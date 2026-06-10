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
            <label v-for="field in activeStep.fields" :key="field.key" class="field" :class="{ wide: field.wide }">
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
          </div>

          <div v-if="activeStep.kind === 'location'" class="location-layout">
            <div class="wizard-grid">
              <label v-for="field in activeStep.fields" :key="field.key" class="field" :class="{ wide: field.wide }">
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
              {{ copyLastInspectionBusy ? 'Buscando...' : 'Preencher com ultima inspecao' }}
            </button>
            <button v-if="!isEditMode" type="button" class="btn info" :disabled="copyFirstInspectionBusy"
              @click="applyFirstInspectionData">
              {{ copyFirstInspectionBusy ? 'Buscando...' : 'Preencher com primeira inspecao' }}
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
  extractEfluenteItems,
  getAdminEfluentesAPI,
  getEfluenteAnexoBlobAPI,
  getEfluenteAnexosAPI,
  getEfluenteByPkAPI,
  getIsAdmin,
  getMeusEfluentesAPI,
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
  normalizeApiEfluenteListItem,
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
const copyFirstInspectionBusy = ref(false)
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

const FIXED_FIELDS_FROM_LAST_INSPECTION = [
  'txMunicipio',
  'txLinhaCptm',
  'txViaCptm',
  'txTrechoESentidoCptm',
  'txEstacaoCptm',
  'nrLatGrauDecimalWgs84',
  'nrLongGrauDecimalWgs84',
  'nrLatMetrosSirgas2000',
  'nrLongMetrosSirgas2000',
  'txNmResponsavelCadastro',
  'txRpResponsavelCadastro',
  'txDrtResponsavelCadastro',
  'txNomePjDaContratada',
  'txNrContratoContratada',
  'txNomePjDaSupervisora',
  'txNrContratoSupervisora',
  'txNmAreaGestoraCptm',
  'txIdAreaGestoraCptm',
  'txSiglaAreaGestoraCptm'
]

const emptyForm = createEmptyEfluenteFormData()
const form = reactive(createEmptyEfluenteFormData())

// Dados de Domínio Integrados (Hardcoded para funcionamento Offline PWA)
const tipoProprietarioOptions = ref([
  { codigo: 1, descricao: 'CPTM - Titularidade' },
  { codigo: 2, descricao: 'CPTM - Posse' },
  { codigo: 3, descricao: 'Metrô' },
  { codigo: 4, descricao: 'Alienado' },
  { codigo: 5, descricao: 'MRS' },
  { codigo: 6, descricao: 'RFSA' },
  { codigo: 7, descricao: 'RFSA/SPU' },
  { codigo: 8, descricao: 'CBTU' },
  { codigo: 9, descricao: 'Pessoa Jurídica' },
  { codigo: 10, descricao: 'Pessoa Física' },
  { codigo: 11, descricao: 'Indefinido' },
  { codigo: 13, descricao: 'FEPASA' },
  { codigo: 14, descricao: 'Permuta' }
])

const tipoProprietarioL13Options = ref([
  { codigo: 1, descricao: 'CPTM - Titularidade' },
  { codigo: 5, descricao: 'MRS' },
  { codigo: 15, descricao: 'Prefeitura de Guarulhos' },
  { codigo: 16, descricao: 'DAEE' },
  { codigo: 18, descricao: 'USP Leste' },
  { codigo: 19, descricao: 'GRU - Aeroporto' },
  { codigo: 20, descricao: 'CCR - Rodovia Dutra' },
  { codigo: 21, descricao: 'Ecopistas' },
  { codigo: 22, descricao: 'CDHU' }
])

const simNaoOptions = ref([
  { codigo: 1, descricao: 'Sim' },
  { codigo: 2, descricao: 'Não' },
  { codigo: 3, descricao: 'Não Informado' },
  { codigo: 97, descricao: 'Não se aplica(m)' },
  { codigo: 98, descricao: 'Inexistente(s)' },
  { codigo: 99, descricao: 'Indefinido(a)(s)' },
  { codigo: 100, descricao: 'Não avaliado(a)(s)' }
])

const statusRegistroOptions = ref([
  { codigo: 1, descricao: 'Ativo' },
  { codigo: 2, descricao: 'Inativo' },
  { codigo: 97, descricao: 'Não se aplica(m)' },
  { codigo: 98, descricao: 'Inexistente(s)' },
  { codigo: 99, descricao: 'Indefinido(a)(s)' },
  { codigo: 100, descricao: 'Não avaliado(a)(s)' }
])

const statusDesvioOptions = ref([
  { codigo: 1, descricao: 'Não Regularizado' },
  { codigo: 2, descricao: 'Regularizado' },
  { codigo: 97, descricao: 'Não se aplica(m)' },
  { codigo: 98, descricao: 'Inexistente(s)' },
  { codigo: 99, descricao: 'Indefinido(a)(s)' },
  { codigo: 100, descricao: 'Não avaliado(a)(s)' }
])


const naturezaOptions = ref([
  { codigo: 13, descricao: 'Áreas Ambientalmente Protegidas' },
  { codigo: 3, descricao: 'Áreas Contaminadas' },
  { codigo: 1, descricao: 'Arqueologia' },
  { codigo: 18, descricao: 'Comunicação Social' },
  { codigo: 17, descricao: 'Documentação' },
  { codigo: 5, descricao: 'Efluente' },
  { codigo: 4, descricao: 'Emissões Atmosféricas' },
  { codigo: 8, descricao: 'Erosões e Movimentos de Massa' },
  { codigo: 11, descricao: 'Fauna' },
  { codigo: 10, descricao: 'Gerenciamento de Solo' },
  { codigo: 16, descricao: 'Lançamentos Irregulares' },
  { codigo: 2, descricao: 'Patrimônio Histórico' },
  { codigo: 6, descricao: 'Produtos Perigosos' },
  { codigo: 15, descricao: 'Recursos Hídricos' },
  { codigo: 7, descricao: 'Resíduos Sólidos' },
  { codigo: 14, descricao: 'Ruído e Vibração' },
  { codigo: 20, descricao: 'Segmentação Urbana' },
  { codigo: 19, descricao: 'Sinalização e Isolamento' },
  { codigo: 9, descricao: 'Sistema de Drenagem, Inundações e Alagamentos' },
  { codigo: 12, descricao: 'Vegetação' },
  { codigo: 97, descricao: 'Não se aplica(m)' },
  { codigo: 98, descricao: 'Inexistente(s)' },
  { codigo: 99, descricao: 'Indefinido(a)(s)' },
  { codigo: 100, descricao: 'Não avaliado(a)(s)' }
])

const tipoAtividadeListadaOptions = ref([
  { codigo: 1, descricao: 'Estação de Tratamento de Efluente' },
  { codigo: 2, descricao: 'Transporte' },
  { codigo: 96, descricao: 'Outro(a)(s)' },
  { codigo: 99, descricao: 'Indefinido(a)(s)' },
  { codigo: 97, descricao: 'Não se aplica(m)' },
  { codigo: 98, descricao: 'Inexistente(s)' },
  { codigo: 100, descricao: 'Não avaliado(a)(s)' }
])

const tipoDraListadoOptions = ref([
  { codigo: 1, descricao: 'Cadastro Técnico Federal (IBAMA) - CTF/IBAMA' },
  { codigo: 2, descricao: 'Certificado de Dispensa de Licença - CDL' },
  { codigo: 3, descricao: 'Certificado de Movimentação de Resíduos de Interesse Ambiental - CADRI' },
  { codigo: 4, descricao: 'Declaração de Movimentação de Resíduos - DMR' },
  { codigo: 5, descricao: 'Ficha de Informações de Segurança de Produtos Químicos - FISPQ' },
  { codigo: 6, descricao: 'Licença de Operação - LO' },
  { codigo: 7, descricao: 'Manifesto de Transporte de Resíduos - MTR' },
  { codigo: 96, descricao: 'Outro(a)(s)' },
  { codigo: 99, descricao: 'Indefinido(a)(s)' },
  { codigo: 97, descricao: 'Não se aplica(m)' },
  { codigo: 98, descricao: 'Inexistente(s)' },
  { codigo: 100, descricao: 'Não avaliado(a)(s)' }
])

const atividadeCptmOptions = ref([
  { codigo: 1, descricao: 'Empreendimento/Obra' },
  { codigo: 2, descricao: 'Manutenção' },
  { codigo: 3, descricao: 'Operação' },
  { codigo: 96, descricao: 'Outro(a)(s)' },
  { codigo: 99, descricao: 'Indefinido(a)(s)' },
  { codigo: 97, descricao: 'Não se aplica(m)' },
  { codigo: 98, descricao: 'Inexistente(s)' },
  { codigo: 100, descricao: 'Não avaliado(a)(s)' }
])

const edificacaoOptions = ref([
  { codigo: 1, descricao: 'Abrigo' },
  { codigo: 2, descricao: 'Base de manutenção' },
  { codigo: 3, descricao: 'Cabine Primária' },
  { codigo: 4, descricao: 'Cabine Seccionadora' },
  { codigo: 5, descricao: 'Estação' },
  { codigo: 6, descricao: 'Lavador de TUE' },
  { codigo: 7, descricao: 'Oficina' },
  { codigo: 8, descricao: 'Pátio' },
  { codigo: 9, descricao: 'Prédio administrativo' },
  { codigo: 10, descricao: 'Prédio de apoio' },
  { codigo: 11, descricao: 'Sala técnica' },
  { codigo: 12, descricao: 'Subestação' },
  { codigo: 13, descricao: 'Trecho - Km/poste' },
  { codigo: 14, descricao: 'Vários' },
  { codigo: 96, descricao: 'Outro(a)(s)' },
  { codigo: 97, descricao: 'Não se aplica(m)' },
  { codigo: 98, descricao: 'Inexistente(s)' },
  { codigo: 99, descricao: 'Indefinido(a)(s)' },
  { codigo: 100, descricao: 'Não avaliado(a)(s)' }
])

