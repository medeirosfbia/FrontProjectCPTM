<template>
  <AppLayout>
    <PageContainer>
      <Header
        :logo="logo"
        :title="isEditMode ? 'Editar Efluente' : 'Novo Efluente'"
        subtitle="Cadastro ambiental CPTM em etapas"
      >
        <template #actions>
          <button type="button" class="btn ghost" @click="returnToMain">Voltar</button>
        </template>
      </Header>

      <MobileStepHeader
        :steps="steps"
        :current-step="currentStep"
        :progress-percent="progressPercent"
        @open-steps="showStepSheet = true"
      />

      <form class="wizard-shell" @submit.prevent="submitForm">
        <aside class="wizard-sidebar">
          <StepperResponsivo
            :steps="steps"
            :current-step="currentStep"
            :progress-percent="progressPercent"
            :step-errors="stepErrors"
            @go-to-step="goToStep"
          />
        </aside>

        <section class="wizard-panel">
          <div class="tablet-stepper">
            <StepperResponsivo
              :steps="compactSteps"
              :current-step="compactCurrentStep"
              :progress-percent="progressPercent"
              :step-errors="compactStepErrors"
              @go-to-step="goToCompactStep"
            />
            <button type="button" class="btn ghost" @click="showStepSheet = true">Ver todas as etapas</button>
          </div>

          <div class="step-heading">
            <div>
              <p class="eyebrow">Etapa {{ currentStep + 1 }}</p>
              <h2>{{ activeStep.title }}</h2>
              <p>{{ activeStep.description }}</p>
            </div>
            <span class="badge neutral">{{ activeStep.fields?.length || activeStep.badge || 'Resumo' }}</span>
          </div>

          <div v-if="activeStep.kind === 'fields'" class="wizard-grid">
            <label
              v-for="field in activeStep.fields"
              :key="field.key"
              class="field"
              :class="{ wide: field.wide }"
            >
              <span>{{ field.label }}</span>
              <textarea
                v-if="field.type === 'textarea'"
                v-model="form[field.key]"
                rows="5"
                :placeholder="field.placeholder || ''"
              />
              <input
                v-else
                v-model="form[field.key]"
                :type="field.type || 'text'"
                :step="field.step"
                :placeholder="field.placeholder || ''"
                @change="field.location ? updateMapFromInputs() : null"
              />
            </label>
          </div>

          <div v-if="activeStep.kind === 'location'" class="location-layout">
            <div class="wizard-grid">
              <label v-for="field in activeStep.fields" :key="field.key" class="field" :class="{ wide: field.wide }">
                <span>{{ field.label }}</span>
                <input
                  v-model="form[field.key]"
                  :type="field.type || 'text'"
                  :step="field.step"
                  @change="field.location ? updateMapFromInputs() : null"
                />
              </label>
            </div>
            <div class="map-card">
              <div id="efluente-map"></div>
              <div class="map-actions">
                <button type="button" class="btn info" @click="captureGPS">Pegar minha localizacao atual</button>
                <p class="muted">O marcador vermelho define o ponto do cadastro. O bonequinho mostra onde voce esta agora.</p>
              </div>
            </div>
          </div>

          <div v-if="activeStep.kind === 'attachments'" class="attachments-layout">
            <div
              class="upload-panel"
              :class="{ dragging: isDraggingFiles }"
              @dragenter.prevent="isDraggingFiles = true"
              @dragover.prevent="isDraggingFiles = true"
              @dragleave.prevent="isDraggingFiles = false"
              @drop.prevent="onFilesDropped"
            >
              <div class="upload-copy">
                <h3>Anexos/Fotos</h3>
                <p class="muted">Arraste arquivos para este card ou selecione no navegador. Nada sera enviado antes de clicar em Enviar.</p>
              </div>
              <div class="upload-counters">
                <span>{{ imageFiles.length }} imagens</span>
                <span>{{ documentFiles.length }} documentos</span>
              </div>
              <div class="upload-actions">
                <label class="upload-drop">
                  <input type="file" accept="image/*" capture="environment" @change="onFilesSelected" hidden />
                  <strong>Tirar foto</strong>
                </label>
                <label class="upload-drop">
                  <input type="file" accept="image/*" multiple @change="onFilesSelected" hidden />
                  <strong>Selecionar da galeria</strong>
                </label>
                <label class="upload-drop">
                  <input type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/plain" multiple @change="onFilesSelected" hidden />
                  <strong>Selecionar documento</strong>
                </label>
              </div>
            </div>

            <div class="attachment-column">
              <h3>Imagens selecionadas</h3>
              <div v-if="imageFiles.length" class="attachment-grid">
                <article v-for="item in imageFiles" :key="item.key" class="attachment-card">
                  <img :src="item.url" :alt="item.file.name" />
                  <strong>{{ item.file.name }}</strong>
                  <span>{{ item.file.type || 'imagem' }} - {{ formatBytes(item.file.size) }}</span>
                  <button type="button" class="btn ghost" @click="removeSelectedFile(item.index)">Remover</button>
                </article>
              </div>
              <EmptyState v-else title="0 imagens" message="Miniaturas aparecem aqui." />
            </div>

            <div class="attachment-column">
              <h3>Documentos selecionados</h3>
              <div v-if="documentFiles.length" class="document-list">
                <article v-for="item in documentFiles" :key="item.key" class="attachment-card">
                  <strong>{{ item.file.name }}</strong>
                  <span>{{ item.file.type || 'documento' }} - {{ formatBytes(item.file.size) }}</span>
                  <button type="button" class="btn ghost" @click="removeSelectedFile(item.index)">Remover</button>
                </article>
              </div>
              <EmptyState v-else title="0 documentos" message="Arquivos nao-imagem aparecem em lista." />
            </div>

            <div v-if="existingAttachments.length" class="attachment-column wide">
              <h3>Anexos existentes</h3>
              <div class="attachment-grid compact">
                <article v-for="att in existingAttachments" :key="att.attachmentId" class="attachment-card">
                  <strong>{{ att.attName || `Anexo ${att.attachmentId}` }}</strong>
                  <span>{{ att.contentType || 'arquivo' }} - {{ formatBytes(att.dataSize) }}</span>
                  <div class="card-actions">
                    <button type="button" class="btn" @click="previewAttachment(att)">Visualizar</button>
                    <button type="button" class="btn" @click="downloadAttachment(att)">Baixar</button>
                  </div>
                </article>
              </div>
            </div>
          </div>

          <div v-if="activeStep.kind === 'review'" class="review-layout">
            <article v-for="group in reviewGroups" :key="group.title" class="review-card">
              <h3>{{ group.title }}</h3>
              <dl>
                <template v-for="field in group.fields" :key="field.key">
                  <dt>{{ field.label }}</dt>
                  <dd>{{ displayValue(form[field.key]) }}</dd>
                </template>
              </dl>
            </article>
            <article class="review-card">
              <h3>Anexos</h3>
              <p>{{ selectedFiles.length }} arquivo(s) selecionado(s) para envio.</p>
              <p>{{ existingAttachments.length }} anexo(s) existente(s) neste efluente.</p>
            </article>
          </div>

          <div v-if="attachmentPreviewUrl" class="preview-panel">
            <div class="preview-header">
              <strong>{{ attachmentPreviewName }}</strong>
              <button type="button" class="btn ghost" @click="clearAttachmentPreview">Fechar</button>
            </div>
            <img v-if="attachmentPreviewIsImage" :src="attachmentPreviewUrl" alt="Preview do anexo" />
            <a v-else :href="attachmentPreviewUrl" target="_blank" rel="noopener noreferrer">Abrir anexo</a>
          </div>

          <ToastAlert :message="status" :type="statusType" />

          <footer class="wizard-actions">
            <button type="button" class="btn" :disabled="currentStep === 0" @click="prevStep">Voltar</button>
            <button type="button" class="btn warning" @click="saveDraft">Salvar rascunho</button>
            <button v-if="!isLastStep" type="button" class="btn-primary" @click="nextStep">Proximo</button>
            <button v-else type="submit" class="btn-primary" :disabled="saving">
              {{ saving ? 'Enviando...' : 'Enviar' }}
            </button>
          </footer>
        </section>
      </form>

      <StepperBottomSheet
        :visible="showStepSheet"
        :steps="steps"
        :current-step="currentStep"
        :step-errors="stepErrors"
        @close="showStepSheet = false"
        @go-to-step="goToStep"
      />
    </PageContainer>
  </AppLayout>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { onBeforeRouteLeave, useRoute, useRouter } from 'vue-router'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'
