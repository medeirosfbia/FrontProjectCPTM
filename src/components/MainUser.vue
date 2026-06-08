<template>
    <div class="container">
        <div class="user-screen">
            <div v-if="toastVisible" :class="['toast', toastType]">
                <strong v-if="toastTitle">{{ toastTitle }}</strong>
                <span>{{ toastMessage }}</span>
            </div>
            <div class="user-header">
                <div class="header-left">
                    <img src="../assets/cptm_logo_simples.png" alt="CPTM" class="logo" />
                    <div class="header-info">
                        <h1>Efluentes</h1>
                        <p class="subtitle">Acompanhe rascunhos, envios pendentes e registros enviados</p>
                    </div>
                </div>
                <div class="user-area">
                    <button class="avatar" @click="showUserMenu = !showUserMenu" aria-label="Usuário">👤</button>
                    <div v-if="showUserMenu" class="user-menu">
                        <button class="user-logout" @click="logout">Sair</button>
                    </div>
                </div>
            </div>
            <!-- Modal de confirmação -->
            <div v-if="modalVisible" class="modal-overlay" role="dialog" aria-modal="true">
                <div class="modal">
                    <h3>{{ modalAction === 'delete' ? 'Confirmar exclusão' : 'Confirmar envio' }}</h3>
                    <p>Tem certeza que deseja {{ modalAction === 'delete' ? 'apagar' : 'enviar' }} o registro "{{
                        modalTargetTitle }}"?</p>
                    <div class="modal-actions">
                        <button class="btn cancel" @click="cancelModal">Cancelar</button>
                        <button v-if="modalAction == 'delete'" class="btn confirm delete" @click="confirmModal">Sim,
                            apagar</button>
                        <button v-else class="btn confirm send" @click="confirmModal">Sim, enviar</button>
                    </div>
                </div>
            </div>

            <div class="controls">
                <div v-if="status" class="sync-message">{{ status }}</div>
                <div class="summary-grid">
                    <div class="summary-card"><span>Total</span><strong>{{ dashboardStats.total }}</strong></div>
                    <div class="summary-card"><span>Aguardando Envio</span><strong>{{ dashboardStats.pending }}</strong></div>
                    <div class="summary-card"><span>Registros Enviados</span><strong>{{ dashboardStats.sent }}</strong></div>
                    <div class="summary-card"><span>Rascunhos</span><strong>{{ dashboardStats.drafts }}</strong></div>
                </div>
                <QuickGrid 
                    :viewFilter="viewFilter" 
                    @setFilter="setFilter" 
                    @openNewInspection="openNewInspection" 
                />
            </div>

            <div class="table-wrap">
                <input class="inspection-search" v-model="searchQuery" placeholder="Buscar por elemento, municipio ou linha..." />
                <div v-if="!filteredInspections.length && !loadingApi" class="notice">Nenhum efluente neste filtro.</div>
                <div v-if="loadingApi" class="notice" >Sincronizando com o sistema central...</div>

                <InspectionList
                    :items="filteredInspections"
                    title="Efluentes"
                    id-prefix="user-ins-"
                    :show-continue="true"
                    :show-send="true"
                    :show-delete="true"
                    :on-continue="(ins) => goToForm(ins)"
                    :on-send="(ins) => confirmAction('send', ins)"
                    :on-details="openDetails"
                    :on-delete="(ins) => confirmAction('delete', ins)"
                    :on-cancel-pending="cancelPendingSend"
                />
            </div>
        </div>
        <InspectionDetailsModal 
            :visible="detailModalVisible" 
            :inspection="detailTarget" 
            @close="closeDetails" 
        />
    </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useInspectionStore } from '../stores/inspectionStore'
import { storeToRefs } from 'pinia'
import { useRoute, useRouter } from 'vue-router'
import { saveInspection, getAllInspections, deleteInspection as deleteInspectionDB } from '../services/db'
import { cleanupSentLocalInspections, enviarRascunho, sendInspectionNow } from '../services/sync'
import { deleteEfluenteAPI, extractEfluenteItems, getMeusEfluentesAPI } from '../services/api'
import { getEfluenteCardTitle, normalizeApiEfluenteListItem, normalizeLocalEfluenteRecord, SYNC_STATUS } from '../services/efluenteModel'
import { consumeQueuedToast } from '../services/toastQueue'
import { Plus, Calendar, Send, ClipboardList, LogOut, User } from 'lucide-vue-next'
import QuickGrid from './QuickGrid.vue'
import InspectionDetailsModal from './InspectionDetailsModal.vue'
import InspectionList from './InspectionList.vue'

