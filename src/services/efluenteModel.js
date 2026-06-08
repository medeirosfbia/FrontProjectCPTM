export const SYNC_STATUS = {
  DRAFT: 'DRAFT',
  PENDING_SYNC: 'PENDING_SYNC',
  SENT: 'SENT',
  ERROR: 'ERROR'
}

export const EFLUENTE_FIELD_KEYS = [
  'pkCdMeioAmbienteCptm',
  'txNrElementoMonitoramento',
  'txNmElementoMonitoramento',
  'txSiglaDeptoMeioAmbiente',
  'txStatusDoDesvioAmbiental',
  'txStatusDoRegistroNoBd',
  'txMunicipio',
  'txLinhaCptm',
  'txViaCptm',
  'txTrechoESentidoCptm',
  'txKmPoste',
  'txEstacaoCptm',
  'nrLatGrauDecimalWgs84',
  'nrLongGrauDecimalWgs84',
  'nrLatMetrosSirgas2000',
  'nrLongMetrosSirgas2000',
  'txNmLocalEscopoContratual',
  'txTipoDeFormulario',
  'dtDataEmissaoFormulario',
  'nrNumeroDeFormulario',
  'txAutorPfDoFormulario',
  'txNaturezaDoPga',
  'txNomePjExecutora',
  'txTipoAtividadeListada',
  'txTipoAtividadeNListada',
  'txTipoDraListado',
  'txTipoDraNListado',
  'txIdDra',
  'dtValidadeDra',
  'txAnaliseCptmAprovacao',
  'txTipoAtividadeCptm',
  'txNmLocalAtiv',
  'txNmLocalAtivComplemento',
  'txOrigemEfluente',
  'txFonteGeradora',
  'nrQuantidadeL',
  'txTipoDestinacao',
  'txTipoVeiculo',
  'txIdVeiculo',
  'txIdGuiaRemessa',
  'nrDistanciaDaViaM',
  'txOfereceRiscoSistemaCptm',
  'txProprietario',
  'txObsCadastramento',
  'dtDataDoCadastramento',
  'hrHoraDoCadastramento',
  'txAutorPjDoCadastro',
  'txAutorPfDoCadastro',
  'txNmResponsavelCadastro',
  'txRpResponsavelCadastro',
  'txDrtResponsavelCadastro',
  'txNomePjDaContratada',
  'txNrContratoContratada',
  'txNmAreaGestoraCptm',
  'txIdAreaGestoraCptm',
  'txSiglaAreaGestoraCptm',
  'txNomePfDaRepresentante',
  'txNomePjDaSupervisora',
  'txNrContratoSupervisora',
  'txNmArquivoFdcRelacionado',
  'pkCdArquivoFdcRelacionado',
  'txNmArquivoRvtRelacionado',
  'pkCdElementoDeMonitorRvt',
  'txNmArquivoDacRelacionado',
  'pkCdElementoDeMonitorDac',
  'txNmArquivoCncRelacionado',
  'pkCdElementoDeMonitorCnc',
  'pkCdCodigoNoUltimoRra',
  'pkCdCedoc'
]

export const NUMERIC_EFLUENTE_FIELDS = new Set([
  'nrLatGrauDecimalWgs84',
  'nrLongGrauDecimalWgs84',
  'nrLatMetrosSirgas2000',
  'nrLongMetrosSirgas2000',
  'nrNumeroDeFormulario',
  'nrQuantidadeL',
  'nrDistanciaDaViaM'
])

export const DATE_EFLUENTE_FIELDS = new Set([
  'dtDataEmissaoFormulario',
  'dtValidadeDra',
  'dtDataDoCadastramento'
])

function canUseCryptoUuid() {
  return typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
}

