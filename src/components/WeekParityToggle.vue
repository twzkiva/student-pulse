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
  border: 1px solid rgba(255, 255, 255, 0.075);
  border-radius: 0.95rem;
  background: rgba(17, 15, 22, 0.74);
}
.week-option {
  display: inline-flex;
  min-height: 2.5rem;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  border: 0;
  border-radius: 0.7rem;
  color: #8f899a;
  background: transparent;
  font-family: inherit;
  font-size: 0.72rem;
  font-weight: 700;
  transition: 180ms ease;
}
.week-option.active {
  color: white;
  background: linear-gradient(135deg, rgba(185, 108, 255, 0.2), rgba(115, 73, 255, 0.09));
  box-shadow: inset 0 0 0 1px rgba(198, 128, 255, 0.25);
}
.auto-dot {
  width: 0.32rem;
  height: 0.32rem;
  border-radius: 50%;
  background: #52e7a8;
  box-shadow: 0 0 0.45rem rgba(82, 231, 168, 0.7);
}
</style>
