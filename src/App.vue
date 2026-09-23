<script setup>
import { computed, defineAsyncComponent, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import {
  BoltIcon,
  CheckCircleIcon,
  Cog6ToothIcon,
} from '@heroicons/vue/24/outline'
import BellSchedule from './components/BellSchedule.vue'
import BottomNavigation from './components/BottomNavigation.vue'
import CurrentClassWidget from './components/CurrentClassWidget.vue'
import DayOverview from './components/DayOverview.vue'
import SyncStatus from './components/SyncStatus.vue'
import CuratorContact from './components/CuratorContact.vue'
import HomeworkSection from './components/HomeworkSection.vue'
import QuickActions from './components/QuickActions.vue'
import SchedulePanel from './components/SchedulePanel.vue'
import ScheduleList from './components/ScheduleList.vue'
import WeekParityToggle from './components/WeekParityToggle.vue'
import { getIsoWeek, weekDays, weekTypeFor } from './data/schedule'
import { curator } from './data/contacts'
import { useCampusData } from './composables/useCampusData'
import { CAMPUS_TIME_ZONE, campusDate } from './utils/campusTime'
import { buildLessonTimeline } from './utils/scheduleTimeline'
import { syncScheduleWidget } from './services/widgetSync'
import { useAppUpdaterStatus } from './services/appUpdater'
import { useAppearancePreferences } from './composables/useAppearancePreferences'
import { useLayoutPreferences } from './composables/useLayoutPreferences'
import { useSectionNavigation } from './composables/useSectionNavigation'
import { useAuth } from './composables/useAuth'
import AccountButton from './components/account/AccountButton.vue'

const InfoModal = defineAsyncComponent(() => import('./components/InfoModal.vue'))
const AppearanceSettings = defineAsyncComponent(() => import('./components/AppearanceSettings.vue'))
const AuthModal = defineAsyncComponent(() => import('./components/account/AuthModal.vue'))
const WelcomeModal = defineAsyncComponent(() => import('./components/WelcomeModal.vue'))

const now = ref(Date.now())
const minuteNow = computed(() => Math.floor(now.value / 60000) * 60000)
const selectedLesson = ref(null)
const { schedules, homework, syncState, synchronize, updatedAt, isRefreshing, canRefresh } = useCampusData()
const isSettingsOpen = shallowRef(false)
const isAccountOpen = shallowRef(false)
const showWelcomeModal = ref(!globalThis.localStorage?.getItem('hasSeenWelcome'))

function closeWelcomeModal() {
  showWelcomeModal.value = false
  try { globalThis.localStorage?.setItem('hasSeenWelcome', 'true') } catch {}
}
const authNotice = shallowRef('')
const authCallbackError = shallowRef('')
const googleErrorMessages = {
  access_denied: 'Google не дозволив вхід. Перевірте тестових користувачів або спробуйте інший Gmail.',
  invalid_state: 'Сесія входу застаріла або cookie було заблоковано. Почніть вхід ще раз.',
  token_invalid_client: 'Google відхилив OAuth-клієнт. Перевіряємо Client ID та Client Secret.',
  token_invalid_grant: 'Google відхилив одноразовий код входу. Спробуйте ще раз.',
  account_conflict: 'Ця пошта вже прив’язана до іншого Google-акаунта.',
}
const botUrl = 'https://t.me/ki13homeworkbot'
const curatorPhoneUrl = `tel:${curator.phone}`
const { currentVersion, updateStatus } = useAppUpdaterStatus()
const { blocks: layoutBlocks } = useLayoutPreferences()
const isClassPreview = import.meta.env.DEV
  && new URLSearchParams(window.location.search).get('preview') === 'class'
const { colorMode, accentColor, density, motionEnabled, resetPreferences } = useAppearancePreferences()
const { activeNavigation, navigate } = useSectionNavigation(motionEnabled)
const {
  user: accountUser,
  status: authStatus,
  error: authError,
  googleEnabled,
  googleUrl,
  load: loadAuth,
  login: loginAccount,
  register: registerAccount,
  logout: logoutAccount,
  clearError: clearAuthError,
} = useAuth()
let clockTimer
const previewStartedAt = Date.now() - 32 * 60 * 1000

function dayKeyFor(date) {
  return weekDays.find((day) => day.jsDay === campusDate(date).jsDay)?.key ?? null
}

const activeDayKey = ref(dayKeyFor(new Date()) ?? 'monday')
const todayKey = computed(() => dayKeyFor(new Date(now.value)))
const automaticWeekType = computed(() => weekTypeFor(new Date(now.value)))
const selectedWeekType = ref(weekTypeFor(new Date()))
const weekNumber = computed(() => getIsoWeek(new Date(now.value)))
const dateKey = computed(() => campusDate(now.value).dateKey)

watch(dateKey, () => {
  activeDayKey.value = todayKey.value ?? 'monday'
  selectedWeekType.value = automaticWeekType.value
})

function formatClock(timestamp) {
  return new Intl.DateTimeFormat('uk-UA', {
    timeZone: CAMPUS_TIME_ZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(timestamp))
}

function buildTimeline(dayKey, weekType = automaticWeekType.value) {
  const isToday = dayKey === todayKey.value && weekType === automaticWeekType.value
  const lessons = buildLessonTimeline(schedules.value[weekType]?.[dayKey] ?? [], minuteNow.value, isToday)

  if (!isToday) return lessons

  if (isClassPreview && lessons.length) {
    const previewIndex = Math.min(1, lessons.length - 1)
    const previewStartAt = previewStartedAt
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
          state: now.value < previewEndAt ? 'Зараз' : 'Завершено',
        }
      }
      return { ...lesson, state: index === previewIndex + 1 ? 'Далі' : 'Пізніше' }
    })
  }

  return lessons
}