onMounted(async () => {
    try {
        await cleanupSentLocalInspections()
        const data = await getAllInspections()
        const currentUser = localStorage.getItem('user_email')

        const minhasInspecoes = data
            .map(normalizeLocalEfluenteRecord)
            .filter(Boolean)
            .filter(i => i.syncStatus !== SYNC_STATUS.SENT)
            .filter(i => !i.userEmail || i.userEmail === currentUser)

        store.inspections = minhasInspecoes

    } catch (err) {
        console.error("Erro ao carregar rascunhos locais", err)
    }

    // Carrega do sistema central e renderiza junto com os rascunhos locais.
    await setFilter(getInitialFilter())
    showQueuedToast()

    if (typeof window !== 'undefined') {
        window.addEventListener('inspections-synced', handleSyncUpdated)
    }
})

onBeforeUnmount(() => {
    if (typeof window !== 'undefined') {
        window.removeEventListener('inspections-synced', handleSyncUpdated)
    }
})


const store = useInspectionStore() // ← usamos o store
const { inspections } = storeToRefs(store) // ← pegamos as inspeções como refs reativas
const newTitle = ref('')
const showUserMenu = ref(false)
const viewFilter = ref('all')
const router = useRouter()
const route = useRoute()
const sentApiData = ref([])
const loadingApi = ref(false)

const detailModalVisible = ref(false)
const detailTarget = ref(null)

const activeMenu = ref(null)
function toggleMenu(id) {
    activeMenu.value = activeMenu.value === id ? null : id
}

async function handleSyncUpdated() {
    try {
        await cleanupSentLocalInspections()
        const data = await getAllInspections()
        const currentUser = localStorage.getItem('user_email')

        store.inspections = data
            .map(normalizeLocalEfluenteRecord)
            .filter(Boolean)
            .filter(i => i.syncStatus !== SYNC_STATUS.SENT)
            .filter(i => !i.userEmail || i.userEmail === currentUser)

        await setFilter(viewFilter.value)
    } catch (err) {
        console.error('Erro ao atualizar listagem apos sincronizacao', err)
    }
}

function openDetails(ins) {
    detailTarget.value = normalizeInspection(ins)
    detailModalVisible.value = true
}

function closeDetails() {
    detailModalVisible.value = false
    detailTarget.value = null
}

function normalizeInspection(i) {
    return i?.formData ? { ...i, ...i.formData } : normalizeApiEfluenteListItem(i)
}

// ✅ AGORA CRIA USANDO O STORE
async function createInspection(returnObj = false) {

    const title =
        newTitle.value.trim() ||
        `Registro ${inspections.value.length + 1}`

    const ins = {
        id: 'i' + Date.now(),
        title,
        status: 'Rascunho',
        syncStatus: SYNC_STATUS.DRAFT,
        userEmail: localStorage.getItem('user_email') || ''
    }

    await saveInspection(ins)

    store.inspections.push(ins)

    newTitle.value = ''

    if (returnObj) return ins
}

function openNewInspection() {
    router.push('/form/new')
}

function goToSentInspections() {
    router.push('/sent-inspections')
}

const status = ref('')
const toastTitle = ref('')
const toastMessage = ref('')
const toastType = ref('')
const toastVisible = ref(false)
let toastTimer = null

function showToast(msg, type = 'success', duration = 3000) {
    const payload = typeof msg === 'object' && msg !== null ? msg : { message: msg, type, duration }

    if (toastTimer) {
        clearTimeout(toastTimer)
        toastTimer = null
    }

    toastTitle.value = payload.title || ''
    toastMessage.value = payload.message || ''
    toastType.value = payload.type || type
    toastVisible.value = true
    toastTimer = setTimeout(() => {
        toastVisible.value = false
        toastTitle.value = ''
        toastTimer = null
    }, payload.duration || duration)
}

