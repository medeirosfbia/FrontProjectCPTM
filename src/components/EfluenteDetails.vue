<template>
  <AppLayout>
    <PageContainer>
      <Header :logo="logo" title="Visualizar Efluente" subtitle="Dados organizados conforme o formulário de Efluentes">
        <template #actions>
          <button class="btn" type="button" @click="goBack">Voltar</button>
          <button class="btn warning" type="button" @click="edit">Editar</button>
          <button class="btn" type="button" :disabled="!hasGoogleMapsCoordinates" @click="openGoogleMaps">
            Abrir no mapa
          </button>
          <button class="btn info" type="button" @click="downloadPdf">Baixar PDF</button>
        </template>
      </Header>

      <LoadingTrain v-if="loading" message="Carregando registros..." />
      <LoadingTrain v-if="generatingPdf" message="Gerando PDF..." fullscreen />

      <ToastAlert :message="error" type="error" />

      <section v-if="efluente && !loading" class="details-page">
        <article class="summary-panel">
          <div class="summary-main">
            <span class="eyebrow">Efluente</span>
            <h1>{{ efluenteTitle }}</h1>
            <p>{{ display(pk) }}</p>
          </div>

          <dl class="summary-metrics">
            <div>
              <dt>Status</dt>
              <dd>{{ statusText }}</dd>
            </div>
            <div>
              <dt>Data</dt>
              <dd>{{ registeredDate }}</dd>
            </div>
            <div>
              <dt>Anexos</dt>
              <dd>{{ attachmentCount }}</dd>
            </div>
          </dl>
        </article>

        <section class="details-grid">
          <article v-for="section in detailSections" :key="section.title" class="detail-card">
            <h2>{{ section.title }}</h2>
            <dl class="field-list">
              <template v-for="field in section.fields" :key="field.key">
                <dt>{{ field.label }}</dt>
                <dd>{{ displayField(field) }}</dd>
              </template>
            </dl>
          </article>

          <article class="detail-card wide">
            <div class="card-title-row">
              <h2>Registro Fotográfico</h2>
              <span>{{ attachmentCount }} anexo(s)</span>
            </div>

            <div v-if="attachmentItems.length" class="attachment-sections">
              <div v-if="imageAttachments.length" class="attachment-block">
                <h3>Imagens</h3>
                <div class="image-grid">
                  <button
                    v-for="att in imageAttachments"
                    :key="att.id"
                    class="image-thumb"
                    type="button"
                    @click="openAttachment(att)"
                  >
                    <img v-if="thumbnailUrls[att.id]" :src="thumbnailUrls[att.id]" :alt="att.name" />
                    <span v-else>Imagem</span>
                    <strong>{{ att.name }}</strong>
                  </button>
                </div>
              </div>

              <div v-if="documentAttachments.length" class="attachment-block">
                <h3>Documentos</h3>
                <div class="attachment-grid">
                  <div v-for="att in documentAttachments" :key="att.id" class="attachment-card">
                    <strong>{{ att.name }}</strong>
                    <span>{{ att.type || 'arquivo' }} - {{ formatBytes(att.size) }}</span>
                    <div class="attachment-actions">
                      <button class="btn" type="button" @click="openAttachment(att)">Visualizar</button>
                      <button class="btn" type="button" @click="downloadAttachment(att)">Baixar</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <EmptyState v-else title="Não informado" message="Nenhum registro fotográfico ou anexo foi informado." />
          </article>
        </section>
      </section>
    </PageContainer>
  </AppLayout>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import logo from '../assets/cptm_logo_simples.png'
import AppLayout from './ui/AppLayout.vue'
import EmptyState from './ui/EmptyState.vue'
import Header from './ui/Header.vue'
import LoadingTrain from './ui/LoadingTrain.vue'
import PageContainer from './ui/PageContainer.vue'
import ToastAlert from './ui/ToastAlert.vue'
import { EFLUENTE_DETAILS_SECTIONS } from '../services/efluenteDetailsSections'
import { getAllInspections, getInspection } from '../services/db'
import {
  extractEfluenteItems,
  getAdminEfluentesAPI,
  getEfluenteAnexoBlobAPI,
  getEfluenteAnexosAPI,
  getEfluenteByPkAPI,
  getEfluentesExcluidosAPI,
  getMeusEfluentesAPI
} from '../services/api'
import { consumeDetailsRecord } from '../services/detailsCache'
import { getSyncStatusLabel, mapApiEfluenteToFormData, normalizeLocalEfluenteRecord } from '../services/efluenteModel'

