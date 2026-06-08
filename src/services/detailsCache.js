const DETAILS_CACHE_KEY = 'cptm:efluente-details-fallback'

function canUseSessionStorage() {
  return typeof sessionStorage !== 'undefined'
}

function isBlobLike(value) {
  return (typeof Blob !== 'undefined' && value instanceof Blob)
    || (typeof File !== 'undefined' && value instanceof File)
}

function sanitizeForStorage(value, depth = 0) {
  if (value === null || value === undefined) return value
  if (depth > 6) return undefined
  if (isBlobLike(value)) return undefined
  if (value instanceof Date) return value.toISOString()
  if (Array.isArray(value)) {
    return value
      .map(item => sanitizeForStorage(item, depth + 1))
      .filter(item => item !== undefined)
  }
  if (typeof value !== 'object') return value

  const output = {}
  for (const [key, item] of Object.entries(value)) {
    if (key === 'blob' || key === 'file') continue
    const sanitized = sanitizeForStorage(item, depth + 1)
    if (sanitized !== undefined) output[key] = sanitized
  }

  return output
}

function collectIds(record = {}) {
  const raw = record.raw && typeof record.raw === 'object' ? record.raw : {}
  const formData = record.formData && typeof record.formData === 'object' ? record.formData : {}

  return [
    record.localId,
    record.id,
    record.ID,
    record.Id,
    record.serverId,
    record.pkCdMeioAmbienteCptm,
    record.PkCdMeioAmbienteCptm,
    record.pkCdMeioAmbienteCPTM,
    formData.pkCdMeioAmbienteCptm,
    raw.localId,
    raw.id,
    raw.ID,
    raw.Id,
    raw.serverId,
    raw.pkCdMeioAmbienteCptm,
    raw.PkCdMeioAmbienteCptm,
    raw.pkCdMeioAmbienteCPTM
  ]
    .map(value => String(value || '').trim())
    .filter(Boolean)
}

export function queueDetailsRecord(record) {
  if (!record || !canUseSessionStorage()) return

  try {
    const sanitized = sanitizeForStorage(record)
    sessionStorage.setItem(DETAILS_CACHE_KEY, JSON.stringify({
      ids: collectIds(sanitized),
      record: sanitized,
      createdAt: new Date().toISOString()
    }))
  } catch (err) {
    console.warn('Nao foi possivel guardar fallback dos detalhes.', err)
  }
}

export function consumeDetailsRecord(id) {
  if (!canUseSessionStorage()) return null

  try {
    const text = sessionStorage.getItem(DETAILS_CACHE_KEY)
    if (!text) return null

    const payload = JSON.parse(text)
    const requestedId = String(id || '').trim()
    const ids = Array.isArray(payload?.ids) ? payload.ids.map(value => String(value || '').trim()) : []

    if (requestedId && ids.length && !ids.includes(requestedId)) return null
    return payload?.record || null
  } catch (err) {
    console.warn('Nao foi possivel ler fallback dos detalhes.', err)
    return null
  }
}
