import { normalizeApiEfluenteListItem } from './efluenteModel'

export const API_ORIGIN = 'http://localhost:5000'
const BASE = `${API_ORIGIN}/api`
const EFLUENTES_BASE = `${BASE}/efluentes`
const DEFAULT_REQUEST_TIMEOUT_MS = 30000
export const EFLUENTE_DOMINIOS_CACHE_KEY = 'efluente_dominios_cache'

const EFLUENTE_DOMINIOS_ENDPOINTS = {
  siglasDepartamentoMeioAmbiente: 'siglas-departamento-meio-ambiente',
  areasGestoras: 'areas-gestoras',
  naturezasPga: 'naturezas-pga',
  statusDesvio: 'status-desvio',
  statusRegistroBd: 'status-registro-bd',
  municipios: 'municipios',
  linhas: 'linhas',
  vias: 'vias',
  trechosSentidos: 'trechos-sentidos',
  estacoes: 'estacoes',
  tiposProprietario: 'tipos-proprietario',
  proprietarios: 'proprietarios',
  simNao: 'sim-nao',
  tiposAtividadeListada: 'tipos-atividade-listada',
  tiposDraListado: 'tipos-dra-listado',
  tiposAtividadeCptm: 'tipos-atividade-cptm',
  locaisAtividade: 'locais-atividade',
  origensEfluente: 'origens-efluente',
  fontesGeradoras: 'fontes-geradoras',
  tiposDestinacao: 'tipos-destinacao',
  tiposVeiculo: 'tipos-veiculo'
}

const SIM_NAO_DOMINIO_FALLBACK = [
  { codigo: 1, descricao: 'Sim' },
  { codigo: 2, descricao: 'Não' }
]

function normalizeDominioItems(items) {
  return Array.isArray(items)
    ? items
      .map((item) => ({
        codigo: item?.codigo ?? item?.Codigo ?? item?.id ?? item?.Id ?? '',
        descricao: item?.descricao ?? item?.Descricao ?? item?.description ?? ''
      }))
      .filter((item) => item.descricao !== '')
    : []
}

