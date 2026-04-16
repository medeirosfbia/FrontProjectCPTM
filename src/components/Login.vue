<template>
    <div class="container">
        <div class="login-screen">
            <div class="card">
                <img src="../assets/cptm_logo_simples.png" alt="CPTM" class="logo" />
                <h2>Boas-vindas!</h2>
                <form @submit.prevent="submit">
                    <label class="field">
                        <span>Email</span>
                        <input v-model="email" type="email" required placeholder="user@cptm.team" />
                    </label>
                    <label class="field">
                        <span>Senha</span>
                        <input v-model="password" type="password" required placeholder="••••••••" />
                    </label>
                    <button class="btn-primary" type="submit">Entrar</button>
                </form>
                <div v-if="error" class="form-error">{{ error }}</div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { login } from '../services/api'

const router = useRouter()
const email = ref('')
const password = ref('')
const error = ref('')

async function submit() {
    error.value = ''
    try {
        const res = await login(email.value, password.value)
        const role = res?.role || res?.data?.role || localStorage.getItem('user_role') || 'user'
        if (role === 'admin') router.push('/main-admin')
        else router.push('/main-user')
    } catch (err) {
        console.error(err)
        error.value = err.message || 'Falha no login'
        // auto-clear after a short delay
        setTimeout(() => { error.value = '' }, 5000)
    }
}
</script>

<style scoped>
.login-screen {
    position: fixed;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #ffff;
    z-index: 9999;
}

.card {
    width: 100%;
    max-width: 420px;
    background: #fff;
    border-radius: 12px;
    padding: 2rem;
    text-align: center;
}

.logo {
    width: 100px;
    height: auto;
    margin: 0 auto 0.75rem;
    filter: drop-shadow(0 8px 20px rgba(0, 0, 0, 0.06));
}

h2 {
    margin: 0 0 1rem;
    color: #606060;
}

.field {
    display: block;
    text-align: left;
    margin-bottom: 0.75rem;
}

.field span {
    display: block;
    font-size: 0.85rem;
    color: #555;
    margin-bottom: 0.25rem;
}

input {
    width: 100%;
    background-color: #e6e6e9;
    font-weight: bolder;
    padding: 0.65rem 0.75rem;
    color: #606060;
    border-radius: 8px;
    border: 1px solid #e6e6e9;
    font-size: 1rem;
}

input:focus {
  outline: none;
  border: 1px solid #ccc; 
}

.btn-primary {
    width: 100%;
    margin-top: 0.75rem;
    padding: 0.75rem;
    border-radius: 10px;
    border: none;
    background: #ee3338;
    color: #fff;
    font-weight: 600;
    cursor: pointer;
    box-shadow: 0 6px 18px rgba(183, 28, 28, 0.18);
}

.btn-primary:active {
    transform: translateY(1px);
}

.muted {
    margin-top: 1rem;
    font-size: 0.85rem;
    color: #777;
}

@media (max-width:480px) {
    .card {
        padding: 1.25rem;
        border-radius: 10px;
    }
}

.form-error {
    margin-top: 0.75rem;
    color: #b71c1c;
    font-weight: 600;
}

</style>