const origemOptions = ref([
  { codigo: 1, descricao: 'Doméstico/Sanitário' },
  { codigo: 2, descricao: 'Fundação' },
  { codigo: 3, descricao: 'Industrial' },
  { codigo: 96, descricao: 'Outro(a)(s)' },
  { codigo: 97, descricao: 'Não se aplica(m)' },
  { codigo: 98, descricao: 'Inexistente(s)' },
  { codigo: 99, descricao: 'Indefinido(a)(s)' },
  { codigo: 100, descricao: 'Não avaliado(a)(s)' }
])

const fonteGeradoraOptions = ref([
  { codigo: 1, descricao: 'Atividade de obra' },
  { codigo: 2, descricao: 'Banheiro químico' },
  { codigo: 3, descricao: 'Banheiros/vestiários/refeitórios' },
  { codigo: 4, descricao: 'Fossa séptica' },
  { codigo: 5, descricao: 'Lavagem de trens/peças' },
  { codigo: 6, descricao: 'Manutenção ETE' },
  { codigo: 7, descricao: 'Valas de manutenção' },
  { codigo: 96, descricao: 'Outro(a)(s)' },
  { codigo: 97, descricao: 'Não se aplica(m)' },
  { codigo: 98, descricao: 'Inexistente(s)' },
  { codigo: 99, descricao: 'Indefinido(a)(s)' },
  { codigo: 100, descricao: 'Não avaliado(a)(s)' }
])

const destinacaoOptions = ref([
  { codigo: 1, descricao: 'Esgotamento e transporte' },
  { codigo: 2, descricao: 'Interligação em rede coletora' },
  { codigo: 3, descricao: 'Lançamento em galeria de águas pluviais' },
  { codigo: 4, descricao: 'Reinfiltração' },
  { codigo: 5, descricao: 'Tratamento em ETE' },
  { codigo: 96, descricao: 'Outro(a)(s)' },
  { codigo: 97, descricao: 'Não se aplica(m)' },
  { codigo: 98, descricao: 'Inexistente(s)' },
  { codigo: 99, descricao: 'Indefinido(a)(s)' },
  { codigo: 100, descricao: 'Não avaliado(a)(s)' }
])

const veiculoOptions = ref([
  { codigo: 1, descricao: 'Caminhão' },
  { codigo: 96, descricao: 'Outro(a)(s)' },
  { codigo: 97, descricao: 'Não se aplica(m)' },
  { codigo: 98, descricao: 'Inexistente(s)' },
  { codigo: 99, descricao: 'Indefinido(a)(s)' },
  { codigo: 100, descricao: 'Não avaliado(a)(s)' }
])

const siglaMeioAmbienteOptions = ref([
  { codigo: 1, descricao: 'GEA' },
  { codigo: 2, descricao: 'GEA.DEAE' },
  { codigo: 3, descricao: 'GEA.DEAO' },
  { codigo: 97, descricao: 'Não se aplica(m)' },
  { codigo: 98, descricao: 'Inexistente(s)' },
  { codigo: 99, descricao: 'Indefinido(a)(s)' },
  { codigo: 100, descricao: 'Não avaliado(a)(s)' }
])


const areaGestoraOptions = ref([
  { codigo: 1, descricao: '(DE.GEA.0000) GERENCIA DE MEIO AMBIENTE [ID.10-14-4-0-0000]' },
  { codigo: 2, descricao: '(DE.GEA.DEAE.0000) DEPTO. DE MEIO AMBIENTE - EMPREENDIMENTOS [ID.10-14-4-1-0000]' },
  { codigo: 3, descricao: '(DE.GEA.DEAO.0000) DEPTO. DE MEIO AMBIENTE - OPERACAO [ID.10-14-4-2-0000]' },
  { codigo: 5, descricao: '(DE.GED.0000) GERENCIA DE EMPREENDIMENTOS - EXPANSAO [ID.10-14-7-0-0000]' },
  { codigo: 6, descricao: '(DE.GED.DEDC.0000) DEPTO. DE OBRAS CIVIS - EXPANSAO [ID.10-14-7-1-0000]' },
  { codigo: 7, descricao: '(DE.GED.DEDM.0000) DEPTO. DE MONTAGEM DE VIA PERMANENTE E RA [ID.10-14-7-2-0000]' },
  { codigo: 8, descricao: '(DE.GED.DEDS.0000) DEPTO. DE IMPLANTACAO DE SISTEMAS - EXPANSAO [ID.10-14-7-3-0000]' },
  { codigo: 9, descricao: '(DE.GEF.0000) GERENCIA DE EMPREENDIMENTOS [ID.10-14-6-0-0000]' },
  { codigo: 10, descricao: '(DE.GEF.DEFC.0000) DEPTO. DE OBRAS CIVIS [ID.10-14-6-2-0000]' },
  { codigo: 11, descricao: '(DE.GEF.DEFS.0000) DEPTO. DE OBRAS DE SISTEMAS [ID.10-14-6-1-0000]' },
  { codigo: 12, descricao: '(DE.GEO.0000) GERENCIA DE EMPREENDIMENTOS - MODERNIZACAO [ID.10-14-2-0-0000]' },
  { codigo: 14, descricao: '(DE.GEP.0000) GERENCIA DE PROJETOS [ID.10-14-1-0-0000]' },
  { codigo: 15, descricao: '(DE.GEP.DEPE.0000) DEPTO. DE PROJETOS DE EDIFICACOES [ID.10-14-1-2-0000]' },
  { codigo: 16, descricao: '(DE.GEP.DEPG.0000) DEPTO. DE CONSISTENCIA E INOVACAO DE PROJETOS [ID.10-14-1-4-0000]' },
  { codigo: 17, descricao: '(DE.GEP.DEPI.0000) DEPTO. DE PROJETOS DE INFRAESTRUTURA [ID.10-14-1-1-0000]' },
  { codigo: 18, descricao: '(DE.GEP.DEPS.0000) DEPTO. DE PROJETOS DE INSTALACOES E SISTEMAS [ID.10-14-1-3-0000]' },
  { codigo: 19, descricao: '(DE.GET.0000) GERENCIA DE EMPREENDIMENTOS - SISTEMAS [ID.10-14-5-0-0000]' },
  { codigo: 20, descricao: '(DE.GET.DETA.0000) DEPTO. DE SINALIZACAO E TELEFONIA [ID.10-14-5-4-0000]' },
  { codigo: 21, descricao: '(DE.GET.DETE.0000) DEPTO. DE SISTEMAS DE ENERGIA [ID.10-14-5-5-0000]' },
  { codigo: 22, descricao: '(DE.GET.DETO.0000) DEPTO. DE PROJETOS DE IMPLANTACAO DE SISTEMAS [ID.10-14-5-6-0000]' },
  { codigo: 25, descricao: '(DF.GFA.0000) GERENCIA ADMINISTRATIVA [ID.10-12-4-0-0000]' },
  { codigo: 29, descricao: '(DF.GFA.DFAL.0000) DEPTO. DE LOGISTICA ADMINISTRATIVA [ID.10-12-4-1-0000]' },
  { codigo: 34, descricao: '(DF.GFA.DFAS.0000) DEPTO. DE SERVICOS ADMINISTRATIVOS [ID.10-12-4-2-0000]' },
  { codigo: 326, descricao: '(DF.GFH.0000) GERENCIA DE DESENV. ORGAN. E RECURSOS HUMANOS [ID.10-12-8-0-0000]' },
  { codigo: 327, descricao: '(DF.GFH.DFHS.0000) DEPTO. DE SAUDE E SEG. DO TRABALHO [ID.10-12-8-5-0000]' },
  { codigo: 328, descricao: '(DF.GFI.0000) GERENCIA DE TECNOLOGIA DA INFORMACAO [ID.10-12-5-0-0000]' },
  { codigo: 329, descricao: '(DF.GFI.DFIM.0000) DEPTO. DE SUP. E MANUTENCAO DE TI [ID.10-12-5-3-0000]' },
  { codigo: 330, descricao: '(DO.GOA.0000) GERENCIA DE ATENDIMENTO [ID.10-16-9-0-0000]' },
  { codigo: 331, descricao: '(DO.GOA.DOAE.0000) DEPTO DE ATENDIMENTO EM ESTACAO [ID.10-16-9-1-0000]' },
  { codigo: 332, descricao: '(DO.GOA.DOAP.0000) DEPTO DE ATENDIMENTO E SEGURANCA PATRIMONIAL [ID.10-16-9-3-0000]' },
  { codigo: 333, descricao: '(DO.GOA.DOAS.0000) DEPTO DE ATENDIMENTO E SEGURANCA [ID.10-16-9-2-0000]' },
  { codigo: 49, descricao: '(DO.GOC.0000) GERENCIA CIRCULACAO E CONTROLE OPERACIONAL [ID.10-16-2-0-0000]' },
  { codigo: 334, descricao: '(DO.GOC.DOCC.0000) DEPTO. DE CIRCULAÇÃO [ID.10-16-2-8-0000]' },
  { codigo: 66, descricao: '(DO.GOC.DOCP.0000) DEPTO. DE CONTROLE OPERACIONAL [ID.10-16-2-1-0000]' },
  { codigo: 69, descricao: '(DO.GOC.DOCT.0000) DEPTO. DE ESTRATEGIA OPERACIONAL [ID.10-16-2-5-0000]' },
  { codigo: 131, descricao: '(DO.GOF.0000) GERENCIA DE MANUT. DE EQUIPAMENTOS FIXOS [ID.10-15-5-0-0000]' },
  { codigo: 132, descricao: '(DO.GOF.DOFA.0000) DEPTO. DE MANUT. DE SISTEMAS AUXILIARES [ID.10-15-5-1-0000]' },
  { codigo: 142, descricao: '(DO.GOF.DOFE.0000) DEPTO. DE MANUT. DE SISTEMAS DE ENERGIA [ID.10-15-5-2-0000]' },
  { codigo: 156, descricao: '(DO.GOF.DOFS.0000) DEPTO. DE MANUT. DE SISTEMAS ELETR. E RESTAB. DE SERVICOS [ID.10-15-5-3-0000]' },
  { codigo: 187, descricao: '(DO.GOG.0000) GERENCIA ENG. DE OPERACAO [ID.10-16-7-0-0000]' },
  { codigo: 188, descricao: '(DO.GOG.DOGC.0000) DEPTO. ENG. DE ESTACOES E COMUNICACAO [ID.10-16-7-2-0000]' },
  { codigo: 193, descricao: '(DO.GOG.DOGI.0000) DEPTO. ENG. DE SISTEMAS E EQUIPAMENTOS [ID.10-16-7-1-0000]' },
  { codigo: 197, descricao: '(DO.GOL.0000) GERENCIA DE LOGISTICA [ID.10-15-7-0-0000]' },
  { codigo: 198, descricao: '(DO.GOL.DOLA.0000) DEPTO. DE ALMOXARIFADOS [ID.10-15-7-1-0000]' },
  { codigo: 201, descricao: '(DO.GOL.DOLM.0000) DEPTO. DE GESTAO E CADASTRO DE MATERIAIS [ID.10-15-7-2-0000]' },
  { codigo: 38, descricao: '(DO.GOM.0000) GERENCIA GERAL DE MANUTENCAO [ID.10-15-1-0-0000]' },
  { codigo: 39, descricao: '(DO.GOO.0000) GERENCIA GERAL DE OPERACAO [ID.10-16-1-0-0000]' },
  { codigo: 210, descricao: '(DO.GOR.0000) GERENCIA MANUT. MAT RODANTE E OFICINAS [ID.10-15-3-0-0000]' },
  { codigo: 213, descricao: '(DO.GOR.DORA.0000) DEPTO. MANUT. MAT RODANTE - LAPA [ID.10-15-3-4-0000]' },
  { codigo: 219, descricao: '(DO.GOR.DORE.0000) DEPTO. MANUT. MAT RODANTE - ENG. S PAULO [ID.10-15-3-6-0000]' },
  { codigo: 226, descricao: '(DO.GOR.DORO.0000) DEPTO. DE OFICINAS DE MANUT. DE EQUIPAMENTOS [ID.10-15-3-7-0000]' },
  { codigo: 241, descricao: '(DO.GOR.DORV.0000) DEPTO. MANUT. DE VEICULOS FERROVIARIOS E AUXILIARES [ID.10-15-3-8-0000]' },
  { codigo: 274, descricao: '(DO.GOT.0000) GERENCIA ENG. DE MANUTENCAO [ID.10-15-4-0-0000]' },
  { codigo: 278, descricao: '(DO.GOT.DOTI.0000) DEPTO. ENG. DE MANUT. DE INSTALACOES FIXAS [ID.10-15-4-3-0000]' },
  { codigo: 281, descricao: '(DO.GOT.DOTM.0000) DEPTO. ENG. DE MANUT. DE MAT RODANTE [ID.10-15-4-5-0000]' },
  { codigo: 286, descricao: '(DO.GOT.DOTV.0000) DEPTO. ENG. DE MANUT. DE VIA PERMANENTE E ESTRUTURA CIVIL [ID.10-15-4-1-0000]' },
  { codigo: 289, descricao: '(DO.GOV.0000) GERENCIA DE MANUT. DE VIA PERMANENTE E ESTRUTURA CIVIL [ID.10-15-6-0-0000]' },
  { codigo: 291, descricao: '(DO.GOV.DOVC.0000) DEPTO. DE MANUT. DE ESTRUTURA CIVIL [ID.10-15-6-6-0000]' },
  { codigo: 297, descricao: '(DO.GOV.DOVF.0000) DEPTO. PLAN. E CONTR. DE MANUT. DE VIA PERMANENTE [ID.10-15-6-4-0000]' },
  { codigo: 309, descricao: '(DO.GOV.DOVL.0000) DEPTO. DE MANUT. DE VIA PERMANENTE [ID.10-15-6-5-0000]' },
  { codigo: 335, descricao: '(DP.GPM.DPMT.0000) DEPTO DE GESTÃO DO TERRITÓRIO [ID.10-13-8-2-0000]' },
  { codigo: 336, descricao: '(DP.GPN.0000) GERENCIA DE NOVOS NEGOCIOS [ID.10-13-4-0-0000]' },
  { codigo: 337, descricao: '(DP.GPN.DPNG.0000) DEPTO. DE GESTAO DE NEGOCIOS [ID.10-13-4-2-0000]' },
  { codigo: 997, descricao: 'Não se aplica(m)' },
  { codigo: 998, descricao: 'Inexistente(s)' },
  { codigo: 999, descricao: 'Indefinido(a)(s)' },
  { codigo: 1000, descricao: 'Não avaliado(a)(s)' }
])

