<template>
  <AppLayout>
    <PageContainer>
      <Header :logo="logo" title="Mapa de Efluentes" subtitle="Registros PT_EFLUENTE com coordenadas">
        <template #actions>
          <button class="btn" type="button" @click="goBack">Voltar</button>
          <button class="btn info" type="button" :disabled="loading" @click="loadRecords">
            {{ loading ? 'Carregando...' : 'Atualizar' }}
          </button>
        </template>
      </Header>

      <section class="map-filters">
        <label class="field">
          <span>Município</span>
          <select v-model="filters.municipio">
            <option value="">Todos</option>
            <option v-for="opt in municipioOptions" :key="opt.id" :value="opt.id">{{ opt.label }}</option>
          </select>
        </label>

        <label class="field">
          <span>Linha CPTM</span>
          <select v-model="filters.linha">
            <option value="">Todas</option>
            <option v-for="opt in linhaOptions" :key="opt.id" :value="opt.id">{{ opt.label }}</option>
          </select>
        </label>

        <label class="field">
          <span>Status</span>
          <select v-model="filters.status">
            <option value="">Todos</option>
            <option v-for="opt in statusOptions" :key="opt.id" :value="opt.id">{{ opt.label }}</option>
          </select>
        </label>

        <label class="field">
          <span>Data inicial</span>
          <input v-model="filters.dataInicio" type="date" />
        </label>

        <label class="field">
          <span>Data final</span>
          <input v-model="filters.dataFim" type="date" />
        </label>

        <button class="btn ghost" type="button" @click="clearFilters">Limpar filtros</button>
      </section>

      <section class="map-shell">
        <div class="map-toolbar">
          <strong>{{ filteredRecords.length }} registro(s) no mapa</strong>
          <span>{{ recordsWithCoordinates.length }} com coordenadas válidas</span>
        </div>
        <LoadingTrain v-if="loading" message="Carregando registros..." compact />
        <div id="records-map"></div>
        <ToastAlert :message="status" :type="statusType" />
      </section>

      <div v-if="selectedRecord" class="modal-overlay" role="dialog" aria-modal="true">
        <div class="record-modal">
          <div class="modal-header">
            <h3>Inspeção {{ selectedRecord.numeroInspecao }}</h3>
            <button class="btn ghost" type="button" @click="selectedRecord = null">Fechar</button>
          </div>

          <dl>
            <dt>Número da inspeção</dt>
            <dd>{{ selectedRecord.numeroInspecao }}</dd>

            <dt>Município</dt>
            <dd>{{ selectedRecord.municipio || 'Não informado' }}</dd>

            <dt>Data</dt>
            <dd>{{ formatDisplayDate(selectedRecord.data) }}</dd>

            <dt>Status</dt>
            <dd>{{ selectedRecord.statusLabel || 'Não informado' }}</dd>

            <dt>Usuário que criou</dt>
            <dd>{{ selectedRecord.usuarioCriador || 'Não informado' }}</dd>
          </dl>

          <div class="modal-actions">
            <button class="btn-primary" type="button" :disabled="!selectedRecord.id" @click="openInspection(selectedRecord)">
              Abrir Inspeção
            </button>
          </div>
        </div>
      </div>
    </PageContainer>
  </AppLayout>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'
import logo from '../assets/cptm_logo_simples.png'
import AppLayout from './ui/AppLayout.vue'
import Header from './ui/Header.vue'
import LoadingTrain from './ui/LoadingTrain.vue'
import PageContainer from './ui/PageContainer.vue'
import ToastAlert from './ui/ToastAlert.vue'
import { extractEfluenteItems, getAdminEfluentesAPI, getEfluentesMapaAPI } from '../services/api'
import { queueDetailsRecord } from '../services/detailsCache'
import { getDomainDescription } from '../services/efluenteModel'

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({ iconRetinaUrl: markerIcon2x, iconUrl: markerIcon, shadowUrl: markerShadow })

const router = useRouter()
const records = ref([])
const loading = ref(false)
const status = ref('')
const statusType = ref('info')
const selectedRecord = ref(null)
const filters = reactive({
  municipio: '',
  linha: '',
  status: '',
  dataInicio: '',
  dataFim: ''
})

let map = null
let markerLayer = null

const recordsWithCoordinates = computed(() => records.value.filter(item => isValidCoordinate(item.latitude, item.longitude)))
const filteredRecords = computed(() => recordsWithCoordinates.value.filter(matchesFilters))
const municipioOptions = computed(() => uniqueDomainOptions(recordsWithCoordinates.value, 'municipioId', 'municipio'))
const linhaOptions = computed(() => uniqueDomainOptions(recordsWithCoordinates.value, 'linhaId', 'linhaCptm'))
const statusOptions = computed(() => uniqueDomainOptions(recordsWithCoordinates.value, 'status', 'statusLabel'))

