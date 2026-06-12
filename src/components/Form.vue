<template>
  <AppLayout>
    <PageContainer>
      <Header :logo="logo" :title="isEditMode ? 'Editar Efluente' : 'Novo Efluente'"
        subtitle="Cadastro ambiental CPTM em etapas">
        <template #actions>
          <button type="button" class="btn ghost" @click="returnToMain">Voltar</button>
        </template>
      </Header>

      <MobileStepHeader :steps="steps" :current-step="currentStep" :progress-percent="progressPercent"
        @open-steps="showStepSheet = true" />

      <form class="wizard-shell" @submit.prevent="handleSubmitEfluente">
        <aside class="wizard-sidebar">
          <StepperResponsivo :steps="steps" :current-step="currentStep" :progress-percent="progressPercent"
            :step-errors="stepErrors" @go-to-step="goToStep" />
        </aside>

        <section class="wizard-panel">
          <div class="tablet-stepper">
            <StepperResponsivo :steps="compactSteps" :current-step="compactCurrentStep"
              :progress-percent="progressPercent" :step-errors="compactStepErrors" @go-to-step="goToCompactStep" />
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
            <template v-for="field in activeStep.fields" :key="field.key">
              <DomainSelect
                v-if="field.type === 'domain-select'"
                v-model="form[field.key]"
                :class="{ wide: field.wide }"
                :label="field.label"
                :options="getDomainOptions(field.domainKey)"
                :loading="dominiosLoading"
                :disabled="field.readonly"
                :help="field.help"
                :example="field.example"
              />
              <label v-else class="field" :class="{ wide: field.wide }">
              <div class="field-label-row">
                <span>{{ field.label }}</span>
                <FieldHelp :text="field.help" :example="field.example" />
              </div>
              <textarea v-if="field.type === 'textarea'" v-model="form[field.key]" rows="5"
                :placeholder="field.placeholder || ''" :disabled="field.readonly" />
              <select v-else-if="field.type === 'select'" v-model="form[field.key]" :disabled="field.readonly">
                <option value="">Selecione</option>
                <option v-for="option in getFieldOptions(field)" :key="option.codigo" :value="option.codigo">
                  {{ option.descricao }}
                </option>
              </select>
              <input v-else v-model="form[field.key]" :type="field.type || 'text'" :step="field.step" :min="field.min"
                :max="field.max" :inputmode="field.inputmode" :placeholder="field.placeholder || ''"
                :readonly="field.readonly" :disabled="field.readonly"
                @change="field.location ? updateMapFromInputs() : null" />
              </label>
            </template>
          </div>

          <div v-if="activeStep.kind === 'location'" class="location-layout">
            <div class="wizard-grid">
              <template v-for="field in activeStep.fields" :key="field.key">
                <DomainSelect
                  v-if="field.type === 'domain-select'"
                  v-model="form[field.key]"
                  :class="{ wide: field.wide }"
                  :label="field.label"
                  :options="getDomainOptions(field.domainKey)"
                  :loading="dominiosLoading"
                  :disabled="field.readonly"
                  :help="field.help"
                  :example="field.example"
                />
                <label v-else class="field" :class="{ wide: field.wide }">
                <div class="field-label-row">
                  <span>{{ field.label }}</span>
                  <FieldHelp :text="field.help" :example="field.example" />
                </div>
                <select v-if="field.type === 'select'" v-model="form[field.key]" :disabled="field.readonly">
                  <option value="">Selecione</option>
                  <option v-for="option in getFieldOptions(field)" :key="option.codigo" :value="option.codigo">
                    {{ option.descricao }}
                  </option>
                </select>
                <input v-else v-model="form[field.key]" :type="field.type || 'text'" :step="field.step" :min="field.min"
                  :max="field.max" :inputmode="field.inputmode" :placeholder="field.placeholder || ''"
                  :readonly="field.readonly" :disabled="field.readonly"
                  @change="field.location ? updateMapFromInputs() : null" />
                </label>
              </template>
            </div>
            <div class="map-card">
              <div id="efluente-map"></div>
              <div class="map-actions">
                <button type="button" class="btn info" @click="captureGPS">Pegar minha localizacao atual</button>
                <p class="muted">O marcador vermelho define o ponto do cadastro. O bonequinho mostra onde voce esta
                  agora.</p>
              </div>
            </div>
          </div>

          <div v-if="activeStep.kind === 'attachments'" class="attachments-layout">
            <div class="photo-help-inline">
              <FieldHelp text="Inserir Foto. Tamanho: 3x4. Posição e Orientação: Paisagem/Horizontal." />
            </div>

            <div class="upload-panel" :class="{ dragging: isDraggingFiles }" @dragenter.prevent="isDraggingFiles = true"
              @dragover.prevent="isDraggingFiles = true" @dragleave.prevent="isDraggingFiles = false"
              @drop.prevent="onFilesDropped">
              <div class="upload-copy">
                <h3>Anexos/Fotos</h3>
                <p class="muted">Arraste arquivos para este card ou selecione no navegador. Nada sera enviado antes de
                  clicar
                  em Enviar.</p>
              </div>
              <div class="upload-counters">
                <span>{{ imageFiles.length }} imagens</span>
                <span>{{ documentFiles.length }} documentos</span>
              </div>
              <div class="upload-actions">
                <button type="button" class="upload-drop" :class="{ active: isCameraOpen }" :disabled="isCameraStarting"
                  @click="openCamera">
                  <strong>{{ isCameraStarting ? 'Abrindo camera...' : isCameraOpen ? 'Camera aberta' : 'Tirar foto'
                  }}</strong>
                </button>
                <label class="upload-drop">
                  <input type="file" accept="image/*" multiple @change="onFilesSelected" hidden />
                  <strong>Selecionar da galeria</strong>
                </label>
                <label class="upload-drop">
                  <input type="file"
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/plain"
                    multiple @change="onFilesSelected" hidden />
                  <strong>Selecionar documento</strong>
                </label>
              </div>
            </div>

            <div v-if="isCameraOpen" class="camera-panel">
              <div class="camera-preview">
                <video ref="cameraVideoRef" autoplay playsinline muted></video>
              </div>
              <div class="camera-actions">
                <button type="button" class="btn-primary" :disabled="isCameraCapturing" @click="captureCameraPhoto">
                  {{ isCameraCapturing ? 'Salvando...' : 'Capturar e salvar' }}
                </button>
                <button type="button" class="btn ghost" @click="closeCamera">Fechar camera</button>
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
                  <dd>{{ displayValue(field, form[field.key]) }}</dd>
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
            <button type="button" class="btn warning" :disabled="saving" @click="saveDraftAndReturnToDrafts">Salvar
              rascunho</button>
            <button v-if="!isEditMode" type="button" class="btn info" :disabled="copyLastInspectionBusy"
              @click="applyLatestInspectionData">
              {{ copyLastInspectionBusy ? 'Buscando...' : 'Usar dados da última inspeção' }}
            </button>
            <button v-if="!isLastStep" type="button" class="btn-primary" @click="nextStep">Proximo</button>
            <button v-else type="submit" class="btn-primary" :disabled="saving">
              {{ saving ? 'Enviando...' : 'Enviar' }}
            </button>
          </footer>
        </section>
      </form>

      <StepperBottomSheet :visible="showStepSheet" :steps="steps" :current-step="currentStep" :step-errors="stepErrors"
        @close="showStepSheet = false" @go-to-step="goToStep" />

      <div v-if="draftLeaveModalVisible" class="modal-overlay" role="dialog" aria-modal="true">
        <div class="modal">
          <h3>Salvar como rascunho?</h3>
          <p>Deseja salvar este efluente como rascunho antes de sair?</p>
          <div class="modal-actions">
            <button type="button" class="btn ghost" :disabled="saving"
              @click="resolveDraftLeave('cancel')">Cancelar</button>
            <button type="button" class="btn" :disabled="saving" @click="resolveDraftLeave('discard')">Não</button>
            <button type="button" class="btn-primary" :disabled="saving" @click="resolveDraftLeave('save')">
              {{ saving ? 'Salvando...' : 'Sim, salvar' }}
            </button>
          </div>
        </div>
      </div>
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
import DomainSelect from './ui/DomainSelect.vue'
import EmptyState from './ui/EmptyState.vue'
import FieldHelp from './ui/FieldHelp.vue'
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
  getDominiosFormularioEfluenteAPI,
  getEfluenteAnexoBlobAPI,
  getEfluenteAnexosAPI,
  getEfluenteByPkAPI,
  getIsAdmin,
  getUltimaInspecaoEfluenteAPI,
  isRetryableApiError,
  updateEfluenteAPI,
  updateEfluenteMultipartAPI
} from '../services/api'
import { queueToast } from '../services/toastQueue'
import {
  attachmentRecordToFile,
  buildEfluentePayload,
  createAttachmentRecord,
  createDraftRecord,
  createEmptyEfluenteFormData,
  EFLUENTE_FIELD_KEYS,
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
const copyLastInspectionBusy = ref(false)
const isCameraOpen = ref(false)
const isCameraStarting = ref(false)
const isCameraCapturing = ref(false)
const draftLeaveModalVisible = ref(false)
const cameraVideoRef = ref(null)
const existingAttachments = ref([])
const attachmentPreviewUrl = ref('')
const attachmentPreviewName = ref('')
const attachmentPreviewType = ref('')
let attachmentObjectUrl = ''
let cameraStream = null
let mapRef = null
let mapMarker = null
let personMarker = null
let hasRequestedInitialLocation = false
let statusTimer = null
let draftLeaveResolve = null

const FIELDS_NOT_COPIED_FROM_LAST_INSPECTION = new Set([
  'pkCdMeioAmbienteCptm',
  'txNrElementoMonitoramento',
  'nrNumeroDeFormulario',
  'dtDataDoCadastramento',
  'hrHoraDoCadastramento'
])

const emptyForm = createEmptyEfluenteFormData()
const form = reactive(createEmptyEfluenteFormData())

const dominios = reactive({
  siglasDepartamentoMeioAmbiente: [],
  areasGestoras: [],
  naturezasPga: [],
  statusDesvio: [],
  statusRegistroBd: [],
  municipios: [],
  linhas: [],
  vias: [],
  trechosSentidos: [],
  estacoes: [],
  tiposProprietario: [],
  proprietarios: [],
  simNao: [],
  tiposAtividadeListada: [],
  tiposDraListado: [],
  tiposAtividadeCptm: [],
  locaisAtividade: [],
  origensEfluente: [],
  fontesGeradoras: [],
  tiposDestinacao: [],
  tiposVeiculo: []
})
const dominiosLoading = ref(true)
const dominiosLoadError = ref('')

const domainFieldKeys = {
  txSiglaDeptoMeioAmbiente: 'siglasDepartamentoMeioAmbiente',
  txStatusDoDesvioAmbiental: 'statusDesvio',
  txStatusDoRegistroNoBd: 'statusRegistroBd',
  txMunicipio: 'municipios',
  txLinhaCptm: 'linhas',
  txViaCptm: 'vias',
  txTrechoESentidoCptm: 'trechosSentidos',
  txEstacaoCptm: 'estacoes',
  txNaturezaDoPga: 'naturezasPga',
  txTipoAtividadeListada: 'tiposAtividadeListada',
  txTipoDraListado: 'tiposDraListado',
  txTipoAtividadeCptm: 'tiposAtividadeCptm',
  txNmLocalAtiv: 'locaisAtividade',
  txOrigemEfluente: 'origensEfluente',
  txFonteGeradora: 'fontesGeradoras',
  txTipoDestinacao: 'tiposDestinacao',
  txTipoVeiculo: 'tiposVeiculo',
  txOfereceRiscoSistemaCptm: 'simNao',
  txProprietario: 'proprietarios',
  txNmAreaGestoraCptm: 'areasGestoras'
}

const institutionalFields = [
  { key: 'txNomePjDaContratada', label: 'Nome (Pesso Jurídica) da Contratada', help: 'Inserir o nome e sigla da Contratada. Separar nome e sigla por " - ". A sigla pode conter até 10 caracteres, maiúsculos e sem espaços.', example: 'Companhia Paulista de Trens Metropolitanos S.A. - CPTM', wide: true },
  { key: 'txNrContratoContratada', label: 'Nº do Contrato (da Contratada)', help: 'Inserir o identificador do contrato da Contratada, se aplicável. Padrão: Número/Código com até 12 caracteres e sem espaços.', example: 'AR01234-56' },
  { key: 'txNmLocalEscopoContratual', label: 'Local do Escopo Contratual (Pseudônimo)', help: 'Indicar um nome genérico para o local do escopo contratual ou área/trecho da CPTM.', example: 'Pátio Capuava' },
  { key: 'txNomePfDaRepresentante', label: 'Representante (PF) da Contratada e/ou Área Gestora da CPTM', help: 'Inserir o nome do responsável interlocutor da Contratada e/ou da Área Gestora da CPTM para assuntos de meio ambiente, utilizando no máximo 89 caracteres.', example: 'Pessoa 1 / Pessoa 2', wide: true },
  { key: 'txSiglaDeptoMeioAmbiente', label: 'Sigla da Área de Meio Ambiente', type: 'domain-select', domainKey: 'siglasDepartamentoMeioAmbiente', help: 'Escolher a sigla do departamento interlocutor da Gerência de Meio Ambiente - GEA.', example: 'GEA.DEAE' },
  { key: 'txNmAreaGestoraCptm', label: 'Nome da Área Gestora CPTM', type: 'domain-select', domainKey: 'areasGestoras', help: 'Escolher área gestora da CPTM, se aplicável.', example: 'DEPTO. DE MANUT. DE SISTEMAS ELETR. E RESTAB. DE SERVICOS', wide: true },
  { key: 'txIdAreaGestoraCptm', label: 'Indentificador da Área Gestora CPTM', help: 'Campo Automático', example: 'ID.10-15-5-3-0000', readonly: true },
  { key: 'txSiglaAreaGestoraCptm', label: 'Sigla da Área Gestora CPTM', help: 'Campo Automático', example: 'DO.GOT.DOTV.1000', readonly: true },
  { key: 'txNomePjDaSupervisora', label: 'Nome (PJ) da Supervisora Ambiental', help: 'Inserir o nome e sigla da Supervisora Ambiental, utilizando no máximo 89 caracteres. Quando a Supervisora for a própria CPTM repetir a gerência e departamento ambiental informados anteriormente.', example: 'Empresa de Supervisão Ambiental Ltda. - ESA', wide: true },
  { key: 'txNomePjExecutora', label: 'Nome da Empresa Executora', help: 'Inserir o nome da empresa executora vinculada ao formulário, se aplicável.', example: 'Empresa Executora Ltda.', wide: true },
  { key: 'txNrContratoSupervisora', label: 'Nº do Contrato (da Supervisora)', help: 'Inserir o identificador do contrato da Supervisora Ambiental, se aplicável.', example: 'AR01234-56' }
]

const cadastrerFields = [
  { key: 'txAutorPjDoCadastro', label: 'Autor(a) (PJ) do Cadastramento', help: 'Inserir a pessoa jurídica responsável pelo cadastramento/caracterização da informação.', example: 'Companhia Paulista de Trens Metropolitanos S.A. - CPTM', wide: true },
  { key: 'txAutorPfDoCadastro', label: 'Autor(a) (PF) do Cadastramento', help: 'Inserir o nome completo da pessoa que realizou o cadastramento da informação.', example: 'Nome e Sobrenome - Pessoa 4', wide: true },
  { key: 'txNmResponsavelCadastro', label: 'Responsável Técnico - RT pelo Cadastramento', help: 'Inserir o nome completo do(a) responsável técnico(a) pelo cadastramento/caracterização da informação.', example: 'Nome e Sobrenome - Pessoa 5', wide: true },
  { key: 'txRpResponsavelCadastro', label: 'Registro Profissional (do RT)', help: 'Inserir o registro profissional do(a) responsável técnico(a) pelo cadastramento/caracterização da informação.', example: 'CREA - 123456 - Pessoa 5' },
  { key: 'txDrtResponsavelCadastro', label: 'Documento de Responsabilidade Técnica (do RT)', help: 'Inserir o documento de responsabilidade técnica do(a) responsável técnico(a) pela realização do trabalho.', example: 'ART nº 123456 - Pessoa 5' }
]

const formIdentificationFields = [
  { key: 'txNaturezaDoPga', label: 'Natureza (do PGA)', type: 'domain-select', domainKey: 'naturezasPga', help: 'Escolher a Natureza correspondente. Utilizar menu suspenso.', example: 'Emissões Atmosféricas' },
  { key: 'txTipoDeFormulario', label: 'Tipo de Formulário', help: 'Preencher manualmente até a fórmula automática ser implementada.', example: 'Formulário de Cadastramento - FDC (FDC-EEA.EF)' },
  { key: 'dtDataEmissaoFormulario', label: 'Data de Emissão do Formulário', type: 'date', help: 'Inserir a data de emissão do documento. Padrão: dd/mm/aaaa.', example: '01/01/2001' },
  { key: 'nrNumeroDeFormulario', label: 'Número do Formulário', type: 'number', min: 1, max: 999999, inputmode: 'numeric', help: 'Inserir o número de identificação do formulário. Escolher de 1 a 999.999. Digitar apenas números. O número deve ser sequencial, não replicável e com seis unidades. Exibição final: Nº 000001.', example: '1' },
  { key: 'txAutorPfDoFormulario', label: 'Autor(a) (Pessoa Física) do Formulário', help: 'Definir Explicação', example: 'Pessoa 5' },
  { key: 'txNmArquivoFdcRelacionado', label: 'Nome do arquivo FDC relacionado', help: 'Preencher manualmente até a fórmula automática ser implementada.', example: 'DeaoCtAr01823-02FdcEeaEfL10ProgaiaN000001', wide: true },
  { key: 'pkCdArquivoFdcRelacionado', label: 'Código do arquivo FDC relacionado', help: 'Preencher manualmente até a fórmula automática ser implementada.', example: 'FDC-EEA.EF-A.2026-L.07-CPTM-N.000001', wide: true },
  { key: 'txNmArquivoRvtRelacionado', label: 'Nome do arquivo RVT relacionado', help: 'Inserir o nome do arquivo RVT relacionado, se aplicável.', example: 'DeaeCt086020000100A2024Rvt018L07.pdf', wide: true },
  { key: 'pkCdElementoDeMonitorRvt', label: 'Código do E.M. no RVT relacionado', help: 'Inserir o código do elemento de monitoramento no RVT relacionado, se aplicável.', example: 'RVT-EEA.EF-A.2026-L.07-CPTM-N.000001', wide: true },
  { key: 'txNmArquivoDacRelacionado', label: 'Nome do Arquivo DAC relacionado', help: 'Inserir o nome do arquivo DAC relacionado, se aplicável.', example: 'DeaeCt086020000100A2024Dac018L07.pdf', wide: true },
  { key: 'pkCdElementoDeMonitorDac', label: 'Código do E.M. na DAC relacionada', help: 'Inserir o código do elemento de monitoramento na DAC relacionada, se aplicável.', example: 'DAC-EEA.EF-A.2026-L.07-CPTM-N.000001', wide: true },
  { key: 'txNmArquivoCncRelacionado', label: 'Nome do Arquivo CNC relacionado', help: 'Inserir o nome do arquivo CNC relacionado, se aplicável.', example: 'DeaeCt086020000100A2024Cnc018L07.pdf', wide: true },
  { key: 'pkCdElementoDeMonitorCnc', label: 'Código do E.M. na CNC relacionada', help: 'Inserir o código do elemento de monitoramento na CNC relacionada, se aplicável.', example: 'CNC-EEA.EF-A.2026-L.07-CPTM-N.000001', wide: true },
  { key: 'pkCdCodigoNoUltimoRra', label: 'Chave Primária no último RRA', help: 'Inserir a chave primária do último RRA relacionado, se aplicável.', example: 'RRA-EEA.EF-A.2026-L.07-CPTM-N.000001', wide: true },
  { key: 'pkCdCedoc', label: 'Chave Primária - Centro de Documentação', help: 'Inserir a chave primária do Centro de Documentação, se aplicável.', example: 'CEDOC-000001', wide: true }
]

const registrationDateTimeFields = [
  { key: 'dtDataDoCadastramento', label: 'Data do Cadastramento', type: 'date', help: 'Preenchido automaticamente com a data e hora do dispositivo.', example: '01/01/2001', readonly: true },
  { key: 'hrHoraDoCadastramento', label: 'Hora do Cadastramento', type: 'time', help: 'Preenchido automaticamente com a data e hora do dispositivo.', example: '09:00', readonly: true }
]

const monitoredElementFields = [
  { key: 'pkCdMeioAmbienteCptm', label: 'Chave Primária - Meio Ambiente', help: 'Preencher manualmente até a fórmula automática ser implementada.', example: 'EEA.EF-A.2026-L.07-CPTM-N.000001', wide: true },
  { key: 'txNrElementoMonitoramento', label: 'Elemento de Monitoramento - Número', min: 1, max: 999999, inputmode: 'numeric', help: 'Inserir o número do elemento monitorado. Escolher de 1 a 999.999. Digitar apenas números. O número deve ser sequencial, não replicável e com seis unidades. Exibição final: N.000001.', example: '1' },
  { key: 'txNmElementoMonitoramento', label: 'Elemento de Monitoramento - Nome', help: 'Indicar um nome genérico para o elemento de monitoramento.', example: 'Plataforma 1' },
  { key: 'txStatusDoRegistroNoBd', label: 'Status do Registro no BD', type: 'domain-select', domainKey: 'statusRegistroBd', help: 'Indica se o registro está ativo ou inativo no banco de dados.', example: 'Ativo', readonly: !getIsAdmin() },
  { key: 'txStatusDoDesvioAmbiental', label: 'Status do Desvio Ambiental', type: 'domain-select', domainKey: 'statusDesvio', help: 'Indica a situação de regularidade ambiental do desvio.', example: 'Regularizado', readonly: !getIsAdmin() }
]

const locationFields = [
  { key: 'txMunicipio', label: 'Nome de Município', type: 'domain-select', domainKey: 'municipios', help: 'Selecionar o município no qual está localizado o elemento monitorado no ato da vistoria, se aplicável. Utilizar menu suspenso.', example: 'Campo Limpo Paulista' },
  { key: 'txLinhaCptm', label: 'Nome da Linha CPTM', type: 'domain-select', domainKey: 'linhas', help: 'Escolher o número da Linha. Utilizar menu suspenso.', example: 'Linha 07 - Rubi' },
  { key: 'txEstacaoCptm', label: 'Nome da Estação CPTM', type: 'domain-select', domainKey: 'estacoes', help: 'Selecionar o nome da estação na qual está localizado o elemento monitorado no ato da vistoria, se aplicável. Utilizar menu suspenso.', example: 'Estação Jardim Helena - Vila Mara' },
  { key: 'txViaCptm', label: 'Número da Via da Linha CPTM', type: 'domain-select', domainKey: 'vias', help: 'Selecionar a via na qual está localizado o elemento monitorado no ato da vistoria, se aplicável. Utilizar menu suspenso.', example: 'Via 03E - Trecho 2' },
  { key: 'txTrechoESentidoCptm', label: 'Trecho e Sentido da Linha CPTM', type: 'domain-select', domainKey: 'trechosSentidos', help: 'Selecionar o trecho e sentido da via na qual está localizado o elemento monitorado no ato da vistoria, se aplicável. Utilizar menu suspenso.', example: 'Estação Antônio Gianetti Neto - Estação Ferraz de Vasconcelos', wide: true },
  { key: 'txKmPoste', label: 'Número do Quilômetro e Poste', help: 'Inserir o Km/Poste mais próximo do elemento de monitoramento vistoriado, se aplicável. Padrão: "00/00" ou "000/000".', example: '51/02' },
  { key: 'nrLatGrauDecimalWgs84', label: 'Latitude em Graus (Datum: WGS84)', type: 'number', step: 'any', location: true, help: 'Definir Explicação', example: '-23.123456' },
  { key: 'nrLongGrauDecimalWgs84', label: 'Longitude em Graus (Datum: WGS84)', type: 'number', step: 'any', location: true, help: 'Definir Explicação', example: '-46.123456' },
  { key: 'nrLatMetrosSirgas2000', label: 'Latitude em Metros (Datum: SIRGAS2000)', type: 'number', step: 'any', help: 'Inserir a latitude em metros no datum SIRGAS2000, se aplicável.', example: '7390000.00' },
  { key: 'nrLongMetrosSirgas2000', label: 'Longitude em Metros (Datum: SIRGAS2000)', type: 'number', step: 'any', help: 'Inserir a longitude em metros no datum SIRGAS2000, se aplicável.', example: '330000.00' }
]

const environmentalRegulationFields = [
  { key: 'txTipoAtividadeListada', label: 'Tipo de Atividade (Listada)', type: 'domain-select', domainKey: 'tiposAtividadeListada', help: 'Selecionar o tipo de atividade relacionada ao elemento de monitoramento.', example: 'Outro(a)(s)' },
  { key: 'txTipoAtividadeNListada', label: 'Tipo de Atividade (Não Listada)', help: 'Inserir o tipo de atividade não listada quando "Tipo de Atividade (Listada)" for "Outro(a)(s)".', example: 'Transporte' },
  { key: 'txTipoDraListado', label: 'Tipo de DRA (Listado)', type: 'domain-select', domainKey: 'tiposDraListado', help: 'Selecionar o tipo de DRA relacionado ao elemento de monitoramento.', example: 'Outro(a)(s)' },
  { key: 'txTipoDraNListado', label: 'Tipo de DRA (Não Listado)', help: 'Inserir o tipo de DRA não listado quando "Tipo de DRA (Listado)" for "Outro(a)(s)".', example: 'Teste' },
  { key: 'txIdDra', label: 'Código Identificador do DRA', help: 'Inserir o código identificador do DRA.', example: 'DRF nº 123.456' },
  { key: 'dtValidadeDra', label: 'Data de Validade do DRA', type: 'date', help: 'Inserir a data de validade do DRA. Padrão: dd/mm/aaaa.', example: '01/01/2001' },
  { key: 'txAnaliseCptmAprovacao', label: 'Análise CPTM para Aprovação', type: 'textarea', help: 'Inserir a análise da CPTM para aprovação, quando aplicável.', example: 'Aprovado com ressalvas.', wide: true },
  { key: 'txOfereceRiscoSistemaCptm', label: 'Oferece Risco ao Sistema CPTM', type: 'domain-select', domainKey: 'simNao', help: 'Indicar se o efluente oferece risco ao sistema CPTM.', example: 'Não' }
]

const detailFields = [
  { key: 'txTipoAtividadeCptm', label: 'Tipo de Atividade na CPTM', type: 'domain-select', domainKey: 'tiposAtividadeCptm', help: 'Selecionar o tipo de atividade na CPTM. Utilizar lista suspensa.', example: 'Empreendimento/Obra' },
  { key: 'txNmLocalAtiv', label: 'Nome Edificação/Local da CPTM', type: 'domain-select', domainKey: 'locaisAtividade', help: 'Selecionar o nome da edificação/local da CPTM. Utilizar lista suspensa.', example: 'Estação' },
  { key: 'txNmLocalAtivComplemento', label: 'Nome Edificação/Local (Complemento)', help: 'Inserir o complemento do nome da edificação/local na CPTM.', example: 'Brás' },
  { key: 'txOrigemEfluente', label: 'Origem do Efluente', type: 'domain-select', domainKey: 'origensEfluente', help: 'Selecionar a origem do efluente. Utilizar lista suspensa.', example: 'Industrial' },
  { key: 'txFonteGeradora', label: 'Fonte Geradora do Efluente', type: 'domain-select', domainKey: 'fontesGeradoras', help: 'Selecionar a fonte geradora do efluente. Utilizar lista suspensa.', example: 'Banheiro químico' },
  { key: 'nrQuantidadeL', label: 'Quantidade (Litros)', type: 'number', step: 'any', help: 'Inserir a quantidade em litros de efluente. Padrão: número com até 8 casas decimais.', example: '9,25' },
  { key: 'txTipoDestinacao', label: 'Tipo de Destinação do Efluente', type: 'domain-select', domainKey: 'tiposDestinacao', help: 'Selecionar o tipo de destinação do efluente. Utilizar lista suspensa.', example: 'Interligação em rede coletora' },
  { key: 'txTipoVeiculo', label: 'Tipo de Veículo', type: 'domain-select', domainKey: 'tiposVeiculo', help: 'Selecionar o tipo de veículo transportador do efluente. Utilizar lista suspensa.', example: 'Caminhão' },
  { key: 'txIdVeiculo', label: 'Identificador/Placa do Veículo', help: 'Inserir identificador/placa do veículo transportador do efluente.', example: 'WAD 105D' },
  { key: 'txIdGuiaRemessa', label: 'Código Identificador da Guia de Remessa', help: 'Inserir o código identificador da guia de remessa.', example: 'ID nº 10.456' },
  { key: 'nrDistanciaDaViaM', label: 'Distância da Via CPTM (Metros)', type: 'number', step: 'any', help: 'Inserir a distância da via mais próxima em relação ao efluente, utilizando número decimal em metros.', example: '7,58' },
  { key: 'txProprietario', label: 'Proprietário', type: 'domain-select', domainKey: 'proprietarios', help: 'Selecionar o proprietário relacionado ao efluente.', example: 'CPTM', wide: true },
  { key: 'txObsCadastramento', label: 'Obsevações Gerais: Cadastramento', type: 'textarea', help: 'Inserir observações relavantes, relativas ao cadastramento/caracterização, se necessário. Utilizar no máximo 255 caracteres.', wide: true }
]

const steps = [
  { title: 'Premíssas Institucionais / Cabeçalho', description: 'Dados institucionais, contratada, supervisora e área gestora', kind: 'fields', fields: institutionalFields },
  { title: 'Identificação do Cadastrador e Responsável Técnico', description: 'Autor do cadastramento e responsável técnico', kind: 'fields', fields: cadastrerFields },
  { title: 'Identificação do Formulário', description: 'Natureza, formulário e arquivo FDC relacionado', kind: 'fields', fields: formIdentificationFields },
  { title: 'Data e Hora do Cadastro do E.M.', description: 'Momento do cadastramento da informação', kind: 'fields', fields: registrationDateTimeFields },
  { title: 'Identificação do E.M.', description: 'Chave primária, número e nome do elemento monitorado', kind: 'fields', fields: monitoredElementFields },
  { title: 'Localização do E.M.', description: 'Município, linha, estação, via, trecho e coordenadas', kind: 'location', fields: locationFields },
  { title: '7.1. Regulamentação Ambiental', description: 'Atividade, DRA e validade', kind: 'fields', fields: environmentalRegulationFields },
  { title: '7.2. Detalhamento', description: 'Atividade CPTM, origem, volume, destinação e observações', kind: 'fields', fields: detailFields },
  { title: '7.3. Registro Fotográfico', description: 'Fotografias e anexos do efluente', kind: 'attachments', badge: 'Fotos' },
  { title: 'Revisão e envio', description: 'Conferência antes de enviar ao sistema central', kind: 'review', badge: 'Resumo' }
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
  { title: 'Premíssas Institucionais / Cabeçalho', fields: institutionalFields },
  { title: 'Identificação do Cadastrador e Responsável Técnico', fields: cadastrerFields },
  { title: 'Identificação do Formulário', fields: formIdentificationFields },
  { title: 'Data e Hora do Cadastro do E.M.', fields: registrationDateTimeFields },
  { title: 'Identificação do E.M.', fields: monitoredElementFields },
  { title: 'Localização do E.M.', fields: locationFields },
  { title: '7.1. Regulamentação Ambiental', fields: environmentalRegulationFields },
  { title: '7.2. Detalhamento', fields: detailFields }
])

