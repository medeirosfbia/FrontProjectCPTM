const TOAST_KEY = 'cptm_pending_toast'

export function queueToast(toast = {}) {
  if (typeof sessionStorage === 'undefined') return

  const payload = {
    type: toast.type || 'success',
    title: toast.title || '',
    message: toast.message || '',
    duration: toast.duration || 5000
  }

  sessionStorage.setItem(TOAST_KEY, JSON.stringify(payload))
}

export function consumeQueuedToast() {
  if (typeof sessionStorage === 'undefined') return null

  const raw = sessionStorage.getItem(TOAST_KEY)
  if (!raw) return null

  sessionStorage.removeItem(TOAST_KEY)

  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}
