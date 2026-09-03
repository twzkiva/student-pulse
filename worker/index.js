const DAY_LABELS = {
  monday: 'Понеділок',
  tuesday: 'Вівторок',
  wednesday: 'Середа',
  thursday: 'Четвер',
  friday: 'П’ятниця',
}

const DAY_ALIASES = {
  пн: 'monday', понеділок: 'monday', monday: 'monday',
  вт: 'tuesday', вівторок: 'tuesday', tuesday: 'tuesday',
  ср: 'wednesday', середа: 'wednesday', wednesday: 'wednesday',
  чт: 'thursday', четвер: 'thursday', thursday: 'thursday',
  пт: 'friday', 'п’ятниця': 'friday', "п'ятниця": 'friday', friday: 'friday',
}

const WEEK_ALIASES = {
  odd: 'odd', непарний: 'odd', непарна: 'odd',
  even: 'even', парний: 'even', парна: 'even',
}

const BELL_TIMES = {
  1: ['08:30', '09:50'],
  2: ['10:00', '11:20'],
  3: ['12:00', '13:20'],
  4: ['13:30', '14:50'],
  5: ['15:00', '16:20'],
}

const BASE_SCHEDULE = {
  monday: [['Екологія', '411'], ['Математика', '407'], ['Українська література', '410'], [null, null]],
  tuesday: [['Основи правознавства', '301'], ['Захист України', '305л'], ['Основи економічної теорії / Фізкультура', '418 / кфв'], ['Зарубіжна література / Історія України', '214 / 408']],
  wednesday: [['Іноземна мова', '302 / 313л'], ['Всесвітня історія / Хімія', '401 / 406'], ['Українська мова', '410'], ['Біологія', '405']],
  thursday: [['Фізика і астрономія', '413'], ['Інформатика', '320'], ['Фізична культура', 'кфв'], ['Математика', '406']],
  friday: [['Фізика і астрономія', '413'], ['Основи економічної теорії', '418'], ['Інформатика', '320'], [null, null]],
}

const HELP_TEXT = [
  'Я оновлюю застосунок «Кампус Пульс».',
  '',
  '/today — розклад на сьогодні',
  '/week — розклад поточного тижня',
  '/report текст — повідомити про помилку',
  '',
  'Команди куратора:',
  '/setlesson непарний пн 1 Предмет | 405',
  '/cancel парний пт 4',
  '/homework Предмет | Завдання | 2026-09-10',
].join('\n')

const JSON_HEADERS = {
  'content-type': 'application/json; charset=utf-8',
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET,POST,PUT,OPTIONS',
  'access-control-allow-headers': 'content-type',
}

const textEncoder = new TextEncoder()

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: JSON_HEADERS })
}

async function ensureSeedData(db) {
  const count = await db.prepare('SELECT COUNT(*) AS count FROM schedule_entries').first()
  if (Number(count?.count || 0) > 0) return

  const inserts = []
  for (const weekType of ['odd', 'even']) {
    for (const [dayKey, lessons] of Object.entries(BASE_SCHEDULE)) {
      lessons.forEach(([subject, room], index) => {
        inserts.push(db.prepare(`
          INSERT INTO schedule_entries
            (week_type, day_key, period, subject, room, teacher, dossier)
          VALUES (?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT (week_type, day_key, period) DO NOTHING
        `).bind(
          weekType,
          dayKey,
          index + 1,
          subject,
          room,
          subject ? null : 'Пари немає',
          subject ? 'Дані можна доповнити через Telegram-бота.' : 'Цей час вільний від занять.',
        ))
      })
    }
  }
  await db.batch(inserts)
  await db.prepare('PRAGMA optimize').run()
}

async function secretsMatch(received, expected) {
  if (!received || !expected) return false
  const [receivedHash, expectedHash] = await Promise.all([
    crypto.subtle.digest('SHA-256', textEncoder.encode(received)),
    crypto.subtle.digest('SHA-256', textEncoder.encode(expected)),
  ])
  return crypto.subtle.timingSafeEqual(receivedHash, expectedHash)
}

async function getSchedule(db, weekType, dayKey = null) {
  const statement = dayKey
    ? db.prepare('SELECT * FROM schedule_entries WHERE week_type = ? AND day_key = ? ORDER BY period').bind(weekType, dayKey)
    : db.prepare('SELECT * FROM schedule_entries WHERE week_type = ? ORDER BY day_key, period').bind(weekType)
  return (await statement.all()).results
}

function kyivDateInfo() {
  const now = new Date()
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Kyiv', year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'long',
  }).formatToParts(now).filter((part) => part.type !== 'literal').map((part) => [part.type, part.value]))
  return { year: Number(parts.year), month: Number(parts.month), day: Number(parts.day), dayKey: parts.weekday.toLowerCase() }
}

function isoWeekNumber({ year, month, day }) {
  const date = new Date(Date.UTC(year, month - 1, day))
  const weekday = date.getUTCDay() || 7
  date.setUTCDate(date.getUTCDate() + 4 - weekday)
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1))
  return Math.ceil((((date - yearStart) / 86400000) + 1) / 7)
}

