<script setup>
import { AcademicCapIcon, PhoneIcon } from '@heroicons/vue/24/outline'
import { curator } from '../data/contacts'
</script>

<template>
  <section class="curator-card" aria-labelledby="curator-title">
    <div class="curator-glow" aria-hidden="true"></div>

    <div class="curator-icon" aria-hidden="true">
      <AcademicCapIcon class="h-6 w-6" />
    </div>

    <div class="relative z-10 min-w-0 flex-1">
      <p class="text-xs font-bold uppercase tracking-[0.1em] text-neon-bright">
        {{ curator.role }}
      </p>
      <h2 id="curator-title" class="mt-1 text-lg font-bold tracking-[-0.025em] text-ink">
        {{ curator.name }}
      </h2>
      <a class="phone-number" :href="`tel:${curator.phone}`">
        {{ curator.formattedPhone }}
      </a>
    </div>

    <a
      class="call-button"
      :href="`tel:${curator.phone}`"
      :aria-label="`Подзвонити куратору ${curator.name}`"
    >
      <PhoneIcon class="h-5 w-5" aria-hidden="true" />
      <span>Подзвонити</span>
    </a>
  </section>
</template>

<style scoped>
.curator-card {
  position: relative;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.85rem;
  overflow: hidden;
  padding: 1rem;
  border: 1px solid var(--accent-border);
  border-radius: 1.125rem;
  background: linear-gradient(125deg, var(--accent-soft), var(--surface) 68%);
  box-shadow: var(--shadow-sm);
  transition: transform 220ms ease, border-color 220ms ease, box-shadow 220ms ease;
  animation: curator-enter 520ms cubic-bezier(0.22, 1, 0.36, 1) 340ms both;
}

.curator-glow {
  position: absolute;
  top: -4rem;
  left: -3rem;
  width: 9rem;
  height: 9rem;
  border-radius: 50%;
  background: var(--accent-soft);
  filter: blur(35px);
  pointer-events: none;
}

.curator-icon {
  position: relative;
  z-index: 10;
  display: grid;
  width: 3rem;
  height: 3rem;
  flex: none;
  place-items: center;
  border: 1px solid var(--accent-border);
  border-radius: 0.95rem;
  color: var(--accent);
  background: var(--surface);
}

.phone-number {
  display: inline-block;
  min-height: 3rem;
  margin-top: 0.25rem;
  padding-block: 0.35rem;
  color: var(--text-secondary);
  font-size: 0.8125rem;
  font-variant-numeric: tabular-nums;
  font-weight: 600;
  text-decoration: none;
}

.phone-number:hover {
  color: var(--text-primary);
}

.call-button {
  flex-basis: 100%;
  position: relative;
  z-index: 10;
  display: inline-flex;
  min-width: 3rem;
  min-height: 3rem;
  flex: none;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  padding-inline: 0.8rem;
  border: 1px solid var(--accent);
  border-radius: 0.9rem;
  color: var(--on-accent);
  background: var(--accent);
  font-size: 0.75rem;
  font-weight: 700;
  text-decoration: none;
  transition: filter 180ms ease, box-shadow 180ms ease;
  overflow: hidden;
}

.call-button svg,
.call-button span {
  position: relative;
  z-index: 1;
}

.call-button:hover,
.call-button:active {
  filter: brightness(1.08);
}

.call-button:active {
  transform: scale(0.97);
}

@keyframes curator-enter {
  from { opacity: 0; translate: 0 0.7rem; scale: 0.99; }
  to { opacity: 1; translate: 0 0; scale: 1; }
}

@media (hover: hover) {
  .curator-card:hover {
    transform: translateY(-2px);
    border-color: var(--accent);
    box-shadow: var(--shadow-md);
  }
}

@media (max-width: 430px) {
  .curator-card {
    align-items: flex-start;
    flex-wrap: wrap;
  }

  .call-button {
    width: 100%;
    margin-top: 0.15rem;
  }
}
</style>