// Automação de campos derivada do domínio de Área Gestora
watch(() => form.txNmAreaGestoraCptm, (newVal) => {
  const option = findDomainOption('areasGestoras', newVal)
  if (option) {
    const desc = option.descricao || ''
    const siglaMatch = desc.match(/\(([^)]+)\)/)
    const idMatch = desc.match(/\[([^\]]+)\]/)

    form.txSiglaAreaGestoraCptm = siglaMatch ? siglaMatch[1] : ''
    form.txIdAreaGestoraCptm = idMatch ? idMatch[1] : ''
  }
})

function getDomainOptions(domainKey) {
  return Array.isArray(dominios[domainKey]) ? dominios[domainKey] : []
}

function findDomainOption(domainKey, value) {
  if (value === '' || value === null || value === undefined) return null

  const normalizedValue = String(value)
  return getDomainOptions(domainKey).find((option) => (
    String(option.codigo) === normalizedValue || String(option.descricao) === normalizedValue
  )) || null
}

function coerceDomainFieldValuesToDescription() {
  for (const [fieldKey, domainKey] of Object.entries(domainFieldKeys)) {
    const option = findDomainOption(domainKey, form[fieldKey])
    if (option && form[fieldKey] !== option.descricao) {
      form[fieldKey] = option.descricao
    }
  }
}

