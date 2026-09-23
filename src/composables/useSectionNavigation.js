import { onBeforeUnmount, onMounted, shallowRef, toValue } from 'vue'

const targets = { home: 'home', schedule: 'today-schedule', homework: 'homework', teachers: 'curator-contact' }

export function sectionFromHash(hash = '') {
  return Object.keys(targets).find(key => `#${targets[key]}` === hash) ?? 'home'
}

export function useSectionNavigation() {
  const activeNavigation = shallowRef(sectionFromHash(window.location.hash))

  function navigate(id, { updateHistory = true, instant = false } = {}) {
    if (!Object.hasOwn(targets, id)) return
    activeNavigation.value = id
    const hash = `#${targets[id]}`
    if (updateHistory && window.location.hash !== hash) {
      window.history.pushState(null, '', hash)
    }
  }

  function restoreLocation() {
    navigate(sectionFromHash(window.location.hash), { updateHistory: false, instant: true })
  }

  onMounted(() => {
    if (window.location.hash) restoreLocation()
    window.addEventListener('hashchange', restoreLocation)
    window.addEventListener('popstate', restoreLocation)
  })
  onBeforeUnmount(() => {
    window.removeEventListener('hashchange', restoreLocation)
    window.removeEventListener('popstate', restoreLocation)
  })
  return { activeNavigation, navigate }
}
