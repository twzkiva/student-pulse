<script setup>
import { computed } from 'vue'
import { ClockIcon, MapPinIcon } from '@heroicons/vue/24/outline'

const props = defineProps({
  lesson: {
    type: Object,
    required: true,
  },
  mode: {
    type: String,
    default: 'current',
    validator: (value) => ['current', 'next'].includes(value),
  },
  now: {
    type: Number,
    required: true,
  },
})

const isCurrent = computed(() => props.mode === 'current')
const totalSeconds = computed(() => Math.max(1, (props.lesson.endAt - props.lesson.startAt) / 1000))
const targetTime = computed(() => (isCurrent.value ? props.lesson.endAt : props.lesson.startAt))
const remainingSeconds = computed(() => Math.max(0, Math.floor((targetTime.value - props.now) / 1000)))

const progress = computed(() => {
  if (isCurrent.value) {
    const elapsed = totalSeconds.value - remainingSeconds.value
    return Math.min(100, Math.max(0, (elapsed / totalSeconds.value) * 100))
  } else {
    const r = remainingSeconds.value
    if (r > 5400) return 0 // Чекаємо
    return 100 - (r / 5400) * 100 // Повзе від 0 до 100% останні 1.5 години
  }
})

const progressHue = computed(() => {
  if (isCurrent.value) {
    // ПОТОЧНА ПАРА: Початок (0%) - Червоний (0), Середина (50%) - Жовтий (45), Кінець (100%) - Зелений (140)
    const normalized = progress.value / 100
    if (normalized <= 0.5) {
      return 0 + (45 - 0) * (normalized / 0.5)
    }
    return 45 + (140 - 45) * ((normalized - 0.5) / 0.5)
  } else {
    // ДО ПОЧАТКУ (Наступна пара): Зелений -> Жовтий -> Червоний
    const r = remainingSeconds.value
    if (r > 5400) return 140 // Більше 1.5 год - зелений
    if (r > 900) {
      // Від 1.5 год до 15 хв - плавно зелений -> жовтий
      const fraction = (r - 900) / (5400 - 900)
      return 45 + (140 - 45) * fraction
    }
    // Від 15 хв до 0 - плавно жовтий -> червоний
    const fraction = r / 900
    return 0 + (45 - 0) * fraction
  }
})

const timer = computed(() => {
  const hours = Math.floor(remainingSeconds.value / 3600)
  const minutes = Math.floor((remainingSeconds.value % 3600) / 60)
  const seconds = remainingSeconds.value % 60
  return [hours, minutes, seconds].map((value) => String(value).padStart(2, '0')).join(':')
})

const phaseLabel = computed(() => {
  if (!isCurrent.value) return `Початок о ${props.lesson.start}`
  if (remainingSeconds.value <= 15 * 60) return 'Фінішний відрізок'
  if (progress.value < 50) return 'Початок пари'
  return 'Пара триває'
})

const widgetStyle = computed(() => ({
  '--progress': `${progress.value}%`,
  '--progress-hue': progressHue.value.toFixed(1),
}))

const roomIsWide = computed(() => props.lesson.room.length > 5)
</script>

<template>
  <section
    class="current-widget"
    :class="{ 'is-next': !isCurrent }"
    :style="widgetStyle"
    aria-labelledby="current-subject"
  >
    <div class="progress-wash" aria-hidden="true"></div>
    <div class="relative z-10">
      <div class="mb-2.5 flex items-center justify-between gap-2">
        <span class="current-label">
          <span class="current-pulse" aria-hidden="true"></span>
          {{ isCurrent ? 'Поточна пара' : 'Наступна пара' }}
        </span>
        <span class="phase-label">{{ phaseLabel }}</span>
      </div>

      <div class="mb-2.5">
        <p class="mb-1 text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-white/65">
          {{ isCurrent ? 'До завершення' : 'До початку' }}
        </p>
        <p
          class="timer"
          :aria-label="`${isCurrent ? 'До завершення' : 'До початку'} пари ${timer}`"
        >
          {{ timer }}
        </p>
      </div>

      <div class="mb-3 h-px bg-white/16"></div>

      <div class="flex items-end justify-between gap-4">
        <div class="min-w-0">
          <h2 id="current-subject" class="text-base font-bold leading-tight tracking-[-0.02em] text-white sm:text-lg">
            {{ lesson.subject }}
          </h2>
          <div class="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm font-medium text-white/78">
            <span class="flex items-center gap-1.5">
              <ClockIcon class="h-[1.125rem] w-[1.125rem]" aria-hidden="true" />
              {{ lesson.start }}–{{ lesson.end }}
            </span>
            <span class="flex items-center gap-1.5">
              <MapPinIcon class="h-[1.125rem] w-[1.125rem]" aria-hidden="true" />
              Аудиторія {{ lesson.room }}
            </span>
          </div>
        </div>

        <div class="room-orbit" :class="{ wide: roomIsWide }" aria-hidden="true">
          <span>{{ lesson.room }}</span>
        </div>
      </div>

      <div class="mt-3" aria-hidden="true">
        <div class="progress-track"></div>
        <div v-if="isCurrent" class="mt-2 flex justify-between text-[0.5625rem] font-semibold uppercase tracking-[0.12em] text-white/50">
          <span>Початок</span>
          <span>Середина</span>
          <span>Фініш</span>
        </div>
        <div v-else class="mt-2 flex justify-end text-[0.5625rem] font-semibold uppercase tracking-[0.12em] text-white/50">
          <span>{{ remainingSeconds > 5400 ? 'Очікування' : 'Час готуватись' }}</span>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.current-widget {
  position: relative;
  min-height: 9.5rem;
  overflow: hidden;
  padding: 1rem;
  border: 1px solid hsl(var(--progress-hue) 40% 50% / 0.2);
  border-radius: 1.35rem;
  background: rgba(15, 15, 20, 0.4);
  box-shadow: 
    0 20px 40px -15px hsl(var(--progress-hue) 50% 50% / 0.1),
    inset 0 1px 1px rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  transition: border-color 1000ms ease, box-shadow 1000ms ease, transform 260ms ease;
  animation: widget-enter 560ms cubic-bezier(0.22, 1, 0.36, 1) 40ms both;
}

