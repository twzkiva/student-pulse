<script setup>
import { InformationCircleIcon, MapPinIcon } from '@heroicons/vue/24/outline'

defineProps({
  lessons: {
    type: Array,
    required: true,
  },
})

defineEmits(['show-info'])

function stateClass(lesson) {
  return {
    'is-current': lesson.state === 'Зараз',
    'is-complete': lesson.state === 'Завершено',
    'is-empty': lesson.isEmpty,
  }
}
</script>

<template>
  <ol class="schedule-list" aria-label="Пари на обраний день">
    <template v-for="(lesson, index) in lessons" :key="lesson.id">
      <li
        class="lesson-card"
        :class="stateClass(lesson)"
        :style="{ '--stagger-delay': `${80 + index * 55}ms` }"
      >
        <div class="period-number" :aria-label="`${lesson.period} пара`">
          {{ lesson.period }}
        </div>

        <div class="time-column" aria-label="Час пари">
          <span class="text-sm font-bold tabular-nums text-white">{{ lesson.start }}</span>
          <span class="time-line" aria-hidden="true"></span>
          <span class="text-[0.6875rem] font-medium tabular-nums text-white/45">{{ lesson.end }}</span>
        </div>

        <div class="min-w-0 flex-1">
          <div class="mb-1.5 flex items-start justify-between gap-2">
            <h3 class="min-w-0 text-[0.9375rem] font-semibold leading-snug text-white">
              {{ lesson.subject }}
            </h3>
            <span class="state-badge">{{ lesson.state }}</span>
          </div>

          <p class="flex items-center gap-1.5 text-xs font-medium text-muted">
            <MapPinIcon class="h-4 w-4 text-white/45" aria-hidden="true" />
            {{ lesson.isEmpty ? 'Час для відпочинку' : `Аудиторія ${lesson.room}` }}
          </p>
        </div>

        <button
          v-if="!lesson.isEmpty"
          class="info-button"
          type="button"
          :aria-label="`Докладніше про пару «${lesson.subject}»`"
          @click="$emit('show-info', lesson)"
        >
          <InformationCircleIcon class="h-5 w-5" aria-hidden="true" />
          <span class="sr-only sm:not-sr-only">Інфо</span>
        </button>
      </li>

      <li v-if="index < lessons.length - 1" class="break-row" aria-label="Перерва">
        <span class="break-line" aria-hidden="true"></span>
        <span>Перерва {{ lesson.breakAfter }} хв</span>
        <span class="break-line" aria-hidden="true"></span>
      </li>
    </template>
  </ol>
</template>

<style scoped>
.schedule-list {
  display: grid;
  gap: 0;
  margin: 0;
  padding: 0;
  list-style: none;
}

.lesson-card {
  position: relative;
  display: flex;
  min-height: 5.75rem;
  align-items: center;
  gap: 0.7rem;
  overflow: hidden;
  padding: 0.8rem 0.7rem;
  border: 1px solid rgba(255, 255, 255, 0.075);
  border-radius: 1.125rem;
  background: linear-gradient(120deg, rgba(25, 23, 31, 0.9), rgba(15, 14, 19, 0.94));
  box-shadow: inset 0 1px rgba(255, 255, 255, 0.035);
  transition: border-color 180ms ease, background-color 180ms ease, box-shadow 220ms ease, transform 220ms ease;
  animation: lesson-enter 460ms cubic-bezier(0.22, 1, 0.36, 1) var(--stagger-delay) both;
}

.lesson-card::before {
  position: absolute;
  inset: 0 auto 0 0;
  width: 2px;
  background: transparent;
  content: '';
}

.lesson-card.is-current {
  border-color: rgba(185, 108, 255, 0.48);
  background:
    radial-gradient(circle at 8% 50%, rgba(185, 108, 255, 0.15), transparent 30%),
    linear-gradient(120deg, rgba(30, 24, 38, 0.96), rgba(15, 14, 19, 0.96));
  box-shadow:
    0 0 1.5rem rgba(185, 108, 255, 0.08),
    inset 0 1px rgba(255, 255, 255, 0.06);
}

