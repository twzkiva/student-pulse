import { bellSchedule, weekDays, weeklySchedules } from '../data/schedule.js'
import { isCalendarDate } from '../utils/campusTime.js'

const CACHE_KEY = 'campus-pulse-data-v2'

function browserStorage() {
  try { return globalThis.localStorage } catch { return undefined }
}

export function getApiBaseUrl(env = import.meta.env ?? {}, location = globalThis.location) {
  const fallback = env.PROD && location?.protocol === 'https:' ? location.origin : ''
  return (env.VITE_API_URL || fallback || '').replace(/\/+$/, '')
}

function lessonFromRow(row) {
  const bell = bellSchedule[row.period - 1]
  const subject = typeof row.subject === 'string' ? row.subject.trim() : ''
  const isEmpty = !subject
  const text = (value, fallback) => typeof value === 'string' && value.trim() ? value : fallback
  return {
    id: `${row.week_type}-${row.day_key}-${row.period}`,
    period: row.period,
    start: bell.start,
    end: bell.end,
    breakAfter: bell.breakAfter,
    subject: subject || 'Вікно — пари немає',
    room: text(row.room, '—'),
    isEmpty,
    teacher: text(row.teacher, isEmpty ? 'Пари немає' : 'Інформацію ще не додано'),
    dossier: text(row.dossier, isEmpty ? 'Цей час вільний від занять.' : 'Дані можна доповнити через Telegram-бота.'),
    route: text(row.route, row.room ? `Аудиторія ${row.room}.` : 'У цей час заняття немає.'),
  }
}

export function groupScheduleRows(rows, weekType) {
  if (!Array.isArray(rows)) throw new Error('Невірний формат розкладу')
  if (rows.some((row) => !row || row.week_type !== weekType
    || !weekDays.some((day) => day.key === row.day_key)
    || !Number.isInteger(row.period) || !bellSchedule[row.period - 1])) {
    throw new Error('Невірна пара у розкладі')
  }
  const seen = new Set()
  return Object.fromEntries(weekDays.map((day) => [
    day.key,
    rows
      .filter((row) => row.day_key === day.key)
      .sort((a, b) => a.period - b.period)
      .map((row) => {
        const key = `${row.day_key}-${row.period}`
        if (seen.has(key)) throw new Error('Повтор номера пари')
        seen.add(key)
        return lessonFromRow(row)
      }),
  ]))
}

export function normalizeHomework(rows) {
  if (!Array.isArray(rows)) throw new Error('Невірний формат завдань')
  return rows.filter((row) => row && (typeof row.id === 'number' || typeof row.id === 'string')
    && typeof row.subject === 'string' && typeof row.text === 'string').map((row) => {
    const dueDate = row.due_date ?? row.dueDate ?? null
    return {
      id: row.id, subject: row.subject, text: row.text,
      dueDate: isCalendarDate(dueDate) ? dueDate : null,
      dueLabel: isCalendarDate(dueDate)
        ? new Intl.DateTimeFormat('uk-UA', { day: 'numeric', month: 'short', timeZone: 'UTC' })
          .format(new Date(`${dueDate}T12:00:00Z`))
        : dueDate ? 'Дата уточнюється' : 'Без дати',
    }
  })
}

export function readCachedCampusData({ baseUrl = getApiBaseUrl(), storage = browserStorage() } = {}) {
  try {
    const cached = JSON.parse(storage?.getItem(`${CACHE_KEY}:${baseUrl}`) || 'null')
    if (!cached || !Array.isArray(cached.homework)) return null
    const schedules = {}
    for (const type of ['odd', 'even']) {
      const rows = weekDays.flatMap(({ key }) => {
        if (!Array.isArray(cached.schedules?.[type]?.[key])) throw new Error('Invalid cache')
        return cached.schedules[type][key].map((lesson) => ({
          ...lesson, week_type: type, day_key: key, subject: lesson.isEmpty ? null : lesson.subject,
        }))
      })
      schedules[type] = groupScheduleRows(rows, type)
    }
    return { schedules, homework: normalizeHomework(cached.homework), updatedAt: cached.updatedAt || 0 }
  } catch { return null }
}

async function fetchJson(url, { fetcher, signal, timeoutMs }) {
  const controller = new AbortController()
  const abort = () => controller.abort()
  if (signal?.aborted) abort()
  signal?.addEventListener('abort', abort, { once: true })
  const timer = setTimeout(abort, timeoutMs)
  try {
    const response = await fetcher(url, { signal: controller.signal, cache: 'no-store' })
    if (!response.ok) throw new Error(`API: ${response.status}`)
    return await response.json()
  } finally {
    clearTimeout(timer)
    signal?.removeEventListener('abort', abort)
  }
}

export async function loadCampusData({
  baseUrl = getApiBaseUrl(), fetcher = globalThis.fetch, storage = browserStorage(),
  signal, timeoutMs = 10000, previous,
} = {}) {
  if (!baseUrl) return null
  const old = previous ?? readCachedCampusData({ baseUrl, storage })
    ?? { schedules: structuredClone(weeklySchedules), homework: [], updatedAt: 0 }
  const options = { fetcher, signal, timeoutMs }
  const results = await Promise.allSettled([
    fetchJson(`${baseUrl}/api/schedule/odd`, options).then((rows) => groupScheduleRows(rows, 'odd')),
    fetchJson(`${baseUrl}/api/schedule/even`, options).then((rows) => groupScheduleRows(rows, 'even')),
    fetchJson(`${baseUrl}/api/homework`, options).then(normalizeHomework),
  ])
  if (signal?.aborted || results.every((result) => result.status === 'rejected')) {
    throw new Error('Не вдалося синхронізувати дані')
  }
  const value = (index, fallback) => results[index].status === 'fulfilled' ? results[index].value : fallback
  const partial = results.some((result) => result.status === 'rejected')
  const data = {
    schedules: { odd: value(0, old.schedules.odd), even: value(1, old.schedules.even) },
    homework: value(2, old.homework),
    updatedAt: partial ? old.updatedAt : Date.now(), partial,
  }
  try { storage?.setItem(`${CACHE_KEY}:${baseUrl}`, JSON.stringify(data)) } catch {
    // An unavailable/full cache must not discard freshly fetched data.
  }
  return data
}
