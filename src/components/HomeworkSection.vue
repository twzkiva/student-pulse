<script setup>
import { ArrowTopRightOnSquareIcon, ClipboardDocumentListIcon } from '@heroicons/vue/24/outline'

defineProps({
  items: { type: Array, default: () => [] },
  botUrl: { type: String, required: true },
})
</script>

<template>
  <section id="homework" class="homework-card scroll-mt-5" aria-labelledby="homework-title">
    <div class="section-icon" aria-hidden="true">
      <ClipboardDocumentListIcon class="h-5 w-5" />
    </div>
    <div class="min-w-0 flex-1">
      <p class="eyebrow mb-2">Домашні завдання</p>
      <h2 id="homework-title" class="text-base font-bold text-white">
        {{ items.length ? `Активних завдань: ${items.length}` : 'Поки що порожньо' }}
      </h2>
      <div v-if="items.length" class="mt-3 grid gap-2">
        <article v-for="item in items" :key="item.id" class="task-row">
          <span class="task-date">{{ item.dueLabel }}</span>
          <strong>{{ item.subject }}</strong>
          <p>{{ item.text }}</p>
        </article>
      </div>
      <p v-else class="mt-1 text-sm leading-5 text-muted">
        Першого завдання ще немає. Коли воно з’явиться, додай його через бота.
      </p>
      <a :href="`${botUrl}?start=homework`" class="bot-link mt-3" target="_blank" rel="noreferrer">
        Додати через Telegram
        <ArrowTopRightOnSquareIcon class="h-4 w-4" aria-hidden="true" />
      </a>
    </div>
  </section>
</template>

<style scoped>
.homework-card {
  display: flex;
  gap: 0.9rem;
  padding: 1rem;
  border: 1px solid rgba(185, 108, 255, 0.18);
  border-radius: 1.25rem;
  background: linear-gradient(145deg, rgba(26, 22, 34, 0.92), rgba(13, 12, 18, 0.96));
  box-shadow: inset 0 1px rgba(255, 255, 255, 0.045);
}
.section-icon {
  display: grid;
  width: 2.6rem;
  height: 2.6rem;
  flex: none;
  place-items: center;
  border: 1px solid rgba(185, 108, 255, 0.24);
  border-radius: 0.85rem;
  color: #d6a5ff;
  background: rgba(185, 108, 255, 0.09);
}
.bot-link {
  display: inline-flex;
  min-height: 2.35rem;
  align-items: center;
  gap: 0.45rem;
  padding: 0.55rem 0.75rem;
  border: 1px solid rgba(185, 108, 255, 0.28);
  border-radius: 0.75rem;
  color: #e4c8ff;
  background: rgba(185, 108, 255, 0.1);
  font-size: 0.72rem;
  font-weight: 700;
  text-decoration: none;
}
.task-row {
  padding: 0.75rem;
  border: 1px solid rgba(255,255,255,.07);
  border-radius: .8rem;
  background: rgba(255,255,255,.025);
  font-size: .75rem;
}
.task-row p { margin-top: .25rem; color: #aaa4b8; }
.task-date { float: right; color: #d6a5ff; font-size: .65rem; }
</style>
