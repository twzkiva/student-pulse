<script setup>
defineProps({
  modelValue: { type: String, required: true },
  automaticType: { type: String, required: true },
})

defineEmits(['update:modelValue'])
</script>

<template>
  <div class="week-switch" aria-label="Оберіть тип навчального тижня">
    <button
      v-for="option in [{ key: 'odd', label: 'Непарний' }, { key: 'even', label: 'Парний' }]"
      :key="option.key"
      class="week-option"
      :class="{ active: modelValue === option.key }"
      type="button"
      :aria-pressed="modelValue === option.key"
      @click="$emit('update:modelValue', option.key)"
    >
      {{ option.label }}
      <span v-if="automaticType === option.key" class="auto-dot" title="Поточний тиждень"></span>
    </button>
  </div>
</template>

<style scoped>
.week-switch {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.3rem;
  margin-bottom: 0.65rem;
  padding: 0.28rem;
  border: 1px solid var(--border);
  border-radius: 0.95rem;
  background: var(--surface-soft);
}
.week-option {
  display: inline-flex;
  min-height: 3rem;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  border: 0;
  border-radius: 0.7rem;
  color: var(--text-secondary);
  background: transparent;
  font-family: inherit;
  font-size: 0.875rem;
  font-weight: 700;
  transition: 180ms ease;
}
.week-option.active {
  color: var(--accent);
  background: var(--surface);
  box-shadow: var(--shadow-sm), inset 0 0 0 1px var(--accent-border);
}
.auto-dot {
  width: 0.32rem;
  height: 0.32rem;
  border-radius: 50%;
  background: var(--success);
}
</style>