function showQueuedToast() {
    const queued = consumeQueuedToast()
    if (!queued) return
    showToast(queued, queued.type, queued.duration)
}

function getInitialFilter() {
    return route.query.filter === 'scheduled' ? 'scheduled' : 'all'
}

async function enviarRascunhoPeloMenu(ins) {
    console.log('[3 pontos] Enviar clicado', ins)
    console.log('[3 pontos] localId', ins?.localId)

    const localId = ins?.localId || ins?.id || ins?.pkCdMeioAmbienteCptm || ins?.formData?.pkCdMeioAmbienteCptm

    try {
        const queued = await enviarRascunho(ins, {
            onQueued: updateRecordInStore,
            attemptSend: false
        })

        if (!queued) {
            showToast('Rascunho nao encontrado.', 'error')
            return
        }

        updateRecordInStore(queued)
        status.value = 'Aguardando envio. Tentaremos enviar automaticamente quando a conexao ou o sistema central voltar.'
        showToast('Aguardando envio. Tentaremos automaticamente.', 'warning')

        setTimeout(() => {
            enviarRegistroEmSegundoPlano(queued, localId)
        }, 0)
    } catch (e) {
        console.error('Erro ao sincronizar', e)
        status.value = 'Sistema central indisponivel. O registro ficou aguardando envio e sera reenviado automaticamente.'
        showToast('Aguardando envio. Tentaremos automaticamente.', 'warning')
    }
}

async function enviarRegistroEmSegundoPlano(record, fallbackId) {
    try {
        console.log('[3 pontos] chamando sendInspectionNow forceSend=true')
        const result = await sendInspectionNow(record, { forceSend: true })
        if (!result) return

        const localIdStr = String(result.localId || result.id || fallbackId || '')
        if (result?.syncStatus === SYNC_STATUS.SENT) {
            store.inspections = store.inspections.filter(i => String(i.localId || i.id) !== localIdStr)
            await setFilter(viewFilter.value)
            status.value = 'Registro enviado com sucesso.'
            showToast('Registro enviado com sucesso.', 'success')
            return
        }

        updateRecordInStore(result)

        if (result?.syncStatus === SYNC_STATUS.PENDING_SYNC) {
            status.value = 'Aguardando envio. Tentaremos enviar automaticamente quando a conexao ou o sistema central voltar.'
            return
        }

        status.value = result?.lastError
            ? `Erro de envio: ${result.lastError}`
            : 'Erro de envio. Verifique os dados do registro.'
        showToast('Erro de envio.', 'error')
    } catch (e) {
        console.error('Erro ao sincronizar em segundo plano', e)
        const pending = normalizeLocalEfluenteRecord(record)
        if (pending) {
            pending.syncStatus = SYNC_STATUS.PENDING_SYNC
            pending.status = 'Aguardando Envio'
            pending.lastError = null
            const saved = await saveInspection(pending)
            updateRecordInStore(saved)
        }
        status.value = 'Sistema central indisponivel. O registro ficou aguardando envio e sera reenviado automaticamente.'
    }
}

function updateRecordInStore(record) {
    const normalized = normalizeLocalEfluenteRecord(record)
    if (!normalized) return

    const keys = [
        normalized.localId,
        normalized.id,
        normalized.pkCdMeioAmbienteCptm,
        normalized.serverId,
        normalized.formData?.pkCdMeioAmbienteCptm
    ].map(value => String(value || '')).filter(Boolean)
    const idx = store.inspections.findIndex(item => [
        item.localId,
        item.id,
        item.pkCdMeioAmbienteCptm,
        item.serverId,
        item.formData?.pkCdMeioAmbienteCptm
    ].some(value => keys.includes(String(value || ''))))
    store.inspections = idx >= 0
        ? store.inspections.map((item, index) => index === idx ? { ...normalized } : item)
        : [...store.inspections, normalized]
}

