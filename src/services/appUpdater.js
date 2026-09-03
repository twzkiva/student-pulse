import { Capacitor } from '@capacitor/core'
import { CapacitorUpdater } from '@capgo/capacitor-updater'
import { readonly, ref } from 'vue'

const bundledVersion = import.meta.env.VITE_APP_VERSION || '1.0.0'
const currentVersion = ref(bundledVersion)
const updateStatus = ref(Capacitor.isNativePlatform()
  ? 'Підготовка автооновлень…'
  : 'Оновлюється разом із вебверсією')

let initialization

function bundleVersion(bundle) {
  if (!bundle?.version || bundle.version === 'builtin') return bundledVersion
  return bundle.version
}

async function registerUpdaterEvents() {
  await CapacitorUpdater.addListener('downloadComplete', ({ bundle }) => {
    updateStatus.value = `Версія ${bundleVersion(bundle)} готова до встановлення`
  })
  await CapacitorUpdater.addListener('downloadFailed', () => {
    updateStatus.value = 'Не вдалося завантажити — повторимо автоматично'
  })
  await CapacitorUpdater.addListener('noNeedUpdate', ({ bundle }) => {
    currentVersion.value = bundleVersion(bundle)
    updateStatus.value = 'Встановлено останню версію'
  })
}

export function initializeAppUpdater() {
  if (!Capacitor.isNativePlatform()) return Promise.resolve()
  if (initialization) return initialization

  initialization = (async () => {
    try {
      await registerUpdaterEvents()
      const { bundle } = await CapacitorUpdater.notifyAppReady()
      currentVersion.value = bundleVersion(bundle)
      updateStatus.value = 'Автооновлення увімкнені'
      await CapacitorUpdater.triggerUpdateCheck()
    } catch (error) {
      console.warn('Не вдалося запустити автооновлення', error)
      updateStatus.value = 'Перевіримо оновлення під час наступного запуску'
    }
  })()

  return initialization
}

export function useAppUpdaterStatus() {
  return {
    currentVersion: readonly(currentVersion),
    updateStatus: readonly(updateStatus),
  }
}
