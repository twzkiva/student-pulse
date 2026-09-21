<script setup>
import { nextTick, onBeforeUnmount, onMounted, useTemplateRef } from 'vue'
import {
  AdjustmentsHorizontalIcon,
  ArrowPathRoundedSquareIcon,
  CheckIcon,
  XMarkIcon,
} from '@heroicons/vue/24/outline'
import { appearanceThemes } from '../composables/useAppearancePreferences'
import { handleRadioKeydown } from '../utils/radioKeyboard'

defineProps({
  theme: { type: String, required: true },
  density: { type: String, required: true },
  motionEnabled: { type: Boolean, required: true },
  appVersion: { type: String, required: true },
  updateStatus: { type: String, required: true },
})

const emit = defineEmits([
  'close',
  'reset',
  'update:theme',
  'update:density',
  'update:motion-enabled',
])

const panel = useTemplateRef('panel')
const closeButton = useTemplateRef('closeButton')
let previouslyFocused
let previousOverflow

function closeSettings() {
  emit('close')
}

function handleKeydown(event) {
  if (event.key === 'Escape') {
    closeSettings()
    return
  }

  if (event.key !== 'Tab' || !panel.value) return

  const focusable = [...panel.value.querySelectorAll(
    'button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex="-1"])',
  )].filter((element) => element.tabIndex >= 0)
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
    <Transition name="settings" appear>
      <div class="settings-backdrop" @mousedown.self="closeSettings">
        <section
          ref="panel"
          class="settings-panel"
          role="dialog"
          aria-modal="true"
          aria-labelledby="settings-title"
        >
          <header class="settings-header">
            <div class="settings-heading">
              <span class="settings-icon" aria-hidden="true">
                <AdjustmentsHorizontalIcon class="h-5 w-5" />
              </span>
              <div>
                <p class="eyebrow">Вигляд застосунку</p>
                <h2 id="settings-title">Налаштування</h2>
              </div>
            </div>
            <button
              ref="closeButton"
              class="settings-close"
              type="button"
              aria-label="Закрити налаштування"
              @click="closeSettings"
            >
              <XMarkIcon class="h-5 w-5" aria-hidden="true" />
            </button>
          </header>

          <div class="settings-content">
            <fieldset class="settings-group">
              <legend>Тема</legend>
              <p class="group-help">Колір можна змінити будь-коли.</p>
              <div class="theme-options" role="radiogroup" aria-label="Тема оформлення" @keydown="handleRadioKeydown">
                <button
                  v-for="item in appearanceThemes"
                  :key="item.id"
                  class="theme-option"
                  :class="{ selected: theme === item.id }"
                  type="button"
                  role="radio"
                  :aria-checked="theme === item.id"
                  :tabindex="theme === item.id ? 0 : -1"
                  @click="emit('update:theme', item.id)"
                >
                  <span class="theme-swatches" aria-hidden="true">
                    <span
                      v-for="color in item.colors"
                      :key="color"
                      :style="{ backgroundColor: color }"
                    ></span>
                  </span>
                  <span class="theme-copy">
                    <strong>{{ item.label }}</strong>
                    <small>{{ item.description }}</small>
                  </span>
                  <span class="selection-mark" aria-hidden="true">
                    <CheckIcon v-if="theme === item.id" class="h-4 w-4" />
                  </span>
                </button>
              </div>
            </fieldset>

            <fieldset class="settings-group">
              <legend>Щільність</legend>
              <div class="segmented-control" role="radiogroup" aria-label="Щільність інтерфейсу" @keydown="handleRadioKeydown">
                <button
                  v-for="option in [{ id: 'comfortable', label: 'Зручна' }, { id: 'compact', label: 'Компактна' }]"
                  :key="option.id"
                  type="button"
                  role="radio"
                  :aria-checked="density === option.id"
                  :tabindex="density === option.id ? 0 : -1"
                  :class="{ selected: density === option.id }"
                  @click="emit('update:density', option.id)"
                >
                  {{ option.label }}
                </button>
              </div>
            </fieldset>

            <div class="setting-row">
              <div>
                <strong>Плавні анімації</strong>
                <p>Легкі переходи без зайвого сяйва</p>
              </div>
              <button
                class="switch-control"
                :class="{ active: motionEnabled }"
                type="button"
                role="switch"
                :aria-checked="motionEnabled"
                :aria-label="motionEnabled ? 'Вимкнути анімації' : 'Увімкнути анімації'"
                @click="emit('update:motion-enabled', !motionEnabled)"
              >
                <span></span>
              </button>
            </div>

            <div class="setting-row update-row">
              <span class="update-icon" aria-hidden="true">
                <ArrowPathRoundedSquareIcon class="h-5 w-5" />
              </span>
              <div>
                <strong>Оновлення застосунку</strong>
                <p>Версія {{ appVersion }} · {{ updateStatus }}</p>
              </div>
            </div>
          </div>

          <footer class="settings-footer">
            <button class="reset-button" type="button" @click="emit('reset')">
              Відновити стандартні
            </button>
            <button class="done-button" type="button" @click="closeSettings">
              Готово
            </button>
          </footer>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.settings-backdrop {
  position: fixed;
  z-index: 110;
  inset: 0;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding: 0.75rem 0.75rem max(0.75rem, env(safe-area-inset-bottom));
  background: var(--overlay);
  backdrop-filter: blur(10px);
}

.settings-panel {
  width: min(100%, 33rem);
  max-height: calc(100svh - 1.5rem);
  overflow-y: auto;
  border: 1px solid var(--border);
  border-radius: 1.5rem;
  color: var(--text-primary);
  background: var(--surface-raised);
  box-shadow: var(--shadow-modal);
}

.settings-header,
.settings-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 1rem;
}