.current-widget.is-next {
  min-height: 8.5rem;
}

.progress-wash {
  position: absolute;
  inset: 0;
  width: 100%;
  background:
    radial-gradient(ellipse 90% 90% at 0% 0%, hsl(var(--progress-hue) 100% 65% / 0.12), transparent),
    radial-gradient(ellipse 70% 70% at 100% 100%, hsl(calc(var(--progress-hue) - 30) 100% 55% / 0.08), transparent);
  mix-blend-mode: screen;
  pointer-events: none;
  background-size: 100% 100%;
  animation: wash-breathe 6s ease-in-out infinite alternate;
  transition: background 1000ms ease;
}

.current-label,
.phase-label {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  font-size: 0.625rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  line-height: 1;
  text-transform: uppercase;
}

.current-label {
  min-height: 1.5rem;
  gap: 0.5rem;
  padding: 0.35rem 0.55rem;
  color: hsl(var(--progress-hue) 100% 85%);
  background: hsl(var(--progress-hue) 50% 50% / 0.15);
  box-shadow: inset 0 0 0 1px hsl(var(--progress-hue) 50% 50% / 0.2);
}

.current-pulse {
  width: 0.4rem;
  height: 0.4rem;
  border-radius: 999px;
  background: currentColor;
  box-shadow: 0 0 0.45rem currentColor;
}

.phase-label {
  min-height: 1.5rem;
  padding: 0.3rem 0.5rem;
  color: rgba(255, 255, 255, 0.6);
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.timer {
  color: white;
  font-size: clamp(2rem, 8vw, 2.5rem);
  font-variant-numeric: tabular-nums;
  font-weight: 700;
  letter-spacing: -0.05em;
  line-height: 1;
  text-shadow: 0 4px 24px hsl(var(--progress-hue) 80% 72% / 0.25);
}

.room-orbit {
  position: relative;
  display: grid;
  width: 2.25rem;
  height: 2.25rem;
  flex: none;
  place-items: center;
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 0.9rem;
  color: white;
  background: rgba(255, 255, 255, 0.05);
  box-shadow: inset 0 0 1rem rgba(255, 255, 255, 0.02);
  font-size: 0.75rem;
  font-weight: 700;
  text-align: center;
}

.room-orbit.wide {
  width: 3.5rem;
  border-radius: 1.4rem;
  font-size: 0.625rem;
}

.progress-track {
  position: relative;
  height: 0.35rem;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.1);
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.2);
  overflow: hidden;
}

.progress-track::before {
  position: absolute;
  inset: 0 auto 0 0;
  width: var(--progress);
  border-radius: inherit;
  background: hsl(var(--progress-hue) 90% 65%);
  box-shadow: 0 0 1rem hsl(var(--progress-hue) 100% 60% / 0.8);
  content: '';
  transition: width 1000ms linear, background 1000ms ease;
}

@keyframes wash-breathe {
  0% { opacity: 0.7; filter: hue-rotate(-10deg); }
  100% { opacity: 1; filter: hue-rotate(10deg); }
}

@keyframes widget-enter {
  from { opacity: 0; translate: 0 1rem; scale: 0.985; }
  to { opacity: 1; translate: 0 0; scale: 1; }
}

@media (hover: hover) {
  .current-widget:hover {
    transform: translateY(-2px);
    box-shadow:
      var(--shadow-md),
      0 0 1.5rem hsl(var(--progress-hue) 72% 54% / 0.1),
      inset 0 1px rgba(255, 255, 255, 0.1);
  }
}

@media (min-width: 640px) {
  .current-widget { padding: 1.25rem; }
}
</style>
