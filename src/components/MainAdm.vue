<template>
    <div class="container">
        <div class="admin-screen">
                <div v-if="toastVisible" :class="['toast', toastType]">
                    <strong v-if="toastTitle">{{ toastTitle }}</strong>
                    <span>{{ toastMessage }}</span>
                </div>
            <div class="user-header">
                <div class="header-left">
                    <img src="../assets/cptm_logo_simples.png" alt="CPTM" class="logo" />
                    <div class="header-info">
                        <h1>Área do Administrador</h1>
                        <p class="subtitle">Gestao de usuarios e registros</p>
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
                    Meus Registros
                </button>
                <button class="tab-btn" @click="openMap">
                    Mapa
                </button>
            </div>

            <!-- Modal de confirmação global -->
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

            <!-- TAB: USUÁRIOS -->
            <div v-if="loadingUsers" class="notice">
                Carregando usuários...
            </div>
            <div v-if="currentTab === 'users'">
                <!-- Visualizando um usuário específico -->
                <div v-if="selectedUser" class="user-details">
                    <button class="btn ghost back-btn" @click="selectedUser = null">← Voltar para lista</button>
                    <h2 class="user-inspections-title">Registros de {{ selectedUser.name }}</h2>
                    <input
                        class="inspection-search"
                        v-model="userInspectionSearchQuery"
                        placeholder="Buscar por elemento, municipio ou linha..."
                    />
                    <div class="table-wrap">
                        <!-- <div v-if="!userInspections.length" class="notice">{{ selectedUser.name }} não possui inspeções ainda.</div> -->
                        <div v-if="loadingUserInspections" class="notice">
                            Carregando registros...
                        </div>

                        <div v-else-if="!userInspections.length" class="notice">
                            {{ selectedUser.name }} nao possui registros ainda.
                        </div>
                        <section v-else class="list">
                            <div v-for="ins in filteredUserInspections" :key="ins.id" class="inspection">
                                <div class="left">
                                    <strong class="inspection-title">{{ inspectionTitle(ins) }}</strong>
                                    <div class="meta">{{ inspectionSubtitle(ins) }}</div>
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
                    <input class="inspection-search" v-model="inspectionSearchQuery" placeholder="Buscar por elemento, municipio ou linha..." />
                    <div v-if="!filteredInspections.length && !loadingApi" class="notice">Nenhum efluente neste filtro.
                    </div>
                    <div v-if="loadingApi" class="notice" >Sincronizando com o sistema central...
                    </div>

                    <InspectionList
                        :items="filteredInspections"
                        title="Listagem de Efluentes"
                        id-prefix="adm-ins-"
                        :show-continue="true"
                        :show-send="true"
                        :show-delete="true"
                        :allow-delete-sent="true"
                        :on-continue="(ins) => goToForm(ins)"
                        :on-send="(ins) => confirmAction('send', ins)"
                        :on-details="openDetails"
                        :on-delete="(ins) => confirmAction('delete', ins)"
                        :on-cancel-pending="cancelPendingSend"
                    />
                </div>
            </div>

        </div>
        <InspectionDetailsModal
            :visible="detailModalVisible"
            :inspection="detailTarget"
            @close="closeDetails"
        />

        <div v-if="userModalVisible" class="modal-overlay">
    <div class="modal">
        <h3>{{ userModalMode === 'edit' ? 'Editar usuário' : 'Criar usuário' }}</h3>

        <label class="field">
            <span>Nome</span>
            <input v-model="userForm.nomeCompleto" type="text" placeholder="Ex: João da Silva"/>
        </label>

        <label class="field">
            <span>Email</span>
            <input v-model="userForm.email" type="email" placeholder="Ex: joao@cptm.sp.gov.br"/>
        </label>

        <label class="field">
            <span>Data de nascimento</span>
            <input v-model="userForm.dataNascimento" type="date" />
        </label>

        <div v-if="userModalMode === 'edit'" class="password-hint">
            Senha atual: ********
        </div>

        <label class="field">
            <span>{{ userModalMode === 'edit' ? 'Nova senha' : 'Senha' }}</span>
            <input v-model="userForm.senhaNova" type="password" :placeholder="userModalMode === 'edit' ? 'Deixe em branco para manter a atual' : '••••••••'"/>
        </label>

        <label class="field" v-if="userModalMode === 'edit'">
            <span>Confirmar nova senha</span>
            <input v-model="userForm.confirmarSenha" type="password" placeholder="Repita a nova senha"/>
        </label>

        <label class="field checkbox-group">
            <input v-model="userForm.isAdmin" type="checkbox" />
            <span>{{ userModalMode === 'edit' ? 'Manter como administrador' : 'Criar como administrador' }}</span>
        </label>

        <div class="modal-actions">
            <button class="btn cancel" @click="closeCreateUserModal">Cancelar</button>
            <button class="btn confirm send" @click="submitUserForm">{{ userModalMode === 'edit' ? 'Salvar alterações' : 'Salvar' }}</button>
        </div>
    </div>
