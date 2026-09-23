<script setup>
import { nextTick, onBeforeUnmount, onMounted, useTemplateRef, shallowRef, computed } from 'vue'
import {
  XMarkIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  CheckIcon
} from '@heroicons/vue/24/outline'
import { accentColors, colorModes } from '../composables/useAppearancePreferences'
import { useLayoutPreferences } from '../composables/useLayoutPreferences'
import { handleRadioKeydown } from '../utils/radioKeyboard'

const props = defineProps({
  colorMode: { type: String, required: true },
  accentColor: { type: String, required: true },
  density: { type: String, required: true },
  motionEnabled: { type: Boolean, required: true },
  appVersion: { type: String, required: true },
  updateStatus: { type: String, required: true },
})

const emit = defineEmits([
  'close',
  'reset',
  'update:color-mode',
  'update:accent-color',
  'update:density',
  'update:motion-enabled',
])

const { blocks, moveUp, moveDown, toggleVisibility, resetLayout } = useLayoutPreferences()

const activeTab = shallowRef('appearance') // 'appearance' or 'blocks'

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
    last.focus()
    event.preventDefault()
  } else if (!event.shiftKey && document.activeElement === last) {
    first.focus()
    event.preventDefault()
  }
}

onMounted(() => {
  previouslyFocused = document.activeElement
  previousOverflow = document.body.style.overflow
  document.body.style.overflow = 'hidden'
  nextTick(() => { closeButton.value?.focus() })
})

onBeforeUnmount(() => {
  document.body.style.overflow = previousOverflow
  previouslyFocused?.focus?.()
})

function onReset() {
  emit('reset')
  resetLayout()
}

function toggleMotion(e) {
  emit('update:motion-enabled', e.target.checked)
}
</script>

