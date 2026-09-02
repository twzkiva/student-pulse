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
      <p class="text-[0.625rem] font-bold uppercase tracking-[0.14em] text-neon-bright">
        {{ curator.role }}
      </p>
      <h2 id="curator-title" class="mt-1 text-lg font-bold tracking-[-0.025em] text-white">
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
  align-items: center;
  gap: 0.85rem;
  overflow: hidden;
  padding: 1rem;
  border: 1px solid rgba(185, 108, 255, 0.34);
  border-radius: 1.125rem;
  background: linear-gradient(125deg, rgba(30, 24, 38, 0.96), rgba(14, 13, 18, 0.96));
  box-shadow:
    0 0 1.5rem rgba(185, 108, 255, 0.08),
    inset 0 1px rgba(255, 255, 255, 0.055);
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
  background: rgba(185, 108, 255, 0.17);
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
  border: 1px solid rgba(185, 108, 255, 0.28);
  border-radius: 0.95rem;
  color: #d6a5ff;
  background: rgba(185, 108, 255, 0.1);
}

.phone-number {
  display: inline-block;
  min-height: 2rem;
  margin-top: 0.25rem;
  padding-block: 0.35rem;
  color: #bdb6c8;
  font-size: 0.8125rem;
  font-variant-numeric: tabular-nums;
  font-weight: 600;
  text-decoration: none;
}

.phone-number:hover {
  color: white;
}

.call-button {
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
  border: 1px solid rgba(214, 165, 255, 0.42);
  border-radius: 0.9rem;
  color: #130b19;
  background: linear-gradient(135deg, #d8adff, #a950f4);
  box-shadow: 0 0 1.25rem rgba(185, 108, 255, 0.18);
  font-size: 0.75rem;
  font-weight: 700;
  text-decoration: none;
  transition: filter 180ms ease, box-shadow 180ms ease;
  overflow: hidden;
}

.call-button::after {
  position: absolute;
  inset: -50% -35%;
  background: linear-gradient(105deg, transparent 38%, rgba(255, 255, 255, 0.55) 49%, transparent 60%);
  content: '';
  transform: translateX(-90%) rotate(8deg);
  animation: call-shine 4.4s ease-in-out infinite;
  pointer-events: none;
}

.call-button svg,
.call-button span {
  position: relative;
  z-index: 1;
}

.call-button svg {
  animation: phone-ring 4.4s ease-in-out infinite;
}

.call-button:hover,
.call-button:active {
  filter: brightness(1.08);
  box-shadow: 0 0 1.75rem rgba(185, 108, 255, 0.3);
}

.call-button:active {
  transform: scale(0.97);
}

@keyframes curator-enter {
  from { opacity: 0; translate: 0 0.7rem; scale: 0.99; }
  to { opacity: 1; translate: 0 0; scale: 1; }
}

@keyframes call-shine {
  0%, 62% { transform: translateX(-90%) rotate(8deg); opacity: 0; }
  68% { opacity: 1; }
  84%, 100% { transform: translateX(90%) rotate(8deg); opacity: 0; }
}

@keyframes phone-ring {
  0%, 72%, 100% { transform: rotate(0); }
  76% { transform: rotate(-12deg); }
  80% { transform: rotate(10deg); }
  84% { transform: rotate(-7deg); }
  88% { transform: rotate(0); }
}

@media (hover: hover) {
  .curator-card:hover {
    transform: translateY(-2px);
    border-color: rgba(203, 140, 255, 0.5);
    box-shadow: 0 1rem 2.5rem rgba(0, 0, 0, 0.24), 0 0 2rem rgba(185, 108, 255, 0.11);
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
