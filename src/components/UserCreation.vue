<template>
  <AppLayout>
    <PageContainer>
      <Header :logo="logo" title="Cadastrar Usuario" subtitle="Crie operadores e administradores do sistema">
        <template #actions>
          <button class="btn ghost" type="button" @click="cancel">Voltar</button>
        </template>
      </Header>

      <section class="creation-card">
        <PageTitle title="Dados do usuario" subtitle="Informe os dados de acesso e perfil" />
        <form @submit.prevent="submit" class="creation-form">
          <label class="field">
            <span>Nome</span>
            <input v-model="name" type="text" required placeholder="Nome completo" />
          </label>
          <label class="field">
            <span>Email</span>
            <input v-model="email" type="email" required placeholder="email@exemplo.com" />
          </label>
          <label class="field">
            <span>Data de Nascimento</span>
            <input v-model="birthDate" type="date" required />
          </label>
          <label class="field">
            <span>Senha</span>
            <input v-model="password" type="password" required placeholder="********" />
          </label>
          <label class="checkbox-row">
            <input v-model="isAdmin" type="checkbox" />
            <span>Criar como administrador</span>
          </label>

          <ToastAlert :message="error" type="error" />

          <div class="actions">
            <button class="btn ghost" type="button" @click="cancel">Cancelar</button>
            <button class="btn-primary" type="submit">Cadastrar</button>
          </div>
        </form>
      </section>
    </PageContainer>
  </AppLayout>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import logo from '../assets/cptm_logo_simples.png'
import AppLayout from './ui/AppLayout.vue'
import Header from './ui/Header.vue'
import PageContainer from './ui/PageContainer.vue'
import PageTitle from './ui/PageTitle.vue'
import ToastAlert from './ui/ToastAlert.vue'
import { apiFetch } from '../services/api'

const router = useRouter()
const name = ref('')
const email = ref('')
const password = ref('')
const birthDate = ref('')
const isAdmin = ref(false)
const error = ref('')

async function submit() {
  error.value = ''
  try {
    await apiFetch('/Usuarios/register', {
      method: 'POST',
      body: {
        nomeCompleto: name.value,
        email: email.value,
        dataNascimento: birthDate.value,
        senha: password.value,
        isAdmin: isAdmin.value
      }
    })
    router.push('/main-admin')
  } catch (err) {
    console.error(err)
    error.value = err.message || 'Falha ao cadastrar usuario'
  }
}

function cancel() {
  router.push('/main-admin')
}
</script>

<style scoped>
.creation-card {
  width: min(760px, 100%);
  margin-top: 18px;
  background: var(--white);
  border: 1px solid var(--gray-200);
  border-radius: var(--radius);
  box-shadow: var(--shadow-sm);
  padding: 22px;
}

.creation-form {
  margin-top: 18px;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.checkbox-row {
  grid-column: 1 / -1;
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--gray-700);
  font-weight: 800;
}

.checkbox-row input {
  width: 18px;
  min-height: 18px;
}

.actions {
  grid-column: 1 / -1;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

@media (max-width: 720px) {
  .creation-form {
    grid-template-columns: 1fr;
  }

  .actions {
    flex-direction: column-reverse;
  }
}
</style>