const municipioOptions = ref([
  { codigo: 24, descricao: 'Arujá' },
  { codigo: 10, descricao: 'Barueri' },
  { codigo: 25, descricao: 'Biritiba-Mirim' },
  { codigo: 6, descricao: 'Caieiras' },
  { codigo: 26, descricao: 'Cajamar' },
  { codigo: 4, descricao: 'Campo Limpo Paulista' },
  { codigo: 11, descricao: 'Carapicuíba' },
  { codigo: 27, descricao: 'Cotia' },
  { codigo: 28, descricao: 'Diadema' },
  { codigo: 29, descricao: 'Embú' },
  { codigo: 30, descricao: 'Embú-Guaçu' },
  { codigo: 20, descricao: 'Ferraz de Vasconcelos' },
  { codigo: 5, descricao: 'Francisco Morato' },
  { codigo: 7, descricao: 'Franco da Rocha' },
  { codigo: 31, descricao: 'Guararema' },
  { codigo: 23, descricao: 'Guarulhos' },
  { codigo: 32, descricao: 'Itapecerica da Serra' },
  { codigo: 8, descricao: 'Itapevi' },
  { codigo: 21, descricao: 'Itaquaquecetuba' },
  { codigo: 9, descricao: 'Jandira' },
  { codigo: 2, descricao: 'Jundiaí' },
  { codigo: 33, descricao: 'Juquitiba' },
  { codigo: 46, descricao: 'Mairinque' },
  { codigo: 34, descricao: 'Mairiporã' },
  { codigo: 16, descricao: 'Mauá' },
  { codigo: 18, descricao: 'Mogi das Cruzes' },
  { codigo: 12, descricao: 'Osasco' },
  { codigo: 35, descricao: 'Pirapora do Bom Jesus' },
  { codigo: 22, descricao: 'Poá' },
  { codigo: 14, descricao: 'Ribeirão Pires' },
  { codigo: 13, descricao: 'Rio Grande da Serra' },
  { codigo: 36, descricao: 'Salesópolis' },
  { codigo: 37, descricao: 'Santa Isabel' },
  { codigo: 38, descricao: 'Santana de Parnaíba' },
  { codigo: 15, descricao: 'Santo André' },
  { codigo: 45, descricao: 'Santos' },
  { codigo: 39, descricao: 'São Bernardo do Campo' },
  { codigo: 17, descricao: 'São Caetano do Sul' },
  { codigo: 40, descricao: 'São Lourenço da Serra' },
  { codigo: 1, descricao: 'São Paulo' },
  { codigo: 43, descricao: 'São Roque' },
  { codigo: 44, descricao: 'São Vicente' },
  { codigo: 19, descricao: 'Suzano' },
  { codigo: 41, descricao: 'Taboão da Serra' },
  { codigo: 42, descricao: 'Vargem Grande Paulista' },
  { codigo: 3, descricao: 'Várzea Paulista' },
  { codigo: 99, descricao: 'Diversos (Ver Observação)' },
  { codigo: 997, descricao: 'Não se aplica(m)' },
  { codigo: 998, descricao: 'Inexistente(s)' },
  { codigo: 999, descricao: 'Indefinido(a)(s)' },
  { codigo: 1000, descricao: 'Não avaliado(a)(s)' }
])

