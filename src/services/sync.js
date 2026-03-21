import { ref } from 'vue'
import { getAllInspections, saveInspection } from './db'
import { useInspectionStore } from '../stores/inspectionStore'

export const syncState = ref('')

/**
 * Try to send a single inspection to the backend.
 * Mutates `inspection.status` and persists changes via `saveInspection`.
 * Returns the updated inspection object.
 */
export async function sendInspectionNow(inspection) {
    try {
        // mark as sending and persist
        inspection.status = 'Enviando...'
        try { await saveInspection(inspection) } catch (e) { /* ignore */ }

        // if offline, mark as waiting for network
        if (typeof navigator !== 'undefined' && !navigator.onLine) {
            inspection.status = 'Aguardando Rede'
            try { await saveInspection(inspection) } catch (e) { /* ignore */ }
            return inspection
        }

        // attempt POST
        const res = await fetch('/api/inspections', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(inspection)
        })

        if (res.ok) {
            inspection.status = 'Enviado'
            try { await saveInspection(inspection) } catch (e) { /* ignore */ }
            return inspection
        }

        // non-OK -> treat as awaiting network
        inspection.status = 'Aguardando Rede'
        try { await saveInspection(inspection) } catch (e) { /* ignore */ }
        return inspection

    } catch (err) {
        // on any unexpected error, mark awaiting network
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
        const all = await getAllInspections()
        const pending = (all || []).filter(i => i.status === 'Aguardando Rede')

        const store = useInspectionStore()

        for (const inspection of pending) {
            try {
                const updated = await sendInspectionNow(inspection)
                // update pinia store if present
                const idx = store.inspections.findIndex(i => i.id === updated.id)
                if (idx >= 0) store.inspections[idx] = { ...updated }
                else store.inspections.push({ ...updated })
            } catch (err) {
                // if sendInspectionNow throws unexpectedly, mark error and continue
            }
        }

        syncState.value = 'Sincronização concluída'
    } catch (err) {
        syncState.value = 'Erro na sincronização'
    }
}


export function initSync() {
    // Attach global online listener
    try {
        window.addEventListener('online', () => {
            // only attempt sync when navigator reports online
            if (navigator.onLine) {
                syncInspections()
            }
        })
    } catch (e) {
        // ignore: running in non-browser environment
    }
}

export default {
    syncInspections,
    initSync,
    syncState
}
