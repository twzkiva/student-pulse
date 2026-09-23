<script setup>
import { InformationCircleIcon, MapPinIcon } from '@heroicons/vue/24/outline'

const props = defineProps({
  lessons: {
    type: Array,
    required: true,
  },
  homework: {
    type: Array,
    default: () => [],
  },
})

function hasHomework(subject) {
  if (!subject || !props.homework) return false;
  const sub = subject.toLowerCase();
  return props.homework.some(hw => hw.subject && hw.subject.toLowerCase() === sub);
}

defineEmits(['show-info'])

function stateClass(lesson) {
  return {
    'is-current': lesson.state === 'Зараз',
    'is-complete': lesson.state === 'Завершено',
  }
}
</script>

<template>
  <p v-if="!lessons.length" class="rounded-xl border border-panel p-4 text-sm text-muted" role="status">
    На цей день занять немає.
  </p>
  <ol v-else class="schedule-list" aria-label="Пари на обраний день">
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
          <span class="text-sm font-bold tabular-nums text-ink">{{ lesson.start }}</span>
          <span class="time-line" aria-hidden="true"></span>
          <span class="time-end text-[0.6875rem] font-medium tabular-nums">{{ lesson.end }}</span>
        </div>

        <div class="min-w-0 flex-1">
          <div class="lesson-heading mb-1.5">
            <h3 class="min-w-0 text-base font-semibold leading-snug text-ink">
              {{ lesson.subject }}
            </h3>
            <span class="state-badge">{{ lesson.state }}</span>
          </div>

          <p class="flex items-center gap-1.5 text-xs font-medium text-muted">
            <MapPinIcon class="h-4 w-4" aria-hidden="true" />
            Аудиторія {{ lesson.room }}
          </p>
        </div>

        <button
          class="info-button"
          :class="{ 'has-hw': hasHomework(lesson.subject) }"
          type="button"
          :aria-label="`Докладніше про пару «${lesson.subject}»`"
          @click="$emit('show-info', lesson)"
        >
          <InformationCircleIcon class="h-5 w-5" aria-hidden="true" />
          <div v-if="hasHomework(lesson.subject)" class="absolute -top-1 -right-1 flex h-3 w-3">
            <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span class="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
          </div>
          <span class="sr-only sm:not-sr-only">Інфо</span>
        </button>
      </li>

      <li v-if="index < lessons.length - 1 && lesson.breakAfter > 0" class="break-row" aria-label="Перерва">
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
  border: 1px solid var(--border-soft);
  border-radius: 1.125rem;
  background: var(--surface-soft);
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
  border-color: var(--accent-border);
  background: linear-gradient(100deg, var(--accent-soft), var(--surface));
  box-shadow:
    var(--shadow-sm),
    inset 0 1px rgba(255, 255, 255, 0.05);
}

.lesson-card.is-current::before {
  background: var(--accent);
}

.lesson-card.is-complete {
  background: var(--surface);
}
.lesson-heading { display: flex; flex-wrap: wrap; align-items: baseline; gap: .4rem .6rem; }
.lesson-heading h3 { overflow-wrap: anywhere; }

.period-number {
  display: grid;
  width: 1.65rem;
  height: 1.65rem;
  flex: none;
  place-items: center;
  border: 1px solid var(--accent-border);
  border-radius: 0.55rem;
  color: var(--accent);
  background: var(--surface);
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
  background: var(--border);
}

.time-end { color: var(--text-secondary); }

.state-badge {
  flex: none;
  padding: 0.25rem 0.4rem;
  border-radius: 0.45rem;
  color: var(--text-secondary);
  background: var(--surface);
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  line-height: 1;
  text-transform: uppercase;
}

.is-current .state-badge {
  color: var(--accent);
  background: var(--accent-soft);
}

.info-button {
  position: relative;
  display: inline-flex;
  width: 3rem;
  height: 3rem;
  flex: none;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  border: 1px solid var(--accent-border);
  border-radius: 0.875rem;
  color: var(--accent);
  background: var(--surface);
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
  border-color: var(--accent);
  background: var(--accent-soft);
}

.info-button:hover svg {
  transform: rotate(-8deg) scale(1.1);
}

.info-button:active {
  transform: scale(0.95);
}

.break-row {
  display: grid;
  min-height: 2rem;
  align-items: center;
  gap: 0.65rem;
  padding-inline: 0.75rem;
  color: var(--text-tertiary);
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0;
  grid-template-columns: 1fr auto 1fr;
}

.break-line {
  height: 1px;
  background: var(--border-soft);
}

@keyframes lesson-enter {
  from { opacity: 0; translate: 0 0.7rem; scale: 0.985; }
  to { opacity: 1; translate: 0 0; scale: 1; }
}

@media (hover: hover) {
  .lesson-card:hover {
    transform: translateY(-2px);
    border-color: var(--accent-border);
    box-shadow: var(--shadow-md);
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

@media (max-width: 540px) {
  .period-number { display: none; }
  .lesson-card { gap: 0.55rem; }
}

.info-button.has-hw {
  color: #ff4d4f;
  background: rgba(255, 77, 79, 0.1);
  border-color: rgba(255, 77, 79, 0.2);
}
.info-button.has-hw:hover {
  background: rgba(255, 77, 79, 0.2);
  border-color: rgba(255, 77, 79, 0.4);
  box-shadow: 0 0 12px rgba(255, 77, 79, 0.3);
}

</style>
