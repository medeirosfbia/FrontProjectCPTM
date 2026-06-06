<template>
  <div class="container">
    <div class="user-screen">
      <div class="user-header">
        <div class="header-left">
          <button class="back-btn" @click="goBack" aria-label="Voltar">Voltar</button>
          <h1>Registros Enviados</h1>
        </div>
      </div>

      <div class="filters">
        <input v-model="filters.municipio" placeholder="Municipio" />
        <input v-model="filters.linha" placeholder="Linha" />
        <input v-model="filters.status" placeholder="Status" />
        <input v-model="filters.data" type="date" />
        <button class="btn" @click="loadEfluentes(1)">Filtrar</button>
      </div>

      <div v-if="loading" class="sync-message">Carregando registros enviados...</div>
      <div v-if="error" class="sync-message error">{{ error }}</div>

      <div class="table-wrap app-table">
        <div v-if="!loading && !items.length && !error" class="notice">Nenhum registro enviado encontrado.</div>

        <InspectionList
          v-if="items.length"
          :items="items"
          title="Efluentes"
          id-prefix="sent-efl-"
          :show-continue="true"
          :show-details="true"
          :show-delete="false"
          :on-continue="editEfluente"
          :on-details="openDetails"
        />
      </div>

      <div class="pagination">
        <button class="btn" :disabled="page <= 1 || loading" @click="loadEfluentes(page - 1)">Anterior</button>
        <span>Pagina {{ page }}</span>
        <button class="btn" :disabled="items.length < pageSize || loading" @click="loadEfluentes(page + 1)">Proxima</button>
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
import { onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { extractEfluenteItems, getAdminEfluentesAPI, getIsAdmin, getMeusEfluentesAPI } from '../services/api'
import InspectionDetailsModal from './InspectionDetailsModal.vue'
import InspectionList from './InspectionList.vue'

const router = useRouter()
const items = ref([])
const page = ref(1)
const pageSize = ref(10)
const loading = ref(false)
const error = ref('')
const detailModalVisible = ref(false)
const detailTarget = ref(null)
const filters = reactive({
  municipio: '',
  linha: '',
  status: '',
  data: ''
})

onMounted(() => loadEfluentes(1))

async function loadEfluentes(nextPage = page.value) {
  loading.value = true
  error.value = ''

  try {
    const listFn = getIsAdmin() ? getAdminEfluentesAPI : getMeusEfluentesAPI
    const res = await listFn({
      page: nextPage,
      pageSize: pageSize.value,
      municipio: filters.municipio,
      linha: filters.linha,
      status: filters.status,
      data: filters.data
    })

    const visibleItems = extractEfluenteItems(res)

    console.log('dados api', res)
    page.value = Number(res?.page || nextPage)
    pageSize.value = Number(res?.pageSize || pageSize.value)
    items.value = visibleItems
    console.log('dados exibidos', items.value)
  } catch (err) {
    console.error('Erro ao carregar efluentes', err)
    error.value = 'Nao foi possivel carregar os registros enviados.'
  } finally {
    loading.value = false
  }
}

function openDetails(item) {
  detailTarget.value = item
  detailModalVisible.value = true
}

function closeDetails() {
  detailModalVisible.value = false
  detailTarget.value = null
}

function editEfluente(item) {
  const pk = item.pkCdMeioAmbienteCptm || item.id || item.serverId
  if (pk) router.push(`/form/${encodeURIComponent(pk)}`)
}

function goBack() {
  router.push(getIsAdmin() ? '/main-admin' : '/main-user')
}
</script>

<style scoped>
.container {
  min-height: 100vh;
  background: #fff;
  padding: 24px 12px;
}

.user-screen {
  width: min(1100px, 100%);
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.user-header,
.header-left,
.filters,
.pagination {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.back-btn,
.btn {
  border: 1px solid #d0d5dd;
  border-radius: 8px;
  padding: 9px 12px;
  background: #fff;
  color: #344054;
  font-weight: 700;
  cursor: pointer;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.filters {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
}

input {
  width: 100%;
  border: 1px solid #d0d5dd;
  border-radius: 8px;
  padding: 10px 12px;
}

.sync-message {
  color: #175cd3;
  font-weight: 700;
}

.sync-message.error {
  color: #b42318;
}

.notice {
  color: #667085;
  padding: 16px;
  text-align: center;
}

.pagination {
  justify-content: center;
}

@media (max-width: 760px) {
  .filters {
    grid-template-columns: 1fr;
  }
}
</style>