const linhaOptions = ref([
  { codigo: 1, descricao: 'Linha 07 - Rubi' },
  { codigo: 2, descricao: 'Linha 08 - Diamante' },
  { codigo: 3, descricao: 'Linha 09 - Esmeralda' },
  { codigo: 4, descricao: 'Linha 10 - Turquesa' },
  { codigo: 5, descricao: 'Linha 11 - Coral' },
  { codigo: 6, descricao: 'Linha 12 - Safira' },
  { codigo: 7, descricao: 'Linha 07 - Rubi / Linha 08 - Diamante' },
  { codigo: 8, descricao: 'Linha 08 - Diamante / Linha 09 - Esmeralda' },
  { codigo: 9, descricao: 'Linha 09 - Esmeralda / Linha 10 - Turquesa' },
  { codigo: 10, descricao: 'Linha 07 - Rubi / Linha 08 - Diamante / Linha 11 - Coral' },
  { codigo: 11, descricao: 'Linha 07 - Rubi / Linha 11 - Coral' },
  { codigo: 12, descricao: 'Linha 10 - Turquesa / Linha 11 - Coral' },
  { codigo: 13, descricao: 'Linha 11 - Coral / Linha 12 - Safira' },
  { codigo: 14, descricao: 'Linha 10 - Turquesa / Linha 11 - Coral / Linha 12 - Safira' },
  { codigo: 15, descricao: 'Linha 07 - Rubi / Linha 08 - Diamante / Linha 09 - Esmeralda / Linha 10 - Turquesa / Linha 11 - Coral' },
  { codigo: 16, descricao: 'Linha 08 - Diamante / Linha 09 - Esmeralda / Linha 10 - Turquesa / Linha 11 - Coral / Linha 12 - Safira' },
  { codigo: 17, descricao: 'Linha 07 - Rubi / Linha 08 - Diamante / Linha 10 - Turquesa / Linha 11 - Coral / Linha 12 - Safira' },
  { codigo: 18, descricao: 'Sem linha associada' },
  { codigo: 19, descricao: 'Linha 07 - Rubi / Linha 08 - Diamante / Linha 09 - Esmeralda / Linha 10 - Turquesa / Linha 11 - Coral / Linha 12 - Safira' },
  { codigo: 20, descricao: 'Linha 13 - Jade' },
  { codigo: 21, descricao: 'Linha 05 - Lilás' },
  { codigo: 22, descricao: 'Linha 11 - Coral / Linha 12 - Safira / 13 - Jade' },
  { codigo: 23, descricao: 'Linha 10 - Turquesa / Linha 11 - Coral / Linha 12 - Safira / Linha 13 - Jade' },
  { codigo: 24, descricao: 'Linha 07 - Rubi / Linha 10 - Turquesa' },
  { codigo: 25, descricao: 'Linha JJ - Baixada Santista' },
  { codigo: 26, descricao: 'Linha 09 - Esmeralda / Linha 05 - Lilás' },
  { codigo: 27, descricao: 'Linha 07 - Rubi / Linha 08 - Diamante / Linha 09 - Esmeralda / Linha 12 - Safira' },
  { codigo: 28, descricao: 'Linha 07 - Rubi / Linha 12 - Safira' },
  { codigo: 29, descricao: 'Linha 07 - Rubi / Linha 09 - Esmeralda' },
  { codigo: 30, descricao: 'Linha 08 - Diamante / Linha 10 - Turquesa / Linha 11 - Coral / Linha 12 - Safira' },
  { codigo: 31, descricao: 'Linha 08 - Diamante / Linha 09 - Esmeralda / Linha 10 - Turquesa / Linha 11 - Coral / Linha 12 - Safira / Linha JJ - Baixada Santista' },
  { codigo: 32, descricao: 'Linha não informada' },
  { codigo: 33, descricao: 'Linha 12 - Safira/ Linha 13 - Jade' },
  { codigo: 97, descricao: 'Não se aplica(m)' },
  { codigo: 98, descricao: 'Inexistente(s)' },
  { codigo: 99, descricao: 'Indefinido(a)(s)' },
  { codigo: 100, descricao: 'Não avaliado(a)(s)' }
])

const viaOptions = ref([
  { codigo: 1, descricao: 'Via 01' },
  { codigo: 2, descricao: 'Via 02' },
  { codigo: 3, descricao: 'Via 03' },
  { codigo: 4, descricao: 'Via 04' },
  { codigo: 5, descricao: 'Via 05' },
  { codigo: 6, descricao: 'Via 06' },
  { codigo: 7, descricao: 'Via 08' },
  { codigo: 8, descricao: 'Via 09' },
  { codigo: 9, descricao: 'Via 10' },
  { codigo: 10, descricao: 'Via 01S - Trecho 1' },
  { codigo: 11, descricao: 'Via 01S - Trecho 2' },
  { codigo: 12, descricao: 'Via 02S - Trecho 1' },
  { codigo: 13, descricao: 'Via 02S - Trecho 2' },
  { codigo: 14, descricao: 'Via 03S - Trecho 2' },
  { codigo: 15, descricao: 'Via 03E - Trecho 2' },
  { codigo: 16, descricao: 'Via 04E - Trecho 2' },
  { codigo: 17, descricao: 'Via Auxiliar' },
  { codigo: 18, descricao: 'Via Variante' },
  { codigo: 19, descricao: 'Travessão - AMV' },
  { codigo: 97, descricao: 'Não se aplica(m)' },
  { codigo: 98, descricao: 'Inexistente(s)' },
  { codigo: 99, descricao: 'Indefinido(a)(s)' },
  { codigo: 100, descricao: 'Não avaliado(a)(s)' }
])

const estacaoOptions = ref([
  { codigo: 1, descricao: 'Estação Aeroporto Guarulhos' },
  { codigo: 2, descricao: 'Estação Água Branca' },
  { codigo: 3, descricao: 'Estação Antonio Gianetti Neto' },
  { codigo: 4, descricao: 'Estação Antônio João' },
  { codigo: 5, descricao: 'Estação Aracaré' },
  { codigo: 6, descricao: 'Estação Autódromo' },
  { codigo: 7, descricao: 'Estação Baltazar Fidelis' },
  { codigo: 8, descricao: 'Estação Barueri' },
  { codigo: 9, descricao: 'Estação Berrini' },
  { codigo: 10, descricao: 'Estação Botujuru' },
  { codigo: 11, descricao: 'Estação Brás' },
  { codigo: 12, descricao: 'Estação Brás Cubas' },
  { codigo: 13, descricao: 'Estação Caieiras' },
  { codigo: 14, descricao: 'Estação Calmon Viana' },
  { codigo: 15, descricao: 'Estação Campo Limpo Paulista' },
  { codigo: 16, descricao: 'Estação Capuava' },
  { codigo: 17, descricao: 'Estação Carapicuíba' },
  { codigo: 18, descricao: 'Estação Ceasa' },
  { codigo: 19, descricao: 'Estação Cidade Jardim' },
  { codigo: 20, descricao: 'Estação Cidade Universitária' },
  { codigo: 21, descricao: 'Estação Comandante Sampaio' },
  { codigo: 22, descricao: 'Estação Comendador Ermelino' },
  { codigo: 23, descricao: 'Estação Corinthians - Itaquera' },
  { codigo: 24, descricao: 'Estação Dom Bosco' },
  { codigo: 25, descricao: 'Estação Domingos de Morais' },
  { codigo: 26, descricao: 'Estação Engenheiro Cardoso' },
  { codigo: 27, descricao: 'Estação Engenheiro Goulart' },
  { codigo: 28, descricao: 'Estação Engenheiro Manoel Feio' },
  { codigo: 29, descricao: 'Estação Estudantes' },
  { codigo: 30, descricao: 'Estação Ferraz de Vasconcelos' },
  { codigo: 31, descricao: 'Estação Francisco Morato' },
  { codigo: 32, descricao: 'Estação Franco da Rocha' },
  { codigo: 33, descricao: 'Estação General Miguel Costa' },
  { codigo: 34, descricao: 'Estação Grajaú' },
  { codigo: 35, descricao: 'Estação Granja Julieta' },
  { codigo: 36, descricao: 'Estação Guaianazes' },
  { codigo: 37, descricao: 'Estação Guapituba' },
  { codigo: 38, descricao: 'Estação Guarulhos Cecap' },
  { codigo: 39, descricao: 'Estação Hebraica - Rebouças' },
  { codigo: 40, descricao: 'Estação Imperatriz Leopoldina' },
  { codigo: 41, descricao: 'Estação Ipiranga' },
  { codigo: 42, descricao: 'Estação Itaim Paulista' },
  { codigo: 43, descricao: 'Estação Itapevi' },
  { codigo: 44, descricao: 'Estação Itaquaquecetuba' },
  { codigo: 45, descricao: 'Estação Jandira' },
  { codigo: 46, descricao: 'Estação Jaraguá' },
  { codigo: 47, descricao: 'Estação Jardim Belval' },
  { codigo: 48, descricao: 'Estação Jardim Helena - Vila Mara' },
  { codigo: 49, descricao: 'Estação Jardim Romano' },
  { codigo: 50, descricao: 'Estação Jardim Silveira' },
  { codigo: 51, descricao: 'Estação João Dias' },
  { codigo: 52, descricao: 'Estação José Bonifácio' },
  { codigo: 53, descricao: 'Estação Júlio Prestes' },
  { codigo: 54, descricao: 'Estação Jundiaí' },
  { codigo: 55, descricao: 'Estação Jundiapeba' },
  { codigo: 56, descricao: 'Estação Jurubatuba' },
  { codigo: 57, descricao: 'Estação Lapa (Linha 7)' },
  { codigo: 58, descricao: 'Estação Lapa (Linha 8)' },
  { codigo: 59, descricao: 'Estação Luz' },
  { codigo: 60, descricao: 'Estação Mauá' },
  { codigo: 61, descricao: 'Estação Mendes / Bruno Covas' },
  { codigo: 62, descricao: 'Estação Mogi das Cruzes' },
  { codigo: 63, descricao: 'Estação Móoca' },
  { codigo: 64, descricao: 'Estação Morumbi' },
  { codigo: 65, descricao: 'Estação Osasco' },
  { codigo: 66, descricao: 'Estação Palmeiras - Barra Funda' },
  { codigo: 67, descricao: 'Estação Parada Amador Bueno' },
  { codigo: 68, descricao: 'Estação Perus' },
  { codigo: 69, descricao: 'Estação Pinheiros' },
  { codigo: 70, descricao: 'Estação Piqueri' },
  { codigo: 71, descricao: 'Estação Pirituba' },
  { codigo: 72, descricao: 'Estação Poá' },
  { codigo: 73, descricao: 'Estação Prefeito Celso Daniel - Santo André' },
  { codigo: 74, descricao: 'Estação Prefeito Saladino' },
  { codigo: 75, descricao: 'Estação Presidente Altino' },
  { codigo: 76, descricao: 'Estação Primavera - Interlagos' },
  { codigo: 77, descricao: 'Estação Quitaúna' },
  { codigo: 78, descricao: 'Estação Ribeirão Pires' },
  { codigo: 79, descricao: 'Estação Rio Grande da Serra' },
  { codigo: 80, descricao: 'Estação Sagrado Coração' },
  { codigo: 81, descricao: 'Estação Santa Rita' },
  { codigo: 82, descricao: 'Estação Santa Terezinha' },
  { codigo: 83, descricao: 'Estação Santo Amaro (Linha 9)' },
  { codigo: 84, descricao: 'Estação São Caetano' },
  { codigo: 85, descricao: 'Estação São Miguel Paulista' },
  { codigo: 86, descricao: 'Estação Socorro' },
  { codigo: 87, descricao: 'Estação Suzano' },
  { codigo: 88, descricao: 'Estação Tamanduateí' },
  { codigo: 89, descricao: 'Estação Tatuapé' },
  { codigo: 90, descricao: 'Estação USP Leste' },
  { codigo: 91, descricao: 'Estação Utinga' },
  { codigo: 92, descricao: 'Estação Várzea Paulista' },
  { codigo: 93, descricao: 'Estação Vila Aurora' },
  { codigo: 94, descricao: 'Estação Vila Clarice' },
  { codigo: 95, descricao: 'Estação Vila Olímpia' },
  { codigo: 96, descricao: 'Estação Villa-Lobos - Jaguaré' },
  { codigo: 997, descricao: 'Não se aplica(m)' },
  { codigo: 998, descricao: 'Inexistente(s)' },
  { codigo: 999, descricao: 'Indefinido(a)(s)' },
  { codigo: 1000, descricao: 'Não avaliado(a)(s)' }
])