import logo from '../assets/cptm_logo_simples.png'
import AppLayout from './ui/AppLayout.vue'
import EmptyState from './ui/EmptyState.vue'
import Header from './ui/Header.vue'
import MobileStepHeader from './ui/MobileStepHeader.vue'
import PageContainer from './ui/PageContainer.vue'
import StepperBottomSheet from './ui/StepperBottomSheet.vue'
import StepperResponsivo from './ui/StepperResponsivo.vue'
import ToastAlert from './ui/ToastAlert.vue'
import { deleteInspection, getAllInspections, saveInspection } from '../services/db'
import {
  createEfluenteAPI,
  createEfluenteMultipartAPI,
  getEfluenteAnexoBlobAPI,
  getEfluenteAnexosAPI,
  getEfluenteByPkAPI,
  getIsAdmin,
  updateEfluenteAPI,
  updateEfluenteMultipartAPI
} from '../services/api'
import {
  attachmentRecordToFile,
  buildEfluentePayload,
  createAttachmentRecord,
  createDraftRecord,
  createEmptyEfluenteFormData,
  getDraftAttachmentRecords,
  mapApiEfluenteToFormData,
  normalizeLocalEfluenteRecord,
  splitAttachmentRecords,
  SYNC_STATUS,
  toNumberOrNull,
  validateEfluenteForSubmit
} from '../services/efluenteModel'

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({ iconRetinaUrl: markerIcon2x, iconUrl: markerIcon, shadowUrl: markerShadow })

const route = useRoute()
const router = useRouter()
const isEditMode = computed(() => route.params.id !== 'new')
const currentStep = ref(0)
const showStepSheet = ref(false)
const localDraftId = ref('')
const loadedFromLocal = ref(false)
const saving = ref(false)
const hasSavedSuccessfully = ref(false)
const status = ref('')
const statusType = ref('info')
const selectedFiles = ref([])
const selectedPreviewUrls = ref([])
const isDraggingFiles = ref(false)
const existingAttachments = ref([])
const attachmentPreviewUrl = ref('')
const attachmentPreviewName = ref('')
const attachmentPreviewType = ref('')
let attachmentObjectUrl = ''
let mapRef = null
let mapMarker = null
let personMarker = null
let hasRequestedInitialLocation = false

const emptyForm = createEmptyEfluenteFormData()
const form = reactive(createEmptyEfluenteFormData())

