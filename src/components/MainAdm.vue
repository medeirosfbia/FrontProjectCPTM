<template>
    <div class="container">
        <div class="admin-screen">
                <div v-if="toastVisible" :class="['toast', toastType]">{{ toastMessage }}</div>
            <div class="user-header">
                <div class="header-left">
                    <img src="../assets/cptm_logo_simples.png" alt="CPTM" class="logo" />
                    <div class="header-info">
                        <h1>Área do Administrador</h1>
                        <p class="subtitle">Gestão e Inspeções</p>
                    </div>
                </div>
                <div class="user-area">
                    <button class="avatar" @click="showUserMenu = !showUserMenu" aria-label="Usuário">👤</button>
                    <div v-if="showUserMenu" class="user-menu">
                        <button class="btn" @click="createUser">Criar Usuário</button>
                        <button class="user-logout" @click="logout">Sair</button>
                    </div>
                </div>
            </div>

            <!-- Navegação principal do Admin -->
            <div class="admin-tabs">
                <button class="tab-btn" :class="{ active: currentTab === 'users' }" @click="setTab('users')">
                    Usuários
                </button>
                <button class="tab-btn" :class="{ active: currentTab === 'my-inspections' }"
                    @click="setTab('my-inspections')">
                    Minhas Inspeções
                </button>
            </div>

            <!-- Modal de confirmação global -->
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

            <!-- TAB: USUÁRIOS -->
            <div v-if="loadingUsers" class="notice">
                Carregando usuários...
            </div>
            <div v-if="currentTab === 'users'">
                <!-- Visualizando um usuário específico -->
                <div v-if="selectedUser" class="user-details">
                    <button class="btn ghost back-btn" @click="selectedUser = null">← Voltar para lista</button>
                    <h2 class="user-inspections-title">Inspeções de {{ selectedUser.name }}</h2>
                    <input
                        class="inspection-search"
                        v-model="userInspectionSearchQuery"
                        placeholder="Buscar por título..."
                    />
                    <div class="table-wrap">
                        <!-- <div v-if="!userInspections.length" class="notice">{{ selectedUser.name }} não possui inspeções ainda.</div> -->
                        <div v-if="loadingUserInspections" class="notice">
                            Carregando inspeções...
                        </div>

                        <div v-else-if="!userInspections.length" class="notice">
                            {{ selectedUser.name }} não possui inspeções ainda.
                        </div>
                        <section v-else class="list">
                            <div v-for="ins in filteredUserInspections" :key="ins.id" class="inspection">
                                <div class="left">
                                    <strong class="inspection-title">{{ ins.title }}</strong>
                                    <div class="mono">ID: {{ ins.id }}</div>
                                </div>
                                <div class="right">
                                    <div :class="['status', statusClass(ins)]">{{ statusLabel(ins) }}</div>
                                    <div class="action-menu-container">
                                        <button class="btn-small dots-btn" @click.stop="toggleMenu('ins-' + ins.id)">⋮</button>
                                        <div class="action-menu" v-if="activeMenu === ('ins-' + ins.id)">
                                            <button class="btn" @click="openDetails(ins); toggleMenu(null)">Ver Inteira</button>
                                            <button class="btn" style="background:#f2c036;color:#333;" @click="goToEditInspection(ins); toggleMenu(null)">Editar</button>
                                            <button class="btn" style="background:#dc1c22;color:#fff;" @click="confirmAction('delete', ins); toggleMenu(null)">Apagar</button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </section>
                    </div>
                </div>

                <!-- Lista de usuários -->
                <div v-else>
                    <div class="controls">
                        <input class="search-input" v-model="query" placeholder="Buscar por nome ou email..." />
                        <div class="stats">
                            <div class="stat">Operadores: <strong>{{ workers.length }}</strong></div>
                        </div>
                    </div>

                    <div class="table-wrap">
                        <table class="workers">
                            <thead>
                                <tr>
                                    <th @click="sortBy('name')">Nome</th>
                                    <th @click="sortBy('email')">Email</th>
                                    <th @click="sortBy('submissions')">Envios</th>
                                    <th>Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-for="w in filtered" :key="w.id">
                                    <td data-label="Nome">{{ w.name }}</td>
                                    <td data-label="Email">{{ w.email }}</td>
                                    <td data-label="Envios" class="mono">{{ w.submissions }}</td>
                                    <td data-label="Ações">
                                        <div class="action-menu-container">
                                            <button class="btn-small dots-btn" @click.stop="toggleMenu('user-' + w.id)">⋮</button>
                                            <div class="action-menu" v-if="activeMenu === ('user-' + w.id)">
                                                <button class="btn" @click="seeMore(w); toggleMenu(null)">Ver</button>
                                                <button class="btn" style="background:#f2c036;color:#333;" @click="editUserBtn(w); toggleMenu(null)">Editar</button>
                                                <button class="btn" style="background:#dc1c22;color:#fff;" @click="deleteUserBtn(w); toggleMenu(null)">Apagar</button>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            </tbody>
                        </table>

                        <div v-if="!filtered.length" class="notice">Nenhum operador encontrado com esse filtro.</div>
                    </div>
                </div>
            </div>

            <!-- TAB: MINHAS INSPEÇÕES (Estilo App Usuário Normal) -->
            <div v-if="currentTab === 'my-inspections'">
                <div class="app-controls">
                    <div v-if="status" class="sync-message">{{ status }}</div>
                    <QuickGrid 
                        :viewFilter="viewFilter" 
                        @setFilter="setFilter" 
                        @openNewInspection="openNewInspection" 
                    />
                </div>

                <div class="table-wrap app-table">
                    <input class="inspection-search" v-model="inspectionSearchQuery" placeholder="Buscar por título..." />
                    <div v-if="!filteredInspections.length && !loadingApi" class="notice">Nenhuma inspeção neste filtro.
                    </div>
                    <div v-if="loadingApi" class="notice" style="color:blue;">Sincronizando com o banco de dados...
                    </div>

                    <InspectionList
                        :items="filteredInspections"
                        title="Listagem de Inspeções"
                        id-prefix="adm-ins-"
                        :show-continue="true"
                        :show-send="true"
                        :show-delete="true"
                        :allow-delete-sent="true"
                        :on-continue="(ins) => goToForm(ins)"
                        :on-send="(ins) => confirmAction('send', ins)"
                        :on-details="openDetails"
                        :on-delete="(ins) => confirmAction('delete', ins)"
                    />
                </div>
            </div>

        </div>
        <InspectionDetailsModal
            :visible="detailModalVisible"
            :inspection="detailTarget"
            @close="closeDetails"
        />

        <div v-if="createUserModalVisible" class="modal-overlay">
    <div class="modal">
        <h3>Criar usuário</h3>

        <label class="field">
            <span>Nome</span>
            <input v-model="newUser.nomeCompleto" type="text" placeholder="Ex: João da Silva"/>
        </label>

        <label class="field">
            <span>Email</span>
            <input v-model="newUser.email" type="email" placeholder="Ex: joao@cptm.sp.gov.br"/>
        </label>

        <label class="field">
            <span>Data de nascimento</span>
            <input v-model="newUser.dataNascimento" type="date" />
        </label>

        <label class="field">
            <span>Senha</span>
            <input v-model="newUser.senha" type="password" placeholder="••••••••"/>
        </label>

        <label class="field checkbox-group">
            <input v-model="newUser.isAdmin" type="checkbox" />
            <span>Criar como administrador</span>
        </label>

        <div class="modal-actions">
            <button class="btn cancel" @click="closeCreateUserModal">Cancelar</button>
            <button class="btn confirm send" @click="salvarNovoUsuario">Salvar</button>
        </div>
    </div>