function getFieldOptions(field) {
  const options = Array.isArray(field?.options?.value) ? field.options.value : []
  const currentValue = form[field?.key]

  // Verifica se o valor atual (codigo) existe nas opções
  if (!currentValue || options.some(o => o.codigo === currentValue)) return options

  // Fallback caso o valor não exista (ex: rascunho antigo)
  return [currentValue, ...options]
}

async function loadDominiosFormulario() {
  dominiosLoading.value = true
  dominiosLoadError.value = ''

  try {
    const loadedDominios = await getDominiosFormularioEfluenteAPI()
    for (const key of Object.keys(dominios)) {
      dominios[key] = Array.isArray(loadedDominios?.[key]) ? loadedDominios[key] : []
    }
    coerceDomainFieldValuesToDescription()
  } catch (err) {
    console.error('Erro ao carregar dominios do formulario', err)
    dominiosLoadError.value = err?.message || 'Não foi possível carregar as listas suspensas.'
    setStatus(dominiosLoadError.value, 'error', 6000)
  } finally {
    dominiosLoading.value = false
  }
}

watch(currentStep, async () => {
  if (activeStep.value.kind !== 'attachments') closeCamera({ silent: true })
  if (activeStep.value.kind === 'location') {
    await nextTick()
    initMap()
  }
})

