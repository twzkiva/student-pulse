import { campusDate, isCalendarDate } from './campusTime.js'

const dateFormatter = new Intl.DateTimeFormat('uk-UA', { day: 'numeric', month: 'short', timeZone: 'UTC' })

export function presentHomework(items, now = Date.now()) {
  const today = campusDate(now).dateKey
  const tomorrow = new Date(Date.parse(`${today}T12:00:00Z`) + 86400000).toISOString().slice(0, 10)
  return items.map(item => {
    const due = isCalendarDate(item.dueDate) ? item.dueDate : null
    const label = item.dueLabel || (due ? dateFormatter.format(new Date(`${due}T12:00:00Z`)) : 'Без дати')
    return {
      ...item,
      dueDate: due,
      urgency: !due ? 'undated' : due < today ? 'overdue' : due === today ? 'today' : 'upcoming',
      deadlineLabel: !due ? label : due < today ? `Термін минув · ${label}`
        : due === today ? 'Здати сьогодні' : due === tomorrow ? 'Здати завтра' : label,
    }
  }).sort((a, b) => (a.dueDate ?? '9999-99-99').localeCompare(b.dueDate ?? '9999-99-99'))
}
