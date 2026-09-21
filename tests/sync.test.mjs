import test from 'node:test'
import assert from 'node:assert/strict'
import { createRenderer, effectScope, nextTick } from 'vue'
import { useCampusData } from '../src/composables/useCampusData.js'
import { useAppearancePreferences } from '../src/composables/useAppearancePreferences.js'
import { useSectionNavigation } from '../src/composables/useSectionNavigation.js'

const renderer = createRenderer({
  createComment: () => ({}), insert() {}, remove() {}, parentNode() {}, nextSibling() {},
})

function setup(t, fetcher) {
  const old = Object.fromEntries(['window', 'document', 'fetch', 'localStorage'].map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)]))
  const window = new EventTarget(), document = new EventTarget()
  const timers = new Map()
  document.hidden = false
  window.setInterval = (callback, delay) => { timers.set(callback, delay); return callback }
  window.clearInterval = (id) => timers.delete(id)
  for (const [key, value] of Object.entries({ window, document, fetch: fetcher, localStorage: undefined })) {
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value })
  }
  let state
  const app = renderer.createApp({ setup() { state = useCampusData({ baseUrl: 'https://campus.test' }); return () => null } })
  let mounted = true
  app.mount({})
  const unmount = () => { if (mounted) { app.unmount(); mounted = false } }
  t.after(() => {
    unmount()
    for (const [key, descriptor] of Object.entries(old)) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor)
      else delete globalThis[key]
    }
  })
  return { state, window, document, timers, unmount }
}

test('sync refreshes on resume, online and a visible minute; unmount removes listeners and timers', async (t) => {
  let calls = 0, subject = 'Before'
  const { state, window, document, timers, unmount } = setup(t, async (url) => {
    calls++
    return Response.json(url.endsWith('homework') ? [{ id: 1, subject, text: 'Task' }] : [])
  })
  await state.synchronize()
  assert.equal(calls, 3)
  assert.equal(state.homework.value[0].subject, 'Before')
  document.hidden = true
  document.dispatchEvent(new Event('visibilitychange'))
  for (const [callback, delay] of timers) { assert.equal(delay, 60000); callback() }
  assert.equal(calls, 3)
  subject = 'After'
  document.hidden = false
  document.dispatchEvent(new Event('visibilitychange'))
  await state.synchronize()
  assert.equal(calls, 6)
  assert.equal(state.homework.value[0].subject, 'After')
  window.dispatchEvent(new Event('online'))
  await state.synchronize()
  assert.equal(calls, 9)
  for (const callback of timers.keys()) callback()
  await state.synchronize()
  assert.equal(calls, 12)
  assert.equal(state.syncState.value, 'synced')
  unmount()
  assert.equal(timers.size, 0)
  window.dispatchEvent(new Event('online'))
  document.dispatchEvent(new Event('visibilitychange'))
  await state.synchronize()
  assert.equal(calls, 12)
})

test('concurrent refreshes share requests and unmount aborts pending work', async (t) => {
  let requests = 0, aborts = 0
  const { state, unmount } = setup(t, (_url, { signal }) => new Promise((_resolve, reject) => {
    requests++
    signal.addEventListener('abort', () => { aborts++; reject(new Error('aborted')) }, { once: true })
  }))
  const first = state.synchronize(), second = state.synchronize()
  assert.equal(first, second)
  assert.equal(requests, 3)
  unmount()
  await first
  assert.equal(aborts, 3)
  assert.equal(state.syncState.value, 'syncing')
  assert.equal(state.isRefreshing.value, false)
})

