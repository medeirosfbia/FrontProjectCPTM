<template>
  <div class="container">
    <div class="admin-screen">
      <div class="admin-header">
        <div class="header-left">
          <img src="../assets/cptm_logo_simples.png" alt="CPTM" class="logo" />
          <div class="header-info">
            <h1>Formulário de Inspeção</h1>
            <p class="subtitle">Preencha e envie a inspeção</p>
          </div>
        </div>
        <div class="user-area">
          <button class="avatar" @click="showUserMenu = !showUserMenu">👤</button>
          <div v-if="showUserMenu" class="user-menu">
            <button class="user-logout" @click="logout">Sair</button>
          </div>
        </div>
      </div>

      <div class="table-wrap">
        <form class="form" @submit.prevent="submitForm">
          <!-- Paginated pages: render only fields for current page -->
          <div class="page">
            <div v-for="field in pages[currentPage]" :key="field.key" class="row">
              <label>{{ field.label }}</label>

              <template v-if="field.type === 'textarea'">
                <textarea v-model="form[field.key]" rows="4" :placeholder="field.placeholder">
      </textarea>
              </template>

              <template v-else>
                <input v-model="form[field.key]" :placeholder="field.placeholder" />
              </template>

            </div>
          </div>

          <!-- Pagination controls -->
          <div class="pagination">
            <div class="page-buttons">
              <button v-for="n in totalPages" :key="n" type="button" class="btn page-btn"
                :class="{ active: currentPage === (n - 1) }" @click="goToPage(n - 1)">
                {{ n }}
              </button>
            </div>
          </div>
          <div class="pagination arrows">
            <button type="button" class="btn" @click="prevPage" :disabled="currentPage === 0">Anterior</button>
            <button v-if="currentPage === totalPages - 1" type="button" class="btn-primary"
              @click="submitForm">Enviar</button>
            <button v-else type="button" class="btn" @click="nextPage" :disabled="currentPage >= totalPages - 1">
              Próxima
            </button>
          </div>

          <!-- Actions: submit on last page, otherwise Next also available -->
          <div class="actions">
            <button type="button" class="btn" @click="saveDraft">Salvar rascunho</button>
            <button type="button" class="btn ghost" @click="cancel">Cancelar</button>
          </div>

          <div v-if="status" :class="['status', statusType]">{{ status }}</div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useInspectionStore } from '../stores/inspectionStore'
import { useRouter, useRoute } from 'vue-router'
import { computed } from 'vue'
import { saveInspection } from '../services/db'
import { getAllInspections } from '../services/db'
import { syncInspections } from '../services/sync'
import { getToken } from '../services/api'
import { watch } from 'vue'

const router = useRouter()
const route = useRoute()
const store = useInspectionStore()

const showUserMenu = ref(false)
const status = ref('')
const statusType = ref('') // 'success' | 'error' | 'info' | 'warning'

function setStatus(msg = '', type = 'info', duration = 3000) {
  status.value = msg
  statusType.value = type
  if (duration > 0 && msg) {
    setTimeout(() => {
      status.value = ''
      statusType.value = ''
    }, duration)
  }
}

// pegar id da rota
const inspectionId = route.params.id

// estado do formulário
const form = reactive({
  id: null,
  title: '',
  location: '',
  address: '',
  notes: '',
  q1: '',
  q2: '',
  q3: '',
  q4: '',
  q5: '',
  q6: ''
})

// carregar inspeção existente
onMounted(async () => {

  const inspections = await getAllInspections()
  store.inspections = inspections

  if (inspectionId === "new") return

  const inspection = inspections.find(i => i.id === inspectionId)

  if (inspection) {
    Object.assign(form, inspection)
  }

})

// ----------------------
// Autosave
// ----------------------
let autosaveTimer = null

watch(
  form,
  () => {

    clearTimeout(autosaveTimer)

    autosaveTimer = setTimeout(async () => {

      // If this inspection is already marked as Aguardando Rede in the store,
      // do not overwrite it back to 'Não enviada' (this would block sending).
      const existing = store.inspections.find(i => i.id === form.id)
      if (existing && existing.status === 'Aguardando Rede') {
        // keep awaiting status
        return
      }

      await persistInspection("Não enviada")

      setStatus('Salvo automaticamente', 'success', 2500)

    }, 2000)

  },
  { deep: true }
)



// ----------------------
// Paginação
// ----------------------

const currentPage = ref(0)

const pages = [
  [
    { key: 'title', label: 'Título', placeholder: 'Título da inspeção', type: 'text' },
    { key: 'location', label: 'Local', placeholder: 'Local/Estação', type: 'text' }
  ],
  [
    { key: 'address', label: 'Endereço', placeholder: 'Endereço (opcional)', type: 'text' },
    { key: 'q1', label: 'Pergunta 1', placeholder: 'Resposta da pergunta 1', type: 'text' },
    { key: 'q5', label: 'Pergunta 1.1', placeholder: 'Resposta adicional 1', type: 'text' },
    { key: 'q6', label: 'Pergunta 1.2', placeholder: 'Resposta adicional 2', type: 'text' }
  ],
  [
    { key: 'q2', label: 'Pergunta 2', placeholder: 'Resposta da pergunta 2', type: 'text' },
    { key: 'q3', label: 'Pergunta 3', placeholder: 'Resposta da pergunta 3', type: 'text' }
  ],
  [
    { key: 'q4', label: 'Observações', placeholder: 'Anotações da inspeção', type: 'textarea' }
  ]
]


const totalPages = computed(() => pages.length)

function prevPage() {
  if (currentPage.value > 0) {
    currentPage.value--
  }
}

