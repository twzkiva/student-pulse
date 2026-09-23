<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { XMarkIcon, DocumentDuplicateIcon, CheckIcon } from '@heroicons/vue/24/outline'

const isVisible = ref(false)
const copied = ref(false)
const cardNumber = '4874070021944010'

const emit = defineEmits(['close'])

onMounted(() => {
  document.body.style.overflow = 'hidden'
  isVisible.value = true
})

onBeforeUnmount(() => {
  document.body.style.overflow = ''
})

function closeModal() {
  isVisible.value = false
  setTimeout(() => emit('close'), 300)
}

function copyCard() {
  navigator.clipboard.writeText(cardNumber).then(() => {
    copied.value = true
    setTimeout(() => {
      copied.value = false
    }, 2000)
  })
}
</script>

<template>
  <Teleport to="body">
    <Transition name="modal" appear>
      <div v-if="isVisible" class="modal-backdrop" @mousedown.self="closeModal">
        <section
          class="modal-panel"
          role="dialog"
          aria-modal="true"
          aria-labelledby="welcome-title"
        >
          <button class="icon-close absolute top-4 right-4 z-20" type="button" @click="closeModal">
            <XMarkIcon class="h-6 w-6" />
          </button>

          <div class="text-center pt-3 pb-1 relative z-10">
            <div class="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-accent/10 text-accent">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-8 h-8">
                <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
              </svg>
            </div>
            
            <h2 id="welcome-title" class="text-xl font-bold text-ink mb-2">
              Вітаємо в Кампус Пульс! 🎉
            </h2>
            
            <p class="text-sm text-muted mb-6 leading-relaxed">
              Цей сайт створений для зручного розкладу та відстеження завдань. Сподіваюсь, він стане вам у пригоді!
            </p>

            <div class="rounded-xl p-4 border border-white/10 bg-white/5 text-left mb-6 relative overflow-hidden">
              <div class="absolute inset-0 bg-accent/5" aria-hidden="true"></div>
              <p class="text-[0.8rem] font-bold text-ink mb-3 relative z-10">
                ☕ Підтримати автора на каву:
              </p>
              
              <button
                type="button"
                @click="copyCard"
                class="w-full flex items-center justify-between p-3 rounded-lg bg-black/20 border border-white/5 hover:border-accent/50 hover:bg-black/40 transition-colors group relative z-10"
              >
                <div class="relative flex flex-col items-start gap-1">
                  <span class="text-[0.65rem] font-bold uppercase tracking-[0.15em] text-muted group-hover:text-white/70 transition-colors">Номер картки</span>
                  <span class="text-[0.85rem] sm:text-[0.95rem] font-bold font-mono text-ink tracking-widest whitespace-nowrap">
                    4874 0700 2194 4010
                  </span>
                </div>
                <div class="relative flex h-9 w-9 items-center justify-center rounded-md bg-white/5 text-muted group-hover:text-accent group-hover:bg-accent/15 transition-all">
                  <Transition name="fade" mode="out-in">
                    <CheckIcon v-if="copied" class="h-5 w-5 text-green-500" />
                    <DocumentDuplicateIcon v-else class="h-5 w-5" />
                  </Transition>
                </div>
              </button>
            </div>

            <button
              type="button"
              @click="closeModal"
              class="w-full rounded-xl bg-accent px-4 py-3.5 text-sm font-bold text-white shadow-lg shadow-accent/25 transition-transform active:scale-[0.98]"
            >
              Зрозуміло, дякую!
            </button>
          </div>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-backdrop {
  position: fixed;
  z-index: 150;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
  background: var(--overlay, rgba(10, 10, 15, 0.75));
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}

.modal-panel {
  position: relative;
  width: 100%;
  max-width: 24rem;
  background: var(--surface, #1e1e24);
  border: 1px solid var(--border, rgba(255,255,255,0.1));
  border-radius: 1.5rem;
  padding: 1.5rem;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
}

.icon-close {
  display: grid;
  height: 2.25rem;
  width: 2.25rem;
  place-items: center;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.05);
  color: var(--text-muted, rgba(255,255,255,0.5));
  transition: all 0.2s ease;
}

.icon-close:hover {
  background: rgba(255, 255, 255, 0.1);
  color: var(--text, white);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: scale(0.8);
}

.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.3s ease;
}
.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}
.modal-enter-active .modal-panel {
  animation: modal-pop 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}
.modal-leave-active .modal-panel {
  transition: transform 0.3s ease;
  transform: scale(0.95);
}
@keyframes modal-pop {
  0% { opacity: 0; transform: scale(0.9) translateY(1rem); }
  100% { opacity: 1; transform: scale(1) translateY(0); }
}
</style>
