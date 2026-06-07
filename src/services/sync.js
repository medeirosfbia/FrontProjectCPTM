import { ref } from 'vue'
import { deleteInspection, getAllInspections, saveInspection } from './db'
import { useInspectionStore } from '../stores/inspectionStore'
import {
    createEfluenteAPI,
    createEfluenteMultipartAPI,
    getInspectionsAPI,
    getToken,
    isRetryableApiError,
    updateEfluenteAPI,
    updateEfluenteMultipartAPI
} from './api'
import {
    buildEfluentePayload,
    getDraftAttachmentFiles,
    normalizeApiEfluenteListItem,
    normalizeLocalEfluenteRecord,
    SYNC_STATUS,
    validateEfluenteForSubmit
} from './efluenteModel'

let syncing = false
let syncInitialized = false
let syncTimerId = null

export const syncState = ref('')

export async function queueInspectionForSync(record, lastError = '') {
    const normalized = normalizeLocalEfluenteRecord(record)
    if (!normalized) return record

    normalized.syncStatus = SYNC_STATUS.PENDING_SYNC
    normalized.status = 'Aguardando Envio'
    normalized.lastError = lastError
    return saveInspection(normalized)
}

export async function sendInspectionNow(record) {
    const normalized = normalizeLocalEfluenteRecord(record)
    if (!normalized) return record

    if (normalized.syncStatus === SYNC_STATUS.SENT) return normalized

    normalized.syncStatus = SYNC_STATUS.PENDING_SYNC
    normalized.status = 'Aguardando Envio'
    normalized.lastError = ''
    await saveInspection(normalized)

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
        normalized.lastError = 'Sem conexao. O registro ficara aguardando envio e sera reenviado automaticamente.'
        await saveInspection(normalized)
        return normalized
    }

    const token = getToken()
    if (!token) {
        normalized.lastError = 'Usuario nao autenticado. Faca login para sincronizar.'
        await saveInspection(normalized)
        return normalized
    }

    const validation = validateEfluenteForSubmit(normalized.formData)
    if (!validation.valid) {
        normalized.syncStatus = SYNC_STATUS.ERROR
        normalized.lastError = validation.errors[0]
        await saveInspection(normalized)
        return normalized
    }

    const hadPk = Boolean(normalized.formData?.pkCdMeioAmbienteCptm)
    const payload = buildEfluentePayload(normalized.formData)
    const mode = hadPk ? 'edit' : 'create'
    const method = mode === 'edit' ? 'PUT' : 'POST'
    const url = mode === 'edit'
        ? `/api/efluentes/${payload.pkCdMeioAmbienteCptm}`
        : '/api/efluentes'

    if (mode === 'create') {
        delete payload.pkCdMeioAmbienteCptm
    }

    try {
        console.log('modo', mode)
        console.log('pk', payload.pkCdMeioAmbienteCptm || '')
        console.log('localId', normalized.localId)
        console.log('payload', payload)
        console.log('method', method)
        console.log('url', url)

        const files = getDraftAttachmentFiles(normalized)
        const response = files.length
            ? (
                mode === 'edit'
                    ? await updateEfluenteMultipartAPI(payload.pkCdMeioAmbienteCptm, payload, files)
                    : await createEfluenteMultipartAPI(payload, files)
            )
            : (
                mode === 'edit'
                    ? await updateEfluenteAPI(payload.pkCdMeioAmbienteCptm, payload)
                    : await createEfluenteAPI(payload)
            )

        const pk = response?.pkCdMeioAmbienteCptm
            || response?.PkCdMeioAmbienteCptm
            || response?.data?.pkCdMeioAmbienteCptm
            || payload.pkCdMeioAmbienteCptm

        await deleteInspection(normalized.localId || normalized.id)
        return {
            ...normalized,
            pkCdMeioAmbienteCptm: pk,
            syncStatus: SYNC_STATUS.SENT
        }
    } catch (err) {
        normalized.syncStatus = isRetryableApiError(err)
            ? SYNC_STATUS.PENDING_SYNC
            : SYNC_STATUS.ERROR
        normalized.lastError = err?.message || 'Erro ao sincronizar'
        await saveInspection(normalized)
        return normalized
    }
}

export async function cleanupSentLocalInspections() {
    const all = await getAllInspections()
    let deletedCount = 0

    for (const record of all || []) {
        const normalized = normalizeLocalEfluenteRecord(record)
        const legacyStatus = String(record?.status || '').trim().toLowerCase()
        const shouldDelete = normalized?.syncStatus === SYNC_STATUS.SENT
            || legacyStatus === 'enviado'

        if (!shouldDelete) continue

        await deleteInspection(record.localId || record.id)
        deletedCount++
    }

    return deletedCount
}

export async function syncInspections() {
    if (syncing) return
    syncing = true
    syncState.value = 'Sincronizando...'

    try {
        if (typeof navigator !== 'undefined' && !navigator.onLine) {
            syncState.value = 'Aguardando envio'
            return
        }

        const all = await getAllInspections()
        const pending = (all || [])
            .map(normalizeLocalEfluenteRecord)
            .filter(item => item?.syncStatus === SYNC_STATUS.PENDING_SYNC)

        const store = useInspectionStore()
        let sentCount = 0

        for (const item of pending) {
            const result = await sendInspectionNow(item)
            if (result?.syncStatus === SYNC_STATUS.SENT) sentCount++
        }

        await cleanupSentLocalInspections()

        const refreshedLocal = (await getAllInspections())
            .map(normalizeLocalEfluenteRecord)
            .filter(item => item && item.syncStatus !== SYNC_STATUS.SENT)
        store.inspections = refreshedLocal

        try {
            const token = getToken()
            if (token) {
                const serverItems = await getInspectionsAPI()
                if (Array.isArray(serverItems)) {
                    const localIds = new Set(store.inspections.map(item => String(item.pkCdMeioAmbienteCptm || item.localId || item.id)))
                    for (const item of serverItems.map(normalizeApiEfluenteListItem)) {
                        if (!localIds.has(String(item.pkCdMeioAmbienteCptm || item.id))) {
                            store.inspections.push(item)
                        }
                    }
                }
            }
        } catch {
            // Server refresh is best effort.
        }

        if (sentCount > 0 && typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('inspections-synced', { detail: { count: sentCount } }))
        }

        syncState.value = sentCount
            ? `${sentCount} efluente(s) sincronizado(s)`
            : 'Sincronizacao concluida'
    } catch (err) {
        console.error('Erro na sincronizacao', err)
        syncState.value = 'Aguardando envio'
    } finally {
        syncing = false
    }
}

export function initSync() {
    if (syncInitialized) return
    syncInitialized = true

    async function syncPending() {
        if (typeof navigator !== 'undefined' && !navigator.onLine) return
        if (!getToken()) return
        await syncInspections()
    }

    try {
        window.addEventListener('online', syncPending)
        syncTimerId = window.setInterval(syncPending, 5000)
    } catch {
        // ignore non-browser env
    }
}
