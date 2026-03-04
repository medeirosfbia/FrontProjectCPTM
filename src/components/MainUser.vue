<template>
    <div class="container">
        <div class="admin-screen">
            <div class="admin-header">
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

            <div class="controls">
                <!-- espaço reservado para filtros/estatísticas no layout admin -->
            </div>

            <div class="table-wrap">
                <div class="notice">Não existem inspeções agendadas.</div>

                <div class="create-row">
                    <input v-model="newTitle" placeholder="Título da inspeção (opcional)" />
                    <button class="btn-primary" @click="createInspection">Criar inspeção</button>
                </div>

                <section v-if="inspections.length" class="list">
                    <h2>Minhas inspeções</h2>
                    <div v-for="ins in inspections" :key="ins.id" class="inspection">
                        <div class="left">
                            <strong class="inspection-title">{{ ins.title }}</strong>
                            <div class="mono">ID: {{ ins.id }}</div>
                        </div>
                        <div class="right">
                            <div class="status">{{ ins.status }}</div>
                            <button class="btn" @click="goToForm(ins)">Preencher Formulário</button>
                            <button class="btn" @click="sendInspection(ins)"
                                :disabled="ins.status === 'Enviado' || ins.status === 'Enviando...'">Enviar</button>
                            <button class="btn ghost" @click="deleteInspection(ins)">Apagar</button>
                        </div>
                    </div>
                </section>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref } from 'vue'

const inspections = ref([])
const newTitle = ref('')
const showUserMenu = ref(false)
const emit = defineEmits(['logout', 'goToForm'])

function createInspection() {
    const title = newTitle.value.trim() || `Inspeção ${inspections.value.length + 1}`
    inspections.value.push({ id: 'i' + Date.now(), title, status: 'Não enviada' })
    newTitle.value = ''
}

function sendInspection(ins) {
    if (ins.status === 'Enviado' || ins.status === 'Enviando...') return
    ins.status = 'Enviando...'
    setTimeout(() => { ins.status = 'Enviado' }, 900)
}

function deleteInspection(ins) {
    inspections.value = inspections.value.filter(i => i.id !== ins.id)
}

function goToForm(ins) {
    emit('goToForm', ins)
}

function logout() {
    showUserMenu.value = false
    emit('logout')
}
</script>

<style scoped>
/* Use admin panel visual language */
.container {
    min-height: 100vh;
    width: 100%;
    background: linear-gradient(180deg, #f7f7f8, #ffd5d5);
    display: flex;
    align-items: flex-start;
    justify-content: center;
    padding: 2rem 0;
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
    gap: 1rem;
    font-family: system-ui, -apple-system, 'Segoe UI', Roboto, Arial;
}

.admin-header {
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
    background: #0b79ff;
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

h2, h1 {
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
    .admin-screen {
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
</style>
