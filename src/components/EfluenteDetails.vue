<template>
  <AppLayout>
    <PageContainer>
      <Header :logo="logo" title="Detalhes do Efluente" subtitle="Visualizacao completa por secoes">
        <template #actions>
          <button class="btn" type="button" @click="goBack">Voltar</button>
          <button class="btn warning" type="button" @click="edit">Editar</button>
          <button class="btn info" type="button" @click="downloadPdf">Baixar PDF</button>
        </template>
      </Header>

      <div v-if="loading" class="details-grid">
        <LoadingSkeleton height="160px" />
        <LoadingSkeleton height="160px" />
        <LoadingSkeleton height="160px" />
      </div>

      <ToastAlert :message="error" type="error" />

      <section v-if="efluente && !loading" class="details-grid">
        <article v-for="group in groups" :key="group.title" class="detail-card">
          <h2>{{ group.title }}</h2>
          <dl>
            <template v-for="field in group.fields" :key="field.key">
              <dt>{{ field.label }}</dt>
              <dd>{{ display(efluente[field.key]) }}</dd>
            </template>
          </dl>
        </article>

        <article class="detail-card wide">
          <h2>Anexos</h2>
          <div v-if="attachments.length" class="attachment-grid">
            <div v-for="att in attachments" :key="att.attachmentId" class="attachment-card">
              <strong>{{ att.attName || `Anexo ${att.attachmentId}` }}</strong>
              <span>{{ att.contentType || 'arquivo' }} - {{ formatBytes(att.dataSize) }}</span>
              <div class="flex flex-wrap gap-2">
                <button class="btn" type="button" @click="openAttachment(att)">Visualizar</button>
                <button class="btn" type="button" @click="downloadAttachment(att)">Baixar</button>
              </div>
            </div>
          </div>
          <EmptyState v-else title="Sem anexos" message="Este efluente ainda nao possui anexos cadastrados." />
        </article>
      </section>
    </PageContainer>
  </AppLayout>
</template>

<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import logo from '../assets/cptm_logo_simples.png'
import AppLayout from './ui/AppLayout.vue'
import EmptyState from './ui/EmptyState.vue'
import Header from './ui/Header.vue'
import LoadingSkeleton from './ui/LoadingSkeleton.vue'
import PageContainer from './ui/PageContainer.vue'
import ToastAlert from './ui/ToastAlert.vue'
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
import { mapApiEfluenteToFormData, normalizeLocalEfluenteRecord } from '../services/efluenteModel'

const route = useRoute()
const router = useRouter()
const efluente = ref(null)
const attachments = ref([])
const loading = ref(true)
const error = ref('')
let openedUrl = ''

const groups = [
  {
    title: 'Identificacao',
    fields: [
      { key: 'pkCdMeioAmbienteCptm', label: 'Codigo CPTM' },
      { key: 'txNrElementoMonitoramento', label: 'Numero do elemento' },
      { key: 'txNmElementoMonitoramento', label: 'Nome do elemento' },
      { key: 'txStatusDoRegistroNoBd', label: 'Status no sistema central' }
    ]
  },
  {
    title: 'Localizacao',
    fields: [
      { key: 'txMunicipio', label: 'Municipio' },
      { key: 'txLinhaCptm', label: 'Linha' },
      { key: 'txEstacaoCptm', label: 'Estacao' },
      { key: 'nrLatGrauDecimalWgs84', label: 'Latitude' },
      { key: 'nrLongGrauDecimalWgs84', label: 'Longitude' }
    ]
  },
  {
    title: 'Efluente',
    fields: [
      { key: 'txOrigemEfluente', label: 'Origem' },
      { key: 'txFonteGeradora', label: 'Fonte geradora' },
      { key: 'nrQuantidadeL', label: 'Quantidade (L)' },
      { key: 'txTipoDestinacao', label: 'Destinacao' },
      { key: 'txObsCadastramento', label: 'Observacoes' }
    ]
  },
  {
    title: 'Responsaveis',
    fields: [
      { key: 'txNmResponsavelCadastro', label: 'Responsavel' },
      { key: 'txRpResponsavelCadastro', label: 'RP' },
      { key: 'txDrtResponsavelCadastro', label: 'DRT' },
      { key: 'dtDataDoCadastramento', label: 'Data cadastro' }
    ]
  }
]

onMounted(load)
onBeforeUnmount(() => {
  if (openedUrl) URL.revokeObjectURL(openedUrl)
})

async function load() {
  loading.value = true
  error.value = ''
  attachments.value = []
  const id = route.params.id

  try {
    const cached = consumeDetailsRecord(id)
    if (cached) {
      efluente.value = normalizeDetailsRecord(cached)
      if (!cached.__skipAttachmentsEndpoint) await loadAttachments(id)
      return
    }

    try {
      const data = await getEfluenteByPkAPI(id)
      efluente.value = normalizeDetailsRecord(data)
      await loadAttachments(id)
      return
    } catch (err) {
      console.warn('Detalhes nao encontrados no endpoint principal, tentando fallback.', err)
    }

    const fallback = await findFallbackDetails(id)
    if (!fallback) throw new Error('Registro nao encontrado')

    efluente.value = fallback
    if (!fallback.__skipAttachmentsEndpoint) await loadAttachments(id)
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
  } catch (err) {
    console.warn('Nao foi possivel carregar anexos dos detalhes.', err)
    attachments.value = []
  }
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
  return value === null || value === undefined || value === '' ? 'Nao informado' : value
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
  const blob = await getEfluenteAnexoBlobAPI(att.attachmentId)
  openedUrl = URL.createObjectURL(blob)
  window.open(openedUrl, '_blank', 'noopener,noreferrer')
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

function edit() {
  router.push(`/inspections/${encodeURIComponent(route.params.id)}/edit`)
}

function goBack() {
  router.back()
}

function downloadPdf() {
  window.print()
}
</script>

<style scoped>
@reference "../style.css";

.details-grid {
  @apply mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2;
}

.detail-card {
  @apply rounded-app border border-slate-200 bg-white p-5 shadow-sm;
}

.detail-card.wide {
  @apply lg:col-span-2;
}

.detail-card h2 {
  @apply mb-4 text-lg font-black text-slate-950;
}

.detail-card dl {
  @apply grid grid-cols-1 gap-3 sm:grid-cols-[180px_minmax(0,1fr)];
}

.detail-card dt {
  @apply font-extrabold text-slate-500;
}

.detail-card dd {
  @apply m-0 break-words font-semibold text-slate-900;
}

.attachment-grid {
  @apply grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3;
}

.attachment-card {
  @apply flex min-w-0 flex-col gap-2 rounded-app border border-slate-200 bg-slate-50 p-3;
}

.attachment-card strong,
.attachment-card span {
  @apply break-words;
}
</style>
