import { ref } from 'vue'
import { deleteInspection, getAllInspections, saveInspection } from './db'
import { useInspectionStore } from '../stores/inspectionStore'
import {
    createEfluenteAPI,
    createEfluenteMultipartAPI,
    getInspectionsAPI,
    getToken,
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

export const syncState = ref('')

export async function sendInspectionNow(record) {
    const normalized = normalizeLocalEfluenteRecord(record)
    if (!normalized) return record

    if (normalized.syncStatus === SYNC_STATUS.DRAFT) return normalized

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
        normalized.syncStatus = SYNC_STATUS.PENDING_SYNC
        await saveInspection(normalized)
        return normalized
    }

    const token = getToken()
    if (!token) {
        normalized.syncStatus = SYNC_STATUS.PENDING_SYNC
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
        normalized.syncStatus = SYNC_STATUS.ERROR
        normalized.lastError = err?.message || 'Erro ao sincronizar'
        await saveInspection(normalized)
        return normalized
    }
}

export async function syncInspections() {
    if (syncing) return
    syncing = true
    syncState.value = 'Sincronizando...'

    try {
        if (typeof navigator !== 'undefined' && !navigator.onLine) {
            syncState.value = 'Offline'
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

        const refreshedLocal = (await getAllInspections()).map(normalizeLocalEfluenteRecord).filter(Boolean)
        store.inspections = refreshedLocal

        try {
            const token = getToken()
            if (token) {
                const serverItems = await getInspectionsAPI()
                if (Array.isArray(serverItems)) {
                    const localIds = new Set(store.inspections.map(item => String(item.localId || item.id)))
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

        syncState.value = sentCount
            ? `${sentCount} efluente(s) sincronizado(s)`
            : 'Sincronizacao concluida'
    } catch (err) {
        console.error('Erro na sincronizacao', err)
        syncState.value = 'Erro na sincronizacao'
    } finally {
        syncing = false
    }
}

export function initSync() {
    try {
        window.addEventListener('online', () => {
            if (navigator.onLine && getToken()) syncInspections()
        })
    } catch {
        // ignore non-browser env
    }
}
