<template>
  <div class="modal-overlay" v-if="visible" role="dialog" aria-modal="true" @click.self="close">
    <div class="modal details-modal" :class="{ fullscreen: isFullscreen }">
      <header class="modal-header">
        <div class="header-copy">
          <span>Visualização do Efluente</span>
          <h3>{{ title }}</h3>
          <p>{{ display(pk) }}</p>
        </div>
        <button class="close-btn" type="button" @click="close">x</button>
      </header>

      <section class="summary-panel">
        <dl>
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
      </section>

      <div class="modal-actions top-actions">
        <button v-if="canEdit" class="btn warning" type="button" @click="editCurrent">Editar</button>
        <button class="btn" type="button" :disabled="!hasGoogleMapsCoordinates" @click="openGoogleMaps">
          Abrir no mapa
        </button>
        <button class="btn" type="button" @click="downloadPdf">Baixar PDF</button>
        <button class="btn" type="button" @click.stop="toggleFullscreen">
          {{ isFullscreen ? 'Sair da tela inteira' : 'Ver tela inteira' }}
        </button>
        <button class="btn cancel" type="button" @click="close">Voltar</button>
      </div>

      <LoadingTrain v-if="detailsLoading" message="Carregando registros..." compact />
      <LoadingTrain v-if="generatingPdf" message="Gerando PDF..." fullscreen />

      <div class="modal-content">
        <section v-for="section in detailSections" :key="section.title" class="info-group">
          <h4>{{ section.title }}</h4>
          <dl class="field-list">
            <template v-for="field in section.fields" :key="field.key">
              <dt>{{ field.label }}</dt>
              <dd>{{ displayField(field) }}</dd>
            </template>
          </dl>
        </section>

        <section class="info-group wide">
          <div class="section-title-row">
            <h4>Registro Fotográfico</h4>
            <span>{{ attachmentCount }} anexo(s)</span>
          </div>

          <LoadingTrain v-if="attachmentsLoading" message="Carregando registros..." compact />
          <div v-else-if="attachmentItems.length" class="attachment-sections">
            <div v-if="imageAttachments.length" class="attachment-block">
              <h5>Imagens</h5>
              <div class="image-grid">
                <button
                  v-for="att in imageAttachments"
                  :key="att.id"
                  class="image-thumb"
                  type="button"
                  @click="previewAttachment(att)"
                >
                  <img v-if="thumbnailUrls[att.id]" :src="thumbnailUrls[att.id]" :alt="att.name" />
                  <span v-else>Imagem</span>
                  <strong>{{ att.name }}</strong>
                </button>
              </div>
            </div>

            <div v-if="documentAttachments.length" class="attachment-block">
              <h5>Documentos</h5>
              <div class="attachments">
                <article v-for="att in documentAttachments" :key="att.id" class="attachment">
                  <strong>{{ att.name }}</strong>
                  <span>{{ att.type || 'arquivo' }} - {{ formatBytes(att.size) }}</span>
                  <div class="attachment-actions">
                    <button class="btn" type="button" @click="previewAttachment(att)">Visualizar</button>
                    <button class="btn" type="button" @click="downloadAttachment(att)">Baixar</button>
                  </div>
                </article>
              </div>
            </div>
          </div>
          <div v-else class="photo-status">Nenhum registro fotográfico ou anexo foi informado.</div>
        </section>

        <section v-if="previewUrl" class="info-group wide">
          <div class="section-title-row">
            <h4>{{ previewName }}</h4>
            <button class="btn cancel" type="button" @click="clearPreview">Fechar preview</button>
          </div>
          <img v-if="previewIsImage" :src="previewUrl" alt="Preview do anexo" class="photo-image" />
          <a v-else :href="previewUrl" target="_blank" rel="noopener noreferrer" class="file-link">Abrir arquivo</a>
        </section>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { EFLUENTE_DETAILS_SECTIONS } from '../services/efluenteDetailsSections'