const identificationFields = [
  { key: 'txNrElementoMonitoramento', label: 'Numero do Elemento de Monitoramento' },
  { key: 'txNmElementoMonitoramento', label: 'Nome do Elemento de Monitoramento' },
  { key: 'txSiglaDeptoMeioAmbiente', label: 'Departamento Meio Ambiente' },
  { key: 'txStatusDoDesvioAmbiental', label: 'Status do Desvio Ambiental' },
  { key: 'txStatusDoRegistroNoBd', label: 'Status do Registro no Sistema Central' }
]

const locationFields = [
  { key: 'txMunicipio', label: 'Municipio' },
  { key: 'txLinhaCptm', label: 'Linha CPTM' },
  { key: 'txViaCptm', label: 'Via CPTM' },
  { key: 'txTrechoESentidoCptm', label: 'Trecho e Sentido CPTM' },
  { key: 'txKmPoste', label: 'KM/Poste' },
  { key: 'txEstacaoCptm', label: 'Estacao CPTM' },
  { key: 'nrLatGrauDecimalWgs84', label: 'Latitude WGS84', type: 'number', step: 'any', location: true },
  { key: 'nrLongGrauDecimalWgs84', label: 'Longitude WGS84', type: 'number', step: 'any', location: true },
  { key: 'nrLatMetrosSirgas2000', label: 'Latitude SIRGAS2000', type: 'number', step: 'any' },
  { key: 'nrLongMetrosSirgas2000', label: 'Longitude SIRGAS2000', type: 'number', step: 'any' },
  { key: 'txNmLocalEscopoContratual', label: 'Local do Escopo Contratual', wide: true }
]

const formFields = [
  { key: 'txTipoDeFormulario', label: 'Tipo de Formulario' },
  { key: 'dtDataEmissaoFormulario', label: 'Data de Emissao', type: 'date' },
  { key: 'nrNumeroDeFormulario', label: 'Numero do Formulario', type: 'number' },
  { key: 'txAutorPfDoFormulario', label: 'Autor PF do Formulario' },
  { key: 'txNaturezaDoPga', label: 'Natureza do PGA' },
  { key: 'txNomePjExecutora', label: 'Nome PJ Executora' }
]

const activityFields = [
  { key: 'txTipoAtividadeListada', label: 'Tipo de Atividade Listada' },
  { key: 'txTipoAtividadeNListada', label: 'Tipo de Atividade Nao Listada' },
  { key: 'txTipoDraListado', label: 'Tipo DRA Listado' },
  { key: 'txTipoDraNListado', label: 'Tipo DRA Nao Listado' },
  { key: 'txIdDra', label: 'ID DRA' },
  { key: 'dtValidadeDra', label: 'Validade DRA', type: 'date' },
  { key: 'txAnaliseCptmAprovacao', label: 'Analise CPTM Aprovacao' },
  { key: 'txTipoAtividadeCptm', label: 'Tipo Atividade CPTM' },
  { key: 'txNmLocalAtiv', label: 'Nome Local Atividade' },
  { key: 'txNmLocalAtivComplemento', label: 'Complemento Local Atividade', wide: true }
]

const effluentFields = [
  { key: 'txOrigemEfluente', label: 'Origem do Efluente' },
  { key: 'txFonteGeradora', label: 'Fonte Geradora' },
  { key: 'nrQuantidadeL', label: 'Quantidade em Litros', type: 'number', step: 'any' },
  { key: 'txTipoDestinacao', label: 'Tipo de Destinacao' },
  { key: 'txTipoVeiculo', label: 'Tipo de Veiculo' },
  { key: 'txIdVeiculo', label: 'ID do Veiculo' },
  { key: 'txIdGuiaRemessa', label: 'ID Guia de Remessa' },
  { key: 'nrDistanciaDaViaM', label: 'Distancia da Via em Metros', type: 'number', step: 'any' },
  { key: 'txOfereceRiscoSistemaCptm', label: 'Oferece Risco ao Sistema CPTM' },
  { key: 'txProprietario', label: 'Proprietario' },
  { key: 'txObsCadastramento', label: 'Observacoes do Cadastramento', type: 'textarea', wide: true }
]

const registrationFields = [
  { key: 'dtDataDoCadastramento', label: 'Data do Cadastramento', type: 'date' },
  { key: 'hrHoraDoCadastramento', label: 'Hora do Cadastramento', type: 'time' },
  { key: 'txAutorPjDoCadastro', label: 'Autor PJ do Cadastro' },
  { key: 'txAutorPfDoCadastro', label: 'Autor PF do Cadastro' },
  { key: 'txNmResponsavelCadastro', label: 'Nome Responsavel Cadastro' },
  { key: 'txRpResponsavelCadastro', label: 'RP Responsavel Cadastro' },
  { key: 'txDrtResponsavelCadastro', label: 'DRT Responsavel Cadastro' }
]

const contractorFields = [
  { key: 'txNomePjDaContratada', label: 'Nome PJ da Contratada' },
  { key: 'txNrContratoContratada', label: 'Numero Contrato Contratada' },
  { key: 'txNmAreaGestoraCptm', label: 'Nome Area Gestora CPTM' },
  { key: 'txIdAreaGestoraCptm', label: 'ID Area Gestora CPTM' },
  { key: 'txSiglaAreaGestoraCptm', label: 'Sigla Area Gestora CPTM' },
  { key: 'txNomePfDaRepresentante', label: 'Nome PF Representante' },
  { key: 'txNomePjDaSupervisora', label: 'Nome PJ Supervisora' },
  { key: 'txNrContratoSupervisora', label: 'Numero Contrato Supervisora' }
]

