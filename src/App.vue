<script setup>
import { computed, defineAsyncComponent, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import {
  BoltIcon,
  CalendarDaysIcon,
  CheckCircleIcon,
  Cog6ToothIcon,
} from '@heroicons/vue/24/outline'
import BellSchedule from './components/BellSchedule.vue'
import BottomNavigation from './components/BottomNavigation.vue'
import CurrentClassWidget from './components/CurrentClassWidget.vue'
import CuratorContact from './components/CuratorContact.vue'
import HomeworkSection from './components/HomeworkSection.vue'
import QuickActions from './components/QuickActions.vue'
import ScheduleList from './components/ScheduleList.vue'
import WeekParityToggle from './components/WeekParityToggle.vue'
import { homeworkItems } from './data/homework'
import { getIsoWeek, weekDays, weeklySchedules, weekTypeFor } from './data/schedule'
import { loadCampusData, readCachedCampusData } from './services/campusApi'
import { syncScheduleWidget } from './services/widgetSync'
import { useAppUpdaterStatus } from './services/appUpdater'
import { useAppearancePreferences } from './composables/useAppearancePreferences'

const InfoModal = defineAsyncComponent(() => import('./components/InfoModal.vue'))
const AppearanceSettings = defineAsyncComponent(() => import('./components/AppearanceSettings.vue'))

const now = ref(Date.now())
const selectedLesson = ref(null)
const activeNavigation = ref('home')
const notice = ref('')
const schedules = ref(structuredClone(weeklySchedules))
const homework = ref([...homeworkItems])
const syncState = ref(import.meta.env.VITE_API_URL ? 'syncing' : 'local')
const isSettingsOpen = shallowRef(false)
const botUrl = 'https://t.me/R0zkladYrokiw_bot'
const curatorPhoneUrl = 'tel:+380668108900'
const { currentVersion, updateStatus } = useAppUpdaterStatus()
const isClassPreview = import.meta.env.DEV
  && new URLSearchParams(window.location.search).get('preview') === 'class'
const {
  theme,
  density,
  motionEnabled,
  resetPreferences,
} = useAppearancePreferences()
let noticeTimer
let clockTimer

function dayKeyFor(date) {
  return weekDays.find((day) => day.jsDay === date.getDay())?.key ?? null
}

const activeDayKey = ref(dayKeyFor(new Date()) ?? 'monday')
const todayKey = computed(() => dayKeyFor(new Date(now.value)))
const activeDay = computed(() => weekDays.find((day) => day.key === activeDayKey.value))
const automaticWeekType = computed(() => weekTypeFor(new Date(now.value)))
const selectedWeekType = ref(weekTypeFor(new Date()))
const weekNumber = computed(() => getIsoWeek(new Date(now.value)))

function timestampFor(time) {
  const [hours, minutes] = time.split(':').map(Number)
  const date = new Date(now.value)
  date.setHours(hours, minutes, 0, 0)
  return date.getTime()
}

function formatClock(timestamp) {
  return new Intl.DateTimeFormat('uk-UA', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(timestamp))
}

function buildTimeline(dayKey, weekType = automaticWeekType.value) {
  const isToday = dayKey === todayKey.value && weekType === automaticWeekType.value
  const lessons = (schedules.value[weekType]?.[dayKey] ?? [])
    .filter((lesson) => !lesson.isEmpty)
    .map((lesson) => ({
      ...lesson,
      startAt: timestampFor(lesson.start),
      endAt: timestampFor(lesson.end),
      state: 'Заплановано',
    }))

  if (!isToday) return lessons

  if (isClassPreview && lessons.length) {
    const previewIndex = Math.min(1, lessons.length - 1)
    const previewStartAt = now.value - 32 * 60 * 1000
    const previewEndAt = previewStartAt + 80 * 60 * 1000

    return lessons.map((lesson, index) => {
      if (index < previewIndex) return { ...lesson, state: 'Завершено' }
      if (index === previewIndex) {
        return {
          ...lesson,
          start: formatClock(previewStartAt),
          end: formatClock(previewEndAt),
          startAt: previewStartAt,
          endAt: previewEndAt,
          state: 'Зараз',
        }
      }
      return { ...lesson, state: index === previewIndex + 1 ? 'Далі' : 'Пізніше' }
    })
  }

  const nextLessonIndex = lessons.findIndex(
    (lesson) => now.value < lesson.startAt,
  )

  return lessons.map((lesson, index) => {
    if (now.value >= lesson.startAt && now.value < lesson.endAt) {
      return { ...lesson, state: 'Зараз' }
    }
    if (now.value >= lesson.endAt) return { ...lesson, state: 'Завершено' }
    return { ...lesson, state: index === nextLessonIndex ? 'Далі' : 'Пізніше' }
  })
}

const selectedSchedule = computed(() => buildTimeline(activeDayKey.value, selectedWeekType.value))
const todaySchedule = computed(() => (
  todayKey.value ? buildTimeline(todayKey.value, automaticWeekType.value) : []
))
const currentLesson = computed(() => todaySchedule.value.find((lesson) => lesson.state === 'Зараз'))
const nextLesson = computed(() => todaySchedule.value.find((lesson) => lesson.state === 'Далі'))
const featuredLesson = computed(() => currentLesson.value ?? nextLesson.value)
const featuredMode = computed(() => (currentLesson.value ? 'current' : 'next'))

const lessonSummary = computed(() => {
  const count = selectedSchedule.value.length
  if (count === 1) return '1 пара'
  if (count >= 2 && count <= 4) return `${count} пари`
  return `${count} пар`
})

const formattedDate = computed(() => {
  const date = new Intl.DateTimeFormat('uk-UA', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date(now.value))

  return date.charAt(0).toUpperCase() + date.slice(1)
})

const syncLabel = computed(() => ({
  syncing: 'Синхронізація…',
  synced: 'Розклад актуальний',
  cached: 'Збережена копія',
  local: 'Доступно офлайн',
}[syncState.value]))
const statusDisplayLabel = computed(() => (
  isClassPreview ? 'Демо поточної пари' : syncLabel.value
))

const widgetPayload = computed(() => {
  const lesson = featuredLesson.value
  const typeLabel = automaticWeekType.value === 'even' ? 'Парний тиждень' : 'Непарний тиждень'
  const lessonIndex = lesson ? todaySchedule.value.findIndex((item) => item.id === lesson.id) : -1
  const upcoming = lessonIndex >= 0
    ? todaySchedule.value.slice(lessonIndex + 1).filter((item) => !item.isEmpty)
    : []
  const lineFor = (item) => item
    ? `${item.period}. ${item.start} · ${item.subject} · ${item.room}`
    : 'Навчальний день завершено'

  if (!lesson) {
    return {
      dateLabel: formattedDate.value,
      weekLabel: typeLabel,
      statusLabel: todayKey.value ? 'День завершено' : 'Вихідний',
      subject: todayKey.value ? 'Пари закінчилися' : 'Сьогодні без пар',
      room: '—',
      timeLabel: '',
      countdown: 'Готово',
      nextLine: 'Перевір завдання на завтра',
      secondLine: 'Кампус Пульс',
    }
  }

  const targetAt = featuredMode.value === 'current' ? lesson.endAt : lesson.startAt
  const minutes = Math.max(0, Math.ceil((targetAt - now.value) / 60000))
  return {
    dateLabel: formattedDate.value,
    weekLabel: typeLabel,
    statusLabel: featuredMode.value === 'current' ? `Зараз · ${lesson.period} пара` : `Далі · ${lesson.period} пара`,
    subject: lesson.subject,
    room: `Аудиторія ${lesson.room}`,
    timeLabel: `${lesson.start}–${lesson.end}`,
    countdown: featuredMode.value === 'current' ? `Ще ${minutes} хв` : `Через ${minutes} хв`,
    nextLine: lineFor(upcoming[0]),
    secondLine: lineFor(upcoming[1]),
  }
})

async function synchronize() {
  const cached = readCachedCampusData()
  if (cached) {
    schedules.value = cached.schedules
    homework.value = cached.homework
    syncState.value = 'cached'
  }
  if (!import.meta.env.VITE_API_URL) return

  try {
    const fresh = await loadCampusData()
    if (fresh) {
      schedules.value = fresh.schedules
      homework.value = fresh.homework
      syncState.value = 'synced'
      await syncScheduleWidget(widgetPayload.value)
    }
  } catch {
    syncState.value = cached ? 'cached' : 'local'
  }
}

function startClock() {
  stopClock()
  now.value = Date.now()
  clockTimer = window.setInterval(() => {
    now.value = Date.now()
  }, 1000)
}

function stopClock() {
  if (clockTimer) window.clearInterval(clockTimer)
  clockTimer = undefined
}

function handleVisibilityChange() {
  if (document.hidden) stopClock()
  else startClock()
}

function openLessonInfo(lesson) {
  selectedLesson.value = lesson
}

function closeLessonInfo() {
  selectedLesson.value = null
}

function selectNavigation(item) {
  if (item.id === 'home') {
    activeNavigation.value = 'home'
    window.scrollTo({ top: 0, behavior: 'smooth' })
    return
  }

  if (item.id === 'schedule') {
    activeNavigation.value = 'schedule'
    document.querySelector('#today-schedule')?.scrollIntoView({ behavior: 'smooth' })
    return
  }

  if (item.id === 'teachers') {
    activeNavigation.value = 'teachers'
    document.querySelector('#curator-contact')?.scrollIntoView({ behavior: 'smooth' })
    return
  }

  if (item.id === 'homework') {
    activeNavigation.value = 'homework'
    document.querySelector('#homework')?.scrollIntoView({ behavior: 'smooth' })
    return
  }

  activeNavigation.value = item.id
  notice.value = `Розділ «${item.label}» готується до підключення.`
  window.clearTimeout(noticeTimer)
  noticeTimer = window.setTimeout(() => {
    notice.value = ''
    activeNavigation.value = 'home'
  }, 2400)
}

onMounted(() => {
  startClock()
  synchronize()
  document.addEventListener('visibilitychange', handleVisibilityChange)
})

onBeforeUnmount(() => {
  stopClock()
  window.clearTimeout(noticeTimer)
  document.removeEventListener('visibilitychange', handleVisibilityChange)
})

watch(
  () => Math.floor(now.value / 60000),
  () => syncScheduleWidget(widgetPayload.value),
  { immediate: true },
)
</script>

<template>
  <div class="app-shell min-h-svh bg-app text-ink">
    <div class="ambient ambient-one" aria-hidden="true"></div>
    <div class="ambient ambient-two" aria-hidden="true"></div>

    <main class="relative z-10 mx-auto w-full max-w-[680px] px-4 pb-32 pt-[max(1rem,env(safe-area-inset-top))] sm:px-6">
      <header class="app-header mb-5">
        <div class="flex items-start justify-between gap-4">
          <div>
            <p class="eyebrow mb-2 flex items-center gap-2">
              <BoltIcon class="h-4 w-4" aria-hidden="true" />
              КІ-13 · Кампус Пульс
            </p>
            <h1 class="app-title">
              Твій навчальний день
            </h1>
            <p class="mt-1 text-sm font-medium text-muted">{{ formattedDate }}</p>
          </div>

          <button
            class="settings-trigger"
            type="button"
            aria-label="Відкрити налаштування вигляду"
            :aria-expanded="isSettingsOpen"
            @click="isSettingsOpen = true"
          >
            <Cog6ToothIcon class="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <div class="status-line" :aria-label="statusDisplayLabel">
          <span class="status-dot" aria-hidden="true"></span>
          <span>{{ statusDisplayLabel }}</span>
        </div>
      </header>

      <CurrentClassWidget
        v-if="featuredLesson"
        :lesson="featuredLesson"
        :mode="featuredMode"
        :now="now"
      />

      <section v-else class="day-finished" aria-labelledby="day-finished-title">
        <div class="finished-icon" aria-hidden="true">
          <CheckCircleIcon class="h-6 w-6" />
        </div>
        <div>
          <p class="mb-1 text-[0.625rem] font-bold uppercase tracking-[0.14em] text-neon-bright">
            Навчальний день
          </p>
          <h2 id="day-finished-title" class="text-lg font-bold text-ink">
            {{ todayKey ? 'На сьогодні пари завершено' : 'Сьогодні вихідний' }}
          </h2>
          <p class="mt-1 text-sm text-muted">Можна переглянути розклад на інший день нижче.</p>
        </div>
      </section>

      <QuickActions :bot-url="botUrl" :phone-url="curatorPhoneUrl" class="mt-5" />

      <section id="today-schedule" class="schedule-section mt-7 scroll-mt-5" aria-labelledby="schedule-title">
        <div class="mb-4 flex items-end justify-between gap-4">
          <div>
            <p class="eyebrow mb-2 flex items-center gap-2">
              <CalendarDaysIcon class="h-4 w-4" aria-hidden="true" />
              Твій тиждень
            </p>
            <h2 id="schedule-title" class="text-xl font-bold tracking-[-0.03em] text-ink">
              {{ activeDay.label }}
            </h2>
          </div>
          <span class="lesson-count">{{ lessonSummary }}</span>
        </div>

        <div class="mb-2 flex items-center justify-between gap-3 px-1 text-[0.65rem] font-semibold text-muted">
          <span>Навчальний тиждень №{{ weekNumber }}</span>
          <span v-if="selectedWeekType !== automaticWeekType" class="text-neon-bright">Перегляд іншого тижня</span>
          <span v-else class="text-emerald-300">Визначено автоматично</span>
        </div>

        <WeekParityToggle
          v-model="selectedWeekType"
          :automatic-type="automaticWeekType"
        />

        <div class="day-tabs" aria-label="Оберіть день тижня">
          <button
            v-for="day in weekDays"
            :key="day.key"
            class="day-tab"
            :class="{ active: activeDayKey === day.key }"
            type="button"
            :aria-pressed="activeDayKey === day.key"
            :aria-label="day.label"
            @click="activeDayKey = day.key"
          >
            <span>{{ day.short }}</span>
            <span v-if="todayKey === day.key" class="today-dot" aria-hidden="true"></span>
          </button>
        </div>

        <ScheduleList :lessons="selectedSchedule" @show-info="openLessonInfo" />
        <HomeworkSection :items="homework" :bot-url="botUrl" class="mt-4" />
        <BellSchedule class="mt-4" />
        <CuratorContact id="curator-contact" class="mt-4 scroll-mt-5" />
      </section>

      <footer class="app-footer mt-10 py-6 text-center text-xs leading-5 text-muted">
        Працює навіть без інтернету<br />Оновлення розкладу — через Telegram-бота
      </footer>
    </main>

    <Transition name="toast">
      <div v-if="notice" class="notice" role="status">
        {{ notice }}
      </div>
    </Transition>

    <BottomNavigation :active-item="activeNavigation" @select="selectNavigation" />

    <InfoModal
      v-if="selectedLesson"
      :lesson="selectedLesson"
      @close="closeLessonInfo"
    />

    <AppearanceSettings
      v-if="isSettingsOpen"
      :theme="theme"
      :density="density"
      :motion-enabled="motionEnabled"
      :app-version="currentVersion"
      :update-status="updateStatus"
      @update:theme="theme = $event"
      @update:density="density = $event"
      @update:motion-enabled="motionEnabled = $event"
      @reset="resetPreferences"
      @close="isSettingsOpen = false"
    />
  </div>
</template>

<style scoped>
.day-tabs {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 0.35rem;
  margin-bottom: 0.75rem;
  padding: 0.3rem;
  border: 1px solid var(--border);
  border-radius: 1rem;
  background: var(--surface-soft);
  animation: content-rise 480ms cubic-bezier(0.22, 1, 0.36, 1) 160ms both;
}

.day-tab {
  position: relative;
  display: grid;
  min-height: 2.8rem;
  place-items: center;
  border: 0;
  border-radius: 0.75rem;
  color: var(--text-secondary);
  background: transparent;
  font-family: inherit;
  font-size: 0.75rem;
  font-weight: 700;
  transition: color 180ms ease, background-color 180ms ease, box-shadow 180ms ease;
}

.day-tab:hover {
  color: var(--text-primary);
  background: var(--surface-hover);
}

.day-tab.active {
  color: var(--accent);
  background: var(--surface);
  box-shadow: var(--shadow-sm), inset 0 0 0 1px var(--accent-border);
  animation: tab-pop 320ms cubic-bezier(0.22, 1, 0.36, 1);
}

.day-tab:active {
  transform: scale(0.94);
}

.today-dot {
  position: absolute;
  bottom: 0.35rem;
  width: 0.25rem;
  height: 0.25rem;
  border-radius: 50%;
  background: var(--accent);
  box-shadow: 0 0 0.5rem var(--accent-glow);
  animation: today-pulse 2s ease-in-out infinite;
}

.day-finished {
  display: flex;
  min-height: 8.5rem;
  align-items: center;
  gap: 1rem;
  padding: 1.25rem;
  border: 1px solid var(--accent-border);
  border-radius: 1.5rem;
  background:
    linear-gradient(135deg, var(--accent-soft), transparent 58%),
    var(--surface);
  box-shadow: var(--shadow-sm);
  animation: content-rise 520ms cubic-bezier(0.22, 1, 0.36, 1) 60ms both;
}

.finished-icon {
  display: grid;
  width: 3rem;
  height: 3rem;
  flex: none;
  place-items: center;
  border: 1px solid var(--accent-border);
  border-radius: 1rem;
  color: var(--accent);
  background: var(--accent-soft);
}

.app-title {
  margin: 0;
  color: var(--text-primary);
  font-size: 1.4rem;
  font-weight: 750;
  letter-spacing: -0.045em;
  line-height: 1.15;
}

.settings-trigger {
  display: grid;
  width: 3rem;
  height: 3rem;
  flex: none;
  place-items: center;
  border: 1px solid var(--border);
  border-radius: 0.95rem;
  color: var(--text-primary);
  background: var(--surface);
  box-shadow: var(--shadow-sm);
  transition: color 160ms ease, background-color 160ms ease;
}

.settings-trigger:hover,
.settings-trigger:active {
  color: var(--accent);
  background: var(--accent-soft);
}

.settings-trigger:active { opacity: 0.72; }

.status-line {
  display: inline-flex;
  min-height: 2rem;
  align-items: center;
  gap: 0.45rem;
  margin-top: 0.8rem;
  color: var(--text-secondary);
  font-size: 0.6875rem;
  font-weight: 650;
}

.app-footer { border-top: 1px solid var(--border); }

.app-header {
  animation: content-rise 480ms cubic-bezier(0.22, 1, 0.36, 1) both;
}

.schedule-section {
  animation: content-rise 540ms cubic-bezier(0.22, 1, 0.36, 1) 100ms both;
}

@keyframes content-rise {
  from { opacity: 0; translate: 0 0.85rem; }
  to { opacity: 1; translate: 0 0; }
}

@keyframes tab-pop {
  0% { scale: 0.92; }
  65% { scale: 1.035; }
  100% { scale: 1; }
}

@keyframes today-pulse {
  0%, 100% { opacity: 0.55; scale: 0.82; }
  50% { opacity: 1; scale: 1.15; }
}
</style>
