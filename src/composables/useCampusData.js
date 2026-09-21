import { onBeforeUnmount, onMounted, shallowRef } from 'vue'
import { weeklySchedules } from '../data/schedule.js'
import { getApiBaseUrl, loadCampusData, readCachedCampusData } from '../services/campusApi.js'

export function useCampusData({ baseUrl = getApiBaseUrl() } = {}) {
  const cached = readCachedCampusData({ baseUrl })
  const schedules = shallowRef(cached?.schedules ?? structuredClone(weeklySchedules))
  const homework = shallowRef(cached?.homework ?? [])
  const syncState = shallowRef(cached ? 'cached' : baseUrl ? 'syncing' : 'local')
  const updatedAt = shallowRef(Number(cached?.updatedAt) || 0)
  const isRefreshing = shallowRef(false)
  const isOnline = shallowRef(globalThis.navigator?.onLine !== false)
  let hasSavedData = Boolean(cached)
  let inFlight
  let controller
  let refreshTimer
  let disposed = false

  function synchronize() {
    if (!baseUrl || disposed) return Promise.resolve()
    if (inFlight) return inFlight
    if (!isOnline.value) {
      syncState.value = 'offline'
      return Promise.resolve()
    }
    isRefreshing.value = true
    controller = new AbortController()
    inFlight = (async () => {
      try {
        const fresh = await loadCampusData({
          baseUrl, signal: controller.signal,
          previous: { schedules: schedules.value, homework: homework.value, updatedAt: updatedAt.value },
        })
        if (!fresh || disposed) return
        schedules.value = fresh.schedules
        homework.value = fresh.homework
        updatedAt.value = fresh.updatedAt
        hasSavedData = true
        syncState.value = !isOnline.value ? 'offline' : fresh.partial ? 'partial' : 'synced'
      } catch {
        if (!disposed) syncState.value = !isOnline.value ? 'offline' : hasSavedData ? 'cached' : 'local'
      } finally {
        isRefreshing.value = false
        inFlight = undefined
      }
    })()
    return inFlight
  }

  function refreshVisible() {
    if (!document.hidden) void synchronize()
  }

  function handleOnline() {
    isOnline.value = true
    refreshVisible()
  }

  function handleOffline() {
    isOnline.value = false
    if (baseUrl) syncState.value = 'offline'
  }

  onMounted(() => {
    void synchronize()
    refreshTimer = window.setInterval(refreshVisible, 60000)
    document.addEventListener('visibilitychange', refreshVisible)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
  })
  onBeforeUnmount(() => {
    disposed = true
    controller?.abort()
    window.clearInterval(refreshTimer)
    document.removeEventListener('visibilitychange', refreshVisible)
    window.removeEventListener('online', handleOnline)
    window.removeEventListener('offline', handleOffline)
  })
  return { schedules, homework, syncState, synchronize, updatedAt, isRefreshing, canRefresh: Boolean(baseUrl) }
}