import { getEfluenteAnexoBlobAPI, getEfluenteAnexosAPI, getEfluenteByPkAPI } from '../services/api'
import { getDomainDescription, getSyncStatusLabel, mapApiEfluenteToFormData, SYNC_STATUS } from '../services/efluenteModel'
import LoadingTrain from './ui/LoadingTrain.vue'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  inspection: {
    type: Object,
    default: () => null
  }
})

const emit = defineEmits(['close'])
const router = useRouter()

const detailSections = EFLUENTE_DETAILS_SECTIONS
const serverDetails = ref(null)
const attachments = ref([])
const attachmentsLoading = ref(false)
const detailsLoading = ref(false)
const generatingPdf = ref(false)
const isFullscreen = ref(false)
const thumbnailUrls = ref({})
const previewUrl = ref('')
const previewName = ref('')
const previewType = ref('')
let previewObjectUrl = ''
let thumbnailObjectUrls = []

const data = computed(() => normalizeRecord(serverDetails.value || props.inspection))
const pk = computed(() => firstFilled(data.value.pkCdMeioAmbienteCptm, data.value.serverId, data.value.id, data.value.localId))
const isSentRecord = computed(() => (data.value.syncStatus || SYNC_STATUS.SENT) === SYNC_STATUS.SENT)
const canEdit = computed(() => data.value.syncStatus !== SYNC_STATUS.PENDING_SYNC)
const title = computed(() => firstFilled(
  data.value.txNmElementoMonitoramento,
  data.value.txNrElementoMonitoramento,
  getDomainDescription('txOrigemEfluente', data.value.txOrigemEfluente),
  getDomainDescription('txFonteGeradora', data.value.txFonteGeradora),
  data.value.title,
  'Efluente sem nome'
))
const statusText = computed(() => display(firstFilled(
  getDomainDescription('txStatusDoRegistroNoBd', data.value.txStatusDoRegistroNoBd),
  data.value.status,
  data.value.syncStatus ? getSyncStatusLabel(data.value.syncStatus) : ''
)))
const registeredDate = computed(() => displayDate(firstFilled(
  data.value.dtDataDoCadastramento,
  data.value.createdAt,
  data.value.CreatedAt
)))
const previewIsImage = computed(() => previewType.value.startsWith('image/'))
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

function close() {
  isFullscreen.value = false
  emit('close')
}

function toggleFullscreen() {
  isFullscreen.value = !isFullscreen.value
}

function normalizeRecord(record = {}) {
  if (!record) return {}

  if (record.formData) {
    return { ...record, ...record.formData }
  }

  return { ...record, ...mapApiEfluenteToFormData(record) }
}

function firstFilled(...values) {
  for (const value of values) {
    if (value !== undefined && value !== null && value !== '') return value
  }

  return ''
}

function display(value) {
  return value === null || value === undefined || value === '' ? 'Não informado' : value
}