function createId() {
  return canUseCryptoUuid()
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

export function createAttachmentRecord(file) {
  const blob = file?.blob || file
  const name = file?.name || `anexo-${Date.now()}`
  const type = file?.type || blob?.type || 'application/octet-stream'
  const size = file?.size ?? blob?.size ?? 0

  return {
    id: file?.id || createId(),
    name,
    type,
    size,
    blob,
    createdAt: file?.createdAt || new Date().toISOString()
  }
}

export function splitAttachmentRecords(files = []) {
  const images = []
  const documents = []

  for (const file of files.filter(Boolean)) {
    const record = createAttachmentRecord(file)
    if (record.type?.startsWith('image/')) images.push(record)
    else documents.push(record)
  }

  return { images, documents }
}

export function attachmentRecordToFile(record) {
  const blob = record?.blob || record
  const name = record?.name || 'anexo'
  const type = record?.type || blob?.type || 'application/octet-stream'

  if (typeof File !== 'undefined' && blob instanceof File && blob.name === name) return blob
  if (typeof File !== 'undefined' && blob instanceof Blob) {
    return new File([blob], name, {
      type,
      lastModified: record?.createdAt ? new Date(record.createdAt).getTime() : Date.now()
    })
  }

  return blob
}

export function getDraftAttachmentRecords(record = {}) {
  return [
    ...(Array.isArray(record.images) ? record.images : []),
    ...(Array.isArray(record.documents) ? record.documents : [])
  ].filter(item => item?.blob)
}

export function getDraftAttachmentFiles(record = {}) {
  return getDraftAttachmentRecords(record).map(attachmentRecordToFile).filter(Boolean)
}

function normalizeDateInputValue(value) {
  if (!value) return ''

  const text = String(value).trim()
  const match = text.match(/^(\d{4}-\d{2}-\d{2})/)
  if (match) return match[1]

  const parsed = new Date(text)
  if (Number.isNaN(parsed.getTime())) return text

  const year = parsed.getFullYear()
  const month = String(parsed.getMonth() + 1).padStart(2, '0')
  const day = String(parsed.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function normalizeDate(value) {
  if (!value || value === '') return null

  const text = String(value).trim()
  if (!text) return null

  const isoMatch = text.match(/^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2})(?::(\d{2}))?)?$/)
  if (isoMatch) {
    const [, year, month, day, hour, minute, second = '00'] = isoMatch
    if (!isValidDateParts(year, month, day)) return null
    if (hour !== undefined && !isValidTimeParts(hour, minute, second)) return null
    if (hour !== undefined && minute !== undefined) return `${year}-${month}-${day}T${hour}:${minute}:${second}`
    return `${year}-${month}-${day}`
  }

  const brMatch = text.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (brMatch) {
    const [, day, month, year] = brMatch
    if (!isValidDateParts(year, month, day)) return null
    return `${year}-${month}-${day}`
  }

  return null
}

function isValidDateParts(year, month, day) {
  const y = Number(year)
  const m = Number(month)
  const d = Number(day)
  if (!Number.isInteger(y) || !Number.isInteger(m) || !Number.isInteger(d)) return false
  if (m < 1 || m > 12 || d < 1 || d > 31) return false

  const parsed = new Date(Date.UTC(y, m - 1, d))
  return parsed.getUTCFullYear() === y
    && parsed.getUTCMonth() === m - 1
    && parsed.getUTCDate() === d
}

function isValidTimeParts(hour, minute, second) {
  const h = Number(hour)
  const m = Number(minute)
  const s = Number(second)
  return Number.isInteger(h)
    && Number.isInteger(m)
    && Number.isInteger(s)
    && h >= 0
    && h <= 23
    && m >= 0
    && m <= 59
    && s >= 0
    && s <= 59
}

export function createEmptyEfluenteFormData() {
  return EFLUENTE_FIELD_KEYS.reduce((data, key) => {
    data[key] = ''
    return data
  }, {})
}

