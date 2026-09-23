<script setup>
import {
  AcademicCapIcon,
  CalendarDaysIcon,
  ClipboardDocumentListIcon,
  HomeIcon,
} from '@heroicons/vue/24/outline'

defineProps({
  activeItem: {
    type: String,
    default: 'home',
  },
})

defineEmits(['select'])

const items = [
  { id: 'home', label: 'Головна', icon: HomeIcon },
  { id: 'schedule', label: 'Розклад', icon: CalendarDaysIcon },
  { id: 'homework', label: 'Завдання', icon: ClipboardDocumentListIcon },
  { id: 'teachers', label: 'Вчителі', icon: AcademicCapIcon },
]
</script>

<template>
  <nav class="bottom-navigation" aria-label="Головна навігація">
    <div class="nav-shell">
      <button
        v-for="item in items"
        :key="item.id"
        class="nav-item"
        :class="{ active: activeItem === item.id }"
        type="button"
        :aria-current="activeItem === item.id ? 'location' : undefined"
        @click="$emit('select', item)"
      >
        <span class="icon-shell">
          <component :is="item.icon" class="h-5 w-5" aria-hidden="true" />
        </span>
        <span>{{ item.label }}</span>
      </button>
    </div>
  </nav>
</template>

<style scoped>
.bottom-navigation {
  position: fixed;
  z-index: 50;
  right: 0;
  bottom: 0;
  left: 0;
  padding: 0.5rem 0.75rem calc(0.5rem + env(safe-area-inset-bottom));
  pointer-events: none;
}

.nav-shell {
  display: grid;
  max-width: 40.5rem;
  min-height: 4.75rem;
  margin-inline: auto;
  padding: 0.35rem;
  border: 1px solid var(--border);
  border-radius: 1.4rem;
  background: var(--navigation);
  box-shadow: var(--shadow-md);
  backdrop-filter: blur(22px) saturate(140%);
  grid-template-columns: repeat(4, minmax(0, 1fr));
  pointer-events: auto;
  animation: navigation-enter 560ms cubic-bezier(0.22, 1, 0.36, 1) 220ms both;
}

.nav-item {
  position: relative;
  display: flex;
  min-width: 0;
  min-height: 4rem;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 0.2rem;
  padding: 0.3rem 0.1rem;
  border: 0;
  border-radius: 1rem;
  color: var(--text-secondary);
  background: transparent;
  font-family: inherit;
  font-size: 0.75rem;
  font-weight: 600;
  transition: color 180ms ease, background-color 180ms ease, transform 160ms ease;
}

.nav-item:hover {
  color: var(--text-primary);
  background: var(--surface-hover);
}

.nav-item.active {
  color: var(--accent);
  background: var(--accent-soft);
}

.nav-item.active::before {
  position: absolute;
  top: 0;
  left: 50%;
  width: 1.5rem;
  height: 2px;
  border-radius: 999px;
  background: var(--accent);
  content: '';
  transform: translateX(-50%);
}

.icon-shell {
  display: grid;
  width: 2rem;
  height: 2rem;
  place-items: center;
  border-radius: 0.7rem;
}

.active .icon-shell {
  animation: nav-pop 360ms cubic-bezier(0.22, 1, 0.36, 1);
}

.nav-item:active {
  transform: scale(0.94);
}

@keyframes navigation-enter {
  from { opacity: 0; translate: 0 1.25rem; scale: 0.98; }
  to { opacity: 1; translate: 0 0; scale: 1; }
}

@keyframes nav-pop {
  0% { scale: 0.82; }
  65% { scale: 1.12; }
  100% { scale: 1; }
}

@media (min-width: 480px) {
  .nav-item { font-size: 0.8125rem; }
}
</style>