</div>

    </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useInspectionStore } from '../stores/inspectionStore'
import { storeToRefs } from 'pinia'
import { saveInspection, getAllInspections, deleteInspection as deleteInspectionDB } from '../services/db'
import { deleteInspectionAPI } from '../services/api'
import { syncInspections } from '../services/sync'
import { getToken, getCurrentUserId, getInspectionsAPI, getUsuariosAPI, getInspecoesPorUsuarioAPI, criarUsuarioAPI } from '../services/api'
import QuickGrid from './QuickGrid.vue'
import InspectionDetailsModal from './InspectionDetailsModal.vue'
import InspectionList from './InspectionList.vue'

// Gerais
const router = useRouter()
const showUserMenu = ref(false)
const currentTab = ref('users') // 'users' ou 'my-inspections'
const detailModalVisible = ref(false)
const detailTarget = ref(null)

function openDetails(ins) {
    detailTarget.value = normalizeInspection(ins)
    detailModalVisible.value = true
}

function closeDetails() {
    detailModalVisible.value = false
    detailTarget.value = null
}


function setTab(tab) {
    currentTab.value = tab
    if (tab === 'users') {
        selectedUser.value = null
    }
}

// ------------------------------------
// LÓGICA DE USUÁRIOS (ADMIN)
// ------------------------------------
const query = ref('')
const sortKey = ref('name')
const sortDir = ref(1)
const userInspectionSearchQuery = ref('')

