<template>
  <div class="modal-overlay" v-if="visible" role="dialog" aria-modal="true" @click.self="close">
    <div class="modal details-modal">
      <div class="modal-header">
        <h3>Efluente: {{ title }}</h3>
        <button class="close-btn" @click="close">x</button>
      </div>

      <div class="modal-content">
        <section class="info-group">
          <h4>Identificacao</h4>
          <p><strong>ID:</strong> {{ pk || 'Nao informado' }}</p>
          <p><strong>Elemento:</strong> {{ title }}</p>
          <p><strong>Status do registro:</strong> {{ inspection?.txStatusDoRegistroNoBd || inspection?.status || 'Nao informado' }}</p>
          <p><strong>Status desvio:</strong> {{ inspection?.txStatusDoDesvioAmbiental || 'Nao informado' }}</p>
        </section>

        <section class="info-group">
          <h4>Localizacao</h4>
          <p><strong>Municipio:</strong> {{ inspection?.txMunicipio || 'Nao informado' }}</p>
          <p><strong>Linha:</strong> {{ inspection?.txLinhaCptm || 'Nao informado' }}</p>
          <p><strong>Estacao:</strong> {{ inspection?.txEstacaoCptm || 'Nao informado' }}</p>
          <p><strong>Trecho/sentido:</strong> {{ inspection?.txTrechoESentidoCptm || 'Nao informado' }}</p>
          <p><strong>Coordenadas:</strong> {{ displayCoordinates || 'Nao informado' }}</p>
          <a v-if="googleMapsLink" :href="googleMapsLink" target="_blank" rel="noopener noreferrer" class="btn block-btn">
            Abrir no mapa
          </a>
        </section>

        <section class="info-group">
          <h4>Efluente</h4>
          <p><strong>Origem:</strong> {{ inspection?.txOrigemEfluente || 'Nao informado' }}</p>
          <p><strong>Fonte geradora:</strong> {{ inspection?.txFonteGeradora || 'Nao informado' }}</p>
          <p><strong>Quantidade (L):</strong> {{ inspection?.nrQuantidadeL ?? 'Nao informado' }}</p>
          <p><strong>Destinacao:</strong> {{ inspection?.txTipoDestinacao || 'Nao informado' }}</p>
          <p><strong>Risco CPTM:</strong> {{ inspection?.txOfereceRiscoSistemaCptm || 'Nao informado' }}</p>
          <p><strong>Observacoes:</strong> {{ inspection?.txObsCadastramento || 'Nao informado' }}</p>
        </section>

        <section class="info-group">
          <h4>Anexos</h4>
          <div v-if="attachmentsLoading" class="photo-status">Carregando anexos...</div>
          <div v-else-if="attachments.length" class="attachments">
            <article v-for="att in attachments" :key="att.attachmentId" class="attachment">
              <strong>{{ att.attName || `Anexo ${att.attachmentId}` }}</strong>
              <span>{{ att.contentType || 'arquivo' }} - {{ formatBytes(att.dataSize) }}</span>
              <div class="attachment-actions">
                <button class="btn" @click="previewAttachment(att)">Visualizar</button>
                <button class="btn" @click="downloadAttachment(att)">Baixar</button>
              </div>
            </article>
          </div>
          <div v-else class="photo-status">Nenhum anexo disponivel.</div>
        </section>

        <section v-if="previewUrl" class="info-group">
          <div class="preview-header">
            <h4>{{ previewName }}</h4>
            <button class="btn cancel" @click="clearPreview">Fechar preview</button>
          </div>
          <img v-if="previewIsImage" :src="previewUrl" alt="Preview do anexo" class="photo-image" />
          <a v-else :href="previewUrl" target="_blank" rel="noopener noreferrer">Abrir arquivo</a>
        </section>
      </div>

      <div class="modal-actions">
        <button class="btn" @click="downloadPdf">Baixar PDF</button>
        <button v-if="canEdit" class="btn warning" @click="editCurrent">Editar</button>
        <button class="btn cancel" @click="close">Fechar</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { getEfluenteAnexoBlobAPI, getEfluenteAnexosAPI } from '../services/api'
import { SYNC_STATUS } from '../services/efluenteModel'

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

const attachments = ref([])
const attachmentsLoading = ref(false)
const previewUrl = ref('')
const previewName = ref('')
const previewType = ref('')
let previewObjectUrl = ''