async function cancelPendingSend(ins) {
    const normalized = normalizeLocalEfluenteRecord(ins)
    if (!normalized) return

    normalized.syncStatus = SYNC_STATUS.DRAFT
    normalized.status = 'Rascunho'
    const saved = await saveInspection(normalized)
    const id = String(saved.localId || saved.id)
    const idx = store.inspections.findIndex(i => String(i.localId || i.id) === id)
    if (idx >= 0) store.inspections[idx] = saved
    showToast('Envio cancelado. Registro voltou para rascunho.', 'success')
}

function goToForm(ins) {
    if (ins?.syncStatus === SYNC_STATUS.PENDING_SYNC) {
        status.value = 'Registro aguardando envio. Ele sera enviado automaticamente quando a conexao ou o sistema central voltar.'
        showToast('Registro aguardando envio.', 'warning')
        return
    }

    const isLocal = ins.syncStatus && ins.syncStatus !== SYNC_STATUS.SENT
    const id = isLocal
        ? (ins.localId || ins.id)
        : (ins.pkCdMeioAmbienteCptm || ins.serverId)

    if (!id) {
        showToast('ID do efluente nao encontrado.', 'error')
        return
    }

    router.push(`/form/${encodeURIComponent(id)}`)
}

async function deleteInspection(ins) {

    try {
        const isLocal = ins.syncStatus && ins.syncStatus !== SYNC_STATUS.SENT
        const id = isLocal
            ? (ins.localId || ins.id)
            : (ins.pkCdMeioAmbienteCptm || ins.serverId)
        const localItem = isLocal
            ? store.inspections.find(i => String(i.localId || i.id) === String(id))
            : null

        if (localItem) {
            await deleteInspectionDB(id)
            store.inspections = store.inspections.filter(i => String(i.localId || i.id) !== String(id))
            showToast('Efluente apagado localmente.', 'success')
        } else {
            await deleteEfluenteAPI(id)
            sentApiData.value = sentApiData.value.filter(i => String(i.pkCdMeioAmbienteCptm || i.serverId) !== String(id))
            showToast('Efluente apagado do servidor.', 'success')
        }
    } catch (err) {
        console.error('Erro ao apagar efluente', err)
        showToast('Erro ao apagar efluente.', 'error')
    }

}

function logout() {
    localStorage.removeItem("auth_token")
    localStorage.removeItem("user_role")
    localStorage.removeItem("user_is_admin")

    showUserMenu.value = false
    router.push('/login')
}


async function setFilter(key) {
    viewFilter.value = key

    if (key === 'sent' || key === 'all') {
        loadingApi.value = true
        try {
            const response = await getMeusEfluentesAPI({ pageSize: 100 })
            const arr = extractEfluenteItems(response)

            console.log('dados api', response)
            sentApiData.value = arr.map(normalizeApiEfluenteListItem)
            console.log('dados exibidos', sentApiData.value)

        } catch (e) {
            console.error("Erro ao carregar registros enviados", e)
            status.value = 'Erro ao buscar registros enviados.'
        } finally {
            loadingApi.value = false
        }
    }
}

const searchQuery = ref('')

const dashboardStats = computed(() => {
    const local = inspections.value || []
    const sent = sentApiData.value || []
    const mergedIds = new Set([
        ...local.map(i => String(i.pkCdMeioAmbienteCptm || i.localId || i.id || '')),
        ...sent.map(i => String(i.pkCdMeioAmbienteCptm || i.serverId || ''))
    ])
    const pending = local.filter(i => i.syncStatus === SYNC_STATUS.PENDING_SYNC).length
    const drafts = local.filter(i => i.syncStatus === SYNC_STATUS.DRAFT).length

    return {
        total: mergedIds.size,
        pending,
        sent: sent.length,
        drafts
    }
})