const relatedFileFields = [
  { key: 'txNmArquivoFdcRelacionado', label: 'Nome Arquivo FDC Relacionado' },
  { key: 'pkCdArquivoFdcRelacionado', label: 'Codigo Arquivo FDC Relacionado' },
  { key: 'txNmArquivoRvtRelacionado', label: 'Nome Arquivo RVT Relacionado' },
  { key: 'pkCdElementoDeMonitorRvt', label: 'Codigo Elemento Monitor RVT' },
  { key: 'txNmArquivoDacRelacionado', label: 'Nome Arquivo DAC Relacionado' },
  { key: 'pkCdElementoDeMonitorDac', label: 'Codigo Elemento Monitor DAC' },
  { key: 'txNmArquivoCncRelacionado', label: 'Nome Arquivo CNC Relacionado' },
  { key: 'pkCdElementoDeMonitorCnc', label: 'Codigo Elemento Monitor CNC' },
  { key: 'pkCdCodigoNoUltimoRra', label: 'Codigo Ultimo RRA' },
  { key: 'pkCdCedoc', label: 'Codigo CEDOC' }
]

const steps = [
  { title: 'Identificacao', description: 'Codigo, elemento e status', kind: 'fields', fields: identificationFields },
  { title: 'Localizacao', description: 'Trecho CPTM e coordenadas', kind: 'location', fields: locationFields },
  { title: 'Formulario', description: 'Dados do formulario e responsaveis', kind: 'fields', fields: formFields },
  { title: 'Atividade e DRA', description: 'Dados da atividade ambiental', kind: 'fields', fields: activityFields },
  { title: 'Efluente', description: 'Origem, volume e destinacao', kind: 'fields', fields: effluentFields },
  { title: 'Cadastro', description: 'Autores e responsavel pelo cadastro', kind: 'fields', fields: registrationFields },
  { title: 'Contratada e area', description: 'Contratos, supervisora e area gestora', kind: 'fields', fields: contractorFields },
  { title: 'Arquivos relacionados', description: 'Referencias FDC, RVT, DAC, CNC e CEDOC', kind: 'fields', fields: relatedFileFields },
  { title: 'Anexos/Fotos', description: 'Imagens, documentos e anexos existentes', kind: 'attachments', badge: 'Upload' },
  { title: 'Revisao e envio', description: 'Conferencia antes de enviar ao sistema central', kind: 'review', badge: 'Resumo' }
]

const activeStep = computed(() => steps[currentStep.value])
const isLastStep = computed(() => currentStep.value === steps.length - 1)
const progressPercent = computed(() => Math.round(((currentStep.value + 1) / steps.length) * 100))
const stepErrors = computed(() => steps.map((_, index) => getStepError(index)))
const compactIndexes = computed(() => {
  const indexes = [currentStep.value]
  if (currentStep.value + 1 < steps.length) indexes.push(currentStep.value + 1)
  return indexes
})
const compactSteps = computed(() => compactIndexes.value.map(index => steps[index]))
const compactCurrentStep = computed(() => compactIndexes.value.indexOf(currentStep.value))
const compactStepErrors = computed(() => compactIndexes.value.map(index => stepErrors.value[index]))
const attachmentPreviewIsImage = computed(() => attachmentPreviewType.value.startsWith('image/'))
const imageFiles = computed(() => selectedFiles.value
  .map((file, index) => ({ file, index, key: file.id || `${file.name}-${index}`, url: selectedPreviewUrls.value[index] || '' }))
  .filter(item => item.file.type?.startsWith('image/')))
const documentFiles = computed(() => selectedFiles.value
  .map((file, index) => ({ file, index, key: file.id || `${file.name}-${index}` }))
  .filter(item => !item.file.type?.startsWith('image/')))
const reviewGroups = computed(() => [
  { title: 'Dados principais', fields: identificationFields },
  { title: 'Localizacao', fields: locationFields.slice(0, 9) },
  { title: 'Dados do efluente', fields: effluentFields },
  { title: 'Responsaveis', fields: registrationFields },
  { title: 'Contratada e area gestora', fields: contractorFields }
])

watch(currentStep, async () => {
  if (activeStep.value.kind === 'location') {
    await nextTick()
    initMap()
  }
})

onMounted(async () => {
  setTodayDefaults()
  if (isEditMode.value) {
    await loadEfluente()
    await loadAttachments()
  }
  if (activeStep.value.kind === 'location') initMap()
})

onBeforeUnmount(() => {
  clearAttachmentPreview()
  clearSelectedPreviewUrls()
  if (mapRef) mapRef.remove()
})

onBeforeRouteLeave(async () => {
  await saveDraftBeforeLeaving()
  return true
})

function setStatus(message, type = 'info') {
  status.value = message
  statusType.value = type
}

function setTodayDefaults() {
  const today = new Date().toISOString().slice(0, 10)
  if (!form.dtDataEmissaoFormulario) form.dtDataEmissaoFormulario = today
  if (!form.dtDataDoCadastramento) form.dtDataDoCadastramento = today
}

