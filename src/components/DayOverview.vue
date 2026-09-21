<script setup lang="ts">
import { computed } from 'vue'
import { AcademicCapIcon, ArrowUpRightIcon, ClipboardDocumentListIcon, ClockIcon } from '@heroicons/vue/24/outline'

const props = defineProps<{
  lessons: Array<{ state: string; end: string }>
  homeworkCount: number
}>()
const emit = defineEmits<{ navigate: [section: string] }>()
const completed = computed(() => props.lessons.filter(lesson => lesson.state === 'Завершено').length)
const finishTime = computed(() => props.lessons.at(-1)?.end ?? '—')
</script>

<template>
  <section class="day-overview" aria-label="Огляд навчального дня">
    <button class="overview-item" type="button" @click="emit('navigate', 'schedule')">
      <span class="overview-label"><AcademicCapIcon aria-hidden="true" /> Пари сьогодні</span>
      <span class="overview-value">{{ lessons.length }}</span>
      <span class="overview-detail">{{ completed }} завершено <ArrowUpRightIcon aria-hidden="true" /></span>
    </button>
    <div class="overview-item">
      <span class="overview-label"><ClockIcon aria-hidden="true" /> Кінець занять</span>
      <span class="overview-value">{{ finishTime }}</span>
      <span class="overview-detail">{{ lessons.length ? 'За розкладом на сьогодні' : 'Сьогодні без занять' }}</span>
    </div>
    <button class="overview-item" type="button" @click="emit('navigate', 'homework')">
      <span class="overview-label"><ClipboardDocumentListIcon aria-hidden="true" /> Завдання</span>
      <span class="overview-value">{{ homeworkCount }} <span>активних</span></span>
      <span class="overview-detail">{{ homeworkCount ? 'Переглянути дедлайни' : 'Усе спокійно' }} <ArrowUpRightIcon aria-hidden="true" /></span>
    </button>
  </section>
</template>

<style scoped>
.day-overview { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 1rem; margin-block: 1.5rem; }
.overview-item { min-width: 0; display: flex; flex-direction: column; gap: .7rem; padding: 1.2rem; border: 1px solid var(--border); border-radius: 1.1rem; background: var(--surface); color: var(--text-primary); text-align: left; font: inherit; }
button.overview-item:hover { border-color: var(--accent-border); background: var(--surface-tint); }
button.overview-item:active { background: var(--accent-soft); }
.overview-label, .overview-detail { display: flex; align-items: center; gap: .4rem; color: var(--text-secondary); font-size: .8125rem; }
.overview-label svg, .overview-detail svg { width: 1rem; height: 1rem; flex: none; color: var(--accent); }
.overview-value { font-size: 1.8rem; line-height: 1.1; font-weight: 750; letter-spacing: -.04em; font-variant-numeric: tabular-nums; }
.overview-value span { font-size: .8125rem; font-weight: 500; letter-spacing: 0; color: var(--text-secondary); }
.overview-detail { justify-content: space-between; font-size: .75rem; }
@media (max-width: 540px) {
  .day-overview { gap: .5rem; margin-block: 1rem; }
  .overview-item { padding: .8rem .65rem; gap: .6rem; }
  .overview-label { font-size: .75rem; flex-wrap: wrap; }
  .overview-value { font-size: 1.5rem; }
  .overview-value span { display: block; margin-top: .3rem; font-size: .75rem; }
  .overview-detail { display: none; }
}
</style>
