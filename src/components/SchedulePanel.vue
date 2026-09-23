<script setup lang="ts">
import { computed } from 'vue'
import { CalendarDaysIcon, ArrowUturnLeftIcon } from '@heroicons/vue/24/outline'
import ScheduleList from './ScheduleList.vue'
import WeekParityToggle from './WeekParityToggle.vue'
import { weekDays } from '../data/schedule.js'

const props = defineProps<{
  lessons: Array<Record<string, unknown>>
  todayKey: string | null
  automaticType: string
  weekNumber: number
}>()
const day = defineModel<string>('day', { required: true })
const week = defineModel<string>('week', { required: true })
const emit = defineEmits<{ showInfo: [lesson: Record<string, unknown>] }>()
const dayLabel = computed(() => weekDays.find(item => item.key === day.value)?.label ?? 'Розклад')
const isCurrentSelection = computed(() => week.value === props.automaticType && day.value === (props.todayKey ?? 'monday'))
const countLabel = computed(() => {
  const count = props.lessons.length
  return `${count} ${count === 1 ? 'пара' : count >= 2 && count <= 4 ? 'пари' : 'пар'}`
})
function resetDay() {
  day.value = props.todayKey ?? 'monday'
  week.value = props.automaticType
}
</script>

<template>
  <section id="today-schedule" class="schedule-section" tabindex="-1" aria-labelledby="schedule-title">
    <header class="schedule-heading">
      <div>
        <p class="eyebrow"><CalendarDaysIcon aria-hidden="true" /> Розклад занять</p>
        <h2 id="schedule-title">{{ dayLabel }}</h2>
      </div>
      <span class="lesson-count">{{ countLabel }}</span>
    </header>
    <div class="week-caption">
      <span>Тиждень №{{ weekNumber }}</span>
      <button type="button" class="reset-day" :disabled="isCurrentSelection" @click="resetDay">
        <ArrowUturnLeftIcon aria-hidden="true" /> {{ todayKey ? 'До сьогодні' : 'До поточного тижня' }}
      </button>
    </div>
    <WeekParityToggle v-model="week" :automatic-type="automaticType" />
    <div class="day-tabs" role="group" aria-label="Оберіть день тижня">
      <button v-for="item in weekDays" :key="item.key" type="button" class="day-tab" :class="{ active: day === item.key }" :aria-pressed="day === item.key" :aria-label="item.label" @click="day = item.key">
        {{ item.short }}
        <span v-if="todayKey === item.key" class="today-dot" aria-hidden="true"></span>
      </button>
    </div>
    <p v-if="week !== automaticType" class="other-week" role="status">Перегляд {{ week === 'even' ? 'парного' : 'непарного' }} тижня. Поточні пари показано в огляді дня.</p>
    <ScheduleList :lessons="lessons" :homework="homework" @show-info="emit('showInfo', $event)" />
  </section>
</template>

<style scoped>
.schedule-section { margin-top: 1.5rem; padding: 1.25rem; border: 1px solid var(--border); border-radius: 1.5rem; background: var(--surface); scroll-margin-top: 1.25rem; }
.schedule-heading { display: flex; align-items: center; justify-content: space-between; gap: 1rem; }
.schedule-heading .eyebrow { display: flex; align-items: center; gap: .5rem; font-size: .75rem; }
.eyebrow svg { width: 1rem; height: 1rem; }
.schedule-heading h2 { margin-top: .7rem; font-size: 1.5rem; font-weight: 750; letter-spacing: -.035em; }
.week-caption { display: flex; justify-content: space-between; align-items: center; gap: .5rem; margin-block: .65rem; color: var(--text-secondary); font-size: .8125rem; }
.reset-day { display: inline-flex; align-items: center; justify-content: center; gap: .4rem; min-height: 3rem; padding-inline: .65rem; border: 0; border-radius: .7rem; color: var(--accent); background: var(--accent-soft); font: inherit; }
.reset-day:disabled { color: var(--text-secondary); background: transparent; cursor: default; }
.reset-day svg { width: 1rem; height: 1rem; flex: none; }
.day-tabs { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: .35rem; padding: .3rem; margin-bottom: 1rem; border: 1px solid var(--border); border-radius: .95rem; background: var(--surface-soft); }
.day-tab { position: relative; min-height: 3rem; border: 0; border-radius: .7rem; color: var(--text-secondary); background: transparent; font: inherit; font-size: .875rem; font-weight: 650; transition: background-color 150ms ease, color 150ms ease; }
.day-tab:hover { background: var(--surface-hover); }
.day-tab.active { background: var(--accent); color: var(--on-accent); }
.today-dot { position: absolute; bottom: .3rem; left: calc(50% - 2px); width: 4px; height: 4px; border-radius: 50%; background: currentColor; }
.other-week { margin-bottom: 1rem; padding: .75rem; border-radius: .7rem; background: var(--accent-soft); color: var(--text-secondary); font-size: .8125rem; line-height: 1.5; }
@media (max-width: 540px) { .schedule-section { padding: 1rem .65rem; border-radius: 1.1rem; } }
</style>
