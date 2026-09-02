import { bellSchedule, weekDays, weeklySchedules } from '../data/schedule'

const CACHE_KEY = 'campus-pulse-data-v1'

function lessonFromRow(row) {
  const bell = bellSchedule[row.period - 1]
  const isEmpty = !row.subject
  return {
    id: `${row.week_type}-${row.day_key}-${row.period}`,
    period: row.period,
    start: bell.start,
    end: bell.end,
    breakAfter: bell.breakAfter,
    subject: row.subject ?? 'Вікно — пари немає',
    room: row.room ?? '—',
    isEmpty,
    teacher: row.teacher ?? (isEmpty ? 'Пари немає' : 'Інформацію ще не додано'),
    dossier: row.dossier ?? (isEmpty ? 'Цей час вільний від занять.' : 'Дані можна доповнити через Telegram-бота.'),
    route: row.route ?? (row.room ? `Аудиторія ${row.room}.` : 'У цей час заняття немає.'),
  }
}

function groupRows(rows, weekType) {
  return Object.fromEntries(weekDays.map((day) => [
    day.key,
    rows
      .filter((row) => row.day_key === day.key)
      .sort((a, b) => a.period - b.period)
      .map(lessonFromRow),
  ]).map(([dayKey, lessons]) => [dayKey, lessons.length ? lessons : weeklySchedules[weekType][dayKey]]))
}

function homeworkFromRow(row) {
  const dueDate = row.due_date ? new Date(`${row.due_date}T12:00:00`) : null
  return {
    id: row.id,
    subject: row.subject,
    text: row.text,
    dueDate: row.due_date,
    dueLabel: dueDate
      ? new Intl.DateTimeFormat('uk-UA', { day: 'numeric', month: 'short' }).format(dueDate)
      : 'Без дати',
  }
}

export function readCachedCampusData() {
  try {
    const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null')
    return cached?.schedules && cached?.homework ? cached : null
  } catch {
    return null
  }
}

export async function loadCampusData() {
  const baseUrl = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')
  if (!baseUrl) return null

  const [oddResponse, evenResponse, homeworkResponse] = await Promise.all([
    fetch(`${baseUrl}/api/schedule/odd`),
    fetch(`${baseUrl}/api/schedule/even`),
    fetch(`${baseUrl}/api/homework`),
  ])

  if (![oddResponse, evenResponse, homeworkResponse].every((response) => response.ok)) {
    throw new Error('Не вдалося синхронізувати дані')
  }

  const [oddRows, evenRows, homeworkRows] = await Promise.all([
    oddResponse.json(), evenResponse.json(), homeworkResponse.json(),
  ])
  const data = {
    schedules: {
      odd: groupRows(oddRows, 'odd'),
      even: groupRows(evenRows, 'even'),
    },
    homework: homeworkRows.map(homeworkFromRow),
    updatedAt: Date.now(),
  }
  localStorage.setItem(CACHE_KEY, JSON.stringify(data))
  return data
}
