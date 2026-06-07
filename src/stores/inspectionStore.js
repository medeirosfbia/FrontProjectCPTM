import { defineStore } from 'pinia'

export const useInspectionStore = defineStore('inspection', {
    state: () => ({
        inspections: [],
    }),
    actions: {
        addInspection(inspection) {
            const newInspection = { ...inspection, id: 'i' + Date.now(), status: 'Rascunho', syncStatus: 'DRAFT' }
            this.inspections.push(newInspection);
        },

        deleteInspection(id) {
            this.inspections = this.inspections.filter(i => i.id !== id)
        },

        updateStatus(id, newStatus) {
            const item = this.inspections.find(i => i.id === id)
            if (item) {
                item.status = newStatus
            }
        }
    }
})
