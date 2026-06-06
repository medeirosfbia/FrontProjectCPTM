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
import { getEfluenteAnexoBlobAPI, getEfluenteAnexosAPI, getEfluenteByPkAPI } from '../services/api'

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
  try {
    efluente.value = await getEfluenteByPkAPI(route.params.id)
    const data = await getEfluenteAnexosAPI(route.params.id)
    attachments.value = Array.isArray(data) ? data : []
  } catch (err) {
    console.error(err)
    error.value = 'Nao foi possivel carregar os detalhes.'
  } finally {
    loading.value = false
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