const isSentRecord = computed(() => (props.inspection?.syncStatus || SYNC_STATUS.SENT) === SYNC_STATUS.SENT)
const canEdit = computed(() => props.inspection?.syncStatus !== SYNC_STATUS.PENDING_SYNC)
const pk = computed(() => props.inspection?.pkCdMeioAmbienteCptm || props.inspection?.serverId || props.inspection?.id || '')
const title = computed(() => props.inspection?.txNmElementoMonitoramento || props.inspection?.title || 'Sem nome')
const lat = computed(() => props.inspection?.nrLatGrauDecimalWgs84 ?? props.inspection?.latitude)
const lng = computed(() => props.inspection?.nrLongGrauDecimalWgs84 ?? props.inspection?.longitude)
const previewIsImage = computed(() => previewType.value.startsWith('image/'))

const displayCoordinates = computed(() => {
  if (lat.value === null || lat.value === undefined || lng.value === null || lng.value === undefined) return ''
  return `${lat.value}, ${lng.value}`
})

const googleMapsLink = computed(() => {
  if (!displayCoordinates.value) return ''
  return `https://www.google.com/maps/search/?api=1&query=${lat.value},${lng.value}`
})

function close() {
  emit('close')
}

function editCurrent() {
  if (!canEdit.value) return
  if (!pk.value) return
  close()
  router.push(`/form/${encodeURIComponent(pk.value)}`)
}

function downloadPdf() {
  window.print()
}

function formatBytes(value) {
  const size = Number(value || 0)
  if (!size) return '0 B'
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / 1024 / 1024).toFixed(1)} MB`
}

async function loadAttachments() {
  attachments.value = []
  if (!isSentRecord.value || !pk.value) {
    console.log('dados exibidos', { detalhes: props.inspection, anexos: attachments.value })
    return
  }

  attachmentsLoading.value = true
  try {
    const data = await getEfluenteAnexosAPI(pk.value)
    console.log('dados api', data)
    attachments.value = Array.isArray(data) ? data : []
    console.log('dados exibidos', { detalhes: props.inspection, anexos: attachments.value })
  } catch (err) {
    console.error('Erro ao carregar anexos do efluente:', err)
  } finally {
    attachmentsLoading.value = false
  }
}

function clearPreview() {
  if (previewObjectUrl) URL.revokeObjectURL(previewObjectUrl)
  previewObjectUrl = ''
  previewUrl.value = ''
  previewName.value = ''
  previewType.value = ''
}

async function previewAttachment(att) {
  clearPreview()
  const blob = await getEfluenteAnexoBlobAPI(att.attachmentId)
  previewObjectUrl = URL.createObjectURL(blob)
  previewUrl.value = previewObjectUrl
  previewName.value = att.attName || `Anexo ${att.attachmentId}`
  previewType.value = blob.type || att.contentType || ''
}

async function downloadAttachment(att) {
  const blob = await getEfluenteAnexoBlobAPI(att.attachmentId)
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = att.attName || `anexo-${att.attachmentId}`
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

watch(() => props.visible, (visible) => {
  if (visible) loadAttachments()
  else clearPreview()
})

watch(() => props.inspection, () => {
  if (props.visible) loadAttachments()
}, { deep: true })

onBeforeUnmount(clearPreview)
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: 16px;
}

.modal.details-modal {
  background: #fff;
  color: #333;
  border-radius: 8px;
  padding: 20px;
  width: min(720px, 100%);
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.18);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: #555;
}

.modal-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.info-group {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 14px;
}

.info-group h4 {
  margin: 0 0 10px;
  color: #097a5e;
}

.info-group p {
  margin: 6px 0;
}

.attachments {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 10px;
}

.attachment {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.attachment strong,
.attachment span {
  overflow-wrap: anywhere;
}

.attachment-actions,
.modal-actions,
.preview-header {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.preview-header {
  align-items: center;
  justify-content: space-between;
}

.photo-image {
  width: 100%;
  max-height: 520px;
  object-fit: contain;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
}

.photo-status {
  color: #667085;
}

.btn {
  border: 1px solid #d0d5dd;
  background: #fff;
  color: #344054;
  border-radius: 8px;
  padding: 8px 12px;
  font-weight: 700;
  cursor: pointer;
  text-decoration: none;
}

.btn.cancel {
  color: #b42318;
  border-color: #f5b4b4;
}

.block-btn {
  display: inline-flex;
  margin-top: 8px;
}
</style>