export function toNumberOrNull(value) {
  if (value === '' || value === null || value === undefined) return null
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

export function buildEfluentePayload(formData, { ensurePk = false } = {}) {
  const payload = {}

  for (const key of EFLUENTE_FIELD_KEYS) {
    if (NUMERIC_EFLUENTE_FIELDS.has(key)) {
      payload[key] = toNumberOrNull(formData?.[key])
    } else if (DATE_EFLUENTE_FIELDS.has(key)) {
      payload[key] = normalizeDate(formData?.[key])
    } else {
      payload[key] = formData?.[key] ?? ''
    }
  }

  if (!payload.pkCdMeioAmbienteCptm && ensurePk) {
    payload.pkCdMeioAmbienteCptm = crypto.randomUUID()
  }

  if (!payload.pkCdMeioAmbienteCptm) {
    delete payload.pkCdMeioAmbienteCptm
  }

  return payload
}

function unwrapApiEfluenteSource(apiResponse = {}) {
  const source = apiResponse?.data && typeof apiResponse.data === 'object'
    ? apiResponse.data
    : apiResponse

  return source?.efluente
    || source?.Efluente
    || source?.registro
    || source?.Registro
    || source?.item
    || source?.Item
    || source
}

function toSnakeKey(key) {
  return String(key).replace(/([A-Z])/g, '_$1').toLowerCase()
}

function readApiValue(source = {}, key) {
  const pascalKey = key.charAt(0).toUpperCase() + key.slice(1)
  const snakeKey = toSnakeKey(key)
  const candidates = [
    key,
    pascalKey,
    snakeKey,
    snakeKey.toUpperCase()
  ]

  for (const candidate of candidates) {
    if (Object.prototype.hasOwnProperty.call(source, candidate)) {
      return source[candidate]
    }
  }

  const lowerKey = String(key).toLowerCase()
  const foundKey = Object.keys(source).find(item => item.toLowerCase() === lowerKey)
  return foundKey ? source[foundKey] : undefined
}

export function mapApiEfluenteToFormData(apiResponse = {}) {
  const source = unwrapApiEfluenteSource(apiResponse)

  const formData = createEmptyEfluenteFormData()

  for (const key of EFLUENTE_FIELD_KEYS) {
    const value = readApiValue(source, key) ?? ''
    formData[key] = DATE_EFLUENTE_FIELDS.has(key)
      ? normalizeDateInputValue(value)
      : (value ?? '')
  }

  return formData
}

export function createDraftRecord({
  localId,
  formData,
  syncStatus = SYNC_STATUS.DRAFT,
  lastError = '',
  images = [],
  documents = [],
  existingRecord = null
}) {
  const now = new Date().toISOString()
  const id = localId || createId()
  const payload = buildEfluentePayload(formData)

  return {
    id,
    localId: id,
    pkCdMeioAmbienteCptm: payload.pkCdMeioAmbienteCptm || '',
    formData: mapApiEfluenteToFormData(payload),
    images: images.map(createAttachmentRecord),
    documents: documents.map(createAttachmentRecord),
    filesMetadata: [...images, ...documents].map(file => ({
      name: file?.name,
      type: file?.type,
      size: file?.size
    })),
    syncStatus,
    createdAt: existingRecord?.createdAt || now,
    updatedAt: now,
    lastError
  }
}

export function normalizeLocalEfluenteRecord(record) {
  if (!record) return null

  if (record.formData) {
    return {
      ...record,
      id: record.localId || record.id,
      localId: record.localId || record.id,
      formData: mapApiEfluenteToFormData(record.formData),
      images: Array.isArray(record.images) ? record.images : [],
      documents: Array.isArray(record.documents) ? record.documents : [],
      filesMetadata: Array.isArray(record.filesMetadata) ? record.filesMetadata : [],
      syncStatus: record.syncStatus || normalizeLegacySyncStatus(record.status)
    }
  }

  const formData = mapApiEfluenteToFormData(record)
  const fallbackId = record.localId || record.id || createId()
  return {
    id: fallbackId,
    localId: fallbackId,
    pkCdMeioAmbienteCptm: formData.pkCdMeioAmbienteCptm || '',
    formData,
    images: Array.isArray(record.images) ? record.images : [],
    documents: Array.isArray(record.documents) ? record.documents : [],
    filesMetadata: Array.isArray(record.filesMetadata) ? record.filesMetadata : [],
    syncStatus: record.syncStatus || normalizeLegacySyncStatus(record.status),
    createdAt: record.createdAt || new Date().toISOString(),
    updatedAt: record.updatedAt || new Date().toISOString(),
    lastError: record.lastError || ''
  }
}

export function normalizeApiEfluenteListItem(item = {}) {
  const formData = mapApiEfluenteToFormData(item)
  const pk = formData.pkCdMeioAmbienteCptm
    || readApiValue(unwrapApiEfluenteSource(item), 'pkCdMeioAmbienteCptm')
    || item.serverId
    || item.id
    || item.Id
    || ''

  return {
    ...item,
    ...formData,
    id: pk,
    serverId: pk,
    pkCdMeioAmbienteCptm: pk,
    formData,
    attachmentCount: Array.isArray(item.anexos)
      ? item.anexos.length
      : Array.isArray(item.Anexos)
        ? item.Anexos.length
        : Number(item.attachmentCount || item.AttachmentCount || 0),
    syncStatus: SYNC_STATUS.SENT
  }
}

export function getEfluenteCardTitle(item = {}) {
  const data = item.formData || item
  return data.txNmElementoMonitoramento
    || data.txNrElementoMonitoramento
    || data.txOrigemEfluente
    || data.txFonteGeradora
    || data.title
    || data.titulo
    || 'Efluente sem nome'
}

export function getEfluenteCardSubtitle(item = {}) {
  const data = item.formData || item
  const parts = [data.txMunicipio, data.txLinhaCptm, data.txEstacaoCptm].filter(Boolean)
  return parts.length ? parts.join(' | ') : 'Localizacao nao informada'
}

export function getEfluenteCardMeta(item = {}) {
  const data = item.formData || item
  const parts = []
  const date = data.dtDataDoCadastramento || item.createdAt || item.CreatedAt
  const responsible = data.txNmResponsavelCadastro || data.txAutorPfDoCadastro || data.txAutorPjDoCadastro
  const localAttachmentCount = (Array.isArray(item.images) ? item.images.length : 0)
    + (Array.isArray(item.documents) ? item.documents.length : 0)
  const attachmentCount = Number(item.attachmentCount ?? item.attachmentsCount ?? localAttachmentCount)

  if (date) parts.push(`Data: ${String(date).slice(0, 10)}`)
  if (responsible) parts.push(`Responsavel: ${responsible}`)
  parts.push(`${Number.isFinite(attachmentCount) ? attachmentCount : 0} anexo(s)`)

  return parts.join(' | ')
}

export function getSyncStatusLabel(syncStatus) {
  if (syncStatus === SYNC_STATUS.PENDING_SYNC) return 'Aguardando Envio'
  if (syncStatus === SYNC_STATUS.ERROR) return 'Erro de Envio'
  if (syncStatus === SYNC_STATUS.DRAFT) return 'Rascunho'
  return 'Enviado'
}

export function getSyncStatusVariant(syncStatus) {
  if (syncStatus === SYNC_STATUS.PENDING_SYNC) return 'status--waiting'
  if (syncStatus === SYNC_STATUS.ERROR) return 'status--error'
  if (syncStatus === SYNC_STATUS.DRAFT) return 'status--draft'
  return 'status--sent'
}

export function validateEfluenteForSubmit(formData) {
  const data = buildEfluentePayload(formData)
  const errors = []

  if (!data.txNmElementoMonitoramento && !data.txNrElementoMonitoramento) {
    errors.push('Informe o nome ou numero do elemento de monitoramento.')
  }
  if (!data.txMunicipio) errors.push('Informe o municipio.')
  if (!data.txLinhaCptm) errors.push('Informe a linha CPTM.')
  if (!data.txOrigemEfluente && !data.txFonteGeradora) {
    errors.push('Informe a origem do efluente ou a fonte geradora.')
  }
  if (!data.dtDataDoCadastramento) errors.push('Informe a data do cadastramento.')
  if (!data.hrHoraDoCadastramento) errors.push('Informe a hora do cadastramento.')

  const lat = data.nrLatGrauDecimalWgs84
  const lng = data.nrLongGrauDecimalWgs84
  if (lat !== null && (lat < -90 || lat > 90)) errors.push('Latitude valida deve estar entre -90 e 90.')
  if (lng !== null && (lng < -180 || lng > 180)) errors.push('Longitude valida deve estar entre -180 e 180.')

  return {
    valid: errors.length === 0,
    errors
  }
}

function normalizeLegacySyncStatus(status) {
  const value = String(status || '').trim().toLowerCase()
  if (value === 'enviado') return SYNC_STATUS.SENT
  if (value.includes('aguard')) return SYNC_STATUS.PENDING_SYNC
  if (value.includes('erro')) return SYNC_STATUS.ERROR
  return SYNC_STATUS.DRAFT
}