async function loadEfluente() {
  setStatus('Carregando efluente...', 'info')
  try {
    const routeId = String(route.params.id || '')
    const localRecords = await getAllInspections()
    const localRecord = (localRecords || [])
      .map(normalizeLocalEfluenteRecord)
      .find(item => item?.syncStatus !== SYNC_STATUS.SENT && String(item?.localId || item?.id) === routeId)

    if (localRecord) {
      localDraftId.value = localRecord.localId
      loadedFromLocal.value = true
      Object.assign(form, createEmptyEfluenteFormData(), localRecord.formData)
      setSelectedAttachments(getDraftAttachmentRecords(localRecord))
      console.log('dados exibidos', localRecord.formData)
      setStatus('', 'info')
      return
    }

    const apiData = await getEfluenteByPkAPI(routeId)
    const formData = mapApiEfluenteToFormData(apiData)
    console.log('dados api', apiData)
    Object.assign(form, createEmptyEfluenteFormData(), formData)
    setSelectedAttachments([])
    console.log('dados exibidos', formData)
    loadedFromLocal.value = false
    setStatus('', 'info')
  } catch (err) {
    console.error('Erro ao carregar efluente', err)
    setStatus('Nao foi possivel carregar o efluente.', 'error')
  }
}

async function loadAttachments() {
  if (loadedFromLocal.value) return
  const pk = form.pkCdMeioAmbienteCptm || route.params.id
  if (!pk || pk === 'new') return
  try {
    const data = await getEfluenteAnexosAPI(pk)
    console.log('dados api', data)
    existingAttachments.value = Array.isArray(data) ? data : []
    console.log('dados exibidos', existingAttachments.value)
  } catch (err) {
    console.error('Erro ao carregar anexos', err)
  }
}

function goToStep(index) {
  currentStep.value = Math.max(0, Math.min(index, steps.length - 1))
}

function nextStep() {
  if (!validateCurrentStep()) return
  goToStep(currentStep.value + 1)
}

function prevStep() {
  goToStep(currentStep.value - 1)
}

function validateCurrentStep() {
  const error = getStepError(currentStep.value)
  if (error) {
    setStatus(error, 'error')
    return false
  }
  setStatus('', 'info')
  return true
}

function getStepError(index) {
  if (steps[index]?.kind !== 'location') return ''

  const payload = buildPayload()
  const lat = payload.nrLatGrauDecimalWgs84
  const lng = payload.nrLongGrauDecimalWgs84

  if (lat !== null && (lat < -90 || lat > 90)) return 'Latitude valida deve estar entre -90 e 90.'
  if (lng !== null && (lng < -180 || lng > 180)) return 'Longitude valida deve estar entre -180 e 180.'
  return ''
}

function buildPayload(options = {}) {
  return buildEfluentePayload(form, options)
}

function extractPk(response, payload) {
  return response?.pkCdMeioAmbienteCptm
    || response?.PkCdMeioAmbienteCptm
    || response?.data?.pkCdMeioAmbienteCptm
    || response?.data?.PkCdMeioAmbienteCptm
}

async function getExistingLocalRecord() {
  const id = localDraftId.value || String(route.params.id || '')
  if (!id || id === 'new') return null

  const localRecords = await getAllInspections()
  return (localRecords || []).find(item => String(item?.localId || item?.id) === String(id)) || null
}

function hasDraftableData() {
  if (selectedFiles.value.length) return true

  const payload = buildPayload()
  return Object.entries(payload).some(([key, value]) => {
    if (key === 'pkCdMeioAmbienteCptm') return false
    return value !== '' && value !== null && value !== undefined
  })
}

async function saveDraft(options = {}) {
  const { silent = false, updateRoute = true, syncStatus = SYNC_STATUS.DRAFT, lastError = '' } = options
  const { images, documents } = splitAttachmentRecords(selectedFiles.value)
  const existingRecord = await getExistingLocalRecord()
  const record = createDraftRecord({
    localId: localDraftId.value || undefined,
    formData: buildPayload(),
    syncStatus,
    lastError,
    images,
    documents,
    existingRecord
  })
  record.userEmail = localStorage.getItem('user_email') || ''

  const saved = await saveInspection(record)
  localDraftId.value = saved.localId || saved.id
  loadedFromLocal.value = true
  if (!silent) setStatus('Rascunho salvo localmente.', 'success')

  if (updateRoute && route.params.id === 'new') {
    router.replace(`/form/${encodeURIComponent(localDraftId.value)}`)
  }

  return saved
}

async function saveDraftBeforeLeaving() {
  if (saving.value || hasSavedSuccessfully.value) return
  if (!hasDraftableData()) return
  if (!loadedFromLocal.value && isEditMode.value && route.params.id !== 'new') return

  await saveDraft({ silent: true, updateRoute: false })
}

