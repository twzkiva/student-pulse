import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { getIsoWeek, weekTypeFor, weeklySchedules } from '../src/data/schedule.js'
import { campusDate, campusTimestamp, isCalendarDate } from '../src/utils/campusTime.js'
import { buildLessonTimeline } from '../src/utils/scheduleTimeline.js'
import { presentHomework } from '../src/utils/homeworkPresentation.js'
import { sectionFromHash } from '../src/composables/useSectionNavigation.js'
import { getApiBaseUrl, groupScheduleRows, normalizeHomework, loadCampusData, readCachedCampusData } from '../src/services/campusApi.js'

const baseUrl = 'https://campus.test'
const rows = (week) => Object.entries(weeklySchedules[week]).flatMap(([day, lessons]) => lessons.map((lesson) => ({
  ...lesson, week_type: week, day_key: day, subject: lesson.isEmpty ? null : lesson.subject,
})))
const memoryStorage = () => {
  const values = new Map()
  return { getItem: (key) => values.get(key), setItem: (key, value) => values.set(key, value) }
}
const fetcher = async (url) => Response.json(url.endsWith('/odd') ? rows('odd') : url.endsWith('/even') ? rows('even') : [])

test('homework deadlines are sorted without mutation and use Kyiv calendar dates', () => {
  const items = [
    { id: 1, dueDate: null, dueLabel: 'Без дати' },
    { id: 2, dueDate: '2026-09-09', dueLabel: '9 вер.' },
    { id: 3, dueDate: '2026-09-07', dueLabel: '7 вер.' },
    { id: 4, dueDate: '2026-09-08', dueLabel: '8 вер.' },
    { id: 5, dueDate: '2026-99-99', dueLabel: 'Дата уточнюється' },
  ]
  const original = structuredClone(items)
  const tasks = presentHomework(items, Date.parse('2026-09-07T21:30:00Z'))
  assert.deepEqual(tasks.map(item => item.id), [3, 4, 2, 1, 5])
  assert.deepEqual(tasks.map(item => item.urgency), ['overdue', 'today', 'upcoming', 'undated', 'undated'])
  assert.equal(tasks[1].deadlineLabel, 'Здати сьогодні')
  assert.equal(tasks[2].deadlineLabel, 'Здати завтра')
  assert.deepEqual(items, original)
  assert.deepEqual(presentHomework([], Date.now()), [])
})

test('homework tomorrow handles year rollover and navigation accepts only known sections', () => {
  const [task] = presentHomework([{ dueDate: '2027-01-01', dueLabel: '1 січ.' }], Date.parse('2026-12-31T12:00:00Z'))
  assert.equal(task.deadlineLabel, 'Здати завтра')
  assert.equal(sectionFromHash('#today-schedule'), 'schedule')
  assert.equal(sectionFromHash('#homework'), 'homework')
  assert.equal(sectionFromHash('#curator-contact'), 'teachers')
  assert.equal(sectionFromHash('#%invalid'), 'home')
})

test('Kyiv calendar, ISO year boundary and daylight-saving offsets', () => {
  assert.equal(campusDate('2026-09-06T21:30:00Z').dateKey, '2026-09-07')
  assert.equal(campusDate('2026-09-06T21:30:00Z').jsDay, 1)
  assert.equal(getIsoWeek(new Date('2021-01-01T12:00:00Z')), 53)
  assert.equal(getIsoWeek(new Date('2021-01-04T12:00:00Z')), 1)
  assert.equal(weekTypeFor(new Date('2026-09-14T12:00:00Z')), 'even')
  assert.equal(new Date(campusTimestamp('08:30', '2026-09-07T05:00:00Z')).toISOString(), '2026-09-07T05:30:00.000Z')
  assert.equal(new Date(campusTimestamp('08:30', '2026-01-05T05:00:00Z')).toISOString(), '2026-01-05T06:30:00.000Z')
})

test('current/next lesson transitions use half-open time intervals', () => {
  for (const [time, current, next] of [['05:29', undefined, 1], ['05:30', 1, 2], ['06:50', undefined, 2], ['07:00', 2, 3], ['10:20', undefined, undefined]]) {
    const list = buildLessonTimeline(weeklySchedules.odd.monday, Date.parse(`2026-09-07T${time}:00Z`), true)
    assert.equal(list.find((lesson) => lesson.state === 'Зараз')?.period, current)
    assert.equal(list.find((lesson) => lesson.state === 'Далі')?.period, next)
  }
})

test('cancelled middle lesson produces a 130-minute break and empty days stay empty', () => {
  const lessons = structuredClone(weeklySchedules.odd.monday)
  lessons[1].isEmpty = true
  const list = buildLessonTimeline(lessons, Date.parse('2026-09-07T06:55:00Z'), true)
  assert.deepEqual(list.map((lesson) => lesson.period), [1, 3])
  assert.equal(list[0].breakAfter, 130)
  assert.equal(list[1].state, 'Далі')
  assert.deepEqual(groupScheduleRows([], 'odd').monday, [])
  assert.deepEqual(buildLessonTimeline([], Date.now(), true), [])
})

