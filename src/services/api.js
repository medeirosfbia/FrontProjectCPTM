const BASE = 'http://127.0.0.1:5000/api'

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
    const json = atob(padded)
    return JSON.parse(json)
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

  // ASP.NET JWT often maps role to this URI claim.
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
}

/**
 * Generic fetch wrapper that injects Authorization and JSON headers.
 * path: string starting with / (e.g. '/Inspecoes')
 * options: fetch options
 */
export async function apiFetch(path, options = {}) {
  const url = BASE + path
  const headers = new Headers(options.headers || {})

  const token = getToken()
  if (token) headers.set('Authorization', `Bearer ${token}`)

  // set JSON content-type if body is present and not FormData
  if (options.body && !(options.body instanceof FormData)) {
    if (!headers.has('Content-Type')) headers.set('Content-Type', 'application/json')
    if (typeof options.body !== 'string') options.body = JSON.stringify(options.body)
  }

  const res = await fetch(url, { ...options, headers })

  // auto-logout on 401
  if (res.status === 401) {
    logout()
    throw new Error('Unauthorized')
  }

  const text = await res.text()
  let data = null
  try { data = text ? JSON.parse(text) : null } catch (e) { data = text }

  if (!res.ok) {
    const err = new Error(data && data.message ? data.message : `HTTP ${res.status}`)
    err.response = data
    throw err
  }

  return data
}

/* AUTH */
export async function login(email, password) {
  const res = await apiFetch('/Usuarios/login', {
    method: 'POST',
    body: { 
        "email": email,
        "senha": password
    }
  })

  // try common token keys
  const token = res?.token || res?.accessToken || res?.jwt || res?.data?.token
  if (!token) throw new Error('Token not returned from auth')

  localStorage.setItem('auth_token', token)

  const isAdmin = inferIsAdmin(res, token)

  if (isAdmin !== null) {
    localStorage.setItem('user_is_admin', String(isAdmin))
    localStorage.setItem('user_role', isAdmin ? 'admin' : 'user')
  }

  return res
}

/* Inspections CRUD using apiFetch */
export async function createInspectionAPI(data) {
  return apiFetch('/Inspecoes', { method: 'POST', body: data })
}

export async function getInspectionsAPI() {
  return apiFetch('/Inspecoes', { method: 'GET' })
}

export async function updateInspectionAPI(id, data) {
  return apiFetch(`/Inspecoes/${id}`, { method: 'PUT', body: data })
}

export async function deleteInspectionAPI(id) {
  return apiFetch(`/Inspecoes/${id}`, { method: 'DELETE' })
}

export default {
  apiFetch,
  login,
  logout,
  getToken,
  getIsAdmin,
  createInspectionAPI,
  getInspectionsAPI,
  updateInspectionAPI,
  deleteInspectionAPI
}
