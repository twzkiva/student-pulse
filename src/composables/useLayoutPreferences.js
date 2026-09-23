import { shallowRef, watch } from 'vue'

const STORAGE_KEY = 'campus-pulse-layout'

export const defaultBlocks = [
  { id: 'overview', name: 'Огляд дня', visible: true },
  { id: 'schedule', name: 'Розклад пар', visible: true },
  { id: 'homework', name: 'Домашні завдання', visible: true },
  { id: 'actions', name: 'Швидкі дії', visible: true },
  { id: 'curator', name: 'Контакти куратора', visible: true },
  { id: 'bells', name: 'Розклад дзвінків', visible: true },
]

function readPreferences() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY))
    if (Array.isArray(saved) && saved.length > 0) {
      // Merge with defaults in case we add new blocks in the future
      const merged = saved.map(s => {
        const def = defaultBlocks.find(d => d.id === s.id)
        return def ? { ...def, visible: s.visible ?? true } : null
      }).filter(Boolean)
      
      // Append any missing default blocks to the end
      defaultBlocks.forEach(d => {
        if (!merged.find(m => m.id === d.id)) merged.push({ ...d })
      })
      
      return merged
    }
  } catch {
    // Ignore
  }
  return JSON.parse(JSON.stringify(defaultBlocks))
}

export function useLayoutPreferences() {
  const blocks = shallowRef(readPreferences())

  function savePreferences() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(blocks.value.map(b => ({ id: b.id, visible: b.visible }))))
    } catch {
      // Ignore
    }
  }

  function moveUp(index) {
    if (index > 0) {
      const newBlocks = [...blocks.value]
      const temp = newBlocks[index - 1]
      newBlocks[index - 1] = newBlocks[index]
      newBlocks[index] = temp
      blocks.value = newBlocks
    }
  }

  function moveDown(index) {
    if (index < blocks.value.length - 1) {
      const newBlocks = [...blocks.value]
      const temp = newBlocks[index + 1]
      newBlocks[index + 1] = newBlocks[index]
      newBlocks[index] = temp
      blocks.value = newBlocks
    }
  }

  function toggleVisibility(index) {
    const newBlocks = [...blocks.value]
    newBlocks[index] = { ...newBlocks[index], visible: !newBlocks[index].visible }
    blocks.value = newBlocks
  }

  function resetLayout() {
    blocks.value = JSON.parse(JSON.stringify(defaultBlocks))
  }

  watch(blocks, savePreferences, { deep: true })

  return {
    blocks,
    moveUp,
    moveDown,
    toggleVisibility,
    resetLayout,
  }
}