function nextPage() {
  if (currentPage.value < totalPages.value - 1) {
    currentPage.value++
  }
}

function goToPage(i) {
  if (i >= 0 && i < totalPages.value) {
    currentPage.value = i
  }
}


// ----------------------
// Salvar inspeção
// ----------------------

async function submitForm() {
  // avoid autosave racing with submit
  clearTimeout(autosaveTimer)

  if (!form.title && !form.location) {
    setStatus('Preencha ao menos Título ou Local.', 'error', 4000)
    return
  }

  setStatus('Salvando...', 'info', 0)

  if (!form.id) form.id = "i" + Date.now()

  // persist as awaiting network (blocked until sync runs)
  await persistInspection('Aguardando Rede')

  // if offline, notify user and return
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    setStatus('Sem conexão. A inspeção ficará em Aguardando Rede.', 'warning', 5000)
    setTimeout(() => router.push('/main-user'), 1000)
    return
  }

  // only attempt sync when authenticated
  const token = getToken()
  if (!token) {
    setStatus('Não autenticado. Faça login para sincronizar.', 'error', 4000)
    setTimeout(() => router.push('/login'), 1000)
    return
  }

  // attempt synchronization (this will upload 'Aguardando Rede' items and fetch server items)
  await syncInspections()

  // after sync, check whether this inspection was removed from local store (means success)
  const exists = store.inspections.find(i => i.id === form.id)
  if (!exists) {
    setStatus('Inspeção enviada com sucesso!', 'success', 2500)
  } else {
    setStatus('Inspeção permanece em Aguardando Rede.', 'warning', 5000)
  }

  setTimeout(() => router.push('/main-user'), 1200)

}

async function persistInspection(status = "Rascunho") {

  if (!form.id) {
    form.id = "i" + Date.now()
  }

  const payload = {
    ...form,
    status
  }

  await saveInspection(payload)

  const index = store.inspections.findIndex(i => i.id === payload.id)

  if (index !== -1) {
    store.inspections[index] = payload
  } else {
    store.inspections.push(payload)
  }

}


async function saveDraft() {

  await persistInspection("Não enviada")

  setStatus('Rascunho salvo', 'success', 2000)

  router.push("/main-user")

}


function cancel() {
  router.push('/main-user')
}

function logout() {
  localStorage.removeItem("auth_token")
  localStorage.removeItem("user_role")

  showUserMenu.value = false
  router.push('/login')
}
</script>

<style scoped>
/* Keep visual language consistent with admin screens */
.container {
  min-height: 100vh;
  width: 100%;
  background: linear-gradient(180deg, #f7f7f8, #ffd5d5);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 2rem 0
}

.admin-screen {
  width: 100%;
  max-width: 1100px;
  background: #fff;
  border-radius: 12px;
  padding: 1.25rem 1.5rem;
  box-shadow: 0 12px 36px rgba(0, 0, 0, 0.06);
  display: flex;
  flex-direction: column;
  gap: 1rem
}

.admin-header {
  display: flex;
  align-items: center;
  gap: 1rem
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
  padding: 0.35rem
}

.user-logout {
  background: none;
  border: none;
  padding: 0.5rem 0.75rem;
  color: #b71c1c;
  cursor: pointer
}

.table-wrap {
  background: transparent;
  padding: 0
}

.form {
  display: flex;
  flex-direction: column;
  gap: 0.75rem
}

.row {
  display: flex;
  flex-direction: column
}

.row.two {
  display: flex;
  gap: 0.75rem
}

label {
  font-weight: 600;
  margin-bottom: 0.4rem
}

input,
textarea {
  padding: 0.6rem 0.8rem;
  border-radius: 8px;
  border: 1px solid #eee;
  font-size: 0.95rem
}

.actions {
  display: flex;
  gap: 0.6rem;
  margin-top: 0.25rem
}

.btn-primary {
  background: #0b79ff;
  color: #fff;
  border: none;
  padding: 0.6rem 0.9rem;
  border-radius: 8px;
  cursor: pointer
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
  color: #f7f7f8;
  background: #b60c0c;
  border: 1px solid #8b8b8b
}

.status {
  margin-top: 0.5rem;
  color: #444;
  font-weight: 600
}

.status.success { color: #155724; background: #d4edda; padding: 0.45rem 0.6rem; border-radius: 6px }
.status.error { color: #721c24; background: #f8d7da; padding: 0.45rem 0.6rem; border-radius: 6px }
.status.info { color: #0c5460; background: #d1ecf1; padding: 0.45rem 0.6rem; border-radius: 6px }
.status.warning { color: #856404; background: #fff3cd; padding: 0.45rem 0.6rem; border-radius: 6px }

@media (max-width:720px) {
  .row.two {
    flex-direction: column
  }

  .actions {
    flex-direction: column
  }
}

/* Pagination styles */
.pagination {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.6rem;
  margin: 0.5rem 0
}

.page-buttons {
  display: flex;
  gap: 0.4rem;
  justify-content: center;
  flex: 1
}

.page-btn {
  padding: 0.35rem 0.6rem;
  border-radius: 6px;
  border: 1px solid #eee;
  background: #fff;
  cursor: pointer
}

.page-btn.active {
  background: #b71c1c;
  color: #fff;
  border-color: transparent
}

@media (max-width:480px) {
  .pagination {
    flex-direction: column;
    gap: 0.5rem
  }

  .page-buttons {
    width: 100%;
    justify-content: flex-start;
    overflow-x: auto
  }

  .page-btn {
    flex: 0 0 auto
  }

  .actions {
    flex-direction: column
  }
}
</style>