function readDominiosCache() {
  if (typeof localStorage === 'undefined') return null

  try {
    const raw = localStorage.getItem(EFLUENTE_DOMINIOS_CACHE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : null
  } catch {
    return null
  }
}

function writeDominiosCache(dominios) {
  if (typeof localStorage === 'undefined') return

  try {
    localStorage.setItem(EFLUENTE_DOMINIOS_CACHE_KEY, JSON.stringify(dominios))
  } catch {
    // Cache is best-effort; the form can still use the response in memory.
  }
}

async function fetchWithTimeout(url, options = {}, timeoutMs = DEFAULT_REQUEST_TIMEOUT_MS) {
  if (typeof AbortController === 'undefined' || options.signal) {
    return fetch(url, options)
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  try {
    return await fetch(url, { ...options, signal: controller.signal })
  } catch (err) {
    if (err?.name === 'AbortError') {
      const timeoutError = new Error('timeout')
      timeoutError.name = 'TimeoutError'
      throw timeoutError
    }

    throw err
  } finally {
    clearTimeout(timeoutId)
  }
}

export function getToken() {
  return localStorage.getItem('auth_token') || null
}

function decodeJwtPayload(token) {
  if (!token || typeof token !== 'string') return null

  const parts = token.split('.')
  if (parts.length < 2) return null

  try {
    const normalized = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4)
    return JSON.parse(atob(padded))
  } catch {
    return null
  }
}

function roleClaimToIsAdmin(role) {
  if (Array.isArray(role)) {
    return role.some((r) => String(r).toLowerCase().trim() === 'admin')
  }

  return String(role || '').toLowerCase().trim() === 'admin'
}

function inferIsAdmin(res, token) {
  const role = res?.role || res?.data?.role
  const isAdminRaw = res?.isAdmin ?? res?.data?.isAdmin

  if (typeof isAdminRaw === 'boolean') return isAdminRaw
  if (typeof isAdminRaw === 'string') return isAdminRaw.toLowerCase().trim() === 'true'
  if (role) return roleClaimToIsAdmin(role)

  const payload = decodeJwtPayload(token)
  if (!payload) return null

  const claimRole = payload.role
    ?? payload.roles
    ?? payload['http://schemas.microsoft.com/ws/2008/06/identity/claims/role']

  if (claimRole != null) return roleClaimToIsAdmin(claimRole)

  const claimIsAdmin = payload.isAdmin ?? payload.IsAdmin
  if (typeof claimIsAdmin === 'boolean') return claimIsAdmin
  if (typeof claimIsAdmin === 'string') return claimIsAdmin.toLowerCase().trim() === 'true'

  return null
}

export function getIsAdmin() {
  const fromFlag = (localStorage.getItem('user_is_admin') || '').toLowerCase().trim()
  if (fromFlag === 'true') return true
  if (fromFlag === 'false') return false

  const fromRole = (localStorage.getItem('user_role') || '').toLowerCase().trim()
  if (fromRole === 'admin') return true
  if (fromRole === 'user') return false

  const token = getToken()
  const payload = decodeJwtPayload(token)
  if (!payload) return false

  const claimRole = payload.role
    ?? payload.roles
    ?? payload['http://schemas.microsoft.com/ws/2008/06/identity/claims/role']

  if (claimRole != null) {
    const byRole = roleClaimToIsAdmin(claimRole)
    localStorage.setItem('user_is_admin', String(byRole))
    localStorage.setItem('user_role', byRole ? 'admin' : 'user')
    return byRole
  }

  const claimIsAdmin = payload.isAdmin ?? payload.IsAdmin
  if (typeof claimIsAdmin === 'boolean' || typeof claimIsAdmin === 'string') {
    const byFlag = typeof claimIsAdmin === 'boolean'
      ? claimIsAdmin
      : claimIsAdmin.toLowerCase().trim() === 'true'

    localStorage.setItem('user_is_admin', String(byFlag))
    localStorage.setItem('user_role', byFlag ? 'admin' : 'user')
    return byFlag
  }

  return false
}

export function logout() {
  localStorage.removeItem('auth_token')
  localStorage.removeItem('user_role')
  localStorage.removeItem('user_is_admin')
  localStorage.removeItem('user_email')
}

export async function apiFetch(path, options = {}) {
  const url = BASE + path
  const headers = new Headers(options.headers || {})

  const token = getToken()
  if (token) headers.set('Authorization', `Bearer ${token}`)

  const requestOptions = { ...options }
  if (requestOptions.body && !(requestOptions.body instanceof FormData)) {
    if (!headers.has('Content-Type')) headers.set('Content-Type', 'application/json')
    if (typeof requestOptions.body !== 'string') requestOptions.body = JSON.stringify(requestOptions.body)
  }

  const res = await fetchWithTimeout(url, { ...requestOptions, headers })

  if (res.status === 401) {
    logout()
    const err = new Error('Unauthorized')
    err.status = 401
    throw err
  }

  const text = await res.text()
  let data = null
  try { data = text ? JSON.parse(text) : null } catch { data = text }

  if (!res.ok) {
    const validationErrors = data?.errors && typeof data.errors === 'object'
      ? Object.values(data.errors).flat().filter(Boolean).join(' ')
      : ''
    const message = data?.message
      || data?.title
      || validationErrors
      || (typeof data === 'string' && data.trim() ? data : '')
      || `HTTP ${res.status}`
    const err = new Error(message)
    err.status = res.status
    err.response = data
    throw err
  }

  return data
}

export async function getDominioAPI(endpoint) {
  const normalizedEndpoint = String(endpoint || '').replace(/^\/?(api\/)?dominios\/?/, '').replace(/^\/+/, '')
  if (!normalizedEndpoint) throw new Error('Endpoint de dominio obrigatorio.')

  try {
    const items = normalizeDominioItems(await apiFetch(`/dominios/${normalizedEndpoint}`, { method: 'GET' }))
    if (normalizedEndpoint === EFLUENTE_DOMINIOS_ENDPOINTS.simNao && !items.length) {
      return SIM_NAO_DOMINIO_FALLBACK
    }

    return items
  } catch (err) {
    if (normalizedEndpoint === EFLUENTE_DOMINIOS_ENDPOINTS.simNao) {
      return SIM_NAO_DOMINIO_FALLBACK
    }

    throw err
  }
}

export async function getDominiosFormularioEfluenteAPI() {
  const cached = readDominiosCache() || {}
  const entries = Object.entries(EFLUENTE_DOMINIOS_ENDPOINTS)
  const results = await Promise.allSettled(
    entries.map(async ([key, endpoint]) => ({
      key,
      items: await getDominioAPI(endpoint)
    }))
  )

  const dominios = {}
  let successCount = 0
  let fallbackCount = 0
  let firstError = null

  results.forEach((result, index) => {
    const key = entries[index][0]

    if (result.status === 'fulfilled') {
      dominios[key] = result.value.items
      successCount += 1
      return
    }

    firstError ||= result.reason
    dominios[key] = Array.isArray(cached[key]) ? cached[key] : []
    if (dominios[key].length) fallbackCount += 1
  })

  if (successCount > 0) {
    writeDominiosCache({ ...cached, ...dominios })
    return dominios
  }

  if (fallbackCount > 0) return dominios

  const message = 'Não foi possível carregar as listas suspensas.'
  const cacheError = new Error(message)
  cacheError.cause = firstError
  throw cacheError
}

export async function login(email, password) {
  const res = await apiFetch('/Usuarios/login', {
    method: 'POST',
    body: {
      email,
      senha: password
    }
  })

  const token = res?.token || res?.accessToken || res?.jwt || res?.data?.token
  if (!token) throw new Error('Token not returned from auth')

  localStorage.setItem('auth_token', token)
  localStorage.setItem('user_email', email)

  const isAdmin = inferIsAdmin(res, token)
  if (isAdmin !== null) {
    localStorage.setItem('user_is_admin', String(isAdmin))
    localStorage.setItem('user_role', isAdmin ? 'admin' : 'user')
  }

  return res
}

export function getCurrentUserId() {
  const token = getToken()
  const payload = decodeJwtPayload(token)
  return payload?.sub ? Number(payload.sub) : null
}

export async function getUsuariosAPI() {
  return apiFetch('/Usuarios', { method: 'GET' })
}

export async function getUserByIdAPI(id) {
  return apiFetch(`/Usuarios/${id}`, { method: 'GET' })
}

export async function updateUsuarioAPI(id, data) {
  if (id === undefined || id === null || id === '') {
    throw new Error('ID do usuário obrigatório.')
  }

  const payload = {
    nomeCompleto: data?.nomeCompleto,
    email: data?.email,
    dataNascimento: data?.dataNascimento
  }

  if (data?.isAdmin !== undefined && data?.isAdmin !== null) {
    payload.isAdmin = data.isAdmin
  }

  if (data?.senha) {
    payload.senha = data.senha
  }

  return apiFetch(`/Usuarios/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: payload
  })
}

export async function deletarUsuarioAPI(id) {
  return apiFetch(`/Usuarios/${id}`, { method: 'DELETE' })
}

export async function getInspecoesPorUsuarioAPI(usuarioId, params = {}) {
  return getAdminUsuarioEfluentesAPI(usuarioId, params)
}

export async function criarUsuarioAPI(data) {
  return apiFetch('/Usuarios/register', {
    method: 'POST',
    body: data
  })
}

function buildQuery(params = {}) {
  const search = new URLSearchParams()

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      search.set(key, value)
    }
  }

  const qs = search.toString()
  return qs ? `?${qs}` : ''
}

function buildEfluenteListQuery(params = {}) {
  return buildQuery({
    page: params.page ?? 1,
    pageSize: params.pageSize ?? 10,
    municipio: params.municipio,
    linha: params.linha,
    status: params.status,
    data: params.data
  })
}

function buildEfluenteMapQuery(params = {}) {
  return buildQuery({
    municipio: params.municipio,
    linha: params.linha ?? params.linhaCptm,
    status: params.status,
    dataInicio: params.dataInicio,
    dataFim: params.dataFim
  })
}

function normalizeEfluenteListResponse(res) {
  if (Array.isArray(res)) return res.map(normalizeApiEfluenteListItem)
  if (Array.isArray(res?.items)) return { ...res, items: res.items.map(normalizeApiEfluenteListItem) }
  if (Array.isArray(res?.data)) return { ...res, data: res.data.map(normalizeApiEfluenteListItem) }
  return res
}

export function extractEfluenteItems(response) {
  if (Array.isArray(response)) return response
  if (Array.isArray(response?.items)) return response.items
  if (Array.isArray(response?.data?.items)) return response.data.items
  if (Array.isArray(response?.data)) return response.data
  return []
}

async function getEfluentesFromPath(path, params = {}) {
  const res = await apiFetch(`${path}${buildEfluenteListQuery(params)}`, { method: 'GET' })
  return normalizeEfluenteListResponse(res)
}

export async function createEfluenteAPI(data) {
  return apiFetch('/efluentes', { method: 'POST', body: data })
}

function normalizeUploadFiles(files = []) {
  return (Array.isArray(files) ? files : [files])
    .filter(Boolean)
    .map(file => {
      const blob = file?.blob || file
      const name = file?.name || 'anexo'
      const type = file?.type || blob?.type || 'application/octet-stream'

      if (typeof File !== 'undefined' && blob instanceof File && blob.name === name) return blob
      if (typeof File !== 'undefined' && blob instanceof Blob) return new File([blob], name, { type })
      return blob
    })
    .filter(Boolean)
}

async function sendEfluenteMultipart(path, method, payload, files = []) {
  const token = getToken()
  if (!token) throw new Error('Usuario nao autenticado')

  const form = new FormData()
  form.append('payload', JSON.stringify(payload || {}))

  for (const file of normalizeUploadFiles(files)) {
    form.append('files', file, file.name || 'anexo')
  }

  const res = await fetchWithTimeout(`${BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`
    },
    body: form
  })

  if (res.status === 401) {
    logout()
    const err = new Error('Unauthorized')
    err.status = 401
    throw err
  }

  const text = await res.text()
  let data = null
  try { data = text ? JSON.parse(text) : null } catch { data = text }

  if (!res.ok) {
    const err = new Error(data && data.message ? data.message : `HTTP ${res.status}`)
    err.status = res.status
    err.response = data
    throw err
  }

  return data
}

export async function createEfluenteMultipartAPI(data, files = []) {
  return sendEfluenteMultipart('/efluentes', 'POST', data, files)
}

export function isTemporaryNetworkError(error) {
  const status = Number(error?.status || error?.response?.status || 0)
  if (status) {
    return status === 408
      || status === 429
      || status === 502
      || status === 503
      || status === 504
  }

  const isOnline = typeof navigator === 'undefined' ? true : navigator.onLine
  const name = String(error?.name || '').toLowerCase()
  const message = String(error?.message || error || '').toLowerCase()

  return !isOnline
    || name === 'typeerror'
    || name === 'timeouterror'
    || name === 'aborterror'
    || message.includes('failed to fetch')
    || message.includes('networkerror')
    || message.includes('err_connection_refused')
    || message.includes('load failed')
    || message.includes('timeout')
    || message.includes('network request failed')
    || message.includes('connection refused')
    || message.includes('conexao recusada')
    || message.includes('conexão recusada')
    || message.includes('inacess')
    || message.includes('offline')
}

export function isRetryableApiError(err) {
  return isTemporaryNetworkError(err)
}

export async function updateEfluenteMultipartAPI(pk, data, files = []) {
  return sendEfluenteMultipart(`/efluentes/${encodeURIComponent(pk)}`, 'PUT', data, files)
}

export async function getMeusEfluentesAPI(params = {}) {
  return getEfluentesFromPath('/efluentes/meus', params)
}

export async function getAdminEfluentesAPI(params = {}) {
  return getEfluentesFromPath('/admin/efluentes', params)
}

export async function getEfluentesMapaAPI(params = {}) {
  return apiFetch(`/efluentes/mapa${buildEfluenteMapQuery(params)}`, { method: 'GET' })
}

export async function getEfluentesExcluidosAPI(params = {}) {
  const query = buildEfluenteListQuery(params)
  const candidates = [
    `/admin/efluentes/excluidos${query}`,
    `/efluentes/excluidos${query}`,
    `/efluentes/deletados${query}`,
    `/admin/efluentes/deletados${query}`
  ]

  let lastError = null

  for (const path of candidates) {
    try {
      const res = await apiFetch(path, { method: 'GET' })
      return normalizeEfluenteListResponse(res)
    } catch (err) {
      lastError = err
      const status = Number(err?.status || err?.response?.status || 0)
      if (status && status !== 400 && status !== 404 && status !== 405) throw err
    }
  }

  throw lastError || new Error('Nao foi possivel carregar efluentes excluidos')
}

export async function getAdminUsuarioEfluentesAPI(usuarioId, params = {}) {
  if (usuarioId === undefined || usuarioId === null || usuarioId === '') {
    throw new Error('usuarioId obrigatorio')
  }

  return getEfluentesFromPath(`/admin/usuarios/${encodeURIComponent(usuarioId)}/efluentes`, params)
}

export async function getEfluentesAPI(params = {}) {
  return getMeusEfluentesAPI(params)
}

export async function getEfluenteByPkAPI(pk) {
  return apiFetch(`/efluentes/${encodeURIComponent(pk)}`, { method: 'GET' })
}

export async function getUltimaInspecaoEfluenteAPI() {
  return apiFetch('/efluentes/ultima-inspecao', { method: 'GET' })
}

export async function updateEfluenteAPI(pk, data) {
  return apiFetch(`/efluentes/${encodeURIComponent(pk)}`, { method: 'PUT', body: data })
}

export async function deleteEfluenteAPI(pk) {
  return apiFetch(`/efluentes/${encodeURIComponent(pk)}`, { method: 'DELETE' })
}

export async function restoreEfluenteAPI(pk) {
  return apiFetch(`/efluentes/${encodeURIComponent(pk)}/restore`, { method: 'POST' })
}

export async function uploadEfluenteAnexosAPI(pk, files = []) {
  const selectedFiles = normalizeUploadFiles(files)
  if (!selectedFiles.length) return null

  const token = getToken()
  if (!token) throw new Error('Usuario nao autenticado')

  const form = new FormData()
  for (const file of selectedFiles) form.append('files', file)

  const res = await fetchWithTimeout(`${EFLUENTES_BASE}/${encodeURIComponent(pk)}/anexos`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`
    },
    body: form
  })

  if (!res.ok) {
    const msg = await res.text()
    throw new Error(msg || `Erro ao enviar anexos (${res.status})`)
  }

  const text = await res.text()
  try { return text ? JSON.parse(text) : null } catch { return text }
}

