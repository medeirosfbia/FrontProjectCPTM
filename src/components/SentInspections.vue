<template>
    <div class="container">
        <div class="user-screen">
            <div class="user-header" style="flex-wrap: wrap;">
                <div class="header-left">
                    <button class="back-btn" @click="goBack" aria-label="Voltar">⬅</button>
                    <h1>Inspeções Enviadas (Banco de Dados)</h1>
                </div>
            </div>

            <div class="controls">
                <div v-if="loading" class="sync-message">Carregando inspeções do banco de dados...</div>
                <div v-if="error" class="sync-message" style="color: red;">{{ error }}</div>
            </div>

            <div class="table-wrap app-table">
                <div v-if="!loading && !inspections.length && !error" class="notice">
                    Nenhuma inspeção enviada encontrada no banco de dados para o seu usuário.
                </div>

                <section v-if="inspections.length" class="list">
                    <h2>Inspeções Sincronizadas ({{ inspections.length }})</h2>
                    <div v-for="ins in inspections" :key="ins.id" class="inspection">
                        <div class="left">
                            <strong class="inspection-title">{{ ins.title || ins.titulo || 'Sem Título' }}</strong>
                            <div class="mono">ID: {{ ins.id }}</div>
                        </div>
                        <div class="right">
                            <div class="status">{{ ins.status || 'Enviado' }}</div>
                        </div>
                    </div>
                </section>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { getInspectionsAPI } from '../services/api'

const router = useRouter()
const inspections = ref([])
const loading = ref(true)
const error = ref('')

onMounted(async () => {
    try {
        const currentUser = localStorage.getItem('user_email')
        
        let data = await getInspectionsAPI()
        
        // Assegurar que os dados são um array (às vezes a API retorna dentro de "data")
        if (data && data.data && Array.isArray(data.data)) {
            data = data.data
        }

        if (!Array.isArray(data)) {
            data = []
        }

        // Filtra para exibir APENAS as inspeções que o usuário atual criou.
        if (currentUser) {
            data = data.filter(i => {
                const author = i.userEmail || i.user_email || i.usuario || i.email;
                return author === currentUser;
            })
        }

        inspections.value = data
    } catch (err) {
        console.error("Erro ao puxar inspeções:", err)
        error.value = "Não foi possível carregar as inspeções enviadas. Verifique a conexão com o banco ou API."
    } finally {
        loading.value = false
    }
})

function goBack() {
    router.back()
}
</script>

<style scoped>
.back-btn {
    background: none;
    border: none;
    font-size: 1.5rem;
    cursor: pointer;
    margin-right: 15px;
}
</style>