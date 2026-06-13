import { toRaw } from 'vue'

let db

const DB_NAME = 'inspectionDB'
const STORE_NAME = 'inspections'
const DB_VERSION = 1

export function initDB() {
    return new Promise((resolve, reject) => {
        if (db) {
            resolve(db)
            return
        }

        const request = indexedDB.open(DB_NAME, DB_VERSION)

        request.onupgradeneeded = (event) => {
            db = event.target.result
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: 'id' })
            }
        }

        request.onsuccess = (event) => {
            db = event.target.result
            resolve(db)
        }

        request.onerror = (event) => reject(event.target.error)
    })
}

export async function saveInspection(data) {
    const database = await initDB()

    if (!data.id && data.localId) data.id = data.localId
    if (!data.id) data.id = crypto.randomUUID()
    if (!data.localId && data.syncStatus && data.syncStatus !== 'SENT') data.localId = data.id
    if (!data.syncStatus && !data.status) data.syncStatus = 'DRAFT'
    data.updatedAt = new Date().toISOString()

    return new Promise((resolve, reject) => {
        const tx = database.transaction(STORE_NAME, 'readwrite')
        const store = tx.objectStore(STORE_NAME)
        const rawData = toRaw(data)
        const pureData = typeof structuredClone === 'function'
            ? structuredClone(rawData)
            : rawData

        const request = store.put(pureData)
        request.onsuccess = () => resolve(pureData)
        request.onerror = (event) => reject(event)
    })
}

export async function getAllInspections() {
    const database = await initDB()

    return new Promise((resolve, reject) => {
        const tx = database.transaction(STORE_NAME, 'readonly')
        const store = tx.objectStore(STORE_NAME)
        const request = store.getAll()

        request.onsuccess = () => resolve(request.result)
        request.onerror = (event) => reject(event)
    })
}

export async function getInspection(id) {
    const database = await initDB()

    return new Promise((resolve, reject) => {
        const tx = database.transaction(STORE_NAME, 'readonly')
        const store = tx.objectStore(STORE_NAME)
        const request = store.get(id)

        request.onsuccess = () => resolve(request.result || null)
        request.onerror = (event) => reject(event)
    })
}

export async function deleteInspection(id) {
    const database = await initDB()

    return new Promise((resolve, reject) => {
        const tx = database.transaction(STORE_NAME, 'readwrite')
        const store = tx.objectStore(STORE_NAME)
        const request = store.delete(id)

        request.onsuccess = () => resolve()
        request.onerror = (event) => reject(event)
    })
}