</div>

    </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useInspectionStore } from '../stores/inspectionStore'
import { storeToRefs } from 'pinia'
import { saveInspection, getAllInspections, deleteInspection as deleteInspectionDB } from '../services/db'
import { deleteEfluenteAPI } from '../services/api'
import { cleanupSentLocalInspections, enviarRascunho, sendInspectionNow } from '../services/sync'
import { consumeQueuedToast } from '../services/toastQueue'
import { extractEfluenteItems, getAdminUsuarioEfluentesAPI, getMeusEfluentesAPI, getUsuariosAPI, criarUsuarioAPI, updateUsuarioAPI, deletarUsuarioAPI } from '../services/api'
import {
    getEfluenteCardSubtitle,
    getEfluenteCardTitle,
    getSyncStatusLabel,
    getSyncStatusVariant,
    normalizeApiEfluenteListItem,
    normalizeLocalEfluenteRecord,
    SYNC_STATUS
} from '../services/efluenteModel'
import QuickGrid from './QuickGrid.vue'
import InspectionDetailsModal from './InspectionDetailsModal.vue'
import InspectionList from './InspectionList.vue'

// Gerais
const router = useRouter()
const route = useRoute()
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
        dataNascimento: formatDateForInput(u.dataNascimento ?? u.DataNascimento ?? u.birthDate ?? u.birth_date ?? u.nascimento ?? u.Nascimento ?? ''),
        isAdmin: u.isAdmin ?? u.IsAdmin ?? false,
        submissions: u.submissions ?? u.envios ?? 0
    }
}

function formatDateForInput(value) {
    if (!value) return ''

    const text = String(value).trim()
    if (!text) return ''

    const date = new Date(text)
    if (!Number.isNaN(date.getTime())) {
        const year = date.getFullYear()
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const day = String(date.getDate()).padStart(2, '0')
        return `${year}-${month}-${day}`
    }

    const match = text.match(/^(\d{4})-(\d{2})-(\d{2})/)
    if (match) return `${match[1]}-${match[2]}-${match[3]}`

    return text
}

function normalizeInspection(i) {
    return i?.formData ? { ...i, ...i.formData } : normalizeApiEfluenteListItem(i)
}

function statusLabel(ins) {
    return getSyncStatusLabel(ins?.syncStatus || SYNC_STATUS.SENT)
}

function statusClass(ins) {
    return getSyncStatusVariant(ins?.syncStatus || SYNC_STATUS.SENT)
}

function inspectionTitle(ins) {
    return getEfluenteCardTitle(ins)
}

function inspectionSubtitle(ins) {
    return getEfluenteCardSubtitle(ins)
}

