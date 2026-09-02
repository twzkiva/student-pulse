<script setup>
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import {
  ClockIcon,
  MapPinIcon,
  UserIcon,
  XMarkIcon,
} from '@heroicons/vue/24/outline'

defineProps({
  lesson: {
    type: Object,
    required: true,
  },
})

const emit = defineEmits(['close'])
const modalPanel = ref(null)
const closeButton = ref(null)
let previouslyFocused
let previousOverflow

function closeModal() {
  emit('close')
}

function handleKeydown(event) {
  if (event.key === 'Escape') {
    closeModal()
    return
  }

  if (event.key !== 'Tab') return

  const focusable = [...modalPanel.value.querySelectorAll(
    'button:not([disabled]), a[href], input:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
  )]

  if (!focusable.length) return
  const first = focusable[0]
  const last = focusable[focusable.length - 1]

  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault()
    first.focus()
  }
}

onMounted(async () => {
  previouslyFocused = document.activeElement
  previousOverflow = document.body.style.overflow
  document.body.style.overflow = 'hidden'
  document.addEventListener('keydown', handleKeydown)
  await nextTick()
  closeButton.value?.focus()
})

onBeforeUnmount(() => {
  document.body.style.overflow = previousOverflow
  document.removeEventListener('keydown', handleKeydown)
  previouslyFocused?.focus?.()
})
</script>

<template>
  <Teleport to="body">
    <Transition name="modal" appear>
      <div class="modal-backdrop" @mousedown.self="closeModal">
        <section
          ref="modalPanel"
          class="modal-panel"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
          aria-describedby="modal-description"
        >
          <div class="modal-glow" aria-hidden="true"></div>

          <header class="relative z-10 flex items-start justify-between gap-4">
            <div>
              <p class="mb-2 text-[0.625rem] font-bold uppercase tracking-[0.16em] text-neon-bright">
                Деталі пари
              </p>
              <h2 id="modal-title" class="text-xl font-bold tracking-[-0.03em] text-white">
                {{ lesson.subject }}
              </h2>
              <p id="modal-description" class="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-medium text-muted">
                <span class="flex items-center gap-1.5">
                  <ClockIcon class="h-4 w-4" aria-hidden="true" />
                  {{ lesson.start }}–{{ lesson.end }}
                </span>
                <span class="flex items-center gap-1.5">
                  <MapPinIcon class="h-4 w-4" aria-hidden="true" />
                  Аудиторія {{ lesson.room }}
                </span>
              </p>
            </div>

            <button
              ref="closeButton"
              class="icon-close"
              type="button"
              aria-label="Закрити вікно"
              @click="closeModal"
            >
              <XMarkIcon class="h-5 w-5" aria-hidden="true" />
            </button>
          </header>

          <div class="relative z-10 mt-6 grid gap-3">
            <article class="info-block">
              <div class="info-icon" aria-hidden="true">
                <UserIcon class="h-5 w-5" />
              </div>
              <div>
                <p class="info-label">Викладач</p>
                <h3 class="mt-1 text-sm font-semibold text-white">{{ lesson.teacher }}</h3>
                <p class="mt-3 text-xs font-semibold text-white/60">Вимоги до здачі</p>
                <p class="mt-1 text-sm leading-6 text-[#c6c0cf]">{{ lesson.dossier }}</p>
              </div>
            </article>

            <article class="info-block">
              <div class="info-icon" aria-hidden="true">
                <MapPinIcon class="h-5 w-5" />
              </div>
              <div>
                <p class="info-label">Навігація</p>
                <h3 class="mt-1 text-sm font-semibold text-white">Як знайти аудиторію {{ lesson.room }}</h3>
                <p class="mt-2 text-sm leading-6 text-[#c6c0cf]">{{ lesson.route }}</p>
              </div>
            </article>
          </div>

          <button class="close-button relative z-10" type="button" @click="closeModal">
            Закрити
          </button>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-backdrop {
  position: fixed;
  z-index: 100;
  inset: 0;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding: 0.75rem 0.75rem max(0.75rem, env(safe-area-inset-bottom));
  background: rgba(4, 3, 7, 0.74);
  backdrop-filter: blur(12px);
}