test('offline refresh makes no requests and reconnect restores data and freshness', async (t) => {
  let calls = 0
  const { state, window, unmount } = setup(t, async () => { calls++; return Response.json([]) })
  assert.equal(state.isRefreshing.value, true)
  await state.synchronize()
  assert.equal(state.isRefreshing.value, false)
  assert.equal(state.canRefresh, true)
  assert.ok(state.updatedAt.value > 0)
  window.dispatchEvent(new Event('offline'))
  await state.synchronize()
  assert.equal(calls, 3)
  assert.equal(state.syncState.value, 'offline')
  window.dispatchEvent(new Event('online'))
  await state.synchronize()
  assert.equal(calls, 6)
  assert.equal(state.syncState.value, 'synced')
  unmount()
  window.dispatchEvent(new Event('offline'))
  assert.equal(state.syncState.value, 'synced')
})

test('failed refresh keeps saved data and clears loading state for a retry', async (t) => {
  let fail = false
  const { state } = setup(t, async (url) => {
    if (fail) throw new Error('offline')
    return Response.json(url.endsWith('homework') ? [{ id: 1, subject: 'Math', text: 'Task' }] : [])
  })
  await state.synchronize()
  const updatedAt = state.updatedAt.value
  fail = true
  await state.synchronize()
  assert.equal(state.syncState.value, 'cached')
  assert.equal(state.isRefreshing.value, false)
  assert.equal(state.homework.value[0].subject, 'Math')
  assert.equal(state.updatedAt.value, updatedAt)
  fail = false
  await state.synchronize()
  assert.equal(state.syncState.value, 'synced')
})

test('section navigation restores deep links, focuses destinations, respects reduced motion and cleans up', async (t) => {
  const { state, window, document } = setup(t, async () => Response.json([]))
  await state.synchronize()
  const visits = [], pushes = [], focuses = []
  window.location = { hash: '#homework' }
  window.history = { pushState(_state, _title, hash) { pushes.push(hash); window.location.hash = hash } }
  window.matchMedia = () => ({ matches: true })
  window.scrollTo = options => visits.push(['home', options.behavior])
  document.getElementById = id => ({ focus: () => focuses.push(id), scrollIntoView: options => visits.push([id, options.behavior]) })
  let navigation
  const app = renderer.createApp({ setup() { navigation = useSectionNavigation(true); return () => null } })
  app.mount({})
  let mounted = true
  t.after(() => { if (mounted) app.unmount() })
  assert.equal(navigation.activeNavigation.value, 'homework')
  assert.deepEqual(visits, [['homework', 'instant']])
  navigation.navigate('schedule')
  assert.equal(navigation.activeNavigation.value, 'schedule')
  assert.deepEqual(pushes, ['#today-schedule'])
  assert.deepEqual(visits.at(-1), ['today-schedule', 'instant'])
  assert.equal(focuses.at(-1), 'today-schedule')
  window.location.hash = '#homework'
  window.dispatchEvent(new Event('popstate'))
  assert.equal(navigation.activeNavigation.value, 'homework')
  navigation.navigate('__proto__')
  assert.equal(pushes.length, 1)
  app.unmount()
  mounted = false
  window.location.hash = '#home'
  window.dispatchEvent(new Event('hashchange'))
  assert.equal(navigation.activeNavigation.value, 'homework')
})

test('corrupted appearance cache and unavailable storage do not crash startup', async (t) => {
  const { document } = setup(t, async () => Response.json([]))
  document.documentElement = { dataset: {}, style: {} }
  for (const saved of ['null', '[]', '{broken', '{"theme":"unknown"}']) {
    globalThis.localStorage = { getItem: () => saved, setItem() { throw new Error('storage denied') } }
    const scope = effectScope()
    try {
      const state = scope.run(useAppearancePreferences)
      assert.equal(state.theme.value, 'minimal')
      assert.equal(state.density.value, 'comfortable')
      state.theme.value = 'graphite'
      state.motionEnabled.value = false
      await nextTick()
      assert.equal(document.documentElement.dataset.theme, 'graphite')
      assert.equal(document.documentElement.dataset.motion, 'reduced')
      state.resetPreferences()
      await nextTick()
      assert.equal(document.documentElement.style.colorScheme, 'light')
    } finally { scope.stop() }
  }
})