const route = useRoute()
const router = useRouter()
const efluente = ref(null)
const attachments = ref([])
const loading = ref(true)
const generatingPdf = ref(false)
const error = ref('')
const thumbnailUrls = ref({})
let openedUrl = ''
let thumbnailObjectUrls = []
const detailSections = EFLUENTE_DETAILS_SECTIONS

const data = computed(() => efluente.value || {})
const pk = computed(() => firstFilled(data.value.pkCdMeioAmbienteCptm, data.value.serverId, data.value.id))
const efluenteTitle = computed(() => firstFilled(
  data.value.txNmElementoMonitoramento,
  data.value.txNrElementoMonitoramento,
  data.value.txOrigemEfluente,
  data.value.txFonteGeradora,
  'Efluente sem nome'
))
const statusText = computed(() => display(firstFilled(
  data.value.txStatusDoRegistroNoBd,
  data.value.status,
  data.value.syncStatus ? getSyncStatusLabel(data.value.syncStatus) : ''
)))
const registeredDate = computed(() => displayDate(firstFilled(
  data.value.dtDataDoCadastramento,
  data.value.createdAt,
  data.value.CreatedAt
)))
const attachmentItems = computed(() => {
  const apiItems = attachments.value.map(normalizeAttachmentItem)
  if (apiItems.length) return apiItems
  return getLocalAttachmentItems(data.value)
})
const imageAttachments = computed(() => attachmentItems.value.filter(isImageAttachment))
const documentAttachments = computed(() => attachmentItems.value.filter(item => !isImageAttachment(item)))
const attachmentCount = computed(() => {
  if (attachmentItems.value.length) return attachmentItems.value.length

  const explicit = Number(
    data.value.attachmentCount
    ?? data.value.attachmentsCount
    ?? data.value.totalAnexos
    ?? data.value.TotalAnexos
    ?? 0
  )

  return Number.isFinite(explicit) ? explicit : 0
})
const googleMapsCoordinates = computed(() => getGoogleMapsCoordinates(data.value))
const hasGoogleMapsCoordinates = computed(() => Boolean(googleMapsCoordinates.value))

onMounted(load)
onBeforeUnmount(() => {
  if (openedUrl) URL.revokeObjectURL(openedUrl)
  clearThumbnails()
})

async function load() {
  loading.value = true
  error.value = ''
  attachments.value = []
  const id = route.params.id

  try {
    try {
      const data = await getEfluenteByPkAPI(id)
      efluente.value = normalizeDetailsRecord(data)
      await loadAttachmentsForRecord(id, data)
      return
    } catch (err) {
      console.warn('Detalhes nao encontrados no endpoint principal, tentando fallback.', err)
    }

    const cached = consumeDetailsRecord(id)
    if (cached) {
      efluente.value = normalizeDetailsRecord(cached)
      await loadAttachmentsForRecord(id, cached)
      return
    }

    const fallback = await findFallbackDetails(id)
    if (!fallback) throw new Error('Registro nao encontrado')

    efluente.value = fallback
    await loadAttachmentsForRecord(id, fallback)
  } catch (err) {
    console.error('Erro ao carregar detalhes do efluente', err)
    error.value = 'Nao foi possivel carregar os detalhes.'
  } finally {
    loading.value = false
  }
}

async function loadAttachments(id) {
  try {
    const data = await getEfluenteAnexosAPI(id)
    attachments.value = Array.isArray(data) ? data : []
    await rebuildThumbnails()
  } catch (err) {
    console.warn('Nao foi possivel carregar anexos dos detalhes.', err)
    attachments.value = []
    await rebuildThumbnails()
  }
}

async function loadAttachmentsForRecord(id, record = {}) {
  const embedded = extractEmbeddedAttachments(record)
  if (embedded.length) {
    attachments.value = embedded
    await rebuildThumbnails()
    return
  }

  await loadAttachments(id)
}

