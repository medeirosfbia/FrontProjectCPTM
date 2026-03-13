<template>
    <div class="container">
        <div class="user-screen">
            <div class="user-header">
                <div class="header-left">
                    <img src="../assets/cptm_logo_simples.png" alt="CPTM" class="logo" />
                    <div class="header-info">
                        <h1>Inspeções</h1>
                        <p class="subtitle">CPTM + FATEC</p>
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
                <div class="quick-grid">
                    <button class="quick-btn" @click="openNewInspection" aria-label="Abrir nova inspeção">
                        <div class="icon">➕</div>
                        <div class="label">Abrir nova inspeção</div>
                    </button>

                    <button class="quick-btn" :class="{ active: viewFilter === 'scheduled' }"
                        @click="setFilter('scheduled')" :aria-pressed="viewFilter === 'scheduled'"
                        aria-label="Inspeções agendadas">
                        <div class="icon">📅</div>
                        <div class="label">Inspeções agendadas</div>
                    </button>

                    <button class="quick-btn" :class="{ active: viewFilter === 'sent' }" @click="setFilter('sent')"
                        :aria-pressed="viewFilter === 'sent'" aria-label="Inspeções enviadas">
                        <div class="icon">📤</div>
                        <div class="label">Inspeções enviadas</div>
                    </button>

                    <button class="quick-btn" :class="{ active: viewFilter === 'all' }" @click="setFilter('all')"
                        :aria-pressed="viewFilter === 'all'" aria-label="Minhas inspeções">
                        <div class="icon">📋</div>
                        <div class="label">Minhas inspeções</div>
                    </button>
                </div>
            </div>

            <div class="table-wrap">
                <div v-if="!filteredInspections.length" class="notice">Nenhuma inspeção neste filtro.</div>

                <section v-if="filteredInspections.length" class="list">
                    <h2>Inspeções ({{ filteredInspections.length }})</h2>
                    <div v-for="ins in filteredInspections" :key="ins.id" class="inspection">
                        <div class="left">
                            <strong class="inspection-title">{{ ins.title }}</strong>
                            <div class="mono">ID: {{ ins.id }}</div>
                        </div>
                        <div class="right">
                            <div class="status">{{ ins.status }}</div>
                            <button class="btn" @click="goToForm(ins)">Preencher Formulário</button>
                            <button class="btn send" @click="confirmAction('send', ins)"
                                :disabled="ins.status === 'Enviado' || ins.status === 'Enviando...'">Enviar</button>
                            <button class="btn ghost delete" @click="confirmAction('delete', ins)">Apagar</button>
                        </div>
                    </div>
                </section>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useInspectionStore } from '../stores/inspectionStore'
import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'
import { onMounted } from 'vue'
import { saveInspection, getAllInspections, deleteInspection as deleteInspectionDB } from '../services/db'

onMounted(async () => {

    try {

        const data = await getAllInspections()

        // atualiza o store com dados persistidos
        store.inspections = data

    } catch (err) {

        console.error("Erro ao carregar inspeções do IndexedDB", err)

    }

})



const store = useInspectionStore() // ← usamos o store
const { inspections } = storeToRefs(store) // ← pegamos as inspeções como refs reativas
const newTitle = ref('')
const showUserMenu = ref(false)
const viewFilter = ref('all')
const router = useRouter()

// ✅ AGORA CRIA USANDO O STORE
async function createInspection(returnObj = false) {

    const title =
        newTitle.value.trim() ||
        `Inspeção ${inspections.value.length + 1}`

    const ins = {
        id: 'i' + Date.now(),
        title,
        status: 'Não enviada'
    }

    await saveInspection(ins)

    store.inspections.push(ins)

    newTitle.value = ''

    if (returnObj) return ins
}

function openNewInspection() {
    router.push('/form/new')
}

function sendInspection(ins) {
    if (ins.status === 'Enviado' || ins.status === 'Enviando...') return
    ins.status = 'Enviando...'
    setTimeout(() => { ins.status = 'Enviado' }, 900)
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

    showUserMenu.value = false
    router.push('/login')
}

function setFilter(key) {
    viewFilter.value = key
}

// ✅ FILTRO AGORA USA STORE
const filteredInspections = computed(() => {
    if (viewFilter.value === 'all') return inspections.value
    if (viewFilter.value === 'sent')
        return inspections.value.filter(i => i.status === 'Enviado')
    if (viewFilter.value === 'scheduled')
        return inspections.value.filter(i => i.status !== 'Enviado')
    return inspections.value
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
/* Use user panel visual language */
.container {
    min-height: 100vh;
    width: 100%;
    background: linear-gradient(180deg, #f7f7f8, #ffd5d5);
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
    box-shadow: 0 12px 36px rgba(0, 0, 0, 0.06);
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

.header-left {
    display: flex;
    align-items: center;
    gap: 0.75rem
}

.logo {
    width: 56px
}

.header-info h1 {
    margin: 0;
    font-size: 1.4rem
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
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
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
    gap: 1rem;
    align-items: center
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
    background: linear-gradient(180deg, #b71c1c, #8f1616);
    color: #fff;
    border: none;
    cursor: pointer;
    box-shadow: 0 6px 18px rgba(183, 28, 28, 0.18);
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
    box-shadow: 0 12px 26px rgba(183, 28, 28, 0.22);
    background: linear-gradient(180deg, #ff5a5a, #9f1717);
}

.quick-btn.active {
    outline: 3px solid rgba(183, 28, 28, 0.12);
    box-shadow: 0 10px 24px rgba(183, 28, 28, 0.26);
    background: linear-gradient(180deg, #ff6b6b, #b71c1c);
}

.quick-btn:focus {
    outline: 3px solid rgba(183, 28, 28, 0.18);
}

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
    background: #419b05;
}

.modal-actions .btn.delete {
    background: #b71c1c;
}


.modal-actions .btn.cancel {
    background: transparent;
    border: 1px solid #ddd;
    padding: 0.55rem 0.9rem;
    border-radius: 8px;
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
    background: #b71c1c;
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
    display: flex;
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
    background: #fff;
    cursor: pointer;
    color: #333
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
</style>