function currentWeekType() {
  return isoWeekNumber(kyivDateInfo()) % 2 === 0 ? 'even' : 'odd'
}

function isAdmin(env, message) {
  const allowed = String(env.TELEGRAM_ADMIN_CHAT_ID || '')
  return allowed && [message.chat?.id, message.from?.id].some((value) => String(value) === allowed)
}

async function sendTelegram(env, chatId, text) {
  const apiBaseUrl = String(env.TELEGRAM_API_BASE_URL || 'https://api.telegram.org').replace(/\/$/, '')
  const response = await fetch(`${apiBaseUrl}/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      disable_web_page_preview: true,
    }),
  })
  if (!response.ok) throw new Error(`Telegram API: ${response.status}`)
}

async function scheduleText(db, dayKey, weekType) {
  const rows = await getSchedule(db, weekType, dayKey)
  const typeLabel = weekType === 'even' ? 'парний' : 'непарний'
  const lines = [`${DAY_LABELS[dayKey] || dayKey} · ${typeLabel} тиждень`]
  for (const row of rows) {
    const [start, end] = BELL_TIMES[row.period] || ['', '']
    lines.push(`${row.period}. ${start}–${end} · ${row.subject || 'Вікно'}${row.room ? ` · ауд. ${row.room}` : ''}`)
  }
  return lines.join('\n')
}

async function handleTelegramUpdate(env, update) {
  const message = update.message || update.edited_message
  if (!message?.text) return

  const chatId = message.chat.id
  const text = message.text.trim()
  const command = text.split(/\s+/, 1)[0].split('@')[0].toLowerCase()

  if (command === '/start' || command === '/help') {
    const parameter = text.split(/\s+/, 2)[1] || ''
    const prefix = parameter === 'report' ? 'Опиши помилку командою /report текст.\n\n' : ''
    await sendTelegram(env, chatId, prefix + HELP_TEXT)
    return
  }

  const dateInfo = kyivDateInfo()
  const weekType = currentWeekType()

  if (command === '/today') {
    const reply = DAY_LABELS[dateInfo.dayKey]
      ? await scheduleText(env.DB, dateInfo.dayKey, weekType)
      : 'Сьогодні вихідний — навчальних пар немає.'
    await sendTelegram(env, chatId, reply)
    return
  }

  if (command === '/week') {
    const days = []
    for (const dayKey of Object.keys(DAY_LABELS)) days.push(await scheduleText(env.DB, dayKey, weekType))
    await sendTelegram(env, chatId, days.join('\n\n'))
    return
  }

  if (command === '/report') {
    const reportText = text.slice(text.indexOf(' ') + 1).trim()
    if (!text.includes(' ') || !reportText) {
      await sendTelegram(env, chatId, 'Напиши так: /report що саме не так у розкладі')
      return
    }
    await env.DB.prepare('INSERT INTO error_reports (text, reporter_chat_id) VALUES (?, ?)').bind(reportText, String(chatId)).run()
    await sendTelegram(env, chatId, 'Дякую! Повідомлення збережено й передано куратору.')
    if (env.TELEGRAM_ADMIN_CHAT_ID && String(env.TELEGRAM_ADMIN_CHAT_ID) !== String(chatId)) {
      await sendTelegram(env, env.TELEGRAM_ADMIN_CHAT_ID, `Нове повідомлення про помилку:\n${reportText}`)
    }
    return
  }

  if (!isAdmin(env, message)) {
    await sendTelegram(env, chatId, 'Ця команда доступна лише куратору. Скористайся /today, /week або /report.')
    return
  }

  if (command === '/setlesson') {
    const match = text.match(/^\/setlesson(?:@\w+)?\s+(\S+)\s+(\S+)\s+(\d+)\s+(.+?)\s*\|\s*(.+)$/i)
    const parsedWeek = match ? WEEK_ALIASES[match[1].toLowerCase()] : null
    const parsedDay = match ? DAY_ALIASES[match[2].toLowerCase()] : null
    const period = match ? Number(match[3]) : 0
    if (!match || !parsedWeek || !parsedDay || !BELL_TIMES[period]) {
      await sendTelegram(env, chatId, 'Формат: /setlesson непарний пн 1 Предмет | 405')
      return
    }
    await env.DB.prepare(`
      INSERT INTO schedule_entries (week_type, day_key, period, subject, room)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT (week_type, day_key, period) DO UPDATE SET
        subject = excluded.subject, room = excluded.room, updated_at = CURRENT_TIMESTAMP
    `).bind(parsedWeek, parsedDay, period, match[4].trim(), match[5].trim()).run()
    await sendTelegram(env, chatId, `Оновлено:\n${await scheduleText(env.DB, parsedDay, parsedWeek)}`)
    return
  }

  if (command === '/cancel') {
    const match = text.match(/^\/cancel(?:@\w+)?\s+(\S+)\s+(\S+)\s+(\d+)$/i)
    const parsedWeek = match ? WEEK_ALIASES[match[1].toLowerCase()] : null
    const parsedDay = match ? DAY_ALIASES[match[2].toLowerCase()] : null
    const period = match ? Number(match[3]) : 0
    if (!match || !parsedWeek || !parsedDay || !BELL_TIMES[period]) {
      await sendTelegram(env, chatId, 'Формат: /cancel парний пт 4')
      return
    }
    await env.DB.prepare(`
      INSERT INTO schedule_entries (week_type, day_key, period, subject, room)
      VALUES (?, ?, ?, NULL, NULL)
      ON CONFLICT (week_type, day_key, period) DO UPDATE SET
        subject = NULL, room = NULL, updated_at = CURRENT_TIMESTAMP
    `).bind(parsedWeek, parsedDay, period).run()
    await sendTelegram(env, chatId, 'Пару скасовано. Застосунок отримає зміни під час синхронізації.')
    return
  }

  if (command === '/homework') {
    const parts = text.slice(text.indexOf(' ') + 1).split('|').map((part) => part.trim())
    if (!text.includes(' ') || parts.length !== 3 || parts.some((part) => !part) || !/^\d{4}-\d{2}-\d{2}$/.test(parts[2])) {
      await sendTelegram(env, chatId, 'Формат: /homework Предмет | Завдання | 2026-09-10')
      return
    }
    await env.DB.prepare('INSERT INTO homework (subject, text, due_date) VALUES (?, ?, ?)').bind(parts[0], parts[1], parts[2]).run()
    await sendTelegram(env, chatId, 'Домашнє завдання додано.')
    return
  }

  await sendTelegram(env, chatId, HELP_TEXT)
}

async function handleApi(request, env, url) {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: JSON_HEADERS })

  const scheduleMatch = url.pathname.match(/^\/api\/schedule\/(odd|even)$/)
  if (request.method === 'GET' && scheduleMatch) {
    const dayKey = url.searchParams.get('day')
    if (dayKey && !DAY_LABELS[dayKey]) return json({ detail: 'Невірний день тижня' }, 422)
    return json(await getSchedule(env.DB, scheduleMatch[1], dayKey))
  }

  if (request.method === 'GET' && url.pathname === '/api/homework') {
    const result = await env.DB.prepare('SELECT * FROM homework WHERE completed = 0 ORDER BY due_date, id').all()
    return json(result.results)
  }

  if (request.method === 'POST' && url.pathname === '/api/reports') {
    const contentLength = Number(request.headers.get('content-length') || 0)
    if (contentLength > 8192) return json({ detail: 'Повідомлення завелике' }, 413)

    let body
    try {
      body = await request.json()
    } catch {
      return json({ detail: 'Невірний формат запиту' }, 400)
    }

    if (!body?.text || typeof body.text !== 'string' || !body.text.trim()) {
      return json({ detail: 'Додайте текст повідомлення' }, 422)
    }
    const reportText = body.text.trim().slice(0, 2000)
    const result = await env.DB.prepare('INSERT INTO error_reports (text, reporter_chat_id) VALUES (?, ?)')
      .bind(reportText, body.reporter_chat_id ? String(body.reporter_chat_id).slice(0, 64) : null).run()
    return json({ id: result.meta.last_row_id, text: reportText }, 201)
  }

  return json({ detail: 'Маршрут API не знайдено' }, 404)
}

export default {
  async fetch(request, env) {
    try {
      const url = new URL(request.url)

      if (url.pathname.startsWith('/api/')) {
        if (!env.DB) return json({ detail: 'База даних ще не підключена' }, 503)
        await ensureSeedData(env.DB)
        return handleApi(request, env, url)
      }

      if (url.pathname === '/telegram/webhook' && request.method === 'POST') {
        if (!env.DB || !env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_WEBHOOK_SECRET) {
          return json({ ok: false }, 503)
        }
        const verified = await secretsMatch(
          request.headers.get('x-telegram-bot-api-secret-token'),
          env.TELEGRAM_WEBHOOK_SECRET,
        )
        if (!verified) return json({ ok: false }, 403)

        await ensureSeedData(env.DB)
        await handleTelegramUpdate(env, await request.json())
        return json({ ok: true })
      }

      if (!env.ASSETS || typeof env.ASSETS.fetch !== 'function') {
        return new Response('Кампус Пульс: сховище статичних файлів недоступне.', { status: 503 })
      }

      const response = await env.ASSETS.fetch(request)
      if (response.status !== 404 || request.method !== 'GET') return response

      url.pathname = '/index.html'
      return env.ASSETS.fetch(new Request(url, request))
    } catch (error) {
      console.error(JSON.stringify({
        event: 'request_failed',
        message: error instanceof Error ? error.message : 'Невідома помилка',
        method: request.method,
        path: new URL(request.url).pathname,
      }))
      return json({ detail: 'Внутрішня помилка сервера' }, 500)
    }
  },
}
