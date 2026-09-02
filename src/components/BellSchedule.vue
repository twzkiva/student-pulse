<script setup>
import { ChevronDownIcon, ClockIcon } from '@heroicons/vue/24/outline'
import { bellSchedule } from '../data/schedule'
</script>

<template>
  <details class="bell-card" open>
    <summary class="bell-summary">
      <span class="summary-icon" aria-hidden="true">
        <ClockIcon class="h-5 w-5" />
      </span>
      <span class="min-w-0 flex-1">
        <span class="block text-sm font-semibold text-white">Дзвінки та перерви</span>
        <span class="mt-0.5 block text-[0.6875rem] text-muted">Пара триває 80 хвилин</span>
      </span>
      <ChevronDownIcon class="chevron h-5 w-5" aria-hidden="true" />
    </summary>

    <ol class="bell-list" aria-label="Розклад дзвінків">
      <template v-for="period in bellSchedule" :key="period.number">
        <li class="bell-row">
          <span class="period-label">{{ period.label }}</span>
          <span class="period-time">{{ period.start }}–{{ period.end }}</span>
        </li>
        <li v-if="period.breakAfter" class="bell-break">
          Перерва {{ period.breakAfter }} хв
        </li>
      </template>
    </ol>
  </details>
</template>

<style scoped>
.bell-card {
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.075);
  border-radius: 1.125rem;
  background: rgba(18, 16, 23, 0.82);
  box-shadow: inset 0 1px rgba(255, 255, 255, 0.035);
  transition: border-color 220ms ease, box-shadow 220ms ease;
  animation: bell-enter 500ms cubic-bezier(0.22, 1, 0.36, 1) 280ms both;
}

.bell-card[open] {
  border-color: rgba(185, 108, 255, 0.14);
  box-shadow: 0 0 1.5rem rgba(185, 108, 255, 0.045), inset 0 1px rgba(255, 255, 255, 0.045);
}

.bell-summary {
  display: flex;
  min-height: 4.75rem;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  cursor: pointer;
  list-style: none;
}

.bell-summary::-webkit-details-marker {
  display: none;
}

.bell-summary:focus-visible {
  outline: 2px solid #d9afff;
  outline-offset: -3px;
  border-radius: 1rem;
}

.summary-icon {
  display: grid;
  width: 2.75rem;
  height: 2.75rem;
  flex: none;
  place-items: center;
  border: 1px solid rgba(185, 108, 255, 0.22);
  border-radius: 0.85rem;
  color: #d6a5ff;
  background: rgba(185, 108, 255, 0.08);
}

.chevron {
  flex: none;
  color: #8f899a;
  transition: transform 220ms ease;
}

.bell-card[open] .chevron {
  transform: rotate(180deg);
}

.bell-list {
  margin: 0;
  padding: 0 0.75rem 0.85rem;
  list-style: none;
  transform-origin: top;
  animation: details-reveal 300ms cubic-bezier(0.22, 1, 0.36, 1) both;
}

.bell-row {
  display: flex;
  min-height: 2.8rem;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding-inline: 0.75rem;
  border: 1px solid rgba(255, 255, 255, 0.055);
  border-radius: 0.75rem;
  background: rgba(255, 255, 255, 0.025);
}

.period-label {
  color: #aaa4b8;
  font-size: 0.75rem;
  font-weight: 600;
}

.period-time {
  color: white;
  font-size: 0.8125rem;
  font-variant-numeric: tabular-nums;
  font-weight: 700;
}

.bell-break {
  display: grid;
  height: 1.3rem;
  place-items: center;
  color: #716b7c;
  font-size: 0.5rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

@keyframes bell-enter {
  from { opacity: 0; translate: 0 0.7rem; }
  to { opacity: 1; translate: 0 0; }
}

@keyframes details-reveal {
  from { opacity: 0; transform: translateY(-0.35rem) scaleY(0.96); }
  to { opacity: 1; transform: translateY(0) scaleY(1); }
}
</style>