async function findFallbackDetails(id) {
  const cached = consumeDetailsRecord(id)
  if (cached) return normalizeDetailsRecord(cached)

  const localDirect = await getInspection(id)
  if (localDirect) return normalizeDetailsRecord(normalizeLocalEfluenteRecord(localDirect))

  const localList = await getAllInspections()
  const localFound = (localList || []).find(item => recordMatchesId(item, id))
  if (localFound) return normalizeDetailsRecord(normalizeLocalEfluenteRecord(localFound))

  const loaders = [
    () => getEfluentesExcluidosAPI({ pageSize: 100 }),
    () => getAdminEfluentesAPI({ pageSize: 100 }),
    () => getMeusEfluentesAPI({ pageSize: 100 })
  ]

  for (const loadList of loaders) {
    try {
      const response = await loadList()
      const found = extractEfluenteItems(response).find(item => recordMatchesId(item, id))
      if (found) return normalizeDetailsRecord(found)
    } catch (err) {
      console.warn('Fallback de detalhes falhou.', err)
    }
  }

  return null
}

function recordMatchesId(item = {}, id) {
  const key = String(id || '')
  if (!key) return false

  return [
    item.localId,
    item.id,
    item.ID,
    item.Id,
    item.serverId,
    item.pkCdMeioAmbienteCptm,
    item.PkCdMeioAmbienteCptm,
    item.pkCdMeioAmbienteCPTM,
    item.formData?.pkCdMeioAmbienteCptm,
    item.raw?.localId,
    item.raw?.id,
    item.raw?.ID,
    item.raw?.Id,
    item.raw?.serverId,
    item.raw?.pkCdMeioAmbienteCptm,
    item.raw?.PkCdMeioAmbienteCptm,
    item.raw?.pkCdMeioAmbienteCPTM
  ].some(value => String(value || '') === key)
}

function firstFilled(...values) {
  for (const value of values) {
    if (value !== undefined && value !== null && value !== '') return value
  }

  return ''
}

function normalizeDetailsRecord(record = {}) {
  if (!record) return null

  const raw = record.raw && typeof record.raw === 'object' ? record.raw : {}
  const source = record.formData
    ? { ...raw, ...record, ...record.formData }
    : { ...raw, ...record, ...mapApiEfluenteToFormData(raw), ...mapApiEfluenteToFormData(record) }

  const id = firstFilled(
    source.pkCdMeioAmbienteCptm,
    source.PkCdMeioAmbienteCptm,
    source.pkCdMeioAmbienteCPTM,
    source.serverId,
    source.localId,
    source.id,
    source.ID,
    source.Id,
    route.params.id
  )

  return {
    ...source,
    id,
    serverId: firstFilled(source.serverId, id),
    pkCdMeioAmbienteCptm: firstFilled(source.pkCdMeioAmbienteCptm, source.PkCdMeioAmbienteCptm, source.pkCdMeioAmbienteCPTM, id),
    txNrElementoMonitoramento: firstFilled(source.txNrElementoMonitoramento, source.TxNrElementoMonitoramento, source.numeroInspecao, source.NumeroInspecao, source.numero, source.Numero),
    txNmElementoMonitoramento: firstFilled(source.txNmElementoMonitoramento, source.TxNmElementoMonitoramento, source.nomeElemento, source.NomeElemento, source.elemento, source.Elemento, source.title, source.titulo, source.numeroInspecao),
    txStatusDoRegistroNoBd: firstFilled(source.txStatusDoRegistroNoBd, source.TxStatusDoRegistroNoBd, source.status, source.Status, source.syncStatus),
    txMunicipio: firstFilled(source.txMunicipio, source.TxMunicipio, source.municipio, source.Municipio),
    txLinhaCptm: firstFilled(source.txLinhaCptm, source.TxLinhaCptm, source.linhaCptm, source.LinhaCptm, source.linha, source.Linha),
    txEstacaoCptm: firstFilled(source.txEstacaoCptm, source.TxEstacaoCptm, source.estacao, source.Estacao),
    dtDataDoCadastramento: firstFilled(source.dtDataDoCadastramento, source.DtDataDoCadastramento, source.data, source.Data, source.createdAt, source.CreatedAt),
    txAutorPfDoCadastro: firstFilled(source.txAutorPfDoCadastro, source.TxAutorPfDoCadastro, source.usuarioCriador, source.UsuarioCriador, source.criadoPor, source.CriadoPor),
    nrLatGrauDecimalWgs84: firstFilled(source.nrLatGrauDecimalWgs84, source.NrLatGrauDecimalWgs84, source.latitude, source.Latitude, source.lat, source.Lat),
    nrLongGrauDecimalWgs84: firstFilled(source.nrLongGrauDecimalWgs84, source.NrLongGrauDecimalWgs84, source.longitude, source.Longitude, source.lng, source.Lng, source.long, source.Long)
  }
}

