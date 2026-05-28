import { ref } from 'vue'
import { getAllInspections, saveInspection, deleteInspection } from './db'
import { useInspectionStore } from '../stores/inspectionStore'
import {
    createInspectionAPI,
    updateInspectionAPI,
    getInspectionsAPI,
    getToken
} from './api'

let syncing = false 

export const syncState = ref('')

/**
 * Send one inspection now. Respects offline-first: always persists locally first.
 * Returns the inspection object with updated `status` and optional `serverId`.
 */
export async function sendInspectionNow(inspection) {
    try {
        // ensure local id
        if (!inspection.id) inspection.id = 'i' + Date.now()

        // persist locally (don't change status here if already set)
        try { await saveInspection(inspection) } catch (e) {
            // on DB error, mark as awaiting network
            try {
                inspection.status = 'Aguardando Rede'
                await saveInspection(inspection)
            } catch (err) { /* ignore */ }
            return inspection
        }

        // if offline, mark awaiting network and return
        if (typeof navigator !== 'undefined' && !navigator.onLine) {
            inspection.status = 'Aguardando Rede'
            try { await saveInspection(inspection) } catch (e) { /* ignore */ }
            return inspection
        }

        // only attempt send if status is 'Aguardando Rede'
        if (inspection.status !== 'Aguardando Rede') {
            return inspection
        }

        // require token to attempt send
        const token = getToken()
        if (!token) {
            inspection.status = 'Aguardando Rede'
            await saveInspection(inspection)
            return inspection
        }

        // prepare payload for server (remove local-only fields)
        const payload = { ...inspection }
        delete payload.id
        delete payload.status

        // if serverId exists, try update, else create
        let serverRes = null
        try {
            console.log('Enviando payload para a API:', payload)
            if (inspection.serverId) {
                serverRes = await updateInspectionAPI(inspection.serverId, payload)
            } else {
                serverRes = await createInspectionAPI(payload)
            }
            console.log('Resposta sucesso da API:', serverRes)
        } catch (err) {
            console.error('Erro de rede ou da API ao enviar inspeção:', err)
            // network/server error: mark as awaiting network
            inspection.status = 'Aguardando Rede'
            try { await saveInspection(inspection) } catch (e) { /* ignore */ }
            return inspection
        }

        // on success, set serverId
        const sid = serverRes?.id || serverRes?.serverId || serverRes?.data?.id
        if (sid) inspection.serverId = sid

        inspection.status = 'Enviado'

        // remove local copy once the server accepted it
        try { await deleteInspection(inspection.id) } catch (e) { /* ignore */ }

        // return server-side info (include serverId)
        return { ...inspection, status: 'Enviado', serverId: sid }
    } catch (err) {
        // fallback: mark as awaiting network and persist
        try {
            inspection.status = 'Aguardando Rede'
            await saveInspection(inspection)
        } catch (e) { /* ignore */ }
        return inspection
    }
}

export async function syncInspections() {
    syncState.value = 'Sincronizando...'
    try {
        if (typeof navigator !== 'undefined' && !navigator.onLine) {
            syncState.value = 'Offline'
            return
        }

        const all = await getAllInspections()
        const pending = (all || []).filter(i => i.status === 'Aguardando Rede')

        if (!pending.length) {
            syncState.value = 'Nada para enviar'
            return
        }

        const store = useInspectionStore()
        let deletedCount = 0

        for (const inspection of pending) {
            try {
                const updated = await sendInspectionNow(inspection)

                if (updated && updated.status === 'Enviado') {
                    // remove from pinia store (local ID was deleted by sendInspectionNow)
                    const idx = store.inspections.findIndex(i => i.id === updated.id)
                    if (idx >= 0) store.inspections.splice(idx, 1)

                    deletedCount++
                } else {
                    // if not sent, ensure store has the latest state
                    const idx = store.inspections.findIndex(i => i.id === updated.id)
                    if (idx >= 0) store.inspections[idx] = { ...updated }
                    else store.inspections.push({ ...updated })
                }

            } catch (err) {
                // continue with next
            }
        }

        // after uploading pending items, fetch server-side inspections and persist locally
        try {
            if (typeof navigator !== 'undefined' && navigator.onLine) {
                const token = getToken()
                if (token) {
                    const serverItems = await getInspectionsAPI()
                    if (Array.isArray(serverItems)) {
                        for (const s of serverItems) {
                            try {

                                const exists = store.inspections.find(i => i.serverId === s.id || String(i.id) === String(s.id))

                                if (exists) continue

                                const localObj = { ...s, serverId: s.id, status: 'Enviado' }

                                // keep server items only in memory so IndexedDB stays as offline cache
                                const idx2 = store.inspections.findIndex(i => i.serverId === s.id || String(i.id) === String(s.id))
                                if (idx2 >= 0) store.inspections[idx2] = { ...localObj }
                                else store.inspections.push({ ...localObj })
                            } catch (e) {
                                // ignore per-item errors
                            }
                        }
                    }
                }
            }
        } catch (e) {
            // ignore server fetch errors
        }

        try {
            const localItems = await getAllInspections()
            for (const item of localItems || []) {
                const status = String(item?.status || '').trim().toLowerCase()
                if (status === 'enviado' || item.serverId) {
                    try { await deleteInspection(item.id) } catch (e) { /* ignore */ }
                }
            }
        } catch (e) {
            // ignore cleanup errors
        }

        const refreshed = await getAllInspections()
        store.inspections = [...refreshed]

        if (deletedCount > 0) {
            syncState.value = `${deletedCount} inspeção(ões) sincronizada(s) e removida(s) do armazenamento local`
            try {
                window.dispatchEvent(new CustomEvent('inspections-synced', { detail: { count: deletedCount } }))
            } catch (e) {
                // ignore if window not available
            }
        } else {
            syncState.value = 'Sincronização concluída'
        }
    } catch (err) {
        syncState.value = 'Erro na sincronização'
    }
}


// export function initSync() {
//     try {
//         window.addEventListener('online', () => {
//             if (navigator.onLine) {
//                 const token = getToken()
//                 if (token) syncInspections()
//             }
//         })
//     } catch (e) {
//         // ignore non-browser env
//     }
// }

export function initSync() {

    async function runSync() {

        if (syncing) return

        if (!navigator.onLine) return

        const token = getToken()

        if (!token) return

        try {

            syncing = true

            console.log('Tentando sincronização automática...')

            await syncInspections()

        } catch (e) {

            console.error('Erro no sync automático:', e)

        } finally {

            syncing = false

        }
    }

    try {

        window.addEventListener('online', runSync)

        setInterval(runSync, 5000)

    } catch (e) {

        console.error(e)

    }
}

export default {
    sendInspectionNow,
    syncInspections,
    initSync,
    syncState
}