const selectedSchedule = computed(() => buildTimeline(activeDayKey.value, selectedWeekType.value))
const todaySchedule = computed(() => (
  todayKey.value ? buildTimeline(todayKey.value, automaticWeekType.value) : []
))
const currentLesson = computed(() => todaySchedule.value.find((lesson) => lesson.state === 'Зараз'))
const nextLesson = computed(() => todaySchedule.value.find((lesson) => lesson.state === 'Далі'))

const globalNextLesson = computed(() => {
  if (currentLesson.value) return currentLesson.value;
  if (nextLesson.value) return nextLesson.value;
  
  let checkDate = new Date(now.value);
  for (let i = 1; i <= 14; i++) {
    checkDate.setDate(checkDate.getDate() + 1);
    const wType = weekTypeFor(checkDate);
    const dKey = weekDays.find((day) => day.jsDay === campusDate(checkDate).jsDay)?.key ?? null;
    if (!dKey) continue;
    
    const dayLessons = schedules.value[wType]?.[dKey] ?? [];
    const firstLesson = dayLessons.find(l => !l.isEmpty);
    if (firstLesson) {
      const futureTimeline = buildLessonTimeline(dayLessons, checkDate.getTime(), false);
      const nextL = futureTimeline.find(l => !l.isEmpty);
      if (nextL) return nextL;
    }
  }
  return null;
})

const featuredLesson = computed(() => globalNextLesson.value)
const featuredMode = computed(() => (currentLesson.value ? 'current' : 'next'))

