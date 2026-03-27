const BASE = 'http://127.0.0.1:5000/api'

export function getToken() {
  return localStorage.getItem('auth_token') || null
}

export function logout() {
  localStorage.removeItem('auth_token')
  localStorage.removeItem('user_role')
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

  // save role if provided by backend
  if (res?.role) localStorage.setItem('user_role', res.role)
  if (res?.data?.role) localStorage.setItem('user_role', res.data.role)

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
  createInspectionAPI,
  getInspectionsAPI,
  updateInspectionAPI,
  deleteInspectionAPI
}
