import { shallowRef, watch } from 'vue'

const STORAGE_KEY = 'campus-pulse-appearance'

export const appearanceThemes = [
  {
    id: 'minimal',
    label: 'Мінімал',
    description: 'Світла, спокійна та контрастна',
    colors: ['#f4f6fb', '#ffffff', '#3f50e7'],
  },
  {
    id: 'graphite',
    label: 'Графіт',
    description: 'Темна тема без неонового сяйва',
    colors: ['#101318', '#1a1f27', '#6681ff'],
  },
  {
    id: 'violet',
    label: 'Неон',
    description: 'Оригінальна фіолетова тема',
    colors: ['#09080d', '#181620', '#b96cff'],
  },
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
  const theme = shallowRef(
    appearanceThemes.some((item) => item.id === saved.theme) ? saved.theme : 'minimal',
  )
  const density = shallowRef(saved.density === 'compact' ? 'compact' : 'comfortable')
  const motionEnabled = shallowRef(saved.motionEnabled !== false)

  function applyPreferences() {
    const root = document.documentElement
    root.dataset.theme = theme.value
    root.dataset.density = density.value
    root.dataset.motion = motionEnabled.value ? 'full' : 'reduced'
    root.style.colorScheme = theme.value === 'minimal' ? 'light' : 'dark'

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        theme: theme.value,
        density: density.value,
        motionEnabled: motionEnabled.value,
      }))
    } catch {
      // Налаштування лишаються активними до перезавантаження, навіть якщо сховище недоступне.
    }
  }

  function resetPreferences() {
    theme.value = 'minimal'
    density.value = 'comfortable'
    motionEnabled.value = true
  }

  watch([theme, density, motionEnabled], applyPreferences, { immediate: true })

  return {
    theme,
    density,
    motionEnabled,
    resetPreferences,
  }
}