.settings-header { border-bottom: 1px solid var(--border); }
.settings-footer { border-top: 1px solid var(--border); }
.settings-heading { display: flex; align-items: center; gap: 0.75rem; }
.settings-heading h2 { margin: 0.25rem 0 0; font-size: 1.25rem; letter-spacing: -0.03em; }
.settings-icon,
.settings-close {
  display: grid;
  width: 3rem;
  height: 3rem;
  flex: none;
  place-items: center;
  border: 1px solid var(--border);
  border-radius: 0.9rem;
  color: var(--accent);
  background: var(--surface-soft);
}
.settings-close { color: var(--text-primary); transition: background 160ms ease; }
.settings-close:hover { background: var(--surface-hover); }

.settings-content { display: grid; gap: 1.25rem; padding: 1rem; }
.settings-group { min-width: 0; margin: 0; padding: 0; border: 0; }
.settings-group legend,
.setting-row strong { font-size: 0.875rem; font-weight: 700; }
.group-help,
.setting-row p { margin: 0.25rem 0 0; color: var(--text-secondary); font-size: 0.75rem; }
.theme-options { display: grid; gap: 0.5rem; margin-top: 0.75rem; }
.theme-option {
  display: grid;
  min-height: 4.65rem;
  align-items: center;
  gap: 0.75rem;
  padding: 0.65rem;
  border: 1px solid var(--border);
  border-radius: 1rem;
  color: var(--text-primary);
  background: var(--surface);
  text-align: left;
  grid-template-columns: 4rem minmax(0, 1fr) 1.5rem;
  transition: border-color 160ms ease, background-color 160ms ease;
}
.theme-option:hover { background: var(--surface-hover); }
.theme-option.selected { border-color: var(--accent); background: var(--accent-soft); }
.theme-swatches { display: flex; height: 2.65rem; overflow: hidden; border: 1px solid var(--border); border-radius: 0.75rem; }
.theme-swatches span { flex: 1; }
.theme-copy { display: grid; gap: 0.2rem; min-width: 0; }
.theme-copy strong { font-size: 0.875rem; }
.theme-copy small { color: var(--text-secondary); font-size: 0.6875rem; line-height: 1.35; }
.selection-mark { display: grid; width: 1.35rem; height: 1.35rem; place-items: center; border: 1px solid var(--border); border-radius: 50%; color: var(--on-accent); }
.selected .selection-mark { border-color: var(--accent); background: var(--accent); }

.segmented-control { display: grid; gap: 0.25rem; margin-top: 0.65rem; padding: 0.25rem; border: 1px solid var(--border); border-radius: 0.9rem; background: var(--surface-soft); grid-template-columns: 1fr 1fr; }
.segmented-control button { min-height: 2.75rem; border: 0; border-radius: 0.7rem; color: var(--text-secondary); background: transparent; font: inherit; font-size: 0.75rem; font-weight: 700; }
.segmented-control button.selected { color: var(--text-primary); background: var(--surface); box-shadow: var(--shadow-sm); }

.setting-row { display: flex; min-height: 4.25rem; align-items: center; justify-content: space-between; gap: 1rem; padding: 0.8rem; border: 1px solid var(--border); border-radius: 1rem; background: var(--surface); }
.update-row { justify-content: flex-start; }
.update-icon { display: grid; width: 2.5rem; height: 2.5rem; flex: none; place-items: center; border: 1px solid var(--accent-border); border-radius: 0.8rem; color: var(--accent); background: var(--accent-soft); }
.switch-control { position: relative; width: 3.25rem; height: 2rem; flex: none; border: 0; border-radius: 999px; background: var(--control-off); transition: background-color 180ms ease; }
.switch-control span { position: absolute; top: 0.25rem; left: 0.25rem; width: 1.5rem; height: 1.5rem; border-radius: 50%; background: white; box-shadow: 0 2px 8px rgba(15, 23, 42, 0.2); transition: transform 180ms ease; }
.switch-control.active { background: var(--accent); }
.switch-control.active span { transform: translateX(1.25rem); }

.reset-button,
.done-button { min-height: 3rem; padding: 0.65rem 0.9rem; border-radius: 0.85rem; font: inherit; font-size: 0.75rem; font-weight: 700; }
.reset-button { border: 1px solid var(--border); color: var(--text-secondary); background: var(--surface); }
.done-button { min-width: 7rem; border: 1px solid var(--accent); color: var(--on-accent); background: var(--accent); }

.settings-enter-active,
.settings-leave-active { transition: opacity 180ms ease; }
.settings-enter-active .settings-panel,
.settings-leave-active .settings-panel { transition: transform 260ms var(--ease-out), opacity 180ms ease; }
.settings-enter-from,
.settings-leave-to { opacity: 0; }
.settings-enter-from .settings-panel,
.settings-leave-to .settings-panel { opacity: 0; transform: translateY(1rem); }

@media (min-width: 640px) {
  .settings-backdrop { align-items: center; padding: 1.5rem; }
}
</style>