watch(filteredRecords, renderMarkers)

onMounted(async () => {
  await nextTick()
  map = L.map('records-map', { center: [-23.55052, -46.633308], zoom: 10 })
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: 'OpenStreetMap' }).addTo(map)
  markerLayer = L.layerGroup().addTo(map)
  await loadRecords()
})

onBeforeUnmount(() => {
  if (map) map.remove()
})

async function loadRecords() {
  loading.value = true
  status.value = ''

  try {
    const response = await getEfluentesMapaAPI()
    records.value = normalizeMapResponse(response)
  } catch (err) {
    console.warn('Endpoint /api/efluentes/mapa indisponível, usando listagem administrativa.', err)
    try {
      const fallback = await getAdminEfluentesAPI({ pageSize: 1000 })
      records.value = normalizeMapResponse(extractEfluenteItems(fallback))
    } catch (fallbackErr) {
      console.error('Erro ao carregar mapa de efluentes', fallbackErr)
      records.value = []
      status.value = 'Não foi possível carregar os registros do mapa.'
      statusType.value = 'error'
    }
  } finally {
    loading.value = false
    renderMarkers()
  }

  if (!recordsWithCoordinates.value.length && !status.value) {
    status.value = 'Nenhum registro com latitude e longitude válidas.'
    statusType.value = 'warning'
  }
}

function normalizeMapResponse(response) {
  return extractEfluenteItems(response)
    .map(normalizeMapRecord)
    .filter(Boolean)
}

function normalizeMapRecord(item = {}) {
  const source = item?.formData ? { ...item, ...item.formData } : item
  const id = readValue(source, ['id', 'ID', 'Id', 'pkCdMeioAmbienteCptm', 'PkCdMeioAmbienteCptm', 'serverId'])
  const latitude = toNumber(readValue(source, ['latitude', 'Latitude', 'lat', 'Lat', 'nrLatGrauDecimalWgs84', 'NrLatGrauDecimalWgs84']))
  const longitude = toNumber(readValue(source, ['longitude', 'Longitude', 'lng', 'Lng', 'long', 'Long', 'nrLongGrauDecimalWgs84', 'NrLongGrauDecimalWgs84']))
  const data = readValue(source, ['data', 'Data', 'dtDataDoCadastramento', 'DtDataDoCadastramento', 'createdAt', 'CreatedAt'])

  const mId = readValue(source, ['txMunicipio', 'cdMunicipio', 'CdMunicipio', 'municipioId', 'pkCdMunicipio'])
  const lId = readValue(source, ['txLinhaCptm', 'cdLinha', 'CdLinha', 'linhaId', 'pkCdLinha'])
  const statusRaw = readValue(source, ['txStatusDoRegistroNoBd', 'TxStatusDoRegistroNoBd', 'status', 'Status', 'syncStatus', 'SyncStatus']) || ''

  return {
    raw: source,
    id,
    numeroInspecao: readValue(source, ['numeroInspecao', 'NumeroInspecao', 'numero', 'Numero', 'nrNumeroDeFormulario', 'NrNumeroDeFormulario', 'txNrElementoMonitoramento', 'TxNrElementoMonitoramento']) || id || 'Não informado',
    latitude,
    longitude,
    status: statusRaw,
    statusLabel: getSafeDomainLabel('txStatusDoRegistroNoBd', statusRaw),
    municipioId: mId,
    municipio: getSafeDomainLabel('txMunicipio', mId),
    linhaId: lId,
    linhaCptm: getSafeDomainLabel('txLinhaCptm', lId),
    usuarioCriador: readValue(source, [
      'usuarioCriador',
      'UsuarioCriador',
      'criadoPor',
      'CriadoPor',
      'autor',
      'Autor',
      'userEmail',
      'UserEmail',
      'usuarioEmail',
      'UsuarioEmail',
      'nomeUsuario',
      'NomeUsuario',
      'txAutorPfDoCadastro',
      'TxAutorPfDoCadastro'
    ]) || '',
    data,
    dataIso: normalizeDateKey(data)
  }
}

function readValue(source, keys) {
  for (const key of keys) {
    if (source?.[key] !== undefined && source?.[key] !== null && source?.[key] !== '') return source[key]
  }

  const sourceKeys = Object.keys(source || {})
  for (const key of keys) {
    const found = sourceKeys.find(item => item.toLowerCase() === String(key).toLowerCase())
    if (found && source[found] !== undefined && source[found] !== null && source[found] !== '') return source[found]
  }

  return ''
}

