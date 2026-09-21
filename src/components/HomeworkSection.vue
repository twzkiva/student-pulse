<script setup>
import { computed } from 'vue'
import { ArrowTopRightOnSquareIcon, ClipboardDocumentListIcon, CalendarDaysIcon } from '@heroicons/vue/24/outline'
import { presentHomework } from '../utils/homeworkPresentation.js'

const props = defineProps({
  items: { type: Array, default: () => [] },
  botUrl: { type: String, required: true },
  now: { type: Number, default: () => Date.now() },
})
const tasks = computed(() => presentHomework(props.items, props.now))
</script>

<template>
  <section id="homework" tabindex="-1" class="homework-card scroll-mt-5" aria-labelledby="homework-title">
    <div class="homework-heading">
    <div class="section-icon" aria-hidden="true">
      <ClipboardDocumentListIcon class="h-5 w-5" />
    </div>
    <div class="min-w-0 flex-1">
      <p class="eyebrow mb-2">Домашні завдання</p>
      <h2 id="homework-title" class="text-base font-bold text-ink">
        {{ items.length ? `До виконання: ${items.length}` : 'Нових завдань немає' }}
      </h2>
    </div>
    </div>
      <div v-if="tasks.length" class="task-list">
        <article v-for="item in tasks" :key="item.id" class="task-row" :class="`task-${item.urgency}`">
          <span class="task-date"><CalendarDaysIcon aria-hidden="true" />{{ item.deadlineLabel }}</span>
          <h3>{{ item.subject }}</h3>
          <p>{{ item.text }}</p>
        </article>
      </div>
      <p v-else class="mt-1 text-sm leading-5 text-muted">
        Активних завдань немає. Куратор може додати нові через бота.
      </p>
      <a :href="`${botUrl}?start=homework`" class="bot-link mt-3" target="_blank" rel="noreferrer">
        Відкрити Telegram-бота
        <ArrowTopRightOnSquareIcon class="h-4 w-4" aria-hidden="true" />
      </a>
  </section>
</template>

<style scoped>
.homework-card {
  padding: 1.25rem;
  border: 1px solid var(--border);
  border-radius: 1.25rem;
  background: var(--surface);
  box-shadow: var(--shadow-sm);
}
.homework-heading { display: flex; align-items: center; gap: .8rem; }
.task-list { display: grid; gap: .75rem; margin-top: 1.25rem; }
.section-icon {
  display: grid;
  width: 2.6rem;
  height: 2.6rem;
  flex: none;
  place-items: center;
  border: 1px solid var(--accent-border);
  border-radius: 0.85rem;
  color: var(--accent);
  background: var(--accent-soft);
}
.bot-link {
  display: inline-flex;
  min-height: 3rem;
  align-items: center;
  gap: 0.45rem;
  padding: 0.55rem 0.75rem;
  border: 1px solid var(--accent-border);
  border-radius: 0.75rem;
  color: var(--accent);
  background: var(--accent-soft);
  font-size: 0.875rem;
  font-weight: 700;
  text-decoration: none;
}
.task-row {
  padding: 1rem;
  border: 1px solid var(--border-soft);
  border-radius: .8rem;
  background: var(--surface-soft);
  font-size: .875rem;
  overflow-wrap: anywhere;
}
.task-row h3 { font-weight: 700; margin-top: .6rem; line-height: 1.45; }
.task-row p { margin-top: .4rem; color: var(--text-secondary); line-height: 1.65; white-space: pre-line; }
.task-date { display: flex; gap: .4rem; align-items: center; color: var(--accent); font-size: .8125rem; font-weight: 600; }
.task-date svg { width: 1rem; height: 1rem; flex: none; }
.task-overdue .task-date { color: var(--danger); }
.task-today { border-color: var(--accent-border); }
</style>