const filteredUserInspections = computed(() => {
    const query = userInspectionSearchQuery.value.trim().toLowerCase()
    if (!query) return userInspections.value

    return userInspections.value.filter(ins => {
        const haystack = [
            ins.title,
            ins.titulo,
            ins.formData?.txNmElementoMonitoramento,
            ins.formData?.txNrElementoMonitoramento,
            ins.formData?.txMunicipio,
            ins.formData?.txLinhaCptm,
            ins.formData?.txEstacaoCptm,
            ins.txNmElementoMonitoramento,
            ins.txNrElementoMonitoramento,
            ins.txMunicipio,
            ins.txLinhaCptm,
            ins.txEstacaoCptm
        ].join(' ').toLowerCase()

        return haystack.includes(query)
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
                const insp = await getAdminUsuarioEfluentesAPI(user.id, { pageSize: 100 })
                const lista = extractEfluenteItems(insp)
                console.log('dados api', insp)
                console.log('dados exibidos', lista)
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


const userModalVisible = ref(false)
const userModalMode = ref('create')
const editingUserId = ref(null)

const userForm = ref({
    nomeCompleto: '',
    email: '',
    dataNascimento: '',
    senhaNova: '',
    confirmarSenha: '',
    isAdmin: false
})

function createUser() {
    userModalMode.value = 'create'
    editingUserId.value = null
    userForm.value = {
        nomeCompleto: '',
        email: '',
        dataNascimento: '',
        senhaNova: '',
        confirmarSenha: '',
        isAdmin: false
    }
    userModalVisible.value = true
}

function closeCreateUserModal() {
    userModalVisible.value = false
    userModalMode.value = 'create'
    editingUserId.value = null
    userForm.value = {
        nomeCompleto: '',
        email: '',
        dataNascimento: '',
        senhaNova: '',
        confirmarSenha: '',
        isAdmin: false
    }
}

function editUserBtn(w) {
    openEditUserModal(w)
}

async function openEditUserModal(w) {
    userModalMode.value = 'edit'
    editingUserId.value = w.id

    let fullUser = null
    try {
        fullUser = await getUserByIdAPI(w.id)
    } catch (err) {
        console.error('Falha ao buscar usuário completo para edição', err)
    }

    const source = fullUser && typeof fullUser === 'object' ? fullUser : w

    userForm.value = {
        nomeCompleto: source.nomeCompleto || source.NomeCompleto || source.name || source.nome || '',
        email: source.email || source.Email || '',
        dataNascimento: formatDateForInput(
            source.dataNascimento || source.DataNascimento || source.birthDate || source.birth_date || source.nascimento || source.Nascimento || ''
        ),
        senhaNova: '',
        confirmarSenha: '',
        isAdmin: !!(source.isAdmin ?? source.IsAdmin)
    }
    userModalVisible.value = true
}

async function submitUserForm() {
    try {
        if (userModalMode.value === 'edit' && userForm.value.senhaNova) {
            if (userForm.value.senhaNova !== userForm.value.confirmarSenha) {
                throw new Error('A nova senha e a confirmação não conferem.')
            }
        }

        if (userModalMode.value === 'edit') {
            const payload = {
                id: editingUserId.value,
                nomeCompleto: userForm.value.nomeCompleto,
                email: userForm.value.email,
                dataNascimento: userForm.value.dataNascimento,
                isAdmin: userForm.value.isAdmin
            }

            if (userForm.value.senhaNova) {
                payload.senha = userForm.value.senhaNova
            }

            await updateUsuarioAPI(editingUserId.value, payload)
            showToast('Usuário atualizado com sucesso.', 'success')
        } else {
            if (!userForm.value.senhaNova) {
                throw new Error('Informe a senha para cadastrar o usuário.')
            }

            const payload = {
                nomeCompleto: userForm.value.nomeCompleto,
                email: userForm.value.email,
                dataNascimento: userForm.value.dataNascimento,
                senha: userForm.value.senhaNova,
                isAdmin: userForm.value.isAdmin
            }

            await criarUsuarioAPI(payload)
            showToast('Usuário criado com sucesso.', 'success')
        }

        await carregarUsuarios()
        closeCreateUserModal()
    } catch (err) {
        console.error(err)
        const message = err.message || (userModalMode.value === 'edit' ? 'Erro ao atualizar usuário.' : 'Erro ao criar usuário.')
        status.value = message
        showToast(message, 'error')
    }
}

async function deleteUserBtn(w) {
    const confirmDelete = window.confirm(`Apagar o usuário ${w.name}?`)
    if (!confirmDelete) return

    try {
        await deletarUsuarioAPI(w.id)
        await carregarUsuarios()
        showToast('Usuário apagado com sucesso.', 'success')
        if (selectedUser.value && String(selectedUser.value.id) === String(w.id)) {
            selectedUser.value = null
        }
    } catch (err) {
        console.error(err)
        const message = err.message || 'Erro ao apagar usuário.'
        status.value = message
        showToast(message, 'error')
    }
}

async function seeMore(w) {
    selectedUser.value = w
    userInspections.value = []
    loadingUserInspections.value = true

    try {
        const res = await getAdminUsuarioEfluentesAPI(w.id, { pageSize: 100 })
        const arr = extractEfluenteItems(res)

        console.log('dados api', res)
        userInspections.value = arr.map(normalizeInspection)
        console.log('dados exibidos', userInspections.value)
        w.submissions = userInspections.value.length
    } catch (err) {
        console.error(err)
        status.value = 'Erro ao carregar registros do usuario.'
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
const toastTitle = ref('')
const toastMessage = ref('')
const toastType = ref('')
const toastVisible = ref(false)
let toastTimer = null

const adminDashboardStats = computed(() => {
    const local = inspections.value || []
    const sent = sentApiData.value || []
    const mergedIds = new Set([
        ...local.map(i => String(i.localId || i.id || '')),
        ...sent.map(i => String(i.pkCdMeioAmbienteCptm || i.serverId || ''))
    ])

    return {
        users: workers.value.length,
        total: mergedIds.size,
        pending: local.filter(i => i.syncStatus === SYNC_STATUS.PENDING_SYNC).length,
        sent: sent.length
    }
})

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


onMounted(async () => {
    if (route.query.tab === 'my-inspections') currentTab.value = 'my-inspections'
    await carregarUsuarios()

    try {
        await cleanupSentLocalInspections()
        const data = await getAllInspections()
        const currentUser = localStorage.getItem('user_email')

        store.inspections = data
            .map(normalizeLocalEfluenteRecord)
            .filter(Boolean)
            .filter(i => i.syncStatus !== SYNC_STATUS.SENT)
            .filter(i => !i.userEmail || i.userEmail === currentUser)
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

const filteredInspections = computed(() => {
    const currentUser = localStorage.getItem('user_email')
    // Na aba de 'Meus Registros', o Admin ve apenas as que ele mesmo criou.
    const myInspections = inspections.value
        .map(normalizeLocalEfluenteRecord)
        .filter(Boolean)
        .filter(i => !i.userEmail || i.userEmail === currentUser)

    let result = []

    if (viewFilter.value === 'sent') result = sentApiData.value
    else if (viewFilter.value === 'all') {
        const merged = [...myInspections]
        const localIds = new Set(merged.map(i => String(i.pkCdMeioAmbienteCptm || i.localId || i.id)))
        for (const s of sentApiData.value) {
            if (!localIds.has(String(s.pkCdMeioAmbienteCptm || s.serverId))) {
                merged.push(s)
            }
        }
        // sort by most recent if possible, here just returning merged
        result = merged.sort((a,b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')))
    }

    else if (viewFilter.value === 'scheduled') result = myInspections.filter(i => i.syncStatus !== SYNC_STATUS.SENT)
    else result = myInspections

    return applyInspectionSearch(result)
})

function applyInspectionSearch(list) {
    const query = inspectionSearchQuery.value.trim().toLowerCase()
    if (!query) return list

    return list.filter(i => {
        const haystack = [
            i.title,
            i.titulo,
            i.formData?.txNmElementoMonitoramento,
            i.formData?.txNrElementoMonitoramento,
            i.formData?.txMunicipio,
            i.formData?.txLinhaCptm,
            i.formData?.txEstacaoCptm,
            i.txNmElementoMonitoramento,
            i.txNrElementoMonitoramento,
            i.txMunicipio,
            i.txLinhaCptm,
            i.txEstacaoCptm
        ].join(' ').toLowerCase()
        return haystack.includes(query)
    })
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

function openNewInspection() {
    router.push('/form/new')
}

function openMap() {
    router.push('/map')
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
        status.value = 'ID do efluente nao encontrado.'
        return
    }

    router.push(`/form/${encodeURIComponent(id)}`)
}

function goToEditInspection(ins) {
    const isLocal = ins.syncStatus && ins.syncStatus !== SYNC_STATUS.SENT
    const id = isLocal
        ? (ins.localId || ins.id)
        : (ins.pkCdMeioAmbienteCptm || ins.serverId)

    if (!id) {
        status.value = 'ID do efluente nao encontrado.'
        return
    }

    router.push(`/edit-inspection/${encodeURIComponent(id)}`)
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
            status.value = 'Sincronizada com sucesso!'
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

async function deleteInspection(ins) {
    try {
        const isLocal = ins.syncStatus && ins.syncStatus !== SYNC_STATUS.SENT
        const id = isLocal
            ? (ins.localId || ins.id)
            : (ins.pkCdMeioAmbienteCptm || ins.serverId)

        if (!id) {
            showToast('ID do efluente nao encontrado.', 'error')
            return
        }

        const idStr = String(id)
        const localIdx = isLocal
            ? store.inspections.findIndex(i => String(i.localId || i.id) === idStr)
            : -1

        if (localIdx >= 0) {
            try {
                await deleteInspectionDB(id)
                store.inspections = store.inspections.filter(i => String(i.localId || i.id) !== idStr)
                showToast('Efluente apagado localmente.', 'success')
            } catch (e) {
                console.error('Erro ao apagar localmente', e)
                showToast('Erro ao apagar localmente.', 'error')
            }
        } else {
            try {
                await deleteEfluenteAPI(idStr)
                sentApiData.value = sentApiData.value.filter(i => String(i.pkCdMeioAmbienteCptm || i.serverId) !== idStr)
                showToast('Efluente apagado do servidor.', 'success')
            } catch (e) {
                console.error('Erro ao apagar no servidor', e)
                status.value = 'Nao foi possivel apagar do servidor.'
                showToast('Erro ao apagar no servidor.', 'error')
            }
        }
    } catch (err) {
        console.error('Erro ao apagar efluente', err)
    }
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
function logout() {
    localStorage.removeItem("auth_token")
    localStorage.removeItem("user_role")
    localStorage.removeItem("user_is_admin")
    showUserMenu.value = false
    router.push('/login')
}

// ------------------------------------
// Modal de confirmacao (Meus Registros)
// ------------------------------------
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

    if (action === 'send') await enviarRascunhoPeloMenu(target)
    else if (action === 'delete') await deleteInspection(target)
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

/* Estilos de app comum (Meus Registros) */
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

.inspection .meta {
    color: #4b5563;
    font-size: 0.9rem;
    overflow-wrap: anywhere;
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
    background: #f3f4f6;
    color: #4b5563;
    border-color: #e5e7eb;
}

.inspection .status--error {
    background: #fde7e9;
    color: #9f1239;
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
