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
  if (!isCurrent.value) return 8
  const elapsed = totalSeconds.value - remainingSeconds.value
  return Math.min(100, Math.max(0, (elapsed / totalSeconds.value) * 100))
})

const progressHue = computed(() => {
  if (!isCurrent.value) return 276

  const normalized = progress.value / 100
  if (normalized <= 0.5) {
    return -5 + (47 - -5) * (normalized / 0.5)
  }

  const greenThreshold = 0.8125
  if (normalized < greenThreshold) {
    const segment = (normalized - 0.5) / (greenThreshold - 0.5)
    return 47 + (142 - 47) * segment
  }

  return 142
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
      <div class="mb-4 flex items-center justify-between gap-3">
        <span class="current-label">
          <span class="current-pulse" aria-hidden="true"></span>
          {{ isCurrent ? 'Поточна пара' : 'Наступна пара' }}
        </span>
        <span class="phase-label">{{ phaseLabel }}</span>
      </div>

      <div class="mb-5">
        <p class="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-white/65">
          {{ isCurrent ? 'До завершення' : 'До початку' }}
        </p>
        <p
          class="timer"
          :aria-label="`${isCurrent ? 'До завершення' : 'До початку'} пари ${timer}`"
        >
          {{ timer }}
        </p>
      </div>

      <div class="mb-4 h-px bg-white/16"></div>

      <div class="flex items-end justify-between gap-4">
        <div class="min-w-0">
          <h2 id="current-subject" class="text-lg font-bold leading-tight tracking-[-0.025em] text-white sm:text-xl">
            {{ lesson.subject }}
          </h2>
          <div class="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm font-medium text-white/78">
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

      <div v-if="isCurrent" class="mt-4" aria-hidden="true">
        <div class="progress-track">
          <span class="progress-point progress-point-start"></span>
          <span class="progress-point progress-point-middle"></span>
          <span class="progress-point progress-point-end"></span>
        </div>
        <div class="mt-2 flex justify-between text-[0.5625rem] font-semibold uppercase tracking-[0.12em] text-white/50">
          <span>Початок</span>
          <span>Середина</span>
          <span>Фініш</span>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.current-widget {
  position: relative;
  min-height: 15.5rem;
  overflow: hidden;
  padding: 1rem;
  border: 1px solid hsl(var(--progress-hue) 70% 56% / 0.34);
  border-radius: 1.35rem;
  background:
    linear-gradient(145deg, var(--widget-base), var(--widget-base-end) 76%);
  box-shadow:
    var(--shadow-md),
    inset 0 1px rgba(255, 255, 255, 0.08);
  transition: border-color 600ms ease, box-shadow 600ms ease, transform 260ms ease;
  animation: widget-enter 560ms cubic-bezier(0.22, 1, 0.36, 1) 40ms both;
}

.current-widget.is-next {
  min-height: 14.25rem;
}

.progress-wash {
  position: absolute;
  inset: 0 auto 0 0;
  width: var(--progress);
  background:
    linear-gradient(110deg, hsl(var(--progress-hue) 80% 45% / 0.78), hsl(var(--progress-hue) 72% 34% / 0.34) 62%, transparent);
  box-shadow: 0.75rem 0 2rem hsl(var(--progress-hue) 72% 45% / 0.14);
  transition: width 900ms linear, background 700ms ease;
}

.progress-wash::after {
  position: absolute;
  top: 0;
  right: 0;
  width: 1px;
  height: 100%;
  background: hsl(var(--progress-hue) 100% 76% / 0.75);
  box-shadow: 0 0 0.8rem hsl(var(--progress-hue) 90% 64% / 0.55);
  content: '';
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
  min-height: 1.875rem;
  gap: 0.5rem;
  padding: 0.45rem 0.65rem;
  color: white;
  background: var(--widget-chip);
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.16);
  backdrop-filter: blur(12px);
}

.current-pulse {
  width: 0.4rem;
  height: 0.4rem;
  border-radius: 999px;
  background: white;
  box-shadow: 0 0 0.45rem white;
}

.phase-label {
  min-height: 1.875rem;
  padding: 0.45rem 0.65rem;
  color: rgba(255, 255, 255, 0.72);
  background: var(--widget-chip);
}

.timer {
  color: white;
  font-size: clamp(2.35rem, 11vw, 3.5rem);
  font-variant-numeric: tabular-nums;
  font-weight: 600;
  letter-spacing: -0.075em;
  line-height: 0.92;
  text-shadow: 0 0 1.25rem hsl(var(--progress-hue) 80% 72% / 0.18);
}

.room-orbit {
  position: relative;
  display: grid;
  width: 3.1rem;
  height: 3.1rem;
  flex: none;
  place-items: center;
  border: 1px solid rgba(255, 255, 255, 0.25);
  border-radius: 0.9rem;
  color: white;
  background: var(--widget-chip);
  box-shadow: inset 0 0 1.25rem rgba(255, 255, 255, 0.06);
  font-size: 0.75rem;
  font-weight: 700;
  text-align: center;
}

.room-orbit.wide {
  width: 4.35rem;
  border-radius: 1.4rem;
  font-size: 0.625rem;
}

.progress-track {
  position: relative;
  height: 0.25rem;
  border-radius: 999px;
  background: var(--widget-chip);
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.08);
}

.progress-track::before {
  position: absolute;
  inset: 0 auto 0 0;
  width: var(--progress);
  border-radius: inherit;
  background: white;
  box-shadow: 0 0 0.85rem rgba(255, 255, 255, 0.72);
  content: '';
  transition: width 900ms linear;
}

.progress-point {
  position: absolute;
  top: 50%;
  width: 0.45rem;
  height: 0.45rem;
  border: 1px solid rgba(255, 255, 255, 0.5);
  border-radius: 50%;
  background: var(--widget-base);
  transform: translate(-50%, -50%);
}

.progress-point-start { left: 0; }
.progress-point-middle { left: 50%; }
.progress-point-end { left: 100%; }

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