<template>
  <div class="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="settings-title" @keydown="handleKeydown" @click.self="closeSettings">
    <div ref="panel" class="settings-panel relative w-[92vw] max-w-md max-h-[85vh] flex flex-col">
      <!-- HEADER -->
      <header class="flex-none pt-4 pb-2 px-5">
        <div class="flex items-center justify-between mb-4">
          <h2 id="settings-title" class="text-xl font-bold text-ink tracking-tight">Налаштування</h2>
          <button ref="closeButton" type="button" class="close-btn" aria-label="Закрити" @click="closeSettings">
            <XMarkIcon class="h-6 w-6" aria-hidden="true" />
          </button>
        </div>
        
        <!-- Apple-like Segmented Control -->
        <div class="segmented-control">
          <div class="segmented-indicator" :class="activeTab === 'blocks' ? 'translate-x-full' : 'translate-x-0'"></div>
          <button type="button" class="segmented-btn" :class="{ 'text-ink font-semibold': activeTab === 'appearance', 'text-muted': activeTab !== 'appearance' }" @click="activeTab = 'appearance'">
            Вигляд
          </button>
          <button type="button" class="segmented-btn" :class="{ 'text-ink font-semibold': activeTab === 'blocks', 'text-muted': activeTab !== 'blocks' }" @click="activeTab = 'blocks'">
            Блоки
          </button>
        </div>
      </header>

      <!-- SCROLLABLE CONTENT -->
      <div class="flex-1 overflow-y-auto px-5 pb-6 pt-2">
        <!-- APPEARANCE TAB -->
        <div v-show="activeTab === 'appearance'" class="space-y-6">
          
          <section>
            <h3 class="section-title">РЕЖИМ</h3>
            <div class="apple-card flex">
              <label v-for="(mode, index) in colorModes" :key="mode.id" class="flex-1 relative border-r border-border-soft last:border-0 cursor-pointer">
                <input type="radio" name="colorMode" class="sr-only" :value="mode.id" :checked="colorMode === mode.id" @change="$emit('update:color-mode', mode.id)" />
                <div class="py-3 text-center transition-colors" :class="colorMode === mode.id ? 'bg-accent/10 text-accent font-semibold' : 'text-muted hover:bg-surface-hover hover:text-ink'">
                  {{ mode.name }}
                </div>
              </label>
            </div>
          </section>

          <section>
            <h3 class="section-title">КОЛІР</h3>
            <div class="apple-card p-4">
              <div class="flex flex-wrap gap-4 justify-center" role="radiogroup">
                <label v-for="accent in accentColors" :key="accent.id" class="cursor-pointer relative flex h-[2.75rem] w-[2.75rem] items-center justify-center rounded-full transition-all duration-300" 
                  :class="accentColor === accent.id ? 'scale-110 shadow-md ring-2 ring-offset-2 ring-offset-surface' : 'hover:scale-105 hover:shadow-sm opacity-90'" 
                  :style="{ backgroundColor: accent.color, '--tw-ring-color': accent.color }" :title="accent.name">
                  <input type="radio" name="accentColor" class="sr-only" :value="accent.id" :checked="accentColor === accent.id" @change="$emit('update:accent-color', accent.id)" />
                  <div v-if="accentColor === accent.id" class="absolute inset-0 rounded-full animate-ping opacity-20" :style="{ backgroundColor: accent.color }"></div>
                  <CheckIcon v-if="accentColor === accent.id" class="h-5 w-5 text-white relative z-10" aria-hidden="true" />
                </label>
              </div>
            </div>
          </section>

          <section>
            <h3 class="section-title">ЩІЛЬНІСТЬ</h3>
            <div class="apple-card flex">
              <label class="flex-1 relative border-r border-border-soft cursor-pointer">
                <input type="radio" name="density" class="sr-only" value="comfortable" :checked="density === 'comfortable'" @change="$emit('update:density', 'comfortable')" />
                <div class="py-3 text-center transition-colors" :class="density === 'comfortable' ? 'bg-accent/10 text-accent font-semibold' : 'text-muted hover:bg-surface-hover hover:text-ink'">
                  Зручна
                </div>
              </label>
              <label class="flex-1 relative cursor-pointer">
                <input type="radio" name="density" class="sr-only" value="compact" :checked="density === 'compact'" @change="$emit('update:density', 'compact')" />
                <div class="py-3 text-center transition-colors" :class="density === 'compact' ? 'bg-accent/10 text-accent font-semibold' : 'text-muted hover:bg-surface-hover hover:text-ink'">
                  Компактна
                </div>
              </label>
            </div>
          </section>

          <section>
            <div class="apple-card flex items-center justify-between p-3.5 pl-4 cursor-pointer hover:bg-surface-hover transition-colors" @click="$emit('update:motion-enabled', !motionEnabled)">
              <span class="text-[0.95rem] font-medium text-ink">Анімації інтерфейсу</span>
              <div class="ios-switch" :class="{ 'active': motionEnabled }">
                <div class="ios-switch-knob"></div>
              </div>
            </div>
          </section>
        </div>

        <!-- BLOCKS TAB -->
        <div v-show="activeTab === 'blocks'" class="space-y-4">
          <p class="text-[0.85rem] text-muted text-center px-2">Виберіть, які елементи відображати на головній сторінці, та налаштуйте їх порядок.</p>
          
          <div class="apple-card flex flex-col">
            <div v-for="(block, index) in blocks" :key="block.id" class="flex items-center justify-between p-3 pl-4 border-b border-border-soft last:border-0 transition-opacity" :class="{ 'opacity-60': !block.visible, 'bg-surface-hover': block.visible }">
              <div class="flex items-center gap-4 flex-1 cursor-pointer" @click="toggleVisibility(index)">
                <div class="ios-switch" :class="{ 'active': block.visible }">
                  <div class="ios-switch-knob"></div>
                </div>
                <span class="font-medium text-[0.95rem] text-ink">{{ block.name }}</span>
              </div>
              <div class="flex items-center bg-surface rounded-[0.6rem] p-0.5 shadow-sm border border-border-soft ml-2">
                <button type="button" @click.stop="moveUp(index)" :disabled="index === 0" class="p-1.5 rounded-md text-muted hover:text-ink hover:bg-surface-hover disabled:opacity-30 disabled:hover:bg-transparent transition-colors">
                  <ChevronUpIcon class="h-4 w-4 stroke-[2.5]" />
                </button>
                <div class="w-[1px] h-4 bg-border-soft mx-0.5"></div>
                <button type="button" @click.stop="moveDown(index)" :disabled="index === blocks.length - 1" class="p-1.5 rounded-md text-muted hover:text-ink hover:bg-surface-hover disabled:opacity-30 disabled:hover:bg-transparent transition-colors">
                  <ChevronDownIcon class="h-4 w-4 stroke-[2.5]" />
                </button>
              </div>
            </div>
          </div>
        </div>

      </div>

      <!-- FOOTER -->
      <footer class="flex-none px-5 py-4 border-t border-border-soft bg-surface/50 backdrop-blur-md rounded-b-[1.75rem]">
        <div class="flex items-center justify-between">
          <button type="button" class="text-[0.8rem] font-semibold text-danger bg-danger/10 px-3 py-1.5 rounded-lg hover:bg-danger/20 transition-colors" @click="onReset">
            Скинути до заводських
          </button>
          <div class="text-right">
            <p class="text-[0.7rem] font-semibold text-muted uppercase tracking-wider">v{{ appVersion }}</p>
          </div>
        </div>
      </footer>
    </div>
  </div>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 999;
  display: grid;
  place-items: center;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  animation: fade-in 250ms ease-out both;
}

