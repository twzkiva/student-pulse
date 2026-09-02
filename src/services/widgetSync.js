import { Capacitor, registerPlugin } from '@capacitor/core'

const ScheduleWidget = registerPlugin('ScheduleWidget')

export async function syncScheduleWidget(payload) {
  if (!Capacitor.isNativePlatform()) return
  try {
    await ScheduleWidget.update(payload)
  } catch (error) {
    console.warn('Не вдалося оновити Android-віджет', error)
  }
}