test('calendar dates reject impossible dates without crashing homework display', () => {
  assert.equal(isCalendarDate('2026-99-99'), false)
  assert.equal(isCalendarDate('2026-02-29'), false)
  assert.equal(isCalendarDate('2024-02-29'), true)
  const items = normalizeHomework([{ id: 1, subject: 'Math', text: 'Task', due_date: '2026-99-99' }])
  assert.equal(items[0].dueLabel, 'Дата уточнюється')
})

test('same-origin API fallback works and web/mobile production origins agree', async () => {
  assert.equal(getApiBaseUrl({ PROD: true }, { protocol: 'https:', origin: baseUrl }), baseUrl)
  assert.equal(getApiBaseUrl({}, { protocol: 'http:', origin: baseUrl }), '')
  const value = async (file) => (await readFile(new URL(file, import.meta.url), 'utf8')).trim()
  assert.equal(await value('../.env.production'), await value('../.env.mobile'))
})

test('network success survives unavailable cache storage', async () => {
  const data = await loadCampusData({ baseUrl, fetcher, storage: { getItem() { throw Error('blocked') }, setItem() { throw Error('quota') } } })
  assert.equal(data.partial, false)
  assert.equal(data.schedules.odd.monday[0].subject, 'Екологія')
})

test('one failed endpoint retains its old data without discarding fresh schedules', async () => {
  const previous = { schedules: structuredClone(weeklySchedules), homework: [{ id: 42, subject: 'Saved', text: 'Saved' }], updatedAt: 123 }
  const data = await loadCampusData({ baseUrl, previous, storage: memoryStorage(), fetcher: async (url) => url.endsWith('/homework') ? new Response('', { status: 503 }) : fetcher(url) })
  assert.equal(data.partial, true)
  assert.equal(data.homework[0].id, 42)
  assert.equal(data.updatedAt, 123)
  assert.equal(data.schedules.even.friday[0].subject, 'Фізика і астрономія')
})

test('cache is validated and isolated by server origin', async () => {
  const storage = memoryStorage()
  await loadCampusData({ baseUrl, fetcher, storage })
  assert.ok(readCachedCampusData({ baseUrl, storage }))
  assert.equal(readCachedCampusData({ baseUrl: 'https://another.test', storage }), null)
  storage.setItem(`campus-pulse-data-v2:${baseUrl}`, '{"schedules":{},"homework":[]}')
  assert.equal(readCachedCampusData({ baseUrl, storage }), null)
})

test('invalid periods and duplicate periods are rejected', () => {
  assert.throws(() => groupScheduleRows([{ week_type: 'odd', day_key: 'monday', period: 6 }], 'odd'))
  const row = rows('odd')[0]
  assert.throws(() => groupScheduleRows([row, row], 'odd'))
})

test('requests have a deadline and an aborted response does not overwrite cache', async () => {
  const storage = memoryStorage()
  const never = (url, { signal }) => new Promise((resolve, reject) => signal.addEventListener('abort', () => reject(Error('aborted')), { once: true }))
  await assert.rejects(loadCampusData({ baseUrl, fetcher: never, storage, timeoutMs: 10 }))
  const controller = new AbortController()
  controller.abort()
  await assert.rejects(loadCampusData({ baseUrl, fetcher, storage, signal: controller.signal }))
  assert.equal(readCachedCampusData({ baseUrl, storage }), null)
})
import { handleRadioKeydown } from '../src/utils/radioKeyboard.js'

test('radio keyboard navigation wraps, skips disabled options and preserves Tab', () => {
  let focused, clicked, prevented = false
  const buttons = [0, 1, 2].map((id) => ({ disabled: id === 1, focus() { focused = id }, click() { clicked = id } }))
  const event = (key, index = 0) => ({ key, currentTarget: { querySelectorAll: () => buttons },
    target: { closest: () => buttons[index] }, preventDefault() { prevented = true } })
  handleRadioKeydown(event('ArrowRight'))
  assert.equal(focused, 2)
  assert.equal(clicked, 2)
  assert.equal(prevented, true)
  handleRadioKeydown(event('ArrowRight', 2))
  assert.equal(clicked, 0)
  handleRadioKeydown(event('ArrowLeft'))
  assert.equal(clicked, 2)
  handleRadioKeydown(event('Home', 2))
  assert.equal(clicked, 0)
  handleRadioKeydown(event('End'))
  assert.equal(clicked, 2)
  prevented = false
  handleRadioKeydown(event('Tab'))
  assert.equal(prevented, false)
})