.lesson-card.is-current::before {
  background: #c47cff;
  box-shadow: 0 0 0.75rem #b96cff;
  animation: current-edge 2.4s ease-in-out infinite;
}

.lesson-card.is-complete {
  opacity: 0.55;
}

.lesson-card.is-empty {
  border-style: dashed;
  background: rgba(16, 15, 20, 0.58);
}

.period-number {
  display: grid;
  width: 1.65rem;
  height: 1.65rem;
  flex: none;
  place-items: center;
  border: 1px solid rgba(185, 108, 255, 0.2);
  border-radius: 0.55rem;
  color: #d6a5ff;
  background: rgba(185, 108, 255, 0.07);
  font-size: 0.6875rem;
  font-weight: 700;
}

.time-column {
  display: flex;
  width: 2.75rem;
  flex: none;
  align-self: stretch;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
}

.time-line {
  width: 1rem;
  height: 1px;
  margin-block: 0.25rem;
  background: rgba(255, 255, 255, 0.18);
}

.state-badge {
  flex: none;
  padding: 0.25rem 0.4rem;
  border-radius: 0.45rem;
  color: #a8a1b4;
  background: rgba(255, 255, 255, 0.055);
  font-size: 0.5rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  line-height: 1;
  text-transform: uppercase;
}

.is-current .state-badge {
  color: #e4c5ff;
  background: rgba(185, 108, 255, 0.16);
}

.info-button {
  display: inline-flex;
  width: 3rem;
  height: 3rem;
  flex: none;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  border: 1px solid rgba(185, 108, 255, 0.24);
  border-radius: 0.875rem;
  color: #d6a5ff;
  background: rgba(185, 108, 255, 0.08);
  font-family: inherit;
  font-size: 0.6875rem;
  font-weight: 700;
  transition: border-color 180ms ease, background-color 180ms ease, box-shadow 180ms ease;
}

.info-button svg {
  transition: transform 220ms cubic-bezier(0.22, 1, 0.36, 1);
}

.info-button:hover,
.info-button:active {
  border-color: rgba(214, 165, 255, 0.68);
  background: rgba(185, 108, 255, 0.16);
  box-shadow: 0 0 1rem rgba(185, 108, 255, 0.12);
}

.info-button:hover svg {
  transform: rotate(-8deg) scale(1.1);
}

.info-button:active {
  transform: scale(0.95);
}

.break-row {
  display: grid;
  height: 1.7rem;
  align-items: center;
  gap: 0.65rem;
  padding-inline: 0.75rem;
  color: #706a7c;
  font-size: 0.5625rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  grid-template-columns: 1fr auto 1fr;
}

.break-line {
  height: 1px;
  background: rgba(255, 255, 255, 0.055);
}

@keyframes lesson-enter {
  from { opacity: 0; translate: 0 0.7rem; scale: 0.985; }
  to { opacity: 1; translate: 0 0; scale: 1; }
}

@keyframes current-edge {
  0%, 100% { opacity: 0.55; box-shadow: 0 0 0.45rem #b96cff; }
  50% { opacity: 1; box-shadow: 0 0 1rem #c47cff; }
}

@media (hover: hover) {
  .lesson-card:not(.is-empty):hover {
    transform: translateY(-2px);
    border-color: rgba(185, 108, 255, 0.22);
    box-shadow:
      0 0.8rem 2rem rgba(0, 0, 0, 0.22),
      inset 0 1px rgba(255, 255, 255, 0.055);
  }
}

@media (min-width: 640px) {
  .lesson-card {
    gap: 0.9rem;
    padding-inline: 0.9rem;
  }

  .info-button {
    width: auto;
    min-width: 4.75rem;
    padding-inline: 0.75rem;
  }
}

@media (max-width: 374px) {
  .period-number { display: none; }
  .lesson-card { gap: 0.55rem; }
}
</style>
