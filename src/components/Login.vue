<template>
  <AppLayout>
    <div class="login-page">
      <section class="login-hero">
        <img src="../assets/cptm_logo_simples.png" alt="CPTM" class="logo" />
        <div>
          <p class="eyebrow">CPTM Meio Ambiente</p>
          <h1>Sistema de Efluentes</h1>
          <p>Entre para registrar, acompanhar e revisar cadastros ambientais com anexos e geolocalizacao.</p>
        </div>
      </section>

      <section class="login-card">
        <PageTitle title="Entrar" subtitle="Use suas credenciais para continuar" />
        <form @submit.prevent="submit">
          <label class="field">
            <span>Email</span>
            <input v-model="email" type="email" required placeholder="usuario@cptm.sp.gov.br" />
          </label>
          <label class="field">
            <span>Senha</span>
            <input v-model="password" type="password" required placeholder="********" />
          </label>
          <button class="btn-primary" type="submit">Entrar</button>
        </form>
        <ToastAlert :message="error" type="error" />
      </section>
    </div>
  </AppLayout>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import AppLayout from './ui/AppLayout.vue'
import PageTitle from './ui/PageTitle.vue'
import ToastAlert from './ui/ToastAlert.vue'
import { getIsAdmin, login } from '../services/api'

const router = useRouter()
const email = ref('')
const password = ref('')
const error = ref('')

async function submit() {
  error.value = ''
  try {
    await login(email.value, password.value)
    router.push(getIsAdmin() ? '/main-admin' : '/main-user')
  } catch (err) {
    console.error(err)
    error.value = err.message || 'Falha no login'
    setTimeout(() => { error.value = '' }, 5000)
  }
}
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  width: min(1180px, calc(100vw - 32px));
  margin: 0 auto;
  display: grid;
  grid-template-columns: minmax(0, 1.15fr) 420px;
  gap: 22px;
  align-items: center;
  padding: 24px 0;
}

.login-hero,
.login-card {
  background: var(--white);
  border: 1px solid var(--gray-200);
  border-radius: var(--radius);
  box-shadow: var(--shadow-sm);
}

.login-hero {
  min-height: 520px;
  padding: 36px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  background:
    linear-gradient(135deg, rgba(215, 25, 32, 0.12), rgba(43, 92, 158, 0.08)),
    var(--white);
}

.login-hero .logo {
  width: 76px;
}

.login-hero h1 {
  max-width: 640px;
  color: var(--gray-900);
  font-size: clamp(2.3rem, 5vw, 4.7rem);
  line-height: 1;
}

.login-hero p {
  max-width: 560px;
  margin-top: 12px;
  color: var(--gray-500);
  font-size: 1.08rem;
}

.eyebrow {
  color: var(--cptm-red) !important;
  font-size: 0.82rem !important;
  font-weight: 900;
  text-transform: uppercase;
}

.login-card {
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 18px;
}

form {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.btn-primary {
  width: 100%;
}

@media (max-width: 900px) {
  .login-page {
    grid-template-columns: 1fr;
  }

  .login-hero {
    min-height: 320px;
  }
}
</style>