const formattedDate = computed(() => {
  const date = new Intl.DateTimeFormat('uk-UA', {
    timeZone: CAMPUS_TIME_ZONE,
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
  partial: 'Частину даних ще не оновлено',
  offline: 'Немає інтернету',
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
  navigate(item.id)
}

function clearAccountError() {
  authCallbackError.value = ''
  clearAuthError()
}

onMounted(async () => {
  startClock()
  document.addEventListener('visibilitychange', handleVisibilityChange)
  await loadAuth()
  const currentUrl = new URL(window.location.href)
  const authResult = currentUrl.searchParams.get('auth')
  if (authResult === 'google-success') {
    authNotice.value = 'Вхід через Google успішний.'
    isAccountOpen.value = true
  } else if (authResult === 'google-error') {
    const reason = currentUrl.searchParams.get('reason')
    authCallbackError.value = googleErrorMessages[reason]
      || 'Не вдалося завершити вхід через Google. Спробуйте ще раз.'
    isAccountOpen.value = true
  }
  if (authResult) {
    currentUrl.searchParams.delete('auth')
    currentUrl.searchParams.delete('reason')
    window.history.replaceState({}, '', currentUrl)
  }
})

onBeforeUnmount(() => {
  stopClock()
  document.removeEventListener('visibilitychange', handleVisibilityChange)
})

watch(
  [schedules, () => Math.floor(now.value / 60000)],
  () => syncScheduleWidget({ ...widgetPayload.value, schedules: schedules.value }),
  { immediate: true },
)
</script>

<template>
  <div class="app-shell min-h-svh bg-app text-ink">
    <div class="ambient ambient-one" aria-hidden="true"></div>
    <div class="ambient ambient-two" aria-hidden="true"></div>

    <a class="skip-link" href="#today-schedule">Перейти до розкладу</a>
    <main id="home" tabindex="-1" class="campus-main relative z-10 mx-auto w-full px-4 pb-32 pt-[max(1rem,env(safe-area-inset-top))] sm:px-6">
      <header class="app-header mb-5">
        <div class="flex items-start justify-between gap-4">
          <div>
            <p class="eyebrow brand-label mb-3 flex items-center gap-2">
              <BoltIcon class="h-4 w-4" aria-hidden="true" />
              КІ-13 · Кампус Пульс
            </p>
            <h1 class="app-title">
              Усе для твого дня.
            </h1>
            <p class="mt-1 text-sm font-medium text-muted">{{ formattedDate }}</p>
          </div>

          <div class="header-actions">
            <AccountButton
              :user="accountUser"
              :loading="authStatus === 'loading'"
              @open="isAccountOpen = true"
            />
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
        </div>

        <div class="status-line" :aria-label="statusDisplayLabel">
          <span class="status-dot" aria-hidden="true"></span>
          <span>{{ statusDisplayLabel }}</span>
        </div>
      </header>

      <!-- ГОЛОВНА (HOME) -->
      <div v-show="activeNavigation === 'home'" class="tab-pane">
        <DayOverview :lessons="todaySchedule" :homework-count="homework.length" @navigate="selectNavigation({ id: $event })" />
        
        <CurrentClassWidget
          v-if="featuredLesson"
          :lesson="featuredLesson"
          :mode="featuredMode"
          :now="now"
          class="mt-4"
        />
        <section v-else class="day-finished mt-4" aria-labelledby="day-finished-title">
          <div class="finished-icon" aria-hidden="true">
            <CheckCircleIcon class="h-6 w-6" />
          </div>
          <div>
            <p class="mb-1 text-[0.625rem] font-bold uppercase tracking-[0.14em] text-neon-bright">
              Навчальний день
            </p>
            <h2 id="day-finished-title" class="text-lg font-bold text-ink">
              {{ !todayKey ? 'Вихідний день' : todaySchedule.length ? 'На сьогодні пари завершено' : 'Занять немає' }}
            </h2>
            <p class="mt-1 text-sm text-muted">Перейдіть на вкладку Розклад, щоб побачити більше.</p>
          </div>
        </section>

        <!-- РОЗКЛАД (КОМПАКТНИЙ) -->
        <div class="mt-5">
          <div class="flex items-center justify-between mb-2">
            <h2 class="text-lg font-bold text-ink">Розклад</h2>
            <button v-if="(activeDayKey !== todayKey || selectedWeekType !== automaticWeekType) && todayKey" type="button" @click="activeDayKey = todayKey; selectedWeekType = automaticWeekType" class="text-[0.7rem] font-bold text-accent px-2 py-1 bg-accent-soft rounded-md" style="margin-right: -4px;">Сьогодні</button>
          </div>
          <WeekParityToggle v-model="selectedWeekType" :automatic-type="automaticWeekType" style="margin-bottom: 0.4rem;" />
          <div class="day-tabs-home" style="margin-bottom: 0.6rem;">
            <button v-for="item in weekDays" :key="item.key" type="button" class="day-tab-home" :class="{ active: activeDayKey === item.key }" @click="activeDayKey = item.key">
              {{ item.short }}
              <span v-if="todayKey === item.key" class="today-dot" aria-hidden="true"></span>
            </button>
          </div>
          <ScheduleList v-if="selectedSchedule.length" :lessons="selectedSchedule" :homework="homework" @show-info="openLessonInfo" />
          <div v-else class="py-6 text-center text-sm font-medium text-muted bg-surface rounded-2xl border border-border">На цей день пар немає 🎉</div>
        </div>

        <QuickActions :bot-url="botUrl" :phone-url="curatorPhoneUrl" class="mt-6" />
        <SyncStatus :state="syncState" :refreshing="isRefreshing" :can-refresh="canRefresh" :updated-at="updatedAt" class="mt-6" @refresh="synchronize" />
      </div>

      <!-- РОЗКЛАД (SCHEDULE) -->
      <div v-show="activeNavigation === 'schedule'" class="tab-pane">
        <SchedulePanel v-model:day="activeDayKey" v-model:week="selectedWeekType" :lessons="selectedSchedule" :homework="homework" :today-key="todayKey" :automatic-type="automaticWeekType" :week-number="weekNumber" @show-info="openLessonInfo" />
        <BellSchedule class="mt-6" />
      </div>

      <!-- ЗАВДАННЯ (HOMEWORK) -->
      <div v-show="activeNavigation === 'homework'" class="tab-pane">
        <HomeworkSection :items="homework" :bot-url="botUrl" :now="minuteNow" />
      </div>

      <!-- КУРАТОР (TEACHERS) -->
      <div v-show="activeNavigation === 'teachers'" class="tab-pane">
        <CuratorContact id="curator-contact" tabindex="-1" />
      </div>

      <footer class="app-footer mt-10 py-6 text-center text-xs leading-5 text-muted">
        Працює навіть без інтернету<br />Оновлення розкладу — через Telegram-бота
      </footer>
    </main>

    <BottomNavigation :active-item="activeNavigation" @select="selectNavigation" />

    <InfoModal
      v-if="selectedLesson"
      :lesson="selectedLesson"
      @close="closeLessonInfo"
    />

    <AppearanceSettings
      v-if="isSettingsOpen"
      :color-mode="colorMode"
      :accent-color="accentColor"
      :density="density"
      :motion-enabled="motionEnabled"
      :app-version="currentVersion"
      :update-status="updateStatus"
      @update:color-mode="colorMode = $event"
      @update:accent-color="accentColor = $event"
      @update:density="density = $event"
      @update:motion-enabled="motionEnabled = $event"
      @reset="resetPreferences"
      @close="isSettingsOpen = false"
    />

    <WelcomeModal
      v-if="showWelcomeModal"
      @close="closeWelcomeModal"
    />
    
    <AuthModal
      v-if="isAccountOpen"
      :user="accountUser"
      :status="authStatus"
      :error="authCallbackError || authError"
      :notice="authNotice"
      :google-enabled="googleEnabled"
      :google-url="googleUrl"
      @login="loginAccount"
      @register="registerAccount"
      @logout="logoutAccount"
      @clear-error="clearAccountError"
      @close="isAccountOpen = false; authNotice = ''; clearAccountError()"
    />
  </div>
</template>

<style scoped>
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
  font-size: clamp(1.65rem, 3.4vw, 2.5rem);
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
.header-actions { display: flex; align-items: center; gap: 0.5rem; }

.status-line {
  display: inline-flex;
  min-height: 2rem;
  align-items: center;
  gap: 0.45rem;
  margin-top: 0.8rem;
  color: var(--text-secondary);
  font-size: 0.8125rem;
  font-weight: 650;
}

.app-footer { border-top: 1px solid var(--border); }

.app-header {
  animation: content-rise 480ms cubic-bezier(0.22, 1, 0.36, 1) both;
}

.campus-main { max-width: 1160px; }
.campus-grid { display: grid; grid-template-columns: minmax(0, 1fr); gap: 1.5rem; }
.schedule-column, .campus-sidebar { min-width: 0; }
.brand-label { letter-spacing: .08em; }
@media (min-width: 960px) {
  .campus-main { padding-top: 2.5rem; }
  .campus-grid { grid-template-columns: minmax(0, 1.65fr) minmax(300px, 1fr); align-items: start; gap: 1.5rem; }
  .app-header { border-bottom: 1px solid var(--border); padding-bottom: 1.25rem; }
}

@keyframes content-rise {
  from { opacity: 0; translate: 0 0.85rem; }
  to { opacity: 1; translate: 0 0; }
}


.tab-pane { max-width: 768px; margin: 0 auto; }

.day-tabs-home { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: .25rem; padding: .25rem; border: 1px solid var(--border); border-radius: .95rem; background: var(--surface-soft); }
.day-tab-home { position: relative; min-height: 2.35rem; border: 0; border-radius: .7rem; color: var(--text-secondary); background: transparent; font: inherit; font-size: .875rem; font-weight: 650; transition: background-color 150ms ease, color 150ms ease; cursor: pointer; }
.day-tab-home:hover { background: var(--surface-hover); }
.day-tab-home.active { background: var(--accent); color: var(--on-accent); }
.day-tab-home .today-dot { position: absolute; bottom: .25rem; left: calc(50% - 2px); width: 4px; height: 4px; border-radius: 50%; background: currentColor; }

.tab-pane { 
  animation: tab-enter 0.4s cubic-bezier(0.16, 1, 0.3, 1) both;
  will-change: transform, opacity;
}

@keyframes tab-enter {
  0% { opacity: 0; transform: translateY(12px) scale(0.99); }
  100% { opacity: 1; transform: translateY(0) scale(1); }
}

</style>
