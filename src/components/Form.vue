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
          <div class="row">
            <label>Título</label>
            <input v-model="form.title" placeholder="Título da inspeção" />
          </div>

          <div class="row two">
            <div>
              <label>Local</label>
              <input v-model="form.location" placeholder="Local/Estação" />
            </div>
            <div>
              <label>Endereço</label>
              <input v-model="form.address" placeholder="Endereço (opcional)" />
            </div>
          </div>

          <div class="row">
            <label>Observações</label>
            <textarea v-model="form.notes" rows="4" placeholder="Anotações da inspeção"></textarea>
          </div>

          <div class="actions">
            <button class="btn-primary" type="submit">Enviar</button>
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
import { ref } from 'vue'

const form = ref({ title: '', location: '', address: '', notes: '' })
const status = ref('')
const showUserMenu = ref(false)
const emit = defineEmits(['submit', 'cancel', 'logout'])

function submitForm() {
  if (!form.value.title && !form.value.location) {
    status.value = 'Preencha ao menos Título ou Local.'
    return
  }
  status.value = 'Enviando...'
  // Simula envio
  setTimeout(() => {
    const payload = { ...form.value, id: 'i' + Date.now(), status: 'Enviado' }
    status.value = 'Enviado com sucesso'
    emit('submit', payload)
  }, 900)
}

function saveDraft() {
  const payload = { ...form.value, id: 'i' + Date.now(), draft: true }
  status.value = 'Rascunho salvo'
  emit('submit', payload)
}

function cancel() {
  emit('cancel')
}

function logout() {
  showUserMenu.value = false
  emit('logout')
}
</script>

<style scoped>
/* Keep visual language consistent with admin screens */
.container { min-height:100vh; width:100%; background:linear-gradient(180deg,#f7f7f8,#ffd5d5); display:flex; align-items:flex-start; justify-content:center; padding:2rem 0 }
.admin-screen { width:100%; max-width:1100px; background:#fff; border-radius:12px; padding:1.25rem 1.5rem; box-shadow:0 12px 36px rgba(0,0,0,0.06); display:flex; flex-direction:column; gap:1rem }
.admin-header { display:flex; align-items:center; gap:1rem }
.header-left { display:flex; align-items:center; gap:0.75rem }
.logo { width:56px }
.header-info h1 { margin:0; font-size:1.4rem }
.subtitle { margin:0; color:#666 }
.user-area { margin-left:auto; position:relative }
.avatar { background:#fff; border:1px solid #eee; border-radius:50%; width:40px; height:40px; display:inline-flex; align-items:center; justify-content:center; cursor:pointer }
.user-menu { position:absolute; right:0; top:48px; background:#fff; border-radius:8px; box-shadow:0 8px 24px rgba(0,0,0,0.12); padding:0.35rem }
.user-logout { background:none; border:none; padding:0.5rem 0.75rem; color:#b71c1c; cursor:pointer }
.table-wrap { background:transparent; padding:0 }
.form { display:flex; flex-direction:column; gap:0.75rem }
.row { display:flex; flex-direction:column }
.row.two { display:flex; gap:0.75rem }
label { font-weight:600; margin-bottom:0.4rem }
input, textarea { padding:0.6rem 0.8rem; border-radius:8px; border:1px solid #eee; font-size:0.95rem }
.actions { display:flex; gap:0.6rem; margin-top:0.25rem }
.btn-primary { background:#0b79ff; color:#fff; border:none; padding:0.6rem 0.9rem; border-radius:8px; cursor:pointer }
.btn { padding:0.45rem 0.7rem; border-radius:8px; border:1px solid #eee; background:#fff; cursor:pointer }
.btn.ghost { background:transparent }
.status { margin-top:0.5rem; color:#444; font-weight:600 }

@media (max-width:720px) {
  .row.two { flex-direction:column }
  .actions { flex-direction:column }
}
</style>