async function submitForm() {
  if (!validateCurrentStep()) return
  const validation = validateEfluenteForSubmit(form)
  if (!validation.valid) {
    setStatus(validation.errors[0], 'error')
    return
  }

  const routeId = String(route.params.id || '')
  const isEditingApiRecord = isEditMode.value && !loadedFromLocal.value && routeId && routeId !== 'new'
  const mode = isEditingApiRecord ? 'edit' : 'create'
  const payload = buildPayload()
  const pkCdMeioAmbienteCptm = mode === 'edit'
    ? (form.pkCdMeioAmbienteCptm || routeId)
    : ''

  if (mode === 'create') {
    delete payload.pkCdMeioAmbienteCptm
  } else {
    payload.pkCdMeioAmbienteCptm = pkCdMeioAmbienteCptm
  }

  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    const saved = await saveDraft({
      silent: true,
      updateRoute: false,
      syncStatus: SYNC_STATUS.PENDING_SYNC
    })
    localDraftId.value = saved.localId || saved.id
    loadedFromLocal.value = true
    setStatus('Sem conexao. Registro salvo como aguardando envio.', 'warning')
    return
  }

  saving.value = true
  setStatus(isEditMode.value ? 'Atualizando efluente...' : 'Criando efluente...', 'info')
  try {
    const method = mode === 'edit' ? 'PUT' : 'POST'
    const url = mode === 'edit'
      ? `/api/efluentes/${pkCdMeioAmbienteCptm}`
      : '/api/efluentes'

    console.log('modo', mode)
    console.log('pk', pkCdMeioAmbienteCptm)
    console.log('localId', localDraftId.value)
    console.log('payload', payload)
    console.log('method', method)
    console.log('url', url)

    if (mode === 'edit' && !pkCdMeioAmbienteCptm) {
      throw new Error('ID do sistema central nao encontrado para edicao.')
    }

    const filesToSend = selectedFiles.value.map(attachmentRecordToFile).filter(Boolean)
    const response = filesToSend.length
      ? (
          mode === 'edit'
            ? await updateEfluenteMultipartAPI(pkCdMeioAmbienteCptm, payload, filesToSend)
            : await createEfluenteMultipartAPI(payload, filesToSend)
        )
      : (
          mode === 'edit'
            ? await updateEfluenteAPI(pkCdMeioAmbienteCptm, payload)
            : await createEfluenteAPI(payload)
        )
    const pk = extractPk(response, payload)
      || (mode === 'edit' ? pkCdMeioAmbienteCptm : '')
    if (!pk) throw new Error('Sistema central nao retornou o ID do registro')
    form.pkCdMeioAmbienteCptm = pk
    selectedFiles.value = []
    clearSelectedPreviewUrls()
    if (localDraftId.value) {
      await deleteInspection(localDraftId.value)
      localDraftId.value = ''
    }
    loadedFromLocal.value = false
    hasSavedSuccessfully.value = true
    await loadAttachments()
    setStatus('Registro enviado com sucesso.', 'success')
    if (route.params.id !== pk) router.replace(`/form/${encodeURIComponent(pk)}`)
  } catch (err) {
    console.error('Erro ao salvar efluente', err)
    if (localDraftId.value || loadedFromLocal.value) {
      const saved = await saveDraft({
        silent: true,
        updateRoute: false,
        syncStatus: SYNC_STATUS.ERROR,
        lastError: err?.message || 'Erro ao enviar'
      })
      localDraftId.value = saved.localId || saved.id
    }
    setStatus(err?.message || 'Nao foi possivel salvar o efluente.', 'error')
  } finally {
    saving.value = false
  }
}

function onFilesSelected(event) {
  const files = Array.from(event?.target?.files || [])
  addSelectedFiles(files)
  if (event?.target) event.target.value = ''
}

function onFilesDropped(event) {
  isDraggingFiles.value = false
  addSelectedFiles(Array.from(event?.dataTransfer?.files || []))
}

function createPreviewUrlForAttachment(attachment) {
  if (!attachment?.type?.startsWith('image/') || !attachment?.blob) return ''
  return URL.createObjectURL(attachment.blob)
}

function setSelectedAttachments(attachments = []) {
  clearSelectedPreviewUrls()
  selectedFiles.value = attachments.map(createAttachmentRecord)
  selectedPreviewUrls.value = selectedFiles.value.map(createPreviewUrlForAttachment)
}

function addSelectedFiles(files = []) {
  if (!files.length) return

  const records = files.map(createAttachmentRecord)
  selectedFiles.value = [...selectedFiles.value, ...records]
  selectedPreviewUrls.value = [
    ...selectedPreviewUrls.value,
    ...records.map(createPreviewUrlForAttachment)
  ]
}

async function removeSelectedFile(index) {
  if (selectedPreviewUrls.value[index]) URL.revokeObjectURL(selectedPreviewUrls.value[index])
  selectedFiles.value.splice(index, 1)
  selectedPreviewUrls.value.splice(index, 1)

  if (loadedFromLocal.value && localDraftId.value) {
    await saveDraft({ silent: true, updateRoute: false })
  }
}