const trechoOptions = ref([
  { codigo: 62, descricao: 'Estação Aeroporto Guarulhos - Estação Guarulhos - Cecap' },
  { codigo: 126, descricao: 'Estação Aeroporto Guarulhos - Final dos Trilhos' },
  { codigo: 38, descricao: 'Estação Água Branca - Estação Lapa' },
  { codigo: 40, descricao: 'Estação Água Branca - Estação Lapa (Linha 07)' },
  { codigo: 118, descricao: 'Estação Água Branca - Estação Palmeiras - Barra Funda' },
  { codigo: 107, descricao: 'Estação Antônio Gianetti Neto - Estação Ferraz de Vasconcelos' },
  { codigo: 41, descricao: 'Estação Antônio Gianetti Neto - Estação Guaianazes' },
  { codigo: 84, descricao: 'Estação Aracaré - Estação Calmon Viana' },
  { codigo: 48, descricao: 'Estação Aracaré - Estação de Itaquaquecetuba' },
  { codigo: 87, descricao: 'Estação Baltazar Fidelis - Estação de Franco da Rocha' },
  { codigo: 23, descricao: 'Estação Baltazar Fidelis - Estação Francisco Morato' },
  { codigo: 117, descricao: 'Estação Barra Funda - Estação Luz' },
  { codigo: 51, descricao: 'Estação Botujuru - Estação Campo Limpo Paulista' },
  { codigo: 85, descricao: 'Estação Botujuru - Estação Francisco Morato' },
  { codigo: 13, descricao: 'Estação Brás Cubas - Estação Jundiapeba' },
  { codigo: 77, descricao: 'Estação Brás Cubas - Estação Mogi das Cruzes' },
  { codigo: 25, descricao: 'Estação Caieiras - Estação Franco da Rocha' },
  { codigo: 89, descricao: 'Estação Caieiras - Estação Perus' },
  { codigo: 21, descricao: 'Estação Calmon Viana - Estação Aracaré' },
  { codigo: 45, descricao: 'Estação Calmon Viana - Estação Poá' },
  { codigo: 74, descricao: 'Estação Calmon Viana - Estação Suzano' },
  { codigo: 114, descricao: 'Estação Campo Limpo Paulista - Estação Botujuru' },
  { codigo: 50, descricao: 'Estação Campo Limpo Paulista - Estação Várzea Paulista' },
  { codigo: 67, descricao: 'Estação Capuava - Estação Mauá' },
  { codigo: 3, descricao: 'Estação Capuava - Estação Santo André' },
  { codigo: 81, descricao: 'Estação Com. Ermelino Matarazzo - Estação São Miguel Paulista' },
  { codigo: 58, descricao: 'Estação Comendador Ermelino Matarazzo - Estação USP Leste' },
  { codigo: 120, descricao: 'Estação Corinthians - Itaquera - Estação Dom Bosco' },
  { codigo: 9, descricao: 'Estação Corinthians - Itaquera - Estação Tatuapé' },
  { codigo: 97, descricao: 'Estação da Mooca - Estação Ipiranga' },
  { codigo: 33, descricao: 'Estação da Mooca - Estação Roosevelt/Brás' },
  { codigo: 24, descricao: 'Estação de Franco da Rocha - Estação Baltazar Fidelis' },
  { codigo: 111, descricao: 'Estação de Itaquaquecetuba - Estação Aracaré' },
  { codigo: 47, descricao: 'Estação de Itaquaquecetuba - Estação Engenheiro Manoel Feio' },
  { codigo: 8, descricao: 'Estação de Paranapiacaba - Estação Rio Grande da Serra' },
  { codigo: 106, descricao: 'Estação de Paranapiacaba - Final dos Trilhos' },
  { codigo: 57, descricao: 'Estação Dom Bosco - Estação Corinthians - Itaquera' },
  { codigo: 73, descricao: 'Estação Dom Bosco - Estação José Bonifácio' },
  { codigo: 124, descricao: 'Estação Engenheiro Goulart - Estação Guarulhos - Cecap' },
  { codigo: 20, descricao: 'Estação Engenheiro Goulart - Estação Tatuapé' },
  { codigo: 82, descricao: 'Estação Engenheiro Goulart - Estação USP Leste' },
  { codigo: 110, descricao: 'Estação Engenheiro Manoel Feio - Estação de Itaquaquecetuba' },
  { codigo: 60, descricao: 'Estação Engenheiro Manoel Feio - Estação Jardim Romano' },
  { codigo: 15, descricao: 'Estação Estudantes - Estação Mogi das Cruzes' },
  { codigo: 102, descricao: 'Estação Estudantes - Final dos Trilhos' },
  { codigo: 44, descricao: 'Estação Ferraz de Vasconcelos - Estação Antônio Gianetti Neto' },
  { codigo: 109, descricao: 'Estação Ferraz de Vasconcelos - Estação Poá' },
  { codigo: 86, descricao: 'Estação Francisco Morato - Estação Baltazar Fidelis' },
  { codigo: 22, descricao: 'Estação Francisco Morato - Estação Botujuru' },
  { codigo: 88, descricao: 'Estação Franco da Rocha - Estação Caieiras' },
  { codigo: 104, descricao: 'Estação Guaianazes - Estação Antônio Gianetti Neto' },
  { codigo: 42, descricao: 'Estação Guaianazes - Estação José Bonifácio' },
  { codigo: 5, descricao: 'Estação Guapituba - Estação Mauá' },
  { codigo: 69, descricao: 'Estação Guapituba - Estação Ribeirão Pires' },
  { codigo: 125, descricao: 'Estação Guarulhos - Cecap - Estação Aeroporto Guarulhos' },
  { codigo: 61, descricao: 'Estação Guarulhos - Cecap - Estação Engenheiro Goulart' },
  { codigo: 34, descricao: 'Estação Ipiranga - Estação da Mooca' },
  { codigo: 98, descricao: 'Estação Ipiranga - Estação Tamanduateí' },
  { codigo: 59, descricao: 'Estação Itaim Paulista - Estação Jardim Helena - Vila Mara' },
  { codigo: 79, descricao: 'Estação Itaim Paulista - Estação Jardim Romano' },
  { codigo: 56, descricao: 'Estação Jaraguá - Estação Vila Aurora' },
  { codigo: 91, descricao: 'Estação Jaraguá - Estação Vila Clarisse' },
  { codigo: 122, descricao: 'Estação Jardim Helena - Vila Mara - Estação Itaim Paulista' },
  { codigo: 17, descricao: 'Estação Jardim Helena - Vila Mara - Estação São Miguel Paulista' },
  { codigo: 123, descricao: 'Estação Jardim Romano - Estação Engenheiro Manoel Feio' },
  { codigo: 16, descricao: 'Estação Jardim Romano - Estação Itaim Paulista' },
  { codigo: 10, descricao: 'Estação José Bonifácio - Estação Dom Bosco' },
  { codigo: 105, descricao: 'Estação José Bonifácio - Estação Guaianazes' },
  { codigo: 116, descricao: 'Estação Jundiaí - Estação Várzea Paulista' },
  { codigo: 52, descricao: 'Estação Jundiaí - Final dos Trilhos' },
  { codigo: 76, descricao: 'Estação Jundiapeba - Estação Brás Cubas' },
  { codigo: 12, descricao: 'Estação Jundiapeba - Estação Suzano' },
  { codigo: 101, descricao: 'Estação Lapa - Estação Água Branca' },
  { codigo: 103, descricao: 'Estação Lapa (Linha 07) - Estação Água Branca' },
  { codigo: 31, descricao: 'Estação Lapa (Linha 07) - Estação Piqueri' },
  { codigo: 54, descricao: 'Estação Luz - Estação Barra Funda' },
  { codigo: 95, descricao: 'Estação Luz - Estação Roosevelt/Brás' },
  { codigo: 4, descricao: 'Estação Mauá - Estação Capuava' },
  { codigo: 68, descricao: 'Estação Mauá - Estação Guapituba' },
  { codigo: 14, descricao: 'Estação Mogi das Cruzes - Estação Brás Cubas' },
  { codigo: 78, descricao: 'Estação Mogi das Cruzes - Estação Estudantes' },
  { codigo: 55, descricao: 'Estação Palmeiras - Barra Funda - Estação Água Branca' },
  { codigo: 26, descricao: 'Estação Perus - Estação Caieiras' },
  { codigo: 90, descricao: 'Estação Perus - Estação Vila Aurora' },
  { codigo: 94, descricao: 'Estação Piqueri - Estação Lapa (Linha 07)' },
  { codigo: 30, descricao: 'Estação Piqueri - Estação Pirituba' },
  { codigo: 93, descricao: 'Estação Pirituba - Estação Piqueri' },
  { codigo: 29, descricao: 'Estação Pirituba - Estação Vila Clarisse' },
  { codigo: 108, descricao: 'Estação Poá - Estação Calmon Viana' },
  { codigo: 46, descricao: 'Estação Poá - Estação Ferraz de Vasconcelos' },
  { codigo: 65, descricao: 'Estação Prefeito Saladino - Estação Santo André' },
  { codigo: 1, descricao: 'Estação Prefeito Saladino - Estação Utinga' },
  { codigo: 6, descricao: 'Estação Ribeirão Pires - Estação Guapituba' },
  { codigo: 70, descricao: 'Estação Ribeirão Pires - Estação Rio Grande da Serra' },
  { codigo: 71, descricao: 'Estação Rio Grande da Serra - Estação de Paranapiacaba' },
  { codigo: 7, descricao: 'Estação Rio Grande da Serra - Estação Ribeirão Pires' },
  { codigo: 96, descricao: 'Estação Roosevelt/Brás - Estação da Mooca' },
  { codigo: 32, descricao: 'Estação Roosevelt/Brás - Estação Luz' },
  { codigo: 112, descricao: 'Estação Roosevelt/Brás - Estação Tatuapé' },
  { codigo: 66, descricao: 'Estação Santo André - Estação Capuava' },
  { codigo: 2, descricao: 'Estação Santo André - Estação Prefeito Saladino' },
  { codigo: 36, descricao: 'Estação São Caetano - Estação Tamanduateí' },
  { codigo: 100, descricao: 'Estação São Caetano - Estação Utinga' },
  { codigo: 18, descricao: 'Estação São Miguel Paulista - Estação Com. Ermelino Matarazzo' },
  { codigo: 80, descricao: 'Estação São Miguel Paulista - Estação Jardim Helena - Vila Mara' },
  { codigo: 11, descricao: 'Estação Suzano - Estação Calmon Viana' },
  { codigo: 75, descricao: 'Estação Suzano - Estação Jundiapeba' },
  { codigo: 35, descricao: 'Estação Tamanduateí - Estação Ipiranga' },
  { codigo: 99, descricao: 'Estação Tamanduateí - Estação São Caetano' },
  { codigo: 72, descricao: 'Estação Tatuapé - Estação Corinthians - Itaquera' },
  { codigo: 83, descricao: 'Estação Tatuapé - Estação Engenheiro Goulart' },
  { codigo: 49, descricao: 'Estação Tatuapé - Estação Roosevelt/Brás' },
  { codigo: 121, descricao: 'Estação USP Leste - Estação Comendador Ermelino Matarazzo' },
  { codigo: 19, descricao: 'Estação USP Leste - Estação Engenheiro Goulart' },
  { codigo: 64, descricao: 'Estação Utinga - Estação Prefeito Saladino' },
  { codigo: 37, descricao: 'Estação Utinga - Estação São Caetano' },
  { codigo: 113, descricao: 'Estação Várzea Paulista - Estação Campo Limpo Paulista' },
  { codigo: 53, descricao: 'Estação Várzea Paulista - Estação Jundiaí' },
  { codigo: 119, descricao: 'Estação Vila Aurora - Estação Jaraguá' },
  { codigo: 27, descricao: 'Estação Vila Aurora - Estação Perus' },
  { codigo: 28, descricao: 'Estação Vila Clarisse - Estação Jaraguá' },
  { codigo: 92, descricao: 'Estação Vila Clarisse - Estação Pirituba' },
  { codigo: 63, descricao: 'Final dos Trilhos - Estação Aeroporto Guarulhos' },
  { codigo: 43, descricao: 'Final dos Trilhos - Estação de Paranapiacaba' },
  { codigo: 39, descricao: 'Final dos Trilhos - Estação Estudantes' },
  { codigo: 115, descricao: 'Final dos Trilhos - Estação Jundiaí' },
  { codigo: 997, descricao: 'Não se aplica(m)' },
  { codigo: 998, descricao: 'Inexistente(s)' },
  { codigo: 999, descricao: 'Indefinido(a)(s)' },
  { codigo: 1000, descricao: 'Não avaliado(a)(s)' }
])

