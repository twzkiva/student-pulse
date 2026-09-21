<script setup lang="ts">
import { computed } from 'vue'
import { ArrowPathIcon, CheckCircleIcon, CloudArrowDownIcon, ExclamationCircleIcon, WifiIcon } from '@heroicons/vue/24/outline'

const props = defineProps<{
  state: string
  refreshing: boolean
  canRefresh: boolean
  updatedAt: number
}>()
const emit = defineEmits<{ refresh: [] }>()
const status = computed(() => ({
  synced: { label: 'Усі дані оновлено', detail: 'Розклад і завдання синхронізовано.', icon: CheckCircleIcon },
  syncing: { label: 'Оновлюємо дані', detail: 'Завантажуємо розклад і завдання.', icon: ArrowPathIcon },
  cached: { label: 'Показуємо збережені дані', detail: 'Не вдалося оновити. Можна спробувати ще раз.', icon: CloudArrowDownIcon },
  partial: { label: 'Оновлено частину даних', detail: 'Для решти залишено попередню версію.', icon: ExclamationCircleIcon },
  offline: { label: 'Немає інтернету', detail: 'Збережений розклад доступний. Оновимо після підключення.', icon: WifiIcon },
  local: { label: 'Вбудований розклад', detail: props.canRefresh ? 'Сервер недоступний. Дані можуть бути неактуальні.' : 'Онлайн-оновлення ще не підключено.', icon: CloudArrowDownIcon },
}[props.state] ?? { label: 'Перевіряємо дані', detail: '', icon: ArrowPathIcon }))
const updatedLabel = computed(() => props.updatedAt > 0 && Number.isFinite(props.updatedAt)
  ? new Intl.DateTimeFormat('uk-UA', { timeZone: 'Europe/Kyiv', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(props.updatedAt)
  : '')
</script>

<template>
  <section class="sync-card" aria-label="Стан даних">
    <component :is="status.icon" class="sync-icon" :class="{ spinning: refreshing }" aria-hidden="true" />
    <div class="sync-copy">
      <p class="sync-title" role="status">{{ refreshing ? 'Оновлюємо дані…' : status.label }}</p>
      <p class="sync-detail">{{ status.detail }}</p>
      <p v-if="updatedLabel" class="sync-time">Повне оновлення: {{ updatedLabel }}</p>
    </div>
    <button v-if="canRefresh" class="refresh-button" type="button" :disabled="refreshing || state === 'offline'" aria-label="Оновити розклад і завдання" @click="emit('refresh')">
      <ArrowPathIcon :class="{ spinning: refreshing }" aria-hidden="true" />
    </button>
  </section>
</template>

<style scoped>
.sync-card { display: flex; align-items: flex-start; gap: .75rem; padding: 1rem; border: 1px solid var(--border); border-radius: 1.1rem; background: var(--surface-soft); }
.sync-icon { width: 1.25rem; height: 1.25rem; flex: none; color: var(--accent); margin-top: .1rem; }
.sync-copy { min-width: 0; flex: 1; }
.sync-title { font-size: .875rem; font-weight: 650; }
.sync-detail, .sync-time { margin-top: .35rem; font-size: .8125rem; color: var(--text-secondary); line-height: 1.5; }
.sync-time { font-size: .75rem; }
.refresh-button { display: grid; place-items: center; width: 3rem; height: 3rem; flex: none; border: 1px solid var(--border); border-radius: .8rem; color: var(--accent); background: var(--surface); }
.refresh-button svg { width: 1.2rem; height: 1.2rem; }
.refresh-button:hover:not(:disabled) { background: var(--accent-soft); }
.refresh-button:disabled { opacity: .5; cursor: default; }
.spinning { animation: sync-spin 1s linear infinite; }
@keyframes sync-spin { to { transform: rotate(360deg); } }
</style>
