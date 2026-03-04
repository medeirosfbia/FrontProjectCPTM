<template>
    <div class="login-screen">
        <div class="card">
            <img src="../assets/cptm_logo.png" alt="CPTM" class="logo" />
            <h2>Entrar</h2>
            <form @submit.prevent="submit">
                <label class="field">
                    <span>Email</span>
                    <input v-model="email" type="email" required placeholder="seu@exemplo.com" />
                </label>
                <label class="field">
                    <span>Senha</span>
                    <input v-model="password" type="password" required placeholder="••••••••" />
                </label>
                <button class="btn-primary" type="submit">Entrar</button>
            </form>
            <p class="muted">CPTM + FATEC - Projeto de demonstração</p>
        </div>
    </div>
</template>

<script setup>
import { ref } from 'vue'

const emit = defineEmits(['login-adm-success', 'login-user-success'])
const email = ref('')
const password = ref('')

function submit() {
    // placeholder: aqui você chamaria API de autenticação
    console.log('Login', email.value, password.value)
    if (email.value === 'admin@cptm.com' && password.value === 'admin123456') {
        // emitir evento para o pai para navegar ao Main
        emit('login-adm-success')
    } else if (email.value === 'user@cptm.com' && password.value === 'user123456') {
        // emitir evento para o pai para navegar ao Main
        emit('login-user-success')

    } else {
        alert('Credenciais inválidas ou ausentes.')
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
    background: linear-gradient(180deg, #f7f7f8, #ffd5d5);
    z-index: 9999;
}

.card {
    width: 100%;
    max-width: 420px;
    background: #fff;
    border-radius: 12px;
    padding: 2rem;
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