.settings-panel {
  background: var(--surface);
  border: 1px solid var(--border-soft);
  border-radius: 1.75rem;
  box-shadow: 0 2rem 4rem rgba(0, 0, 0, 0.3), 0 0 0 1px inset rgba(255, 255, 255, 0.05);
  animation: modal-up 350ms cubic-bezier(0.22, 1, 0.36, 1) both;
}

.close-btn {
  display: grid;
  width: 2.25rem;
  height: 2.25rem;
  place-items: center;
  border-radius: 50%;
  color: var(--text-secondary);
  background: var(--surface-soft);
  transition: all 200ms ease;
}
.close-btn:hover {
  color: var(--text-primary);
  background: var(--surface-hover);
  transform: scale(1.05);
}

.segmented-control {
  position: relative;
  display: flex;
  background: var(--surface-soft);
  border-radius: 0.9rem;
  padding: 0.25rem;
  border: 1px solid var(--border-soft);
}
.segmented-btn {
  flex: 1;
  position: relative;
  z-index: 10;
  padding: 0.4rem 0;
  text-align: center;
  font-size: 0.85rem;
  font-weight: 500;
  border-radius: 0.7rem;
  transition: color 250ms ease;
}
.segmented-indicator {
  position: absolute;
  top: 0.25rem;
  bottom: 0.25rem;
  left: 0.25rem;
  width: calc(50% - 0.25rem);
  background: var(--surface);
  border-radius: 0.7rem;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
  border: 1px solid var(--border-soft);
  transition: transform 300ms cubic-bezier(0.22, 1, 0.36, 1);
}

.section-title {
  margin-bottom: 0.4rem;
  margin-left: 0.5rem;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-secondary);
  letter-spacing: 0.05em;
}

.apple-card {
  background: var(--surface-soft);
  border-radius: 1rem;
  border: 1px solid var(--border-soft);
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0,0,0,0.02);
}

.ios-switch {
  position: relative;
  width: 3.25rem;
  height: 1.75rem;
  border-radius: 1rem;
  background: var(--control-off);
  transition: background-color 300ms ease;
}
.ios-switch.active {
  background: var(--success);
}
.ios-switch-knob {
  position: absolute;
  top: 0.125rem;
  left: 0.125rem;
  width: 1.5rem;
  height: 1.5rem;
  background: #fff;
  border-radius: 50%;
  box-shadow: 0 2px 4px rgba(0,0,0,0.2);
  transition: transform 300ms cubic-bezier(0.22, 1, 0.36, 1);
}
[data-theme="dark"] .ios-switch-knob {
  background: #f6f8fc;
}
.ios-switch.active .ios-switch-knob {
  transform: translateX(1.5rem);
}

@keyframes fade-in {
  from { opacity: 0; backdrop-filter: blur(0px); -webkit-backdrop-filter: blur(0px); }
  to { opacity: 1; backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); }
}

@keyframes modal-up {
  from { opacity: 0; transform: translateY(2rem) scale(0.95); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}
</style>
