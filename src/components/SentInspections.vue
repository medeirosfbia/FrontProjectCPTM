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
                <input class="search-input" v-model="searchQuery" style="background:#fff; color:#333;" placeholder="Buscar por título..." />
                <div v-if="loading" class="sync-message">Carregando inspeções do banco de dados...</div>
                <div v-if="error" class="sync-message" style="color: red;">{{ error }}</div>
            </div>

            <div class="table-wrap app-table">
                <div v-if="!loading && !filteredInspections.length && !error" class="notice">
                    Nenhuma inspeção encontrada.
                </div>

                <section v-if="filteredInspections.length" class="list">
                    <h2>Inspeções Sincronizadas ({{ filteredInspections.length }})</h2>
                    <div v-for="ins in filteredInspections" :key="ins.id" class="inspection">
                        <div class="left">
                            <strong class="inspection-title">{{ ins.title || ins.titulo || 'Sem Título' }}</strong>
                            <div class="mono">ID: {{ ins.id }}</div>
                        </div>
                        <div class="right" style="display: flex; gap: 8px; align-items: center;">
                            <div class="status">{{ ins.status || 'Enviado' }}</div>
                            <button class="btn ghost btn-small" @click="openDetails(ins)">Ver mais</button>
                        </div>
                    </div>
                </section>
            </div>
        </div>
        <InspectionDetailsModal 
            :visible="detailModalVisible" 
            :inspection="detailTarget" 
            @close="closeDetails" 
        />
    </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { getInspectionsAPI } from '../services/api'
import InspectionDetailsModal from './InspectionDetailsModal.vue'

const router = useRouter()
const inspections = ref([])
const loading = ref(true)
const error = ref('')
const searchQuery = ref('')
const detailModalVisible = ref(false)
const detailTarget = ref(null)

const filteredInspections = computed(() => {
    let q = searchQuery.value.trim().toLowerCase()
    if (!q) return inspections.value
    
    return inspections.value.filter(i => {
        const title = String(i.title || i.titulo || '').toLowerCase()
        return title.includes(q)
    })
})

function openDetails(ins) {
    detailTarget.value = ins
    detailModalVisible.value = true
}

function closeDetails() {
    detailModalVisible.value = false
    detailTarget.value = null
}

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
.search-input {
    width: 100%;
    padding: 12px;
    border: 1px solid #ccc;
    border-radius: 8px;
    font-size: 1rem;
    margin-bottom: 15px;
    box-sizing: border-box;
}
</style>