function formatBytes(value) {
  const size = Number(value || 0)
  if (!size) return '0 B'
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / 1024 / 1024).toFixed(1)} MB`
}

function displayValue(value) {
  return value === '' || value === null || value === undefined ? 'Nao informado' : value
}

function clearAttachmentPreview() {
  if (attachmentObjectUrl) URL.revokeObjectURL(attachmentObjectUrl)
  attachmentObjectUrl = ''
  attachmentPreviewUrl.value = ''
  attachmentPreviewName.value = ''
  attachmentPreviewType.value = ''
}

function clearSelectedPreviewUrls() {
  for (const url of selectedPreviewUrls.value) {
    if (url) URL.revokeObjectURL(url)
  }
  selectedPreviewUrls.value = []
}

async function previewAttachment(att) {
  clearAttachmentPreview()
  const blob = await getEfluenteAnexoBlobAPI(att.attachmentId)
  attachmentObjectUrl = URL.createObjectURL(blob)
  attachmentPreviewUrl.value = attachmentObjectUrl
  attachmentPreviewName.value = att.attName || `Anexo ${att.attachmentId}`
  attachmentPreviewType.value = blob.type || att.contentType || ''
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

function initMap() {
  const el = document.getElementById('efluente-map')
  if (!el) return
  if (!mapRef) {
    mapRef = L.map(el, { center: [-23.55052, -46.633308], zoom: 13 })
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: 'OpenStreetMap' }).addTo(mapRef)
    mapRef.on('click', (event) => updatePosition(event.latlng.lat, event.latlng.lng))
  }
  updateMapFromInputs()
  requestCurrentLocation({ setFormWhenEmpty: !isEditMode.value })
  setTimeout(() => mapRef?.invalidateSize(), 180)
}

function updatePosition(lat, lng) {
  form.nrLatGrauDecimalWgs84 = Number(lat).toFixed(6)
  form.nrLongGrauDecimalWgs84 = Number(lng).toFixed(6)
  updateMapFromInputs()
}

function updateMapFromInputs() {
  const lat = toNumberOrNull(form.nrLatGrauDecimalWgs84)
  const lng = toNumberOrNull(form.nrLongGrauDecimalWgs84)
  if (!mapRef || lat === null || lng === null) return
  const latLng = [lat, lng]
  if (mapMarker) {
    mapMarker.setLatLng(latLng)
  } else {
    mapMarker = L.marker(latLng, { draggable: true }).addTo(mapRef)
    mapMarker.on('dragend', (event) => {
      const point = event.target.getLatLng()
      updatePosition(point.lat, point.lng)
    })
  }
  mapRef.setView(latLng, 16)
}

function captureGPS() {
  requestCurrentLocation({ setFormWhenEmpty: true, forceStatus: true })
}

function goToCompactStep(compactIndex) {
  const realIndex = compactIndexes.value[compactIndex]
  if (Number.isInteger(realIndex)) goToStep(realIndex)
}

function requestCurrentLocation({ setFormWhenEmpty = false, forceStatus = false } = {}) {
  if (!navigator.geolocation) {
    setStatus('Geolocalizacao nao disponivel no navegador.', 'error')
    return
  }

  if (!forceStatus && hasRequestedInitialLocation) return
  hasRequestedInitialLocation = true

  if (forceStatus) setStatus('Capturando localizacao...', 'info')

  navigator.geolocation.getCurrentPosition(
    (position) => {
      const lat = position.coords.latitude
      const lng = position.coords.longitude
      setPersonMarker([lat, lng])

      const hasCadastroCoords = toNumberOrNull(form.nrLatGrauDecimalWgs84) !== null
        && toNumberOrNull(form.nrLongGrauDecimalWgs84) !== null

      if (setFormWhenEmpty || !hasCadastroCoords) {
        updatePosition(lat, lng)
      } else if (mapRef) {
        mapRef.setView([lat, lng], 16)
      }

      setStatus(forceStatus ? 'Localizacao atual capturada.' : '', forceStatus ? 'success' : 'info')
    },
    (err) => {
      if (forceStatus) setStatus(`Erro ao capturar localizacao: ${err.message}`, 'error')
      else console.warn('Nao foi possivel obter localizacao atual:', err)
    },
    { enableHighAccuracy: true, timeout: 10000 }
  )
}

function setPersonMarker(latLng) {
  if (!mapRef) return

  if (personMarker) {
    personMarker.setLatLng(latLng)
    return
  }

  const icon = L.divIcon({
    html: '<div class="person-marker">🚶</div>',
    className: 'person-marker-wrap',
    iconSize: [38, 38],
    iconAnchor: [19, 38]
  })

  personMarker = L.marker(latLng, {
    icon,
    zIndexOffset: 1000,
    interactive: false
  }).addTo(mapRef)
}

function returnToMain() {
  router.push(getIsAdmin() ? '/main-admin' : '/main-user')
}
</script>

<style scoped>
.wizard-shell {
  display: grid;
  grid-template-columns: minmax(240px, 25%) minmax(0, 1fr);
  gap: 14px;
  margin-top: 12px;
  align-items: start;
}

.wizard-sidebar,
.wizard-panel {
  background: var(--white);
  border: 1px solid var(--gray-200);
  border-radius: var(--radius);
  box-shadow: var(--shadow-sm);
}

.wizard-sidebar {
  position: sticky;
  top: 12px;
  padding: 10px;
  max-height: calc(100vh - 24px);
  overflow: hidden;
}

.wizard-panel {
  padding: 14px;
  min-height: min(680px, calc(100vh - 120px));
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.tablet-stepper {
  display: none;
}

.step-heading {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  border-bottom: 1px solid var(--gray-200);
  padding-bottom: 12px;
}

.step-heading h2 {
  font-size: clamp(1.4rem, 2vw, 2rem);
}

.step-heading p {
  color: var(--gray-500);
}

.eyebrow {
  color: var(--cptm-red) !important;
  font-weight: 900;
  text-transform: uppercase;
  font-size: 0.78rem;
}

.wizard-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.field.wide {
  grid-column: 1 / -1;
}

.location-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 380px;
  gap: 16px;
}

.map-card {
  border: 1px solid var(--gray-200);
  border-radius: var(--radius);
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.map-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

#efluente-map {
  height: 420px;
  border-radius: var(--radius);
  overflow: hidden;
  z-index: 1;
}

:deep(.person-marker-wrap) {
  background: transparent;
  border: 0;
}

:deep(.person-marker) {
  width: 38px;
  height: 38px;
  display: grid;
  place-items: center;
  border-radius: 999px;
  background: #fff;
  border: 2px solid var(--cptm-blue);
  box-shadow: 0 8px 18px rgba(16, 24, 40, 0.22);
  font-size: 22px;
  line-height: 1;
}

.attachments-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 12px;
}

.upload-panel,
.attachment-column,
.review-card,
.preview-panel {
  border: 1px solid var(--gray-200);
  border-radius: var(--radius);
  padding: 12px;
  background: var(--gray-25);
}

.upload-panel,
.attachment-column.wide {
  grid-column: 1 / -1;
}

.upload-panel {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(220px, auto);
  gap: 12px;
  align-items: center;
  background: #fff;
}

.upload-panel.dragging {
  border-color: var(--cptm-blue);
  box-shadow: 0 0 0 4px rgba(43, 92, 158, 0.12);
}

.upload-copy {
  min-width: 0;
}

.upload-counters {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.upload-counters span {
  border: 1px solid var(--gray-200);
  border-radius: 999px;
  background: var(--gray-50);
  padding: 5px 9px;
  color: var(--gray-700);
  font-size: 0.82rem;
  font-weight: 900;
}

.upload-drop {
  min-height: 44px;
  border: 2px dashed var(--gray-300);
  border-radius: var(--radius);
  background: var(--white);
  display: flex;
  align-items: center;
  justify-content: center;
  white-space: nowrap;
  padding: 8px 12px;
  color: var(--cptm-red);
  font-weight: 900;
  cursor: pointer;
}

.upload-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.upload-drop:focus-within {
  border-color: var(--cptm-red);
  box-shadow: 0 0 0 3px rgba(215, 25, 32, 0.12);
}

.attachment-column {
  min-height: 0;
}

.attachment-column .empty-state {
  padding: 14px;
}

.document-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 10px;
}

.document-list .attachment-card {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
}

.document-list .attachment-card span {
  grid-column: 1;
}

.document-list .attachment-card .btn {
  grid-row: 1 / span 2;
  grid-column: 2;
}

/* Legacy inner span styles kept harmless for older markup. */
.upload-drop span {
  color: var(--gray-500);
}

/*
  The upload drop target used to be a large empty square. Keep the visual compact
  so the form starts close to the top, especially on phones.
*/
.upload-drop.old-large {
  min-height: 130px;
  place-items: center;
  text-align: center;
}

.attachment-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(128px, 1fr));
  gap: 10px;
  margin-top: 10px;
}

.attachment-grid.compact {
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
}

.attachment-card {
  min-width: 0;
  border: 1px solid var(--gray-200);
  border-radius: var(--radius);
  background: var(--white);
  padding: 9px;
  display: flex;
  flex-direction: column;
  gap: 7px;
}

.attachment-card img {
  width: 100%;
  aspect-ratio: 4 / 3;
  object-fit: cover;
  border-radius: 6px;
  background: var(--gray-100);
}

.attachment-card strong,
.attachment-card span {
  overflow-wrap: anywhere;
}

.review-layout {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.review-card dl {
  display: grid;
  grid-template-columns: minmax(140px, 0.8fr) minmax(0, 1fr);
  gap: 8px 12px;
  margin: 12px 0 0;
}

.review-card dt {
  color: var(--gray-500);
  font-weight: 800;
}

.review-card dd {
  margin: 0;
  overflow-wrap: anywhere;
}

.preview-header,
.card-actions,
.wizard-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.preview-header {
  justify-content: space-between;
}

.preview-panel img {
  width: min(100%, 720px);
  max-height: 520px;
  object-fit: contain;
  border-radius: var(--radius);
  border: 1px solid var(--gray-200);
  margin-top: 12px;
}

.wizard-actions {
  justify-content: flex-end;
  margin-top: auto;
  border-top: 1px solid var(--gray-200);
  padding-top: 12px;
  position: sticky;
  bottom: 0;
  z-index: 20;
  background: rgba(255, 255, 255, 0.96);
  backdrop-filter: blur(10px);
}

@media (max-width: 1100px) {
  .wizard-shell {
    grid-template-columns: 1fr;
  }

  .wizard-sidebar {
    display: none;
  }

  .tablet-stepper {
    display: flex;
    flex-direction: column;
    gap: 10px;
    border-bottom: 1px solid var(--gray-200);
    padding-bottom: 10px;
  }

  .location-layout {
    grid-template-columns: 1fr;
  }

  .wizard-panel {
    min-height: auto;
  }
}

@media (max-width: 760px) {
  .wizard-shell {
    margin-top: 10px;
  }

  .tablet-stepper {
    display: none;
  }

  .wizard-panel {
    padding: 10px;
    gap: 12px;
  }

  .wizard-grid,
  .attachments-layout,
  .review-layout {
    grid-template-columns: 1fr;
  }

  .step-heading,
  .wizard-actions {
    align-items: stretch;
    flex-direction: column;
  }

  .step-heading {
    display: none;
  }

  .upload-panel {
    grid-template-columns: 1fr;
  }

  .upload-counters {
    order: 2;
  }

  .upload-drop {
    width: 100%;
    min-height: 48px;
  }

  .upload-actions {
    order: 3;
    flex-direction: column;
  }

  .attachment-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .document-list .attachment-card {
    grid-template-columns: 1fr;
  }

  .document-list .attachment-card .btn {
    grid-row: auto;
    grid-column: auto;
    width: 100%;
  }

  .wizard-actions {
    margin-inline: -10px;
    padding: 10px;
    box-shadow: 0 -10px 24px rgba(16, 24, 40, 0.08);
  }

  .wizard-actions .btn,
  .wizard-actions .btn-primary {
    width: 100%;
    min-height: 48px;
  }

  .review-card dl {
    grid-template-columns: 1fr;
  }
}
</style>