const selectedUser = ref(null)
const userInspections = ref([]) // Simulação

const workers = ref([])
const loadingUsers = ref(false)
const loadingUserInspections = ref(false)

const activeMenu = ref(null)
function toggleMenu(id) { activeMenu.value = activeMenu.value === id ? null : id }

function normalizeUser(u) {
    return {
        id: u.id ?? u.Id,
        name: u.nomeCompleto ?? u.NomeCompleto ?? u.name ?? u.nome ?? 'Sem nome',
        email: u.email ?? u.Email ?? 'Sem email',
        isAdmin: u.isAdmin ?? u.IsAdmin ?? false,
        submissions: u.submissions ?? u.envios ?? 0
    }
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

function statusLabel(ins) {
    return ins.status || 'Enviado'
}

function normalizedStatus(ins) {
    return String(ins?.status || 'Enviado').trim().toLowerCase()
}

function statusClass(ins) {
    const value = normalizedStatus(ins)

    if (value === 'enviado') return 'status--sent'
    if (value.includes('aguard')) return 'status--waiting'
    if (value.includes('não enviada') || value.includes('nao enviada') || value.includes('não enviado') || value.includes('nao enviado')) return 'status--draft'
    return 'status--neutral'
}

const filteredUserInspections = computed(() => {
    const query = userInspectionSearchQuery.value.trim().toLowerCase()
    if (!query) return userInspections.value

    return userInspections.value.filter(ins => {
        const title = String(ins.title || ins.titulo || '').toLowerCase()
        return title.includes(query)
    })
})

async function carregarUsuarios() {
    loadingUsers.value = true

    try {
        const res = await getUsuariosAPI()
        const arr = Array.isArray(res) ? res : res?.data ?? []

        workers.value = arr.map(normalizeUser)

        for (const user of workers.value) {
            try {
                const insp = await getInspecoesPorUsuarioAPI(user.id)
                const lista = Array.isArray(insp) ? insp : insp?.data ?? []
                user.submissions = lista.length
            } catch {
                user.submissions = 0
            }
        }
    } catch (err) {
        console.error(err)
        status.value = 'Erro ao carregar usuários.'
    } finally {
        loadingUsers.value = false
    }
}


const filtered = computed(() => {
    const q = query.value.trim().toLowerCase()

    let list = workers.value.filter(w => {
        const name = String(w.name || '').toLowerCase()
        const email = String(w.email || '').toLowerCase()

        return !q || name.includes(q) || email.includes(q)
    })

    list = list.sort((a, b) => {
        const A = a[sortKey.value]
        const B = b[sortKey.value]

        if (typeof A === 'string') {
            return sortDir.value * String(A).localeCompare(String(B))
        }

        return sortDir.value * ((A || 0) - (B || 0))
    })

    return list
})



function sortBy(key) {
    if (sortKey.value === key) sortDir.value = -sortDir.value
    else { sortKey.value = key; sortDir.value = 1 }
}


const createUserModalVisible = ref(false)

const newUser = ref({
    nomeCompleto: '',
    email: '',
    dataNascimento: '',
    senha: '',
    isAdmin: false
})

function createUser() {
    createUserModalVisible.value = true
}

function closeCreateUserModal() {
    createUserModalVisible.value = false
    newUser.value = {
        nomeCompleto: '',
        email: '',
        dataNascimento: '',
        senha: '',
        isAdmin: false
    }
}

async function salvarNovoUsuario() {
    try {
        await criarUsuarioAPI(newUser.value)
        await carregarUsuarios()
        closeCreateUserModal()
        status.value = 'Usuário criado com sucesso.'
    } catch (err) {
        console.error(err)
        status.value = err.message || 'Erro ao criar usuário.'
    }
}

async function seeMore(w) {
    selectedUser.value = w
    userInspections.value = []
    loadingUserInspections.value = true

    try {
        const res = await getInspecoesPorUsuarioAPI(w.id)
        const arr = Array.isArray(res) ? res : res?.data ?? []

        userInspections.value = arr.map(normalizeInspection)
        w.submissions = userInspections.value.length
    } catch (err) {
        console.error(err)
        status.value = 'Erro ao carregar inspeções do usuário.'
    } finally {
        loadingUserInspections.value = false
    }
}


// ------------------------------------
// LÓGICA DE INSPEÇÕES DO ADMIN
// ------------------------------------
const store = useInspectionStore()
const { inspections } = storeToRefs(store)
const viewFilter = ref('all')
const inspectionSearchQuery = ref('')
const status = ref('')
const loadingApi = ref(false)
const sentApiData = ref([])

// Toast
const toastMessage = ref('')
const toastType = ref('')
const toastVisible = ref(false)

function showToast(msg, type = 'success', duration = 3000) {
    toastMessage.value = msg
    toastType.value = type
    toastVisible.value = true
    setTimeout(() => { toastVisible.value = false }, duration)
}


onMounted(async () => {
    await carregarUsuarios()

    try {
        const data = await getAllInspections()
        const currentUser = localStorage.getItem('user_email')

        store.inspections = data.filter(i => i.userEmail === currentUser)
    } catch (err) {
        console.error("Erro ao carregar inspeções", err)
    }

    // Carrega do backend e renderiza as duas via 'all'
    await setFilter('all')
})

const filteredInspections = computed(() => {
    const currentUser = localStorage.getItem('user_email')
    // Na aba de 'Minhas Inspeções', o Admin vê apenas as que ele mesmo criou
    const myInspections = inspections.value.filter(i => i.userEmail === currentUser)

    let result = []

    if (viewFilter.value === 'sent') result = sentApiData.value
    else if (viewFilter.value === 'all') {
        const merged = [...myInspections]
        const localIds = new Set(merged.map(i => String(i.id)))
        for (const s of sentApiData.value) {
            if (!localIds.has(String(s.id))) {
                merged.push(s)
            }
        }
        // sort by most recent if possible, here just returning merged
        result = merged.sort((a,b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')))
    }

    else if (viewFilter.value === 'scheduled') result = myInspections.filter(i => i.status !== 'Enviado')
    else result = myInspections

    return applyInspectionSearch(result)
})

function applyInspectionSearch(list) {
    const query = inspectionSearchQuery.value.trim().toLowerCase()
    if (!query) return list

    return list.filter(i => String(i.title || i.titulo || '').toLowerCase().includes(query))
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

            // sentApiData.value = arr
            const currentUserId = getCurrentUserId()

            sentApiData.value = arr
                .map(normalizeInspection)
                .filter(i => Number(i.usuarioId) === Number(currentUserId))
        } catch (e) {
            console.error("Erro API Sent", e)
            status.value = 'Erro ao buscar inspeções no banco.'
        } finally {
            loadingApi.value = false
        }
    }
}

function openNewInspection() {
    router.push('/form/new')
}

function goToForm(ins) {
    router.push(`/form/${ins.id}`)
}

function goToEditInspection(ins) {
    router.push(`/edit-inspection/${ins.id}`)
}

async function sendInspection(ins) {
    const idx = store.inspections.findIndex(i => i.id === ins.id)
    try {
        ins.status = 'Aguardando Rede'
        await saveInspection(ins)
        if (idx >= 0) store.inspections[idx] = { ...ins }
    } catch (e) {
        status.value = 'Erro ao salvar localmente. Fica em Aguardando Rede.'
        return
    }

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
        status.value = 'Sem conexão. Inspeção ficará em Aguardando Rede.'
        return
    }

    const token = getToken()
    if (!token) {
        status.value = 'Usuário não autenticado. Faça login para sincronizar.'
        return
    }

    status.value = 'Sincronizando...'
    try {
        await syncInspections()
        const exists = store.inspections.find(i => i.id === ins.id)
        if (!exists) status.value = 'Sincronizada com sucesso!'
        else status.value = 'Permanece em Aguardando Rede.'
    } catch (e) {
        status.value = 'Erro na sincronização.'
    }
}

