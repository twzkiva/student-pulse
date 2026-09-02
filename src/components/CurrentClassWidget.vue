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
    <div class="tech-grid" aria-hidden="true"></div>

    <div class="relative z-10">
      <div class="mb-5 flex items-center justify-between gap-3">
        <span class="current-label">
          <span class="current-pulse" aria-hidden="true"></span>
          {{ isCurrent ? 'Поточна пара' : 'Наступна пара' }}
        </span>
        <span class="phase-label">{{ phaseLabel }}</span>
      </div>

      <div class="mb-6">
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

      <div class="mb-5 h-px bg-white/16"></div>

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

      <div v-if="isCurrent" class="mt-5" aria-hidden="true">
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
  min-height: 20rem;
  overflow: hidden;
  padding: 1.1rem;
  border: 1px solid hsl(var(--progress-hue) 95% 62% / 0.48);
  border-radius: 1.5rem;
  background:
    radial-gradient(circle at 90% 12%, hsl(var(--progress-hue) 100% 62% / 0.12), transparent 38%),
    linear-gradient(145deg, #17131d, #0d0c12 74%);
  box-shadow:
    0 1.5rem 5rem rgba(0, 0, 0, 0.42),
    0 0 2.25rem hsl(var(--progress-hue) 96% 54% / 0.15),
    inset 0 1px rgba(255, 255, 255, 0.08);
  transition: border-color 600ms ease, box-shadow 600ms ease, transform 260ms ease;
  animation: widget-enter 560ms cubic-bezier(0.22, 1, 0.36, 1) 40ms both;
}

.current-widget.is-next {
  min-height: 17.25rem;
}

.progress-wash {
  position: absolute;
  inset: 0 auto 0 0;
  width: var(--progress);
  background:
    linear-gradient(115deg, hsl(var(--progress-hue) 98% 48% / 0.76), hsl(var(--progress-hue) 96% 38% / 0.34) 58%, transparent),
    radial-gradient(circle at 35% 35%, hsl(var(--progress-hue) 100% 70% / 0.38), transparent 58%);
  box-shadow: 1.25rem 0 3rem hsl(var(--progress-hue) 98% 52% / 0.22);
  transition: width 900ms linear, background 700ms ease;
  animation: energy-breathe 4.8s ease-in-out infinite;
}

.progress-wash::before {
  position: absolute;
  inset: 0;
  background: linear-gradient(105deg, transparent 30%, rgba(255, 255, 255, 0.16) 48%, transparent 66%);
  content: '';
  transform: translateX(-130%);
  animation: energy-sweep 5.2s cubic-bezier(0.22, 1, 0.36, 1) infinite;
}

.progress-wash::after {
  position: absolute;
  top: 0;
  right: 0;
  width: 1px;
  height: 100%;
  background: hsl(var(--progress-hue) 100% 76% / 0.75);
  box-shadow: 0 0 1.1rem hsl(var(--progress-hue) 100% 64% / 0.9);
  content: '';
}

.tech-grid {
  position: absolute;
  inset: 0;
  opacity: 0.22;
  background-image:
    linear-gradient(rgba(255, 255, 255, 0.08) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.08) 1px, transparent 1px);
  background-size: 2rem 2rem;
  mask-image: linear-gradient(125deg, black, transparent 78%);
  animation: grid-drift 18s linear infinite;
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
  background: rgba(8, 7, 11, 0.38);
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.16);
  backdrop-filter: blur(12px);
}

.current-pulse {
  width: 0.4rem;
  height: 0.4rem;
  border-radius: 999px;
  background: white;
  box-shadow: 0 0 0.65rem white;
  animation: pulse 1.8s ease-in-out infinite;
}

.phase-label {
  min-height: 1.875rem;
  padding: 0.45rem 0.65rem;
  color: rgba(255, 255, 255, 0.72);
  background: rgba(8, 7, 11, 0.3);
}

.timer {
  color: white;
  font-size: clamp(2.55rem, 12vw, 4.05rem);
  font-variant-numeric: tabular-nums;
  font-weight: 600;
  letter-spacing: -0.075em;
  line-height: 0.92;
  text-shadow: 0 0 2rem hsl(var(--progress-hue) 100% 72% / 0.3);
}

.room-orbit {
  position: relative;
  display: grid;
  width: 3.1rem;
  height: 3.1rem;
  flex: none;
  place-items: center;
  border: 1px solid rgba(255, 255, 255, 0.25);
  border-radius: 50%;
  color: white;
  background: rgba(9, 8, 13, 0.36);
  box-shadow: inset 0 0 1.25rem rgba(255, 255, 255, 0.06);
  font-size: 0.75rem;
  font-weight: 700;
  text-align: center;
  animation: room-float 4.6s ease-in-out infinite;
}

.room-orbit.wide {
  width: 4.35rem;
  border-radius: 1.4rem;
  font-size: 0.625rem;
}

.room-orbit.wide::after {
  animation: none;
}

.room-orbit::after {
  position: absolute;
  inset: -0.35rem;
  border: 1px dashed rgba(255, 255, 255, 0.18);
  border-radius: inherit;
  content: '';
  animation: orbit-spin 16s linear infinite;
}

.progress-track {
  position: relative;
  height: 0.25rem;
  border-radius: 999px;
  background: rgba(8, 7, 11, 0.38);
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
  background: #17131d;
  transform: translate(-50%, -50%);
}

.progress-point-start { left: 0; }
.progress-point-middle { left: 50%; }
.progress-point-end { left: 100%; }

@keyframes pulse {
  50% { opacity: 0.48; transform: scale(0.8); }
}

@keyframes widget-enter {
  from { opacity: 0; translate: 0 1rem; scale: 0.985; }
  to { opacity: 1; translate: 0 0; scale: 1; }
}

@keyframes energy-breathe {
  0%, 100% { opacity: 0.82; }
  50% { opacity: 1; }
}

@keyframes energy-sweep {
  0%, 55% { transform: translateX(-130%); opacity: 0; }
  62% { opacity: 1; }
  82%, 100% { transform: translateX(130%); opacity: 0; }
}

@keyframes grid-drift {
  from { background-position: 0 0, 0 0; }
  to { background-position: 2rem 2rem, 2rem 2rem; }
}

@keyframes room-float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-0.22rem); }
}

@keyframes orbit-spin {
  to { transform: rotate(360deg); }
}

@media (hover: hover) {
  .current-widget:hover {
    transform: translateY(-2px);
    box-shadow:
      0 1.75rem 5.5rem rgba(0, 0, 0, 0.46),
      0 0 2.75rem hsl(var(--progress-hue) 96% 54% / 0.2),
      inset 0 1px rgba(255, 255, 255, 0.1);
  }
}

@media (min-width: 640px) {
  .current-widget { padding: 1.25rem; }
}
</style>
