<template>
    <div class="container">
        <div class="creation-screen">
            <div class="card">
                <img src="../assets/cptm_logo.png" alt="CPTM" class="logo" />
                <h2>Cadastrar</h2>
                <form @submit.prevent="submit">
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
                    <label class="field checkbox-group">
                        <span class="checkbox-title">Tipo de Usuário</span>
                        <span class="checkbox-label">Administrador</span>
                        <input v-model="isAdmin" type="checkbox" class="checkbox-input" />
                    </label>
                    <label class="field">
                        <span>Senha</span>
                        <input v-model="password" type="password" required placeholder="••••••••" />
                    </label>
                    <button class="btn-primary" type="submit">Cadastrar</button>
                    <button class="btn ghost" type="button" @click="cancel">Cancelar</button>
                </form>
                <div v-if="error" class="form-error">{{ error }}</div>
                <p class="muted">CPTM + FATEC - Projeto de demonstração</p>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
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
        error.value = err.message || 'Falha ao cadastrar usuário'
    }
}

function cancel() {
    router.push('/main-admin')
}

</script>

<style scoped>
.container {
    min-height: 100vh;
    width: 100%;
    border-radius: 8px;
    background: linear-gradient(180deg, #f7f7f8, #ffd5d5);
    align-items: center;
}

.creation-screen {
    max-width: 1200px;
    margin: 0 auto;
    padding: 1rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    color: #111;
    font-family: system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial;
}

.card {
    width: 100%;
    max-width: 420px;
    align-self: center;
    background: #fff;
    border-radius: 12px;
    padding: 1rem;
    box-shadow: 0 12px 30px rgba(0, 0, 0, 0.06);
    text-align: center;
}

.logo {
    width: 140px;
    height: auto;
    margin: 0 auto 0.75rem;
    filter: drop-shadow(0 8px 20px rgba(0, 0, 0, 0.06));
}

h2 {
    margin: 0 0 1rem;
    color: #222;
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
    padding: 0.65rem 0.75rem;
    border-radius: 8px;
    border: 1px solid #e6e6e9;
    font-size: 1rem;
}

.checkbox-group {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.checkbox-title {
    font-size: 0.85rem;
    color: #555;
    margin-right: 1rem;
}

.checkbox-label {
    font-size: 0.9rem;
    color: #555;
}

.checkbox-input {
    width: 16px;
    height: 16px;
    cursor: pointer;
}

.form-error {
    margin-top: 0.75rem;
    color: #b71c1c;
    font-weight: 600;
}

.btn-primary {
    width: 100%;
    margin-top: 0.75rem;
    padding: 0.75rem;
    border-radius: 10px;
    border: none;
    background: #b71c1c;
    color: #fff;
    font-weight: 600;
    cursor: pointer;
    box-shadow: 0 6px 18px rgba(183, 28, 28, 0.18);
}

.btn-primary:active {
    transform: translateY(1px);
}

.btn-primary:hover {
    background: #a31818;
}

.btn {
    width: 100%;
    margin-top: 0.5rem;
    padding: 0.75rem;
    border-radius: 10px;
    border: 1px solid #ccc;
    background: #eee;
    color: #333;
    font-weight: 600;
    cursor: pointer;
    box-shadow: 0 6px 18px rgba(183, 28, 28, 0.18);
}

.btn:hover {
    background: #ddd;
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
</style>