async function deleteInspection(ins) {
    try {
        const idStr = String(ins.id)

        const localIdx = store.inspections.findIndex(i => String(i.id) === idStr)

        if (localIdx >= 0) {
            // local item: remove from IndexedDB and store
            try {
                await deleteInspectionDB(ins.id)
                store.inspections = store.inspections.filter(i => String(i.id) !== idStr)
                showToast('Inspeção apagada localmente.', 'success')
            } catch (e) {
                console.error('Erro ao apagar localmente', e)
                showToast('Erro ao apagar localmente.', 'error')
            }
        } else {
            // server item: attempt backend delete then remove from sentApiData
            try {
                await deleteInspectionAPI(idStr)
                sentApiData.value = sentApiData.value.filter(i => String(i.id) !== idStr)
                showToast('Inspeção apagada do servidor.', 'success')
            } catch (e) {
                console.error('Erro ao apagar no servidor', e)
                status.value = 'Não foi possível apagar do servidor.'
                showToast('Erro ao apagar no servidor.', 'error')
            }
        }
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

// ------------------------------------
// Modal de Confirmação (Minhas Inspeções)
// ------------------------------------
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

    if (modalAction.value === 'send') sendInspection(modalTarget.value)
    else if (modalAction.value === 'delete') deleteInspection(modalTarget.value)

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
/* Aproveitando base visual da MainUser.vue com cores admin */
.container {
    min-height: 100vh;
    width: 100%;
    background: #fff;
    display: flex;
    align-items: flex-start;
    justify-content: center;
    padding: 2rem 0;
}

.admin-screen {
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

/* Header */
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
}
.toast.success { background: #16a34a }
.toast.error { background: #ef4444 }

.header-left {
    display: flex;
    align-items: center;
    gap: 0.75rem;
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
    color: #666;
    font-weight: 500;
}

.user-area {
    margin-left: auto;
    position: relative;
    display: flex;
    align-items: center;
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
    cursor: pointer;
}

.user-menu {
    position: absolute;
    right: 0;
    top: 48px;
    background: #fff;
    border-radius: 8px;
    box-shadow: 0 8px 24px #626262;
    padding: 0.35rem;
    min-width: 120px;
    z-index: 100;
}

.user-menu .btn {
    background: transparent;
    border: none;
    color: #333;
    font-weight: 500;
    width: 100%;
    padding: 0.75rem;
    text-align: left;
    cursor: pointer;
}

.user-menu .btn:hover {
    background: #f5f5f5;
}

.user-logout {
    background: none;
    border: none;
    padding: 0.75rem;
    width: 100%;
    text-align: left;
    color: #b71c1c;
    cursor: pointer;
    font-weight: 600;
}

.user-logout:hover {
    background: #fff0f0;
}

/* Abas do Admin */
.admin-tabs {
    display: flex;
    gap: 0.5rem;
    background: #f4f4f4;
    padding: 0.4rem;
    border-radius: 10px;
    margin-bottom: 1.5rem;
}

.tab-btn {
    flex: 1;
    background: transparent;
    border: none;
    font-size: 1rem;
    font-weight: 600;
    color: #666;
    padding: 0.75rem 1rem;
    cursor: pointer;
    border-radius: 6px;
    transition: all 0.2s ease;
}

.tab-btn.active {
    background: #ffffff;
    color: #097a5e;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

/* Tabelas (Usuários) */
.controls {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-bottom: 1rem;
}

.search-input {
    flex: 1;
    padding: 0.6rem 0.8rem;
    border-radius: 8px;
    border: 1px solid #ddd;
    font-size: 1rem;
    background-color: #ffffff;
    color: #333;
}

.stats .stat {
    font-size: 0.95rem;
    color: #555;
    background: #f8f8f8;
    padding: 0.4rem 0.8rem;
    border-radius: 6px;
}

.table-wrap {
    background: #fff;
    border-radius: 8px;
    margin-top: 1rem;
}

.workers { width: 100%; border-collapse: collapse; min-width: unset; }

.workers th {
    text-align: left;
    padding: 0.8rem;
    color: #555;
    font-weight: 600;
    cursor: pointer;
    border-bottom: 2px solid #eee;
}

.workers td {
    padding: 0.8rem;
    border-bottom: 1px solid #f2f2f4;
    color: #333;
}

.action-btn {
    background: #f0f0f0;
    color: #333;
    border: 1px solid #ccc;
    padding: 0.4rem 0.8rem;
    border-radius: 6px;
    cursor: pointer;
    font-weight: 600;
}

.action-btn:hover {
    background: #e0e0e0;
}

.notice {
    padding: 2rem;
    text-align: center;
    color: #888;
    font-style: italic;
}

/* Área do Usuário Específico */
.user-details {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.user-inspections-title {
    color: #111;
    background: transparent;
    margin: 0.25rem 0 0.5rem;
}

.back-btn {
    align-self: flex-start;
    padding: 0.5rem 1rem;
    background: transparent;
    border: 1px solid #ccc;
    border-radius: 6px;
    cursor: pointer;
}

/* Estilos de app comum (Minhas inspeções) */
.app-controls {
    display: flex;
    flex-direction: column;
    gap: 1rem;
}

.inspection-search {
    width: 100%;
    padding: 12px 14px;
    border: 1px solid #d7dbe2;
    background: #fff;
    color: #333;
    border-radius: 12px;
    font-size: 1rem;
    box-sizing: border-box;
    box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
}

.inspection-search:focus {
    outline: none;
    border-color: #097a5e;
    box-shadow: 0 0 0 3px rgba(9, 122, 94, 0.12);
}

.sync-message {
    padding: 0.5rem 0.75rem;
    background: #d1ecf1;
    color: #0c5460;
    border-radius: 8px;
    font-weight: 600;
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

.quick-btn.active {
    box-shadow: 0 10px 24px #ccc;
    opacity: 0.9;
    transform: scale(0.98);
}

.quick-btn:hover {
    transform: translateY(-4px);
    box-shadow: 0 12px 26px #ccc;
}

.quick-btn .label {
    font-weight: 700;
    font-size: 0.95rem;
}

.green {
    background-color: #097a5e;
}

.yellow {
    background-color: #f2c036;
}

.blue {
    background-color: #2b5c9e;
}

.red {
    background-color: #de221d;
}

.list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
}

.list h2 {
    margin-bottom: 0.5rem;
    font-size: 1.2rem;
}

.inspection {
    box-sizing: border-box; max-width: 100%; display: flex;
    justify-content: space-between;
    align-items: center;
    background: #fff;
    padding: 1rem 1.25rem;
    border-radius: 8px;
    border: 1px solid #eaeaea;
}

.inspection .left {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
}

.inspection-title {
    font-size: 1.1rem;
    color: #111;
}

.inspection .mono {
    font-size: 0.85rem;
    color: #666;
    font-family: monospace;
}

.inspection .right {
    display: flex;
    align-items: center;
    gap: 0.75rem;
}

.inspection .status {
    padding: 0.3rem 0.6rem;
    border-radius: 999px;
    font-size: 0.8rem;
    font-weight: 700;
    letter-spacing: 0.01em;
    border: 1px solid transparent;
    white-space: nowrap;
}

.inspection .status--sent {
    background: #e7f7ec;
    color: #1f7a3f;
    border-color: #bfe8cb;
}

.inspection .status--waiting {
    background: #fff2de;
    color: #a85d00;
    border-color: #ffd29a;
}

.inspection .status--draft {
    background: #ffe6e6;
    color: #b42318;
    border-color: #f5b4b4;
}

.inspection .status--neutral {
    background: #f3f4f6;
    color: #4b5563;
    border-color: #e5e7eb;
}

.btn {
    padding: 0.5rem 0.75rem;
    border: 1px solid #ddd;
    background-color: #ffffff;
    color: #333333;
    border-radius: 6px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
}

.btn:hover {
    background-color: #f0f0f0;
}

.btn.ghost {
    background-color: transparent;
    border-color: transparent;
    color: #097a5e;
}

.btn.ghost:hover {
    background-color: rgba(9, 122, 94, 0.1);
}

.continue {
    background: #eef2f6;
    color: #333;
}

.send-btn {
    background: #097a5e;
    color: #fff;
}

.send-btn:disabled,
.continue:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

.ghost.delete {
    background: #ffeaeb;
    border: 1px solid #ffbcbc;
    color: #ca1616;
    padding: 0.4rem 0.6rem;
}

.btn-small {
    padding: 0.4rem 0.6rem;
}

/* Modais */
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

.modal input {
    background-color: #ffffff;
    color: #333;
    border: 1px solid #ccc;
    padding: 0.6rem;
    border-radius: 6px;
    width: 100%;
}

.modal .field {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
    margin-bottom: 1rem;
    text-align: left;
    color: #444;
    font-weight: 500;
}

.modal .field span {
    font-size: 0.9rem;
}

.modal .field.checkbox-group {
    flex-direction: row;
    align-items: center;
    gap: 0.5rem;
    margin-top: 0.5rem;
}

.modal .field.checkbox-group input {
    width: auto;
    margin: 0;
    accent-color: #097a5e;
    cursor: pointer;
    transform: scale(1.1);
}

.modal .field.checkbox-group span {
    font-weight: 600;
    cursor: pointer;
}

.modal-actions {
    display: flex;
    gap: 0.6rem;
    justify-content: flex-end;
}

.modal-actions .btn.confirm {
    color: #fff;
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
}

.modal-actions .btn.cancel:hover {
    background: rgba(43, 92, 158, 0.1);
}

@media (max-width: 720px) {
    .quick-grid {
        grid-template-columns: 1fr 1fr;
    }

    .inspection {
        flex-direction: column;
        align-items: flex-start;
        gap: 1rem;
    }

    .inspection .right {
        width: 100%;
        justify-content: space-between;
    }

    .admin-tabs {
        flex-direction: column;
    }

}
.table-wrap { overflow-x: auto; }

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

@media (max-width: 768px) {
    .workers thead {
        display: none;
    }
    .workers, .workers tbody, .workers tr, .workers td {
        display: block;
        width: 100%;
        box-sizing: border-box;
    }
    .workers tr {
        margin-bottom: 1rem;
        background: #fff;
        border: 1px solid #f2f2f4;
        border-radius: 8px;
        padding: 1rem;
        position: relative;
    }
    .workers td {
        border-bottom: none;
        padding: 0.4rem 0;
        text-align: right;
        display: flex;
        justify-content: space-between;
        align-items: center;
    }
    .workers td::before {
        content: attr(data-label);
        font-weight: bold;
        color: #555;
        text-align: left;
    }
    .workers td:last-child {
        justify-content: flex-end;
    }
    .workers td:last-child::before {
        display: none;
    }
}
</style>