onMounted(async () => {
  await loadDominiosFormulario()

  if (isEditMode.value) {
    await loadEfluente()
    await loadAttachments()
  } else {
    initializeNewEfluenteDateTime()
  }
  if (activeStep.value.kind === 'location') initMap()
})

onBeforeUnmount(() => {
  closeCamera({ silent: true })
  clearAttachmentPreview()
  clearSelectedPreviewUrls()
  clearTransientMessages()
  resolveDraftLeave('cancel')
  if (mapRef) mapRef.remove()
})

onBeforeRouteLeave(async () => {
  return saveDraftBeforeLeaving()
})

function setStatus(message, type = 'info', duration = 0) {
  if (statusTimer) {
    clearTimeout(statusTimer)
    statusTimer = null
  }

  status.value = message
  statusType.value = type

  if (message && duration > 0) {
    statusTimer = setTimeout(() => {
      status.value = ''
      statusType.value = 'info'
      statusTimer = null
    }, duration)
  }
}

function clearTransientMessages() {
  if (statusTimer) {
    clearTimeout(statusTimer)
    statusTimer = null
  }

  status.value = ''
  statusType.value = 'info'
}

function getCurrentLocalDateTime() {
  const now = new Date()

  const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`

  return { date, time }
}

function initializeNewEfluenteDateTime() {
  const { date, time } = getCurrentLocalDateTime()

  if (!form.dtDataDoCadastramento) form.dtDataDoCadastramento = date
  if (!form.hrHoraDoCadastramento) form.hrHoraDoCadastramento = time

  const defaultStatusRegistro = findDomainOption('statusRegistroBd', 1)?.descricao || ''
  const defaultStatusDesvio = findDomainOption('statusDesvio', 1)?.descricao || ''

  if (!form.txStatusDoRegistroNoBd) form.txStatusDoRegistroNoBd = defaultStatusRegistro
  if (!form.txStatusDoDesvioAmbiental) form.txStatusDoDesvioAmbiental = defaultStatusDesvio
}

async function applyLatestInspectionData() {
  if (isEditMode.value) return

  if (copyLastInspectionBusy.value) return
  copyLastInspectionBusy.value = true
  setStatus('Buscando dados da última inspeção...', 'info')

  try {
    const latest = await getUltimaInspecaoEfluenteAPI()
    const sourceData = mapApiEfluenteToFormData(latest)

    if (!Object.values(sourceData).some(Boolean)) {
      setStatus('Nenhuma inspeção anterior encontrada.', 'warning')
      return
    }

    copyFixedFieldsFromLatestInspection(sourceData)
    updateMapFromInputs()

    setStatus('Dados da última inspeção copiados.', 'success')
  } catch (err) {
    console.error('Erro ao copiar dados da última inspeção', err)
    setStatus(err?.message || 'Não foi possível copiar os dados da última inspeção.', 'error')
  } finally {
    copyLastInspectionBusy.value = false
  }
}

function copyFixedFieldsFromLatestInspection(sourceData = {}) {
  for (const key of EFLUENTE_FIELD_KEYS) {
    if (FIELDS_NOT_COPIED_FROM_LAST_INSPECTION.has(key)) continue
    form[key] = sourceData[key] ?? ''
  }
  coerceDomainFieldValuesToDescription()
}

async function loadEfluente() {
  setStatus('Carregando efluente...', 'info')
  try {
    const routeId = String(route.params.id || '')
    const localRecords = await getAllInspections()
    const localRecord = (localRecords || [])
      .map(normalizeLocalEfluenteRecord)
      .find(item => item?.syncStatus !== SYNC_STATUS.SENT && isSameLocalOrServerRecord(item, routeId))

    if (localRecord) {
      localDraftId.value = localRecord.localId
      loadedFromLocal.value = true
      Object.assign(form, createEmptyEfluenteFormData(), localRecord.formData)
      coerceDomainFieldValuesToDescription()
      setSelectedAttachments(getDraftAttachmentRecords(localRecord))
      console.log('dados exibidos', localRecord.formData)
      setStatus('', 'info')
      return
    }

    const apiData = await getEfluenteByPkAPI(routeId)
    const formData = mapApiEfluenteToFormData(apiData)
    console.log('dados api', apiData)
    Object.assign(form, createEmptyEfluenteFormData(), formData)
    coerceDomainFieldValuesToDescription()
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
  return (localRecords || [])
    .map(normalizeLocalEfluenteRecord)
    .find(item => item?.syncStatus !== SYNC_STATUS.SENT && isSameLocalOrServerRecord(item, id)) || null
}

function isSameLocalOrServerRecord(item, id) {
  const key = String(id || '')
  if (!key) return false

  return String(item?.localId || '') === key
    || String(item?.id || '') === key
    || String(item?.pkCdMeioAmbienteCptm || '') === key
    || String(item?.formData?.pkCdMeioAmbienteCptm || '') === key
}

function getDraftLocalIdForSave() {
  if (localDraftId.value) return localDraftId.value

  const routeId = String(route.params.id || '')
  if (isEditMode.value && routeId && routeId !== 'new') return routeId

  return undefined
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
    localId: getDraftLocalIdForSave(),
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
  if (!silent) setStatus('Rascunho salvo com sucesso.', 'success', 5000)

  if (updateRoute && route.params.id === 'new') {
    router.replace(`/form/${encodeURIComponent(localDraftId.value)}`)
  }

  return saved
}

async function saveDraftAndReturnToDrafts() {
  if (saving.value) return

  saving.value = true
  try {
    await saveDraft({ silent: true, updateRoute: false })
    hasSavedSuccessfully.value = true
    clearTransientMessages()
    queueToast({
      type: 'success',
      title: 'Rascunho salvo',
      message: 'Seu efluente foi salvo como rascunho e poderá ser continuado posteriormente.',
      duration: 5000
    })
    await router.push(getDraftsListRoute())
  } catch (err) {
    console.error('Erro ao salvar rascunho', err)
    setStatus(err?.message || 'Não foi possível salvar o rascunho.', 'error', 6000)
  } finally {
    saving.value = false
  }
}

function getDraftsListRoute() {
  return {
    path: getIsAdmin() ? '/main-admin' : '/main-user',
    query: getIsAdmin()
      ? { tab: 'my-inspections', filter: 'scheduled' }
      : { filter: 'scheduled' }
  }
}

async function saveDraftBeforeLeaving() {
  if (saving.value || hasSavedSuccessfully.value) return
  if (!hasDraftableData()) return

  const action = await askDraftLeaveAction()
  if (action === 'cancel') return false
  if (action === 'discard') {
    hasSavedSuccessfully.value = true
    clearTransientMessages()
    return true
  }

  saving.value = true
  try {
    await saveDraft({ silent: true, updateRoute: false })
    hasSavedSuccessfully.value = true
    clearTransientMessages()
    queueToast({
      type: 'success',
      title: 'Rascunho salvo',
      message: 'Seu efluente foi salvo como rascunho e poderá ser continuado posteriormente.',
      duration: 5000
    })
    return true
  } catch (err) {
    console.error('Erro ao salvar rascunho antes de sair', err)
    setStatus(err?.message || 'Não foi possível salvar o rascunho.', 'error', 6000)
    return false
  } finally {
    saving.value = false
  }
}

function askDraftLeaveAction() {
  draftLeaveModalVisible.value = true
  return new Promise(resolve => {
    draftLeaveResolve = resolve
  })
}

function resolveDraftLeave(action) {
  if (!draftLeaveResolve) {
    draftLeaveModalVisible.value = false
    return
  }

  const resolve = draftLeaveResolve
  draftLeaveResolve = null
  draftLeaveModalVisible.value = false
  resolve(action)
}

async function handleSubmitEfluente() {
  if (saving.value) return
  if (!validateCurrentStep()) return
  const validation = validateEfluenteForSubmit(form)
  if (!validation.valid) {
    setStatus(validation.errors[0], 'error', 6000)
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

  saving.value = true
  setStatus(isEditMode.value ? 'Atualizando efluente...' : 'Criando efluente...', 'info')
  try {
    const queuedDraft = await saveDraft({
      silent: true,
      updateRoute: false,
      syncStatus: SYNC_STATUS.PENDING_SYNC
    })
    localDraftId.value = queuedDraft.localId || queuedDraft.id
    loadedFromLocal.value = true

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      hasSavedSuccessfully.value = true
      clearTransientMessages()
      queueToast({
        type: 'warning',
        title: 'Aguardando envio',
        message: 'Efluente salvo como Aguardando Envio. Ele será enviado automaticamente quando o sistema central voltar.',
        duration: 5000
      })
      await router.push(getDraftsListRoute())
      return
    }

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
    clearTransientMessages()
    queueToast({
      type: 'success',
      title: 'Efluente enviado com sucesso',
      message: 'Efluente enviado com sucesso.',
      duration: 5000
    })
    await router.push(getDraftsListRoute())
  } catch (err) {
    console.error('Erro ao salvar efluente', err)
    const retryable = isRetryableApiError(err)
    const saved = await saveDraft({
      silent: true,
      updateRoute: false,
      syncStatus: retryable ? SYNC_STATUS.PENDING_SYNC : SYNC_STATUS.ERROR,
      lastError: err?.message || 'Erro ao enviar'
    })
    localDraftId.value = saved.localId || saved.id
    loadedFromLocal.value = true
    if (retryable) {
      hasSavedSuccessfully.value = true
      clearTransientMessages()
      queueToast({
        type: 'warning',
        title: 'Aguardando envio',
        message: 'Efluente salvo como Aguardando Envio. Ele será enviado automaticamente quando o sistema central voltar.',
        duration: 5000
      })
      await router.push(getDraftsListRoute())
      return
    }

    setStatus(
      err?.message || 'Não foi possível enviar o efluente. Verifique os dados e tente novamente.',
      'error',
      6000
    )
  } finally {
    saving.value = false
  }
}

async function openCamera() {
  if (isCameraOpen.value && cameraStream) return

  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
    setStatus('Camera nao disponivel neste navegador.', 'error')
    return
  }

  isCameraStarting.value = true
  setStatus('Abrindo camera...', 'info')

  try {
    closeCamera({ silent: true })
    cameraStream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: { ideal: 'environment' },
        width: { ideal: 1920 },
        height: { ideal: 1080 }
      },
      audio: false
    })
    isCameraOpen.value = true
    await nextTick()

    if (cameraVideoRef.value) {
      cameraVideoRef.value.srcObject = cameraStream
      await cameraVideoRef.value.play?.()
    }

    setStatus('Camera pronta para capturar.', 'success')
  } catch (err) {
    console.error('Erro ao abrir camera', err)
    closeCamera({ silent: true })
    setStatus(getCameraErrorMessage(err), 'error')
  } finally {
    isCameraStarting.value = false
  }
}

function closeCamera({ silent = false } = {}) {
  if (cameraStream) {
    cameraStream.getTracks().forEach(track => track.stop())
    cameraStream = null
  }

  if (cameraVideoRef.value) {
    cameraVideoRef.value.srcObject = null
  }

  isCameraOpen.value = false
  isCameraCapturing.value = false
  if (!silent) setStatus('', 'info')
}

async function captureCameraPhoto() {
  const video = cameraVideoRef.value
  if (!cameraStream || !video) {
    setStatus('Camera ainda nao esta pronta.', 'error')
    return
  }

  isCameraCapturing.value = true

  try {
    const width = video.videoWidth
    const height = video.videoHeight
    if (!width || !height) {
      setStatus('Aguardando imagem da camera...', 'info')
      return
    }

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height

    const context = canvas.getContext('2d')
    if (!context) throw new Error('Nao foi possivel preparar a foto.')

    context.drawImage(video, 0, 0, width, height)
    const blob = await canvasToBlob(canvas)
    const fileName = `foto-${formatPhotoTimestamp(new Date())}.jpg`
    const file = createPhotoFile(blob, fileName)

    addSelectedFiles([file])
    setStatus('Foto capturada e adicionada aos anexos.', 'success')
  } catch (err) {
    console.error('Erro ao capturar foto', err)
    setStatus(err?.message || 'Nao foi possivel capturar a foto.', 'error')
  } finally {
    isCameraCapturing.value = false
  }
}

function canvasToBlob(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob)
      else reject(new Error('Nao foi possivel salvar a foto.'))
    }, 'image/jpeg', 0.92)
  })
}

function createPhotoFile(blob, name) {
  if (typeof File !== 'undefined') {
    return new File([blob], name, { type: 'image/jpeg', lastModified: Date.now() })
  }

  blob.name = name
  blob.lastModified = Date.now()
  return blob
}

function formatPhotoTimestamp(date) {
  const pad = value => String(value).padStart(2, '0')
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate())
  ].join('')
    + '-'
    + [pad(date.getHours()), pad(date.getMinutes()), pad(date.getSeconds())].join('')
}

function getCameraErrorMessage(err) {
  const name = err?.name || ''
  if (name === 'NotAllowedError' || name === 'SecurityError') return 'Permissao da camera negada.'
  if (name === 'NotFoundError' || name === 'OverconstrainedError') return 'Nenhuma camera compativel foi encontrada.'
  if (name === 'NotReadableError') return 'A camera esta em uso por outro aplicativo.'
  return err?.message || 'Nao foi possivel abrir a camera.'
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

function displayValue(field, value) {
  if (value === '' || value === null || value === undefined) return 'Nao informado'
  if (field.type === 'domain-select') {
    return findDomainOption(field.domainKey, value)?.descricao || value
  }
  if (field.type === 'select') {
    const options = getFieldOptions(field)
    const found = options.find(o => o.codigo === value)
    return found ? found.descricao : value
  }
  return value
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

.field-label-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
  min-width: 0;
}

.field-label-row>span {
  min-width: 0;
  overflow-wrap: anywhere;
}

.field input:disabled,
.field select:disabled,
.field textarea:disabled {
  background: var(--gray-100);
  color: var(--gray-500);
  cursor: not-allowed;
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

.attachments-layout>.wizard-grid {
  grid-column: 1 / -1;
}

.photo-help-inline {
  grid-column: 1 / -1;
  display: flex;
  justify-content: flex-end;
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
  appearance: none;
  text-align: center;
}

.upload-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.upload-drop.active {
  border-color: var(--cptm-blue);
  color: var(--cptm-blue);
  background: rgba(43, 92, 158, 0.06);
}

.upload-drop:disabled {
  cursor: not-allowed;
  opacity: 0.65;
}

.upload-drop:focus-within {
  border-color: var(--cptm-red);
  box-shadow: 0 0 0 3px rgba(215, 25, 32, 0.12);
}

.upload-drop:focus-visible {
  outline: 0;
  border-color: var(--cptm-red);
  box-shadow: 0 0 0 3px rgba(215, 25, 32, 0.12);
}

.camera-panel {
  grid-column: 1 / -1;
  border: 1px solid var(--gray-200);
  border-radius: var(--radius);
  padding: 12px;
  background: var(--white);
}

.camera-preview {
  aspect-ratio: 16 / 9;
  min-height: 260px;
  overflow: hidden;
  border-radius: var(--radius);
  background: #111827;
}

.camera-preview video {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: cover;
  background: #111827;
}

.camera-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 10px;
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

.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 1300;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  background: rgba(15, 23, 42, 0.42);
}

.modal {
  width: min(460px, 100%);
  border: 1px solid var(--gray-200);
  border-radius: var(--radius);
  background: var(--white);
  box-shadow: 0 18px 50px rgba(16, 24, 40, 0.22);
  padding: 16px;
}

.modal h3 {
  margin: 0 0 0.45rem;
  color: var(--gray-900);
}

.modal p {
  color: var(--gray-600);
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 16px;
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

  .camera-preview {
    min-height: 220px;
  }

  .camera-actions {
    flex-direction: column;
  }

  .camera-actions .btn,
  .camera-actions .btn-primary {
    width: 100%;
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