export async function getEfluenteAnexosAPI(pk) {
  return apiFetch(`/efluentes/${encodeURIComponent(pk)}/anexos`, { method: 'GET' })
}

export async function getEfluenteAnexoBlobAPI(attachmentId) {
  const token = getToken()
  if (!token) throw new Error('Usuario nao autenticado')

  const res = await fetchWithTimeout(`${EFLUENTES_BASE}/anexos/${encodeURIComponent(attachmentId)}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`
    }
  })

  if (!res.ok) {
    const msg = await res.text()
    throw new Error(msg || `Erro ao buscar anexo (${res.status})`)
  }

  return res.blob()
}

export function getEfluenteAnexoUrl(attachmentId) {
  return `${EFLUENTES_BASE}/anexos/${encodeURIComponent(attachmentId)}`
}

export async function createInspectionAPI(data) {
  return createEfluenteAPI(data)
}

export async function getInspectionsAPI(params = {}) {
  const res = await getMeusEfluentesAPI(params)
  return extractEfluenteItems(res)
}

export async function updateInspectionAPI(id, data) {
  return updateEfluenteAPI(id, data)
}

export async function deleteInspectionAPI(id) {
  return deleteEfluenteAPI(id)
}

export async function uploadInspectionImageAPI(id, file) {
  return uploadEfluenteAnexosAPI(id, file)
}