// ✅ FILTRO AGORA USA STORE E MOSTRA TODAS
const filteredInspections = computed(() => {
    let result = []
    if (viewFilter.value === 'sent') {
        result = sentApiData.value
    } else if (viewFilter.value === 'all') {
        const merged = [...inspections.value]
        const localIds = new Set(merged.map(i => String(i.pkCdMeioAmbienteCptm || i.localId || i.id)))
        for (const s of sentApiData.value) {
            if (!localIds.has(String(s.pkCdMeioAmbienteCptm || s.serverId))) {
                merged.push(s)
            }
        }
        result = merged.sort((a,b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')))
    } else if (viewFilter.value === 'scheduled') {
        result = inspections.value.filter(i => i.syncStatus !== SYNC_STATUS.SENT)
    } else {
        result = inspections.value
    }

    const q = searchQuery.value.trim().toLowerCase()
    if (!q) return result

    return result.filter(i => {
        const haystack = [
            i.formData?.txNmElementoMonitoramento,
            i.formData?.txNrElementoMonitoramento,
            i.formData?.txMunicipio,
            i.formData?.txLinhaCptm,
            i.txNmElementoMonitoramento,
            i.txNrElementoMonitoramento,
            i.txMunicipio,
            i.txLinhaCptm,
            i.txEstacaoCptm
        ].join(' ').toLowerCase()
        return haystack.includes(q)
    })
})


// --------------------
// Modal de confirmação
// --------------------

const modalVisible = ref(false)
const modalAction = ref('')
const modalTarget = ref(null)
const modalTargetTitle = computed(() => modalTarget.value ? getEfluenteCardTitle(modalTarget.value) : '')

function confirmAction(action, ins) {
    modalAction.value = action
    modalTarget.value = ins
    modalVisible.value = true
}

async function confirmModal() {
    if (!modalTarget.value) {
        modalVisible.value = false
        return
    }

    const action = modalAction.value
    const target = modalTarget.value
    modalVisible.value = false
    modalTarget.value = null
    modalAction.value = ''

    if (action === 'send') {
        await enviarRascunhoPeloMenu(target)
    } else if (action === 'delete') {
        await deleteInspection(target)
    }
}

function cancelModal() {
    modalVisible.value = false
    modalTarget.value = null
    modalAction.value = ''
}
</script>



<style scoped>
.inspection-search {
    width: 100%;
    padding: 12px 14px;
    border: 1px solid #d7dbe2;
    background: #fff;
    color: #333;
    border-radius: 12px;
    font-size: 1rem;
    margin-top: 15px;
    margin-bottom: 15px;
    box-sizing: border-box;
    box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
}

.inspection-search:focus {
    outline: none;
    border-color: #097a5e;
    box-shadow: 0 0 0 3px rgba(9, 122, 94, 0.12);
}

/* Use user panel visual language */
.container {
    min-height: 100vh;
    width: 100%;
    background: #fff;
    display: flex;
    align-items: flex-start;
    justify-content: center;
    padding: 2rem 0;
    border-radius: 8px;
}

.user-screen {
    width: 100%;
    margin: 0 1rem;
    max-width: 1100px;
    background: #fff;
    border-radius: 12px;
    padding: 1.25rem 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    font-family: system-ui, -apple-system, 'Segoe UI', Roboto, Arial;
}

.user-header {
    display: flex;
    align-items: center;
    gap: 1rem;
}

/* Toast */
.toast {
    position: fixed;
    right: 20px;
    top: 20px;
    z-index: 9999;
    padding: 0.6rem 0.9rem;
    border-radius: 8px;
    color: #fff;
    font-weight: 700;
    box-shadow: 0 6px 18px rgba(16,24,40,0.12);
    display: grid;
    gap: 0.15rem;
    max-width: min(420px, calc(100vw - 40px));
}
.toast span {
    font-weight: 600;
}
.toast.success { background: #16a34a }
.toast.warning { background: #ca8a04 }
.toast.error { background: #ef4444 }

.sync-message {
    margin-bottom: 0.75rem;
    padding: 0.5rem 0.75rem;
    background: #d1ecf1;
    color: #0c5460;
    border-radius: 8px;
    font-weight: 600;
}

.header-left {
    display: flex;
    align-items: center;
    gap: 0.75rem
}

.user-header {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-bottom: 1.5rem;
    padding: 1rem 1.25rem;
    background: #ffffff;
    border-radius: 12px;
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05);
    border: 1px solid #f0f0f0;
}

.logo {
    width: 64px;
    object-fit: contain;
}

.header-info h1 {
    margin: 0;
    font-size: 1.5rem;
    color: #222;
    font-weight: 700;
}

.subtitle {
    margin: 0;
    color: #666
}

.user-area {
    margin-left: auto;
    position: relative
}

.avatar {
    background: #fff;
    border: 1px solid #eee;
    border-radius: 50%;
    width: 40px;
    height: 40px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    cursor: pointer
}

.user-menu {
    position: absolute;
    right: 0;
    top: 48px;
    background: #fff;
    border-radius: 8px;
    box-shadow: 0 8px 24px #626262;
    padding: 0.35rem;
    min-width: 110px
}

.user-logout {
    background: none;
    border: none;
    padding: 0.5rem 0.75rem;
    width: 100%;
    text-align: left;
    color: #b71c1c;
    cursor: pointer;
    font-weight: 600
}

.controls {
    display: flex;
    flex-direction: column;
    gap: 1rem;
}

.quick-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 0.9rem;
    width: 100%;
}

.quick-btn {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 1.15rem;
    border-radius: 12px;
    background-color: #dc1c22;
    color: #fff;
    border: none;
    cursor: pointer;
    box-shadow: 0 6px 18px #ccc;
    min-height: 88px;
    text-align: center;
}

.quick-btn .icon {
    font-size: 1.6rem;
}

.quick-btn .label {
    font-weight: 700;
    font-size: 0.95rem;
}

.quick-btn:hover {
    transform: translateY(-4px);
    box-shadow: 0 12px 26px #ccc;
}

.quick-btn.active {
    box-shadow: 0 10px 24px #ccc;
}

.quick-btn:focus {
    outline: 3px solid #ccc;
}

.quick-btn.green  { background-color: #097a5e; }
.quick-btn.yellow { background-color: #f2c036; }
.quick-btn.blue   { background-color: #2b5c9e; }
.quick-btn.red { background-color: #de221d; }

/* Modal styles */
.modal-overlay {
    position: fixed;
    left: 0;
    top: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.35);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1200;
    padding: 1rem;
}

.modal {
    background: #fff;
    border-radius: 10px;
    padding: 1rem 1.1rem;
    max-width: 480px;
    width: 100%;
    box-shadow: 0 12px 36px rgba(0, 0, 0, 0.18);
}

.modal h3 {
    margin: 0 0 0.4rem 0;
}

.modal p {
    margin: 0 0 0.9rem 0;
    color: #333;
}

.modal-actions {
    display: flex;
    gap: 0.6rem;
    justify-content: flex-end;
}

.modal-actions .btn.confirm {
    color: #fff;
    border: none;
    padding: 0.55rem 0.9rem;
    border-radius: 8px;
}

.modal-actions .btn.send {
    background: #097a5e;
}

.modal-actions .btn.delete {
    background: #ca1616;
}


.modal-actions .btn.cancel {
    background: transparent;
    border: 1px solid #2b5c9e;
    color: #2b5c9e;
    padding: 0.55rem 0.9rem;
    border-radius: 8px;
}

.modal-actions .btn.cancel:hover {
    background: rgba(43, 92, 158, 0.1);
}

.table-wrap {
    background: transparent;
    padding: 0
}

.notice {
    background: #fff6d9;
    padding: 0.8rem;
    border-radius: 8px;
    color: #705500;
    margin-bottom: 1rem
}

.create-row {
    display: flex;
    gap: 0.75rem;
    margin-bottom: 1rem
}

.create-row input {
    flex: 1;
    padding: 0.6rem 0.8rem;
    border-radius: 10px;
    border: 1px solid #eee
}

.btn-primary {
    background: #ca1616;
    color: #fff;
    border: none;
    padding: 0.6rem 0.9rem;
    border-radius: 8px;
    cursor: pointer
}

.list h2 {
    margin: 0 0 0.5rem 0;
    font-size: 1rem
}

.inspection {
    box-sizing: border-box; max-width: 100%; display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.75rem;
    border: 1px solid #f2f2f4;
    border-radius: 8px;
    margin-bottom: 0.6rem;
    background: #fff
}

.mono {
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, 'Roboto Mono', monospace;
    color: #555;
}

.right {
    display: flex;
    gap: 0.5rem;
    align-items: center
}

.status {
    font-weight: 700;
    color: #333
}

h2,
h1 {
    margin: 0 0 0.75rem 0;
    font-size: 1.1rem;
    color: #222
}

.inspection-title {
    font-size: 0.95rem;
    margin-bottom: 0.25rem;
    display: block;
    color: #333
}

.btn {
    padding: 0.45rem 0.7rem;
    border-radius: 8px;
    border: 1px solid #eee;
    background-color: #ffffff;
    color: #333333;
    cursor: pointer;
    font-weight: 600;
    transition: all 0.2s;
}

.btn:hover {
    background-color: #f0f0f0;
}

.btn.continue {
    background: #929288;
    color: #fff
}

.btn.send {
    background: #2b5c9e;
    color: #fff
}

.btn.ghost.delete {
    background: #ffeaeb;
    border: 1px solid #ffbcbc;
    color: #ca1616;
}

.btn.ghost {
    background: transparent
}

.btn[disabled] {
    opacity: 0.6;
    cursor: not-allowed
}

@media (max-width: 720px) {
    .user-screen {
        padding: 1rem
    }

    .create-row {
        flex-direction: column
    }

    .inspection {
        flex-direction: column;
        align-items: flex-start
    }

    .right {
        width: 100%;
        display: flex;
        justify-content: space-between;
        gap: 0.5rem
    }
}

/* Tablet: two columns for quick actions and slightly reduced paddings */
@media (max-width: 900px) {
    .user-screen {
        padding: 0.9rem;
    }

    .quick-grid {
        grid-template-columns: repeat(2, 1fr);
    }

    .quick-btn {
        min-height: 84px;
    }

    .logo {
        width: 48px;
    }

    .header-info h1 {
        font-size: 1.2rem;
    }

    .inspection {
        flex-direction: column;
        align-items: flex-start;
    }
}

/* Mobile: single column, larger touch targets and stacked header */
@media (max-width: 480px) {
    .container {
        padding: 1rem 0;
    }

    .user-screen {
        padding: 0.75rem;
        border-radius: 8px;
    }

    .quick-grid {
        grid-template-columns: 1fr;
    }

    .quick-btn {
        min-height: 72px;
        padding: 0.85rem;
        gap: 0.35rem;
    }

    .quick-btn .icon {
        font-size: 1.4rem;
    }

    .quick-btn .label {
        font-size: 0.92rem;
    }

    .header-left {
        flex-direction: column;
        align-items: flex-start;
        gap: 0.5rem;
    }

    .user-header {
        align-items: flex-start;
        gap: 0.5rem;
    }

    .user-area {
        margin-left: auto;
    }

    .logo {
        width: 44px;
    }

    .create-row input {
        padding: 0.55rem 0.65rem;
    }

    .btn,
    .btn-primary {
        padding: 0.55rem 0.7rem;
    }

    /* Prevent inspection content from overflowing the inspection box */
    .inspection {
        box-sizing: border-box;
        width: 100%;
        padding-right: 0.5rem;
    }

    .inspection .left,
    .inspection .right {
        width: 100%;
    }

    .inspection-title,
    .mono {
        word-break: break-word;
        overflow-wrap: anywhere;
    }

    .right {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
        justify-content: flex-start;
    }

    .right .btn {
        flex: 1 1 48%;
        min-width: 120px;
        box-sizing: border-box;
    }

    .right .btn[disabled] {
        flex: 1 1 48%;
    }

    /* make sure list container has some horizontal padding to avoid touching edges */
    .table-wrap {
        padding: 0 0.5rem;
    }
}
.action-menu-container {
    position: relative;
    display: inline-block;
}

.dots-btn {
    background: none;
    border: none;
    font-size: 1.5rem;
    cursor: pointer;
    line-height: 1;
    padding: 0 0.5rem;
    color: #555;
    font-weight: bold;
}

.action-menu {
    position: absolute;
    right: 0;
    top: 100%;
    background: #fff;
    border: 1px solid #ccc;
    border-radius: 8px;
    box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    display: flex;
    flex-direction: column;
    padding: 0.5rem;
    gap: 0.5rem;
    z-index: 100;
    min-width: 120px;
}

.action-menu button {
    width: 100%;
    text-align: center;
}
</style>