function displayField(field) {
  const value = data.value[field.key]
  if (field.type === 'date') return displayDate(value)
  return display(getDomainDescription(field.key, value))
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
    id: att.attachmentId || att.id || att.name || `anexo-${index}`,
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

async function loadDetails() {
  serverDetails.value = null
  const id = pk.value
  if (!props.visible || !isSentRecord.value || !id) return

  detailsLoading.value = true
  try {
    const details = await getEfluenteByPkAPI(id)
    serverDetails.value = details
    const embedded = extractEmbeddedAttachments(details)
    if (embedded.length) attachments.value = embedded
  } catch (err) {
    console.warn('Não foi possível carregar o detalhe completo do efluente; usando dados da lista.', err)
  } finally {
    detailsLoading.value = false
  }
}

async function loadAttachments() {
  if (!attachments.value.length) attachments.value = []
  const id = pk.value
  if (!props.visible || !isSentRecord.value || !id) return
  if (attachments.value.length) return

  attachmentsLoading.value = true
  try {
    const data = await getEfluenteAnexosAPI(id)
    attachments.value = Array.isArray(data) ? data : []
  } catch (err) {
    console.warn('Não foi possível carregar anexos do efluente.', err)
  } finally {
    attachmentsLoading.value = false
  }
}

function editCurrent() {
  if (!canEdit.value || !pk.value) return
  close()
  router.push(`/form/${encodeURIComponent(pk.value)}`)
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

function formatBytes(value) {
  const size = Number(value || 0)
  if (!size) return '0 B'
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / 1024 / 1024).toFixed(1)} MB`
}

function clearPreview() {
  if (previewObjectUrl) URL.revokeObjectURL(previewObjectUrl)
  previewObjectUrl = ''
  previewUrl.value = ''
  previewName.value = ''
  previewType.value = ''
}

function clearThumbnails() {
  for (const url of thumbnailObjectUrls) URL.revokeObjectURL(url)
  thumbnailObjectUrls = []
  thumbnailUrls.value = {}
}

async function getAttachmentBlob(att) {
  if (att?.blob) return att.blob
  if (att?.attachmentId) return getEfluenteAnexoBlobAPI(att.attachmentId)
  throw new Error('Anexo não disponível para visualização.')
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
      console.warn('Não foi possível carregar thumbnail do anexo.', err)
    }
  }))

  thumbnailUrls.value = next
}

async function previewAttachment(att) {
  clearPreview()
  const blob = await getAttachmentBlob(att)
  previewObjectUrl = URL.createObjectURL(blob)
  previewUrl.value = previewObjectUrl
  previewName.value = att.name || `Anexo ${att.attachmentId || ''}`
  previewType.value = blob.type || att.type || ''
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

async function refreshModalData() {
  clearPreview()
  clearThumbnails()
  attachments.value = []
  await loadDetails()
  await loadAttachments()
  await rebuildThumbnails()
}

watch(() => props.visible, (visible) => {
  if (visible) refreshModalData()
  else {
    clearPreview()
    clearThumbnails()
    isFullscreen.value = false
    serverDetails.value = null
    attachments.value = []
  }
})

watch(() => props.inspection, () => {
  if (props.visible) refreshModalData()
}, { deep: true })

onBeforeUnmount(() => {
  clearPreview()
  clearThumbnails()
})
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.52);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: 18px;
}

.modal.details-modal {
  background: #f8fafc;
  color: #1f2937;
  border-radius: 8px;
  padding: 18px;
  width: min(1200px, 100%);
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 18px 44px rgba(15, 23, 42, 0.22);
}

.modal.details-modal.fullscreen {
  width: 100%;
  max-width: none;
  height: 100vh;
  max-height: 100vh;
  border-radius: 0;
}

.modal-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 18px;
}

.header-copy {
  min-width: 0;
}

.header-copy span {
  display: block;
  color: #047857;
  font-size: 0.75rem;
  font-weight: 900;
  text-transform: uppercase;
}

.header-copy h3 {
  margin: 4px 0;
  color: #0f172a;
  font-size: clamp(1.35rem, 2.5vw, 2rem);
  line-height: 1.15;
  overflow-wrap: anywhere;
}

.header-copy p {
  margin: 0;
  color: #64748b;
  font-weight: 700;
  overflow-wrap: anywhere;
}

.close-btn {
  width: 36px;
  height: 36px;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  background: #fff;
  color: #475569;
  cursor: pointer;
  font-size: 1.25rem;
  font-weight: 900;
}

.summary-panel {
  margin-top: 12px;
}

.summary-panel dl {
  margin: 0;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.summary-panel div {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 12px;
}

.summary-panel dt {
  color: #64748b;
  font-size: 0.72rem;
  font-weight: 900;
  text-transform: uppercase;
}

.summary-panel dd {
  margin: 4px 0 0;
  color: #0f172a;
  font-size: 1rem;
  font-weight: 900;
  overflow-wrap: anywhere;
}

.top-actions {
  margin: 12px 0;
  justify-content: flex-end;
}

.loading-state {
  margin-bottom: 12px;
  color: #175cd3;
  font-weight: 800;
}

.modal-content {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 360px), 1fr));
  gap: 12px;
}

.info-group {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 16px;
}

.info-group.wide {
  grid-column: 1 / -1;
}

.info-group h4 {
  margin: 0 0 12px;
  color: #0f172a;
  font-size: 1rem;
}

.field-list {
  margin: 0;
  display: grid;
  grid-template-columns: minmax(220px, 35%) minmax(0, 1fr);
  gap: 12px;
}

.field-list dt {
  color: #64748b;
  font-weight: 800;
}

.field-list dd {
  margin: 0;
  min-width: 0;
  color: #111827;
  font-weight: 700;
  overflow-wrap: anywhere;
  word-break: normal;
  white-space: normal;
}

.section-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 12px;
}

.section-title-row h4 {
  margin: 0;
}

.section-title-row span {
  border-radius: 999px;
  background: #ecfdf3;
  color: #047857;
  padding: 4px 10px;
  font-size: 0.82rem;
  font-weight: 900;
}

.attachments {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 10px;
}

.attachment-sections {
  display: grid;
  gap: 16px;
}

.attachment-block h5 {
  margin: 0 0 10px;
  color: #334155;
  font-size: 0.92rem;
  font-weight: 900;
}

.image-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 10px;
}

.image-thumb {
  min-width: 0;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #f8fafc;
  padding: 8px;
  display: grid;
  gap: 8px;
  cursor: pointer;
  text-align: left;
}

.image-thumb img,
.image-thumb span {
  width: 100%;
  aspect-ratio: 4 / 3;
  border-radius: 6px;
  background: #e2e8f0;
}

.image-thumb img {
  object-fit: cover;
}

.image-thumb span {
  display: grid;
  place-items: center;
  color: #64748b;
  font-weight: 900;
}

.image-thumb strong {
  color: #0f172a;
  font-size: 0.85rem;
  overflow-wrap: anywhere;
  word-break: normal;
}

.attachment {
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #f8fafc;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.attachment strong,
.attachment span {
  overflow-wrap: anywhere;
  word-break: normal;
}

.attachment-actions,
.modal-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.photo-image {
  width: 100%;
  max-height: 540px;
  object-fit: contain;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #fff;
}

.photo-status {
  color: #64748b;
  font-weight: 700;
}

.file-link {
  color: #175cd3;
  font-weight: 800;
}

.btn {
  border: 1px solid #cbd5e1;
  background: #fff;
  color: #334155;
  border-radius: 8px;
  padding: 8px 12px;
  min-height: 40px;
  font-weight: 800;
  cursor: pointer;
  text-decoration: none;
}

.btn.warning {
  background: #f2c036;
  border-color: #f2c036;
  color: #1f2937;
}

.btn.cancel {
  color: #b42318;
  border-color: #f5b4b4;
}

@media (max-width: 768px) {
  .modal-overlay {
    align-items: stretch;
    justify-content: stretch;
    padding: 0;
  }

  .modal.details-modal {
    width: 100%;
    max-width: none;
    height: 100vh;
    max-height: 100vh;
    border-radius: 0;
    padding: 12px 12px 72px;
  }

  .modal-header {
    position: sticky;
    top: 0;
    z-index: 2;
    padding: 12px;
  }

  .header-copy h3 {
    font-size: 1.15rem;
  }

  .summary-panel dl,
  .field-list {
    grid-template-columns: 1fr;
  }

  .top-actions {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 3;
    margin: 0;
    padding: 8px;
    background: #fff;
    border-top: 1px solid #e2e8f0;
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 6px;
  }

  .top-actions .btn {
    min-height: 44px;
    max-height: 44px;
    padding: 6px 8px;
    font-size: 0.78rem;
    line-height: 1.1;
  }

  .modal-content {
    grid-template-columns: 1fr;
  }

  .image-grid,
  .attachments {
    grid-template-columns: 1fr 1fr;
  }
}

@media (max-width: 420px) {
  .top-actions {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .image-grid,
  .attachments {
    grid-template-columns: 1fr;
  }
}
</style>