.modal-panel {
  position: relative;
  width: 100%;
  max-width: 32rem;
  max-height: min(43rem, calc(100svh - 1.5rem));
  overflow-y: auto;
  padding: 1.25rem;
  border: 1px solid rgba(197, 124, 255, 0.7);
  border-radius: 1.5rem;
  background:
    linear-gradient(145deg, rgba(29, 24, 36, 0.99), rgba(12, 11, 16, 0.99));
  box-shadow:
    0 1.75rem 6rem rgba(0, 0, 0, 0.58),
    0 0 2.5rem rgba(185, 108, 255, 0.2),
    inset 0 1px rgba(255, 255, 255, 0.08);
}

.modal-glow {
  position: absolute;
  top: -7rem;
  left: 50%;
  width: 18rem;
  height: 11rem;
  border-radius: 50%;
  background: rgba(185, 108, 255, 0.22);
  filter: blur(52px);
  transform: translateX(-50%);
  pointer-events: none;
}

.icon-close {
  display: grid;
  width: 3rem;
  height: 3rem;
  flex: none;
  place-items: center;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 0.875rem;
  color: white;
  background: rgba(255, 255, 255, 0.055);
  transition: border-color 180ms ease, background-color 180ms ease;
}

.icon-close:hover,
.icon-close:active {
  border-color: rgba(214, 165, 255, 0.5);
  background: rgba(185, 108, 255, 0.12);
}

.info-block {
  display: grid;
  grid-template-columns: 2.5rem minmax(0, 1fr);
  gap: 0.875rem;
  padding: 1rem;
  border: 1px solid rgba(255, 255, 255, 0.075);
  border-radius: 1.125rem;
  background: rgba(255, 255, 255, 0.035);
}

.info-icon {
  display: grid;
  width: 2.5rem;
  height: 2.5rem;
  place-items: center;
  border: 1px solid rgba(185, 108, 255, 0.22);
  border-radius: 0.8rem;
  color: #d6a5ff;
  background: rgba(185, 108, 255, 0.09);
}

.info-label {
  color: #d6a5ff;
  font-size: 0.625rem;
  font-weight: 700;
  letter-spacing: 0.13em;
  text-transform: uppercase;
}

.close-button {
  display: inline-flex;
  width: 100%;
  min-height: 3.25rem;
  align-items: center;
  justify-content: center;
  margin-top: 1rem;
  border: 1px solid rgba(214, 165, 255, 0.45);
  border-radius: 1rem;
  color: #110b17;
  background: linear-gradient(135deg, #d6a5ff, #a94fff);
  box-shadow: 0 0 1.5rem rgba(185, 108, 255, 0.22);
  font-family: inherit;
  font-size: 0.875rem;
  font-weight: 700;
  transition: filter 180ms ease, box-shadow 180ms ease;
}

.close-button:hover,
.close-button:active {
  filter: brightness(1.08);
  box-shadow: 0 0 2rem rgba(185, 108, 255, 0.32);
}

.modal-enter-active,
.modal-leave-active {
  transition: opacity 180ms ease;
}

.modal-enter-active .modal-panel,
.modal-leave-active .modal-panel {
  transition: transform 280ms cubic-bezier(0.22, 1, 0.36, 1), opacity 180ms ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .modal-panel,
.modal-leave-to .modal-panel {
  opacity: 0;
  transform: translateY(1.25rem) scale(0.98);
}

@media (min-width: 640px) {
  .modal-backdrop {
    align-items: center;
    padding: 1.5rem;
  }

  .modal-panel {
    padding: 1.5rem;
  }
}
</style>
