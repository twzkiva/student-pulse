import { readonly, shallowRef } from 'vue'
import { getApiBaseUrl } from '../services/campusApi.js'

const user = shallowRef(null)
const status = shallowRef('idle')
const error = shallowRef('')
const googleEnabled = shallowRef(false)
let loadPromise

function endpoint(path) {
  return `${getApiBaseUrl()}${path}`
}

async function request(path, options = {}) {
  const response = await fetch(endpoint(path), {
    credentials: 'include',
    cache: 'no-store',
    ...options,
    headers: options.body ? { 'content-type': 'application/json', ...options.headers } : options.headers,
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(payload.detail || 'Не вдалося виконати запит')
  return payload
}

async function load() {
  if (loadPromise) return loadPromise
  status.value = 'loading'
  loadPromise = Promise.all([
    request('/api/auth/config'),
    request('/api/auth/me'),
  ]).then(([config, session]) => {
    googleEnabled.value = Boolean(config.googleEnabled)
    user.value = session.user || null
    status.value = 'ready'
  }).catch(() => {
    status.value = 'unavailable'
  }).finally(() => { loadPromise = undefined })
  return loadPromise
}

async function mutate(path, body) {
  error.value = ''
  status.value = 'submitting'
  try {
    const payload = await request(path, { method: 'POST', body: JSON.stringify(body) })
    user.value = payload.user || null
    status.value = 'ready'
    return true
  } catch (requestError) {
    error.value = requestError instanceof Error ? requestError.message : 'Сталася помилка'
    status.value = 'ready'
    return false
  }
}

async function login(credentials) {
  return mutate('/api/auth/login', credentials)
}

async function register(profile) {
  return mutate('/api/auth/register', profile)
}

async function logout() {
  const success = await mutate('/api/auth/logout', {})
  if (success) user.value = null
  return success
}

function clearError() {
  error.value = ''
}

export function useAuth() {
  return {
    user: readonly(user),
    status: readonly(status),
    error: readonly(error),
    googleEnabled: readonly(googleEnabled),
    googleUrl: endpoint('/api/auth/google'),
    load,
    login,
    register,
    logout,
    clearError,
  }
}