const proprietarioOptions = ref([
  { codigo: 1, descricao: 'CPTM - Titularidade' },
  { codigo: 2, descricao: 'CPTM - Posse' },
  { codigo: 3, descricao: 'Metrô' },
  { codigo: 4, descricao: 'Alienado' },
  { codigo: 5, descricao: 'MRS' },
  { codigo: 6, descricao: 'RFSA' },
  { codigo: 7, descricao: 'RFSA/SPU' },
  { codigo: 8, descricao: 'CBTU' },
  { codigo: 9, descricao: 'Pessoa Jurídica' },
  { codigo: 10, descricao: 'Pessoa Física' },
  { codigo: 11, descricao: 'Indefinido' },
  { codigo: 13, descricao: 'FEPASA' },
  { codigo: 14, descricao: 'Permuta' },
  { codigo: 15, descricao: 'Prefeitura de Guarulhos' },
  { codigo: 16, descricao: 'DAEE' },
  { codigo: 18, descricao: 'USP Leste' },
  { codigo: 19, descricao: 'GRU - Aeroporto' },
  { codigo: 20, descricao: 'CCR - Rodovia Dutra' },
  { codigo: 21, descricao: 'Ecopistas' },
  { codigo: 22, descricao: 'CDHU' },
  { codigo: 97, descricao: 'Não se aplica(m)' },
  { codigo: 98, descricao: 'Inexistente(s)' },
  { codigo: 100, descricao: 'Não avaliado(a)(s)' }
])

const institutionalFields = [
  { key: 'txNomePjDaContratada', label: 'Nome (Pesso Jurídica) da Contratada', help: 'Inserir o nome e sigla da Contratada. Separar nome e sigla por " - ". A sigla pode conter até 10 caracteres, maiúsculos e sem espaços.', example: 'Companhia Paulista de Trens Metropolitanos S.A. - CPTM', wide: true },
  { key: 'txNrContratoContratada', label: 'Nº do Contrato (da Contratada)', help: 'Inserir o identificador do contrato da Contratada, se aplicável. Padrão: Número/Código com até 12 caracteres e sem espaços.', example: 'AR01234-56' },
  { key: 'txNmLocalEscopoContratual', label: 'Local do Escopo Contratual (Pseudônimo)', help: 'Indicar um nome genérico para o local do escopo contratual ou área/trecho da CPTM.', example: 'Pátio Capuava' },
  { key: 'txNomePfDaRepresentante', label: 'Representante (PF) da Contratada e/ou Área Gestora da CPTM', help: 'Inserir o nome do responsável interlocutor da Contratada e/ou da Área Gestora da CPTM para assuntos de meio ambiente, utilizando no máximo 89 caracteres.', example: 'Pessoa 1 / Pessoa 2', wide: true },
  { key: 'txSiglaDeptoMeioAmbiente', label: 'Sigla da Área de Meio Ambiente', type: 'select', options: siglaMeioAmbienteOptions, help: 'Escolher a sigla do departamento interlocutor da Gerência de Meio Ambiente - GEA.', example: 'GEA.DEAE' },
  { key: 'txNmAreaGestoraCptm', label: 'Nome da Área Gestora CPTM', type: 'select', options: areaGestoraOptions, help: 'Escolher área gestora da CPTM, se aplicável.', example: 'DEPTO. DE MANUT. DE SISTEMAS ELETR. E RESTAB. DE SERVICOS', wide: true },
  { key: 'txIdAreaGestoraCptm', label: 'Indentificador da Área Gestora CPTM', help: 'Campo Automático', example: 'ID.10-15-5-3-0000', readonly: true },
  { key: 'txSiglaAreaGestoraCptm', label: 'Sigla da Área Gestora CPTM', help: 'Campo Automático', example: 'DO.GOT.DOTV.1000', readonly: true },
  { key: 'txNomePjDaSupervisora', label: 'Nome (PJ) da Supervisora Ambiental', help: 'Inserir o nome e sigla da Supervisora Ambiental, utilizando no máximo 89 caracteres. Quando a Supervisora for a própria CPTM repetir a gerência e departamento ambiental informados anteriormente.', example: 'Empresa de Supervisão Ambiental Ltda. - ESA', wide: true }
]

