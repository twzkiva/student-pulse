export const CAMPUS_TIME_ZONE = 'Europe/Kyiv'

const partsFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: CAMPUS_TIME_ZONE,
  year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
})

export function campusDate(value = Date.now()) {
  const parts = Object.fromEntries(partsFormatter.formatToParts(new Date(value))
    .filter((part) => part.type !== 'literal').map((part) => [part.type, part.value]))
  return {
    ...Object.fromEntries(Object.entries(parts).map(([key, item]) => [key, Number(item)])),
    dateKey: `${parts.year}-${parts.month}-${parts.day}`,
    jsDay: new Date(Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day))).getUTCDay(),
  }
}

export function campusTimestamp(time, value = Date.now()) {
  const { year, month, day } = campusDate(value)
  const [hour, minute] = time.split(':').map(Number)
  const target = Date.UTC(year, month - 1, day, hour, minute)
  let result = target
  // Resolve a Kyiv wall-clock time, including the daylight-saving offset.
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const p = campusDate(result)
    result += target - Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second)
  }
  return result
}

export function isCalendarDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T12:00:00Z`)
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
}
