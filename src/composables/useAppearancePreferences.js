import { shallowRef, watch } from 'vue'

const STORAGE_KEY = 'campus-pulse-appearance'

export const accentColors = [
  { id: 'indigo', name: 'Індиго', color: '#4f46e5' },
  { id: 'violet', name: 'Фіолетовий', color: '#9333ea' },
  { id: 'emerald', name: 'Смарагдовий', color: '#059669' },
  { id: 'rose', name: 'Трояндовий', color: '#e11d48' },
  { id: 'amber', name: 'Бурштиновий', color: '#d97706' },
]

export const colorModes = [
  { id: 'system', name: 'Системна' },
  { id: 'light', name: 'Світла' },
  { id: 'dark', name: 'Темна' },
]

function readPreferences() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}')
    return saved && typeof saved === 'object' && !Array.isArray(saved) ? saved : {}
  } catch {
    return {}
  }
}

export function useAppearancePreferences() {
  const saved = readPreferences()
  
  // Legacy migration
  let initialMode = saved.colorMode || 'system'
  let initialAccent = saved.accentColor || 'indigo'
  
  if (saved.theme) {
    if (saved.theme === 'minimal') { initialMode = 'light'; initialAccent = 'indigo' }
    if (saved.theme === 'graphite') { initialMode = 'dark'; initialAccent = 'indigo' }
    if (saved.theme === 'violet') { initialMode = 'dark'; initialAccent = 'violet' }
  }

  const colorMode = shallowRef(initialMode)
  const accentColor = shallowRef(initialAccent)
  const density = shallowRef(saved.density === 'compact' ? 'compact' : 'comfortable')
  const motionEnabled = shallowRef(saved.motionEnabled !== false)

  function applyPreferences() {
    const root = document.documentElement
    
    let activeTheme = colorMode.value
    if (activeTheme === 'system') {
      activeTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    }

    root.dataset.theme = activeTheme
    root.dataset.accent = accentColor.value
    root.dataset.density = density.value
    root.dataset.motion = motionEnabled.value ? 'full' : 'reduced'
    root.style.colorScheme = activeTheme

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        colorMode: colorMode.value,
        accentColor: accentColor.value,
        density: density.value,
        motionEnabled: motionEnabled.value,
      }))
    } catch {
      // Ignore
    }
  }

  function resetPreferences() {
    colorMode.value = 'system'
    accentColor.value = 'indigo'
    density.value = 'comfortable'
    motionEnabled.value = true
  }

  watch([colorMode, accentColor, density, motionEnabled], applyPreferences, { immediate: true })

  // Listen for system theme changes if set to system
  if (typeof window !== 'undefined') {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      if (colorMode.value === 'system') applyPreferences()
    })
  }

  return {
    colorMode,
    accentColor,
    density,
    motionEnabled,
    resetPreferences,
  }
}