const cadastrerFields = [
  { key: 'txAutorPfDoCadastro', label: 'Autor(a) (PF) do Cadastramento', help: 'Inserir o nome completo da pessoa que realizou o cadastramento da informação.', example: 'Nome e Sobrenome - Pessoa 4', wide: true },
  { key: 'txNmResponsavelCadastro', label: 'Responsável Técnico - RT pelo Cadastramento', help: 'Inserir o nome completo do(a) responsável técnico(a) pelo cadastramento/caracterização da informação.', example: 'Nome e Sobrenome - Pessoa 5', wide: true },
  { key: 'txRpResponsavelCadastro', label: 'Registro Profissional (do RT)', help: 'Inserir o registro profissional do(a) responsável técnico(a) pelo cadastramento/caracterização da informação.', example: 'CREA - 123456 - Pessoa 5' },
  { key: 'txDrtResponsavelCadastro', label: 'Documento de Responsabilidade Técnica (do RT)', help: 'Inserir o documento de responsabilidade técnica do(a) responsável técnico(a) pela realização do trabalho.', example: 'ART nº 123456 - Pessoa 5' }
]

const formIdentificationFields = [
  { key: 'txNaturezaDoPga', label: 'Natureza (do PGA)', type: 'select', options: naturezaOptions, help: 'Escolher a Natureza correspondente. Utilizar menu suspenso.', example: 'Emissões Atmosféricas' },
  { key: 'txTipoDeFormulario', label: 'Tipo de Formulário', help: 'Campo Automático', example: 'Formulário de Cadastramento - FDC (FDC-EEA.EF)', readonly: true },
  { key: 'dtDataEmissaoFormulario', label: 'Data de Emissão do Formulário', type: 'date', help: 'Inserir a data de emissão do documento. Padrão: dd/mm/aaaa.', example: '01/01/2001' },
  { key: 'nrNumeroDeFormulario', label: 'Número do Formulário', type: 'number', min: 1, max: 999999, inputmode: 'numeric', help: 'Inserir o número de identificação do formulário. Escolher de 1 a 999.999. Digitar apenas números. O número deve ser sequencial, não replicável e com seis unidades. Exibição final: Nº 000001.', example: '1' },
  { key: 'txAutorPfDoFormulario', label: 'Autor(a) (Pessoa Física) do Formulário', help: 'Definir Explicação', example: 'Pessoa 5' },
  { key: 'txNmArquivoFdcRelacionado', label: 'Nome do arquivo FDC relacionado', help: 'Campo Automático', example: 'DeaoCtAr01823-02FdcEeaEfL10ProgaiaN000001', readonly: true, wide: true },
  { key: 'pkCdArquivoFdcRelacionado', label: 'Código do arquivo FDC relacionoda', help: 'Campo Automático', example: 'FDC-EEA.EF-A.2026-L.07-CPTM-N.000001', readonly: true, wide: true }
]

const registrationDateTimeFields = [
  { key: 'dtDataDoCadastramento', label: 'Data do Cadastramento', type: 'date', help: 'Preenchido automaticamente com a data e hora do dispositivo.', example: '01/01/2001', readonly: true },
  { key: 'hrHoraDoCadastramento', label: 'Hora do Cadastramento', type: 'time', help: 'Preenchido automaticamente com a data e hora do dispositivo.', example: '09:00', readonly: true }
]

const monitoredElementFields = [
  { key: 'pkCdMeioAmbienteCptm', label: 'Chave Primária - Meio Ambiente', help: 'Campo Automático', example: 'EEA.EF-A.2026-L.07-CPTM-N.000001', readonly: true, wide: true },
  { key: 'txNrElementoMonitoramento', label: 'Elemento de Monitoramento - Número', min: 1, max: 999999, inputmode: 'numeric', help: 'Inserir o número do elemento monitorado. Escolher de 1 a 999.999. Digitar apenas números. O número deve ser sequencial, não replicável e com seis unidades. Exibição final: N.000001.', example: '1' },
  { key: 'txNmElementoMonitoramento', label: 'Elemento de Monitoramento - Nome', help: 'Indicar um nome genérico para o elemento de monitoramento.', example: 'Plataforma 1' },
  { key: 'txStatusDoRegistroNoBd', label: 'Status do Registro no BD', type: 'select', options: statusRegistroOptions, help: 'Indica se o registro está ativo ou inativo no banco de dados.', example: 'Ativo' },
  { key: 'txStatusDoDesvioAmbiental', label: 'Status do Desvio Ambiental', type: 'select', options: statusDesvioOptions, help: 'Indica a situação de regularidade ambiental do desvio.', example: 'Regularizado' }
]

const locationFields = [
  { key: 'txMunicipio', label: 'Nome de Município', type: 'select', options: municipioOptions, help: 'Selecionar o município no qual está localizado o elemento monitorado no ato da vistoria, se aplicável. Utilizar menu suspenso.', example: 'Campo Limpo Paulista' },
  { key: 'txLinhaCptm', label: 'Nome da Linha CPTM', type: 'select', options: linhaOptions, help: 'Escolher o número da Linha. Utilizar menu suspenso.', example: 'Linha 07 - Rubi' },
  { key: 'txEstacaoCptm', label: 'Nome da Estação CPTM', type: 'select', options: estacaoOptions, help: 'Selecionar o nome da estação na qual está localizado o elemento monitorado no ato da vistoria, se aplicável. Utilizar menu suspenso.', example: 'Estação Jardim Helena - Vila Mara' },
  { key: 'txViaCptm', label: 'Número da Via da Linha CPTM', type: 'select', options: viaOptions, help: 'Selecionar a via na qual está localizado o elemento monitorado no ato da vistoria, se aplicável. Utilizar menu suspenso.', example: 'Via 03E - Trecho 2' },
  { key: 'txTrechoESentidoCptm', label: 'Trecho e Sentido da Linha CPTM', type: 'select', options: trechoOptions, help: 'Selecionar o trecho e sentido da via na qual está localizado o elemento monitorado no ato da vistoria, se aplicável. Utilizar menu suspenso.', example: 'Estação Antônio Gianetti Neto - Estação Ferraz de Vasconcelos', wide: true },
  { key: 'txKmPoste', label: 'Número do Quilômetro e Poste', help: 'Inserir o Km/Poste mais próximo do elemento de monitoramento vistoriado, se aplicável. Padrão: "00/00" ou "000/000".', example: '51/02' },
  { key: 'nrLatGrauDecimalWgs84', label: 'Latitude em Graus (Datum: WGS84)', type: 'number', step: 'any', location: true, help: 'Definir Explicação', example: '-23.123456' },
  { key: 'nrLongGrauDecimalWgs84', label: 'Longitude em Graus (Datum: WGS84)', type: 'number', step: 'any', location: true, help: 'Definir Explicação', example: '-46.123456' }
]

const environmentalRegulationFields = [
  { key: 'txTipoAtividadeListada', label: 'Tipo de Atividade (Listada)', type: 'select', options: tipoAtividadeListadaOptions, help: 'Selecionar o tipo de atividade relacionada ao elemento de monitoramento.', example: 'Outro(a)(s)' },
  { key: 'txTipoAtividadeNListada', label: 'Tipo de Atividade (Não Listada)', help: 'Inserir o tipo de atividade não listada quando "Tipo de Atividade (Listada)" for "Outro(a)(s)".', example: 'Transporte' },
  { key: 'txTipoDraListado', label: 'Tipo de DRA (Listado)', type: 'select', options: tipoDraListadoOptions, help: 'Selecionar o tipo de DRA relacionado ao elemento de monitoramento.', example: 'Outro(a)(s)' },
  { key: 'txTipoDraNListado', label: 'Tipo de DRA (Não Listado)', help: 'Inserir o tipo de DRA não listado quando "Tipo de DRA (Listado)" for "Outro(a)(s)".', example: 'Teste' },
  { key: 'txIdDra', label: 'Código Identificador do DRA', help: 'Inserir o código identificador do DRA.', example: 'DRF nº 123.456' },
  { key: 'dtValidadeDra', label: 'Data de Validade do DRA', type: 'date', help: 'Inserir a data de validade do DRA. Padrão: dd/mm/aaaa.', example: '01/01/2001' }
]

