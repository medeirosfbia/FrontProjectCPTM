<template>
    <div class="container">
        <div class="user-screen">
            <div class="user-header">
                <div class="header-left">
                    <img src="../assets/cptm_logo_simples.png" alt="CPTM" class="logo" />
                    <div class="header-info">
                        <h1>Inspeções</h1>
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
                    <p>Tem certeza que deseja {{ modalAction === 'delete' ? 'apagar' : 'enviar' }} a inspeção "{{
                        modalTarget?.title }}"?</p>
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
                <QuickGrid 
                    :viewFilter="viewFilter" 
                    @setFilter="setFilter" 
                    @openNewInspection="openNewInspection" 
                />
            </div>

            <div class="table-wrap">
                <input class="inspection-search" v-model="searchQuery" placeholder="Buscar por título..." />
                <div v-if="!filteredInspections.length && !loadingApi" class="notice">Nenhuma inspeção neste filtro.</div>
                <div v-if="loadingApi" class="notice" style="color:blue;">Sincronizando com o banco de dados...</div>

                <InspectionList
                    :items="filteredInspections"
                    title="Inspeções"
                    id-prefix="user-ins-"
                    :show-continue="true"
                    :show-send="true"
                    :show-delete="true"
                    :on-continue="(ins) => goToForm(ins)"
                    :on-send="(ins) => confirmAction('send', ins)"
                    :on-details="openDetails"
                    :on-delete="(ins) => confirmAction('delete', ins)"
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
import { ref, computed } from 'vue'
import { useInspectionStore } from '../stores/inspectionStore'
import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'
import { onMounted } from 'vue'
import { saveInspection, getAllInspections, deleteInspection as deleteInspectionDB } from '../services/db'
import { syncInspections } from '../services/sync'
import { getToken, getInspectionsAPI } from '../services/api'
import { Plus, Calendar, Send, ClipboardList, LogOut, User } from 'lucide-vue-next'
import QuickGrid from './QuickGrid.vue'
import InspectionDetailsModal from './InspectionDetailsModal.vue'
import InspectionList from './InspectionList.vue'

onMounted(async () => {
    try {
        const data = await getAllInspections()
        const currentUser = localStorage.getItem('user_email')

        const minhasInspecoes = data.filter(i => {
            return i.userEmail === currentUser
        })

        store.inspections = minhasInspecoes

    } catch (err) {
        console.error("Erro ao carregar inspeções do IndexedDB", err)
    }

    // Carrega do backend e renderiza as duas via 'all'
    await setFilter('all')
})


const store = useInspectionStore() // ← usamos o store
const { inspections } = storeToRefs(store) // ← pegamos as inspeções como refs reativas
const newTitle = ref('')
const showUserMenu = ref(false)
const viewFilter = ref('all')
const router = useRouter()
const sentApiData = ref([])
const loadingApi = ref(false)

const detailModalVisible = ref(false)
const detailTarget = ref(null)

const activeMenu = ref(null)
function toggleMenu(id) {
    activeMenu.value = activeMenu.value === id ? null : id
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
    return {
        ...i,
        id: i.id ?? i.Id,
        title: i.title ?? i.Title ?? i.titulo ?? 'Sem título',
        location: i.location ?? i.Location,
        latitude: i.latitude ?? i.Latitude,
        longitude: i.longitude ?? i.Longitude,
        address: i.address ?? i.Address,
        notes: i.notes ?? i.Notes,
        q1: i.q1 ?? i.Q1,
        q2: i.q2 ?? i.Q2,
        q3: i.q3 ?? i.Q3,
        q4: i.q4 ?? i.Q4,
        q5: i.q5 ?? i.Q5,
        q6: i.q6 ?? i.Q6,
        createdAt: i.createdAt ?? i.CreatedAt,
        usuarioId: i.usuarioId ?? i.UsuarioId,
        status: i.status ?? 'Enviado'
    }
}

