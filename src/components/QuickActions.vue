<script setup>
import { ChatBubbleLeftRightIcon, ExclamationTriangleIcon, PhoneIcon } from '@heroicons/vue/24/outline'

defineProps({
  botUrl: { type: String, required: true },
  phoneUrl: { type: String, required: true },
})

const actions = [
  { id: 'call', label: 'Подзвонити куратору', icon: PhoneIcon, kind: 'phone' },
  { id: 'bot', label: 'Написати боту', icon: ChatBubbleLeftRightIcon, kind: 'bot' },
  { id: 'report', label: 'Повідомити про помилку', icon: ExclamationTriangleIcon, kind: 'report' },
]
</script>

<template>
  <section class="quick-actions" aria-labelledby="quick-actions-title">
    <p id="quick-actions-title" class="eyebrow col-span-full">Швидкі дії</p>
    <a
      v-for="action in actions"
      :key="action.id"
      class="action-tile"
      :href="action.kind === 'phone' ? phoneUrl : `${botUrl}?start=${action.kind}`"
      :target="action.kind === 'phone' ? undefined : '_blank'"
      :rel="action.kind === 'phone' ? undefined : 'noreferrer'"
    >
      <component :is="action.icon" class="h-5 w-5" aria-hidden="true" />
      <span>{{ action.label }}</span>
    </a>
  </section>
</template>

<style scoped>
.quick-actions {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.55rem;
}
.action-tile {
  min-width: 0;
  overflow-wrap: anywhere;
  display: flex;
  min-height: 5.7rem;
  align-items: flex-start;
  justify-content: space-between;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0.75rem;
  border: 1px solid var(--border);
  border-radius: 1rem;
  color: var(--accent);
  background: var(--surface);
  box-shadow: var(--shadow-sm);
  font-size: .8125rem;
  font-weight: 700;
  line-height: 1.4;
  text-decoration: none;
  transition: transform 180ms ease, border-color 180ms ease, background 180ms ease;
}
.action-tile:hover {
  border-color: var(--accent-border);
  background: var(--accent-soft);
  transform: translateY(-2px);
}
.action-tile:active { transform: scale(.96); }
</style>