const detailFields = [
  { key: 'txTipoAtividadeCptm', label: 'Tipo de Atividade na CPTM', type: 'select', options: atividadeCptmOptions, help: 'Selecionar o tipo de atividade na CPTM. Utilizar lista suspensa.', example: 'Empreendimento/Obra' },
  { key: 'txNmLocalAtiv', label: 'Nome Edificação/Local da CPTM', type: 'select', options: edificacaoOptions, help: 'Selecionar o nome da edificação/local da CPTM. Utilizar lista suspensa.', example: 'Estação' },
  { key: 'txNmLocalAtivComplemento', label: 'Nome Edificação/Local (Complemento)', help: 'Inserir o complemento do nome da edificação/local na CPTM.', example: 'Brás' },
  { key: 'txOrigemEfluente', label: 'Origem do Efluente', type: 'select', options: origemOptions, help: 'Selecionar a origem do efluente. Utilizar lista suspensa.', example: 'Industrial' },
  { key: 'txFonteGeradora', label: 'Fonte Geradora do Efluente', type: 'select', options: fonteGeradoraOptions, help: 'Selecionar a fonte geradora do efluente. Utilizar lista suspensa.', example: 'Banheiro químico' },
  { key: 'nrQuantidadeL', label: 'Quantidade (Litros)', type: 'number', step: 'any', help: 'Inserir a quantidade em litros de efluente. Padrão: número com até 8 casas decimais.', example: '9,25' },
  { key: 'txTipoDestinacao', label: 'Tipo de Destinação do Efluente', type: 'select', options: destinacaoOptions, help: 'Selecionar o tipo de destinação do efluente. Utilizar lista suspensa.', example: 'Interligação em rede coletora' },
  { key: 'txTipoVeiculo', label: 'Tipo de Veículo', type: 'select', options: veiculoOptions, help: 'Selecionar o tipo de veículo transportador do efluente. Utilizar lista suspensa.', example: 'Caminhão' },
  { key: 'txIdVeiculo', label: 'Identificador/Placa do Veículo', help: 'Inserir identificador/placa do veículo transportador do efluente.', example: 'WAD 105D' },
  { key: 'txIdGuiaRemessa', label: 'Código Identificador da Guia de Remessa', help: 'Inserir o código identificador da guia de remessa.', example: 'ID nº 10.456' },
  { key: 'nrDistanciaDaViaM', label: 'Distância da Via CPTM (Metros)', type: 'number', step: 'any', help: 'Inserir a distância da via mais próxima em relação ao efluente, utilizando número decimal em metros.', example: '7,58' },
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
const isAdminUser = computed(() => getIsAdmin())
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
  const option = areaGestoraOptions.value.find(o => o.codigo === newVal)
  if (option) {
    const desc = option.descricao || ''
    const siglaMatch = desc.match(/\(([^)]+)\)/)
    const idMatch = desc.match(/\[([^\]]+)\]/)

    form.txSiglaAreaGestoraCptm = siglaMatch ? siglaMatch[1] : ''
    form.txIdAreaGestoraCptm = idMatch ? idMatch[1] : ''
  }
})

function getFieldOptions(field) {
  const options = Array.isArray(field?.options?.value) ? field.options.value : []
  const currentValue = form[field?.key]

  // Verifica se o valor atual (codigo) existe nas opções
  if (!currentValue || options.some(o => o.codigo === currentValue)) return options

  // Fallback caso o valor não exista (ex: rascunho antigo)
  return [currentValue, ...options]
}

watch(currentStep, async () => {
  if (activeStep.value.kind !== 'attachments') closeCamera({ silent: true })
  if (activeStep.value.kind === 'location') {
    await nextTick()
    initMap()
  }
})

onMounted(async () => {
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
}

async function applyLatestInspectionData() {
  if (isEditMode.value) return

  if (!getCurrentMonitoredElementKeys().length) {
    setStatus('Informe o elemento monitorado antes de preencher pela ultima inspecao.', 'warning')
    return
  }

  if (copyLastInspectionBusy.value) return
  copyLastInspectionBusy.value = true
  setStatus('Buscando ultima inspecao do elemento...', 'info')

  try {
    const latest = await findLatestInspectionForCurrentElement()

    if (!latest) {
      setStatus('Nenhuma inspecao anterior encontrada para este elemento.', 'warning')
      return
    }

    const sourceData = await hydrateInspectionDataForCopy(latest)
    copyFixedFieldsFromLatestInspection(sourceData)
    updateMapFromInputs()

    setStatus('Dados fixos copiados da ultima inspecao.', 'success')
  } catch (err) {
    console.error('Erro ao copiar dados da ultima inspecao', err)
    setStatus(err?.message || 'Nao foi possivel copiar os dados da ultima inspecao.', 'error')
  } finally {
    copyLastInspectionBusy.value = false
  }
}

async function applyFirstInspectionData() {
  if (isEditMode.value) return
  if (copyFirstInspectionBusy.value) return

  copyFirstInspectionBusy.value = true
  setStatus('Buscando primeira inspecao...', 'info')

  try {
    const first = await findFirstInspectionForTemplate()
    if (!first) {
      setStatus('Nenhuma inspecao anterior encontrada para usar como modelo.', 'warning')
      return
    }

    const sourceData = await hydrateInspectionDataForCopy(first)
    copyFormFieldsFromFirstInspection(sourceData)
    updateMapFromInputs()
    setStatus('Dados da primeira inspecao copiados para o formulario.', 'success')
  } catch (err) {
    console.error('Erro ao copiar dados da primeira inspecao', err)
    setStatus(err?.message || 'Nao foi possivel copiar os dados da primeira inspecao.', 'error')
  } finally {
    copyFirstInspectionBusy.value = false
  }
}

async function findLatestInspectionForCurrentElement() {
  const targetKeys = getCurrentMonitoredElementKeys()
  if (!targetKeys.length) return null

  const candidates = await getInspectionCopyCandidates()
  const sameElementCandidates = candidates.filter(item => isSameMonitoredElement(item, targetKeys))

  if (!sameElementCandidates.length) return null

  return sameElementCandidates
    .sort((a, b) => getInspectionRecencyTime(b) - getInspectionRecencyTime(a))
  [0]
}

async function findFirstInspectionForTemplate() {
  const candidates = await getInspectionCopyCandidates()
  if (!candidates.length) return null

  return candidates
    .sort((a, b) => getInspectionTemplateTime(a) - getInspectionTemplateTime(b))
  [0]
}

async function getInspectionCopyCandidates() {
  const candidates = []

  try {
    const localRecords = await getAllInspections()
    candidates.push(
      ...(localRecords || [])
        .map(normalizeLocalEfluenteRecord)
        .filter(Boolean)
        .filter(item => !isCurrentInspectionRecord(item))
    )
  } catch (err) {
    console.error('Erro ao buscar inspecoes locais para copia', err)
  }

  try {
    candidates.push(
      ...(await getApiInspectionsForCopy())
        .filter(Boolean)
        .filter(item => !isCurrentInspectionRecord(item))
    )
  } catch (err) {
    console.error('Erro ao buscar inspecoes da API para copia', err)
  }

  return candidates
}

async function getApiInspectionsForCopy() {
  const listFns = isAdminUser.value
    ? [getAdminEfluentesAPI, getMeusEfluentesAPI]
    : [getMeusEfluentesAPI]

  let lastError = null

  for (const listFn of listFns) {
    try {
      const response = await listFn({ pageSize: 100 })
      return extractEfluenteItems(response).map(normalizeApiEfluenteListItem)
    } catch (err) {
      lastError = err
    }
  }

  throw lastError || new Error('Nao foi possivel buscar inspecoes da API.')
}

async function hydrateInspectionDataForCopy(item) {
  const pk = getInspectionPk(item)
  const isLocalDraft = item?.syncStatus && item.syncStatus !== SYNC_STATUS.SENT

  if (pk && !isLocalDraft) {
    try {
      return mapApiEfluenteToFormData(await getEfluenteByPkAPI(pk))
    } catch (err) {
      console.error('Erro ao detalhar ultima inspecao para copia', err)
    }
  }

  return mapApiEfluenteToFormData(item?.formData || item || {})
}

function copyFixedFieldsFromLatestInspection(sourceData = {}) {
  for (const key of FIXED_FIELDS_FROM_LAST_INSPECTION) {
    form[key] = sourceData[key] ?? ''
  }
}

function copyFormFieldsFromFirstInspection(sourceData = {}) {
  for (const key of EFLUENTE_FIELD_KEYS) {
    if (key === 'pkCdMeioAmbienteCptm') continue
    if (key === 'dtDataDoCadastramento') continue
    if (key === 'hrHoraDoCadastramento') continue
    form[key] = sourceData[key] ?? ''
  }
  form.pkCdMeioAmbienteCptm = ''
}

function getCurrentMonitoredElementKeys() {
  return getMonitoredElementKeys(form)
}

function getMonitoredElementKeys(source = {}) {
  return [
    normalizeElementReference(source?.txNrElementoMonitoramento),
    normalizeElementReference(source?.txNmElementoMonitoramento)
  ].filter(Boolean)
}

function normalizeElementReference(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
}

function isSameMonitoredElement(item, targetKeys = []) {
  const source = item?.formData || item || {}
  const itemKeys = getMonitoredElementKeys(source)
  return itemKeys.some(key => targetKeys.includes(key))
}

function isCurrentInspectionRecord(item) {
  const currentIds = [
    localDraftId.value,
    route.params.id
  ].map(value => String(value || '')).filter(value => value && value !== 'new')

  if (!currentIds.length) return false

  const itemIds = [
    item?.localId,
    item?.id,
    item?.serverId,
    item?.pkCdMeioAmbienteCptm,
    item?.formData?.pkCdMeioAmbienteCptm
  ].map(value => String(value || '')).filter(Boolean)

  return itemIds.some(id => currentIds.includes(id))
}

function getInspectionPk(item = {}) {
  return item.pkCdMeioAmbienteCptm
    || item.PkCdMeioAmbienteCptm
    || item.serverId
    || item.formData?.pkCdMeioAmbienteCptm
    || ''
}

function getInspectionRecencyTime(item = {}) {
  const source = item.formData || item
  const date = source.dtDataDoCadastramento || source.dtDataEmissaoFormulario
  const time = source.hrHoraDoCadastramento || '00:00'
  const dateTime = date ? new Date(`${String(date).slice(0, 10)}T${time}`) : null
  if (dateTime && !Number.isNaN(dateTime.getTime())) return dateTime.getTime()

  for (const fallback of [item.updatedAt, item.createdAt, item.UpdatedAt, item.CreatedAt]) {
    const parsed = new Date(fallback)
    if (!Number.isNaN(parsed.getTime())) return parsed.getTime()
  }

  return 0
}

function getInspectionTemplateTime(item = {}) {
  const time = getInspectionRecencyTime(item)
  return time || Number.MAX_SAFE_INTEGER
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