// ✅ AGORA CRIA USANDO O STORE
async function createInspection(returnObj = false) {

    const title =
        newTitle.value.trim() ||
        `Inspeção ${inspections.value.length + 1}`

    const ins = {
        id: 'i' + Date.now(),
        title,
        status: 'Não enviada',
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

async function sendInspection(ins) {
    const idx = store.inspections.findIndex(i => i.id === ins.id)

    // persist as Aguardando Rede
    try {
        ins.status = 'Aguardando Rede'
        await saveInspection(ins)
        if (idx >= 0) store.inspections[idx] = { ...ins }
    } catch (e) {
        console.error('Erro ao persistir localmente', e)
        status.value = 'Erro ao salvar localmente. Fica em Aguardando Rede.'
        return
    }

    // if offline, notify and return
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
        status.value = 'Sem conexão. Inspeção ficará em Aguardando Rede.'
        return
    }

    // require auth
    const token = getToken()
    if (!token) {
        status.value = 'Usuário não autenticado. Faça login para sincronizar.'
        return
    }

    // attempt sync
    status.value = 'Sincronizando com o Back-end...'
    try {
        await syncInspections()

        const exists = store.inspections.find(i => i.id === ins.id)
        if (!exists) {
            status.value = 'Inspeção enviada e salva no banco de dados com sucesso!'
        } else {
            status.value = 'Erro ao enviar para o Back-end. A API (Oracle) pode estar fora do ar. Mantido no cache local para tentar mais tarde.'
        }
    } catch (e) {
        console.error('Erro ao sincronizar', e)
        status.value = 'Erro: A conexão com o Back-end falhou. Re-tentaremos automaticamente.'
    }
}

function goToForm(ins) {
    router.push(`/form/${ins.id}`)
}

async function deleteInspection(ins) {

    try {

        await deleteInspectionDB(ins.id)

        store.inspections = store.inspections.filter(i => i.id !== ins.id)

    } catch (err) {

        console.error("Erro ao apagar inspeção", err)

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
            let res = await getInspectionsAPI()

            let arr = []
            if (res && res.data && Array.isArray(res.data)) arr = res.data
            else if (Array.isArray(res)) arr = res

            sentApiData.value = arr.map(i => ({
                ...i,
                status: 'Enviado'
            }))

        } catch (e) {
            console.error("Erro API Sent", e)
            status.value = 'Erro ao buscar inspeções no banco.'
        } finally {
            loadingApi.value = false
        }
    }
}

const searchQuery = ref('')

// ✅ FILTRO AGORA USA STORE E MOSTRA TODAS
const filteredInspections = computed(() => {
    let result = []
    if (viewFilter.value === 'sent') {
        result = sentApiData.value
    } else if (viewFilter.value === 'all') {
        const merged = [...inspections.value]
        const localIds = new Set(merged.map(i => String(i.id)))
        for (const s of sentApiData.value) {
            if (!localIds.has(String(s.id))) {
                merged.push(s)
            }
        }
        result = merged.sort((a,b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')))
    } else if (viewFilter.value === 'scheduled') {
        result = inspections.value.filter(i => i.status !== 'Enviado')
    } else {
        result = inspections.value
    }

    const q = searchQuery.value.trim().toLowerCase()
    if (!q) return result

    return result.filter(i => {
        const title = String(i.title || i.titulo || '').toLowerCase()
        return title.includes(q)
    })
})


// --------------------
// Modal de confirmação
// --------------------

const modalVisible = ref(false)
const modalAction = ref('')
const modalTarget = ref(null)

function confirmAction(action, ins) {
    modalAction.value = action
    modalTarget.value = ins
    modalVisible.value = true
}

function confirmModal() {
    if (!modalTarget.value) {
        modalVisible.value = false
        return
    }

    if (modalAction.value === 'send') {
        sendInspection(modalTarget.value)
    } else if (modalAction.value === 'delete') {
        deleteInspection(modalTarget.value)
    }

    modalVisible.value = false
    modalTarget.value = null
    modalAction.value = ''
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