function display(value) {
  return value === null || value === undefined || value === '' ? 'Não informado' : value
}

function displayField(field) {
  const value = data.value[field.key]
  if (field.type === 'date') return displayDate(value)
  return display(value)
}

function displayDate(value) {
  if (!value) return 'Não informado'

  const text = String(value)
  const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (iso) return `${iso[3]}/${iso[2]}/${iso[1]}`

  const parsed = new Date(text)
  if (Number.isNaN(parsed.getTime())) return text

  const day = String(parsed.getDate()).padStart(2, '0')
  const month = String(parsed.getMonth() + 1).padStart(2, '0')
  const year = parsed.getFullYear()
  return `${day}/${month}/${year}`
}

function normalizeAttachmentItem(att = {}, index = 0) {
  return {
    id: att.attachmentId || att.id || att.name || `api-${index}`,
    attachmentId: att.attachmentId,
    name: att.attName || att.name || `Anexo ${index + 1}`,
    type: att.contentType || att.type || 'arquivo',
    size: att.dataSize ?? att.size ?? 0,
    blob: att.blob || null
  }
}

function extractEmbeddedAttachments(record = {}) {
  const source = record?.data && typeof record.data === 'object' ? record.data : record
  return [
    ...(Array.isArray(source?.anexos) ? source.anexos : []),
    ...(Array.isArray(source?.Anexos) ? source.Anexos : []),
    ...(Array.isArray(source?.attachments) ? source.attachments : []),
    ...(Array.isArray(source?.Attachments) ? source.Attachments : []),
    ...(Array.isArray(source?.files) ? source.files : []),
    ...(Array.isArray(source?.Files) ? source.Files : [])
  ]
}

function getLocalAttachmentItems(record = {}) {
  return [
    ...(Array.isArray(record.images) ? record.images : []),
    ...(Array.isArray(record.documents) ? record.documents : [])
  ].map((att, index) => normalizeAttachmentItem(att, index))
}

function isImageAttachment(att = {}) {
  const type = String(att.type || '').toLowerCase()
  const name = String(att.name || '').toLowerCase()
  return type.startsWith('image/')
    || /\.(png|jpe?g|gif|webp|bmp|heic|heif)$/i.test(name)
}

