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
          <div v-for="(page, idx) in pages" :key="idx" v-show="currentPage === idx" class="page">
            <div v-for="field in page" :key="field.key" class="row">
              <label>{{ field.label }}</label>
              <template v-if="field.type === 'textarea'">
                <textarea v-model="form[field.key]" rows="4" :placeholder="field.placeholder"></textarea>
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
                :class="{ active: currentPage === (n - 1) }" @click="goToPage(n - 1)">{{ n }}</button>
            </div>
          </div>
          <div class="pagination arrows">
            <button type="button" class="btn" @click="prevPage" :disabled="currentPage === 0">Anterior</button>
            <button v-if="currentPage === totalPages - 1" type="button" class="btn-primary"
              @click="submitForm">Enviar</button>
            <button v-else type="button" class="btn" @click="nextPage"
              :disabled="currentPage >= totalPages - 1">Próxima</button>
          </div>

          <!-- Actions: submit on last page, otherwise Next also available -->
          <div class="actions">
            <button type="button" class="btn" @click="saveDraft">Salvar rascunho</button>
            <button type="button" class="btn ghost" @click="cancel">Cancelar</button>
          </div>

          <div class="status" v-if="status">{{ status }}</div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useInspectionStore } from '../stores/inspectionStore'

const props = defineProps({ initialInspection: { type: Object, default: null } })
const store = useInspectionStore()
const form = reactive({ title: '', location: '', address: '', notes: '', q1: '', q2: '', q3: '', q4: '', q5: '', q6: '' })
const status = ref('')
const showUserMenu = ref(false)
const emit = defineEmits(['submit', 'cancel', 'logout'])

// Pagination state
const currentPage = ref(0)
const pages = [
  [{ key: 'title', label: 'Título', placeholder: 'Título da inspeção', type: 'text' }, { key: 'location', label: 'Local', placeholder: 'Local/Estação', type: 'text' }],
  [{ key: 'address', label: 'Endereço', placeholder: 'Endereço (opcional)', type: 'text' }, { key: 'q1', label: 'Pergunta 1', placeholder: 'Resposta da pergunta 1', type: 'text' }, { key: 'q5', label: 'Pergunta 1.1', placeholder: 'Resposta adicional 1', type: 'text' }, { key: 'q6', label: 'Pergunta 1.2', placeholder: 'Resposta adicional 2', type: 'text' }],
  [{ key: 'q2', label: 'Pergunta 2', placeholder: 'Resposta da pergunta 2', type: 'text' }, { key: 'q3', label: 'Pergunta 3', placeholder: 'Resposta da pergunta 3', type: 'text' }],
  [{ key: 'q4', label: 'Observações', placeholder: 'Anotações da inspeção', type: 'textarea' }]
]

const totalPages = pages.length

// Initialize with incoming inspection if provided
if (props.initialInspection) {
  form.title = props.initialInspection.title || ''
  if (props.initialInspection.id) form.id = props.initialInspection.id
}

function submitForm() {
  if (!form.title && !form.location) {
    status.value = 'Preencha ao menos Título ou Local.'
    return
  }
  status.value = 'Enviando...'
  // Simula envio
  setTimeout(() => {
    const payload = { ...form, id: form.id || ('i' + Date.now()), status: 'Enviado' }
    status.value = 'Enviado com sucesso'
    store.addInspection(payload)
    emit('submit', payload)
  }, 900)
}

function saveDraft() {
  const payload = { ...form, id: 'i' + Date.now(), draft: true }
  status.value = 'Rascunho salvo'
  emit('submit', payload)
}

function cancel() {
  emit('cancel')
}

function prevPage() {
  if (currentPage.value > 0) currentPage.value--
}

function nextPage() {
  if (currentPage.value < totalPages - 1) currentPage.value++
}

function goToPage(i) {
  if (i >= 0 && i < totalPages) currentPage.value = i
}

function logout() {
  localStorage.removeItem("auth_token")
  localStorage.removeItem("user_role")

  showUserMenu.value = false
  emit('logout')
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