function toNumber(value) {
  if (value === '' || value === null || value === undefined) return null
  const number = Number(String(value).replace(',', '.'))
  return Number.isFinite(number) ? number : null
}

function isValidCoordinate(latitude, longitude) {
  return latitude !== null
    && longitude !== null
    && latitude >= -90
    && latitude <= 90
    && longitude >= -180
    && longitude <= 180
}

function getSafeDomainLabel(key, val) {
  if (val === '' || val === null || val === undefined) return 'Não informado'
  const desc = getDomainDescription(key, val)
  return desc === 'Não informado' ? String(val) : desc
}

function matchesFilters(record) {
  if (filters.municipio && String(record.municipioId) !== String(filters.municipio)) return false
  if (filters.linha && String(record.linhaId) !== String(filters.linha)) return false
  if (filters.status && String(record.status) !== String(filters.status)) return false
  if (filters.dataInicio && (!record.dataIso || record.dataIso < filters.dataInicio)) return false
  if (filters.dataFim && (!record.dataIso || record.dataIso > filters.dataFim)) return false
  return true
}

function uniqueDomainOptions(items, idField, labelField) {
  const seen = new Set()
  const options = []

  for (const item of items) {
    const id = item[idField]
    const label = item[labelField] || id
    if (id && !seen.has(id)) {
      seen.add(id)
      options.push({ id, label: String(label).trim() })
    }
  }

  return options.sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'))
}

function renderMarkers() {
  if (!map || !markerLayer) return

  markerLayer.clearLayers()
  const bounds = []

  for (const record of filteredRecords.value) {
    const point = [record.latitude, record.longitude]
    bounds.push(point)
    L.marker(point)
      .addTo(markerLayer)
      .on('click', () => {
        selectedRecord.value = record
      })
  }

  if (bounds.length) {
    map.fitBounds(bounds, { padding: [28, 28], maxZoom: 16 })
  }
}

function normalizeDateKey(value) {
  if (!value) return ''
  const text = String(value)
  const iso = text.match(/^(\d{4}-\d{2}-\d{2})/)
  if (iso) return iso[1]

  const parsed = new Date(text)
  if (Number.isNaN(parsed.getTime())) return ''
  const year = parsed.getFullYear()
  const month = String(parsed.getMonth() + 1).padStart(2, '0')
  const day = String(parsed.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function formatDisplayDate(value) {
  const key = normalizeDateKey(value)
  if (!key) return 'Não informado'
  const [year, month, day] = key.split('-')
  return `${day}/${month}/${year}`
}

function clearFilters() {
  filters.municipio = ''
  filters.linha = ''
  filters.status = ''
  filters.dataInicio = ''
  filters.dataFim = ''
}

function openInspection(record) {
  if (!record?.id) return
  queueDetailsRecord(record)
  router.push(`/inspections/${encodeURIComponent(record.id)}/details`)
}

function goBack() {
  router.push('/main-admin')
}
</script>

<style scoped>
@reference "../style.css";

.map-filters {
  @apply mt-5 grid grid-cols-1 items-end gap-3 rounded-app border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-2 xl:grid-cols-[repeat(5,minmax(0,1fr))_auto];
}

.map-shell {
  @apply mt-4 flex flex-col gap-3 rounded-app border border-slate-200 bg-white p-4 shadow-sm;
}

.map-toolbar {
  @apply flex flex-wrap items-center justify-between gap-2 text-sm text-slate-600;
}

.map-toolbar strong {
  @apply text-base text-slate-950;
}

#records-map {
  @apply min-h-[68vh] overflow-hidden rounded-app;
  z-index: 1;
}

.modal-overlay {
  @apply fixed inset-0 z-[1300] flex items-center justify-center bg-slate-950/40 p-4;
}

.record-modal {
  @apply w-full max-w-lg rounded-app border border-slate-200 bg-white p-5 shadow-xl;
}

.modal-header,
.modal-actions {
  @apply flex flex-wrap items-center justify-between gap-3;
}

.modal-header h3 {
  @apply text-xl font-black text-slate-950;
}

.record-modal dl {
  @apply my-5 grid grid-cols-[150px_minmax(0,1fr)] gap-3;
}

.record-modal dt {
  @apply font-extrabold text-slate-500;
}

.record-modal dd {
  @apply m-0 break-words font-semibold text-slate-900;
}

.modal-actions {
  @apply justify-end;
}

@media (max-width: 640px) {
  .record-modal dl {
    @apply grid-cols-1;
  }
}
</style>