function formatBytes(value) {
  const size = Number(value || 0)
  if (!size) return '0 B'
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / 1024 / 1024).toFixed(1)} MB`
}

async function openAttachment(att) {
  if (openedUrl) URL.revokeObjectURL(openedUrl)
  const blob = await getAttachmentBlob(att)
  openedUrl = URL.createObjectURL(blob)
  window.open(openedUrl, '_blank', 'noopener,noreferrer')
}

async function downloadAttachment(att) {
  const blob = await getAttachmentBlob(att)
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = att.name || `anexo-${att.attachmentId || Date.now()}`
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

async function getAttachmentBlob(att) {
  if (att?.blob) return att.blob
  if (att?.attachmentId) return getEfluenteAnexoBlobAPI(att.attachmentId)
  throw new Error('Anexo não disponível para visualização.')
}

function clearThumbnails() {
  for (const url of thumbnailObjectUrls) URL.revokeObjectURL(url)
  thumbnailObjectUrls = []
  thumbnailUrls.value = {}
}

async function rebuildThumbnails(items = imageAttachments.value) {
  clearThumbnails()
  const next = {}

  await Promise.all(items.map(async (att) => {
    try {
      const blob = await getAttachmentBlob(att)
      const url = URL.createObjectURL(blob)
      thumbnailObjectUrls.push(url)
      next[att.id] = url
    } catch (err) {
      console.warn('Nao foi possivel carregar thumbnail do anexo.', err)
    }
  }))

  thumbnailUrls.value = next
}

function edit() {
  router.push(`/inspections/${encodeURIComponent(route.params.id)}/edit`)
}

function goBack() {
  router.back()
}

function getGoogleMapsCoordinates(source = {}) {
  const lat = toCoordinateNumber(firstFilled(
    source.nrLatGrauDecimalWgs84,
    source.NrLatGrauDecimalWgs84,
    source.latitude,
    source.Latitude,
    source.lat,
    source.Lat
  ))
  const lng = toCoordinateNumber(firstFilled(
    source.nrLongGrauDecimalWgs84,
    source.NrLongGrauDecimalWgs84,
    source.longitude,
    source.Longitude,
    source.lng,
    source.Lng,
    source.long,
    source.Long
  ))

  if (lat === null || lng === null) return null
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null
  return { lat, lng }
}

function toCoordinateNumber(value) {
  if (value === '' || value === null || value === undefined) return null
  const number = Number(String(value).replace(',', '.'))
  return Number.isFinite(number) ? number : null
}

function openGoogleMaps() {
  if (!googleMapsCoordinates.value) return
  const { lat, lng } = googleMapsCoordinates.value
  const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${lat},${lng}`)}`
  window.open(url, '_blank', 'noopener,noreferrer')
}

async function downloadPdf() {
  generatingPdf.value = true
  await new Promise(resolve => setTimeout(resolve, 120))
  window.print()
  setTimeout(() => {
    generatingPdf.value = false
  }, 500)
}
</script>

<style scoped>
@reference "../style.css";

.details-grid {
  @apply mt-5 grid gap-4;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 360px), 1fr));
}

.details-page {
  @apply mt-5 flex flex-col gap-4;
}

.summary-panel {
  @apply flex flex-col gap-4 rounded-app border border-slate-200 bg-white p-5 shadow-sm lg:flex-row lg:items-center lg:justify-between;
}

.summary-main {
  @apply min-w-0;
}

.eyebrow {
  @apply text-xs font-black uppercase tracking-wide text-emerald-700;
}

.summary-main h1 {
  @apply mt-1 break-words text-2xl font-black text-slate-950;
}

.summary-main p {
  @apply mt-1 break-words text-sm font-semibold text-slate-500;
}

.summary-metrics {
  @apply grid grid-cols-1 gap-2 sm:grid-cols-3 lg:min-w-[420px];
}

.summary-metrics div {
  @apply rounded-app border border-slate-200 bg-slate-50 p-3;
}

.summary-metrics dt {
  @apply text-xs font-black uppercase text-slate-500;
}

.summary-metrics dd {
  @apply m-0 mt-1 break-words text-base font-black text-slate-950;
}

.detail-card {
  @apply rounded-app border border-slate-200 bg-white p-5 shadow-sm;
}

.detail-card.wide {
  grid-column: 1 / -1;
}

.detail-card h2 {
  @apply mb-4 text-lg font-black text-slate-950;
}

.field-list {
  @apply grid gap-3;
  grid-template-columns: minmax(220px, 35%) minmax(0, 1fr);
}

.field-list dt {
  @apply font-extrabold text-slate-500;
}

.field-list dd {
  @apply m-0 font-semibold text-slate-900;
  min-width: 0;
  overflow-wrap: anywhere;
  word-break: normal;
  white-space: normal;
}

.card-title-row {
  @apply mb-4 flex flex-wrap items-center justify-between gap-2;
}

.card-title-row h2 {
  @apply m-0;
}

.card-title-row span {
  @apply rounded-full bg-emerald-50 px-3 py-1 text-sm font-black text-emerald-700;
}

.attachment-grid {
  @apply grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3;
}

.attachment-sections {
  @apply grid gap-4;
}

.attachment-block h3 {
  @apply mb-3 text-base font-black text-slate-700;
}

.image-grid {
  @apply grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4;
}

.image-thumb {
  @apply grid min-w-0 cursor-pointer gap-2 rounded-app border border-slate-200 bg-slate-50 p-2 text-left;
}

.image-thumb img,
.image-thumb span {
  @apply w-full rounded-md bg-slate-200;
  aspect-ratio: 4 / 3;
}

.image-thumb img {
  object-fit: cover;
}

.image-thumb span {
  @apply grid place-items-center font-black text-slate-500;
}

.image-thumb strong {
  @apply text-sm font-black text-slate-900;
  overflow-wrap: anywhere;
  word-break: normal;
}

.attachment-card {
  @apply flex min-w-0 flex-col gap-2 rounded-app border border-slate-200 bg-slate-50 p-3;
}

.attachment-actions {
  @apply flex flex-wrap gap-2;
}

.attachment-card strong,
.attachment-card span {
  overflow-wrap: anywhere;
  word-break: normal;
}

@media (max-width: 768px) {
  .field-list {
    grid-template-columns: 1fr;
  }

  .summary-panel {
    @apply p-4;
  }

  .summary-metrics {
    @apply grid-cols-1;
  }
}
</style>