export async function getInspectionImageBlobAPI(id) {
  return getEfluenteAnexoBlobAPI(id)
}

export default {
  apiFetch,
  login,
  logout,
  isTemporaryNetworkError,
  getToken,
  getIsAdmin,
  getCurrentUserId,
  getDominioAPI,
  getDominiosFormularioEfluenteAPI,
  getUsuariosAPI,
  getUserByIdAPI,
  updateUsuarioAPI,
  deletarUsuarioAPI,
  getInspecoesPorUsuarioAPI,
  criarUsuarioAPI,
  createEfluenteAPI,
  createEfluenteMultipartAPI,
  extractEfluenteItems,
  getEfluentesAPI,
  getMeusEfluentesAPI,
  getAdminEfluentesAPI,
  getEfluentesMapaAPI,
  getEfluentesExcluidosAPI,
  getAdminUsuarioEfluentesAPI,
  getEfluenteByPkAPI,
  getUltimaInspecaoEfluenteAPI,
  updateEfluenteAPI,
  updateEfluenteMultipartAPI,
  deleteEfluenteAPI,
  restoreEfluenteAPI,
  uploadEfluenteAnexosAPI,
  getEfluenteAnexosAPI,
  getEfluenteAnexoBlobAPI,
  getEfluenteAnexoUrl,
  createInspectionAPI,
  getInspectionsAPI,
  updateInspectionAPI,
  deleteInspectionAPI,
  uploadInspectionImageAPI,
  getInspectionImageBlobAPI
}
