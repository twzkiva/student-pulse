import { handleAuth, requireAdmin } from './auth.js'

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
  '/homework — список завдань з номерами',
  '/done 12 — завершити завдання (куратор)',
].join('\n')

const JSON_HEADERS = {
  'content-type': 'application/json; charset=utf-8',
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET,POST,PUT,OPTIONS',
  'access-control-allow-headers': 'content-type, authorization, x-telegram-bot-api-secret-token',
  'cache-control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  'referrer-policy': 'strict-origin-when-cross-origin',
  'x-content-type-options': 'nosniff',
  'x-frame-options': 'DENY',
  'x-xss-protection': '1; mode=block',
  'strict-transport-security': 'max-age=31536000; includeSubDomains; preload',
  'content-security-policy': "default-src 'self' https:; frame-ancestors 'none'; object-src 'none'; base-uri 'none';"
}

function getCorsHeaders(request, env) {
  const origin = request.headers.get('origin')
  let allowedOrigin = '*'
  if (env.PUBLIC_ORIGIN) {
    allowedOrigin = env.PUBLIC_ORIGIN
    if (origin === env.PUBLIC_ORIGIN || origin?.startsWith('http://localhost:')) {
      allowedOrigin = origin
    }
  }
  return {
    ...JSON_HEADERS,
    'access-control-allow-origin': allowedOrigin,
    'access-control-allow-credentials': 'true',
  }
}

const UPDATE_APP_ID = 'ua.edu.campus.pulse'
const UPDATE_MANIFEST_PATH = '/updates/manifest.json'

const textEncoder = new TextEncoder()


// Захист від DDoS/Спаму (In-Memory IP Rate Limiter)
const ipRequests = new Map();
function isRateLimited(ip) {
  if (!ip) return false;
  const now = Date.now();
  const data = ipRequests.get(ip) || { count: 0, resetTime: now + 60000 };
  
  if (now > data.resetTime) {
    data.count = 1;
    data.resetTime = now + 60000;
  } else {
    data.count++;
  }
  
  ipRequests.set(ip, data);
  // Максимум 200 запитів за хвилину з однієї IP (запобігає флуду)
  return data.count > 200;
}

function json(data, status = 200, request = null, env = null) {
  const headers = request && env ? getCorsHeaders(request, env) : JSON_HEADERS
  return new Response(JSON.stringify(data), { status, headers })
}

class RequestError extends Error {
  constructor(status, message) { super(message); this.status = status }
}

async function readJson(request, limit = 8192) {
  if (Number(request.headers.get('content-length')) > limit) throw new RequestError(413, 'Повідомлення завелике')
  const reader = request.body?.getReader()
  if (!reader) throw new RequestError(400, 'Порожній запит')
  let size = 0
  let text = ''
  const decoder = new TextDecoder()
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      size += value.byteLength
      if (size > limit) {
        await reader.cancel()
        throw new RequestError(413, 'Повідомлення завелике')
      }
      text += decoder.decode(value, { stream: true })
    }
    const body = JSON.parse(text + decoder.decode())
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('Invalid JSON object')
    return body
  } catch (error) {
    if (error instanceof RequestError) throw error
    throw new RequestError(400, 'Невірний формат запиту')
  } finally { reader.releaseLock() }
}

function validDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T12:00:00Z`)
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
}

function versionParts(value) {
  const match = String(value).match(/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Za-z.-]+))?(?:\+[0-9A-Za-z.-]+)?$/)
  if (!match) return null
  const numbers = match.slice(1, 4).map(Number)
  const pre = match[4]?.split('.') ?? []
  if (!numbers.every(Number.isSafeInteger)
    || pre.some((part) => !part || /^0\d+$/.test(part))
    || String(value).split('+')[1]?.split('.').some((part) => !part)) return null
  return { numbers, pre }
}

function compareVersions(left, right) {
  const a = versionParts(left)
  const b = versionParts(right)
  for (let index = 0; index < 3; index += 1) {
    const difference = a.numbers[index] - b.numbers[index]
    if (difference) return Math.sign(difference)
  }
  if (!a.pre.length || !b.pre.length) return a.pre.length ? -1 : b.pre.length ? 1 : 0
  for (let i = 0; i < Math.max(a.pre.length, b.pre.length); i += 1) {
    if (a.pre[i] === b.pre[i]) continue
    if (a.pre[i] === undefined) return -1
    if (b.pre[i] === undefined) return 1
    const an = /^\d+$/.test(a.pre[i])
    const bn = /^\d+$/.test(b.pre[i])
    if (an && bn) return a.pre[i].length !== b.pre[i].length
      ? Math.sign(a.pre[i].length - b.pre[i].length) : a.pre[i] < b.pre[i] ? -1 : 1
    if (an !== bn) return an ? -1 : 1
    return a.pre[i] < b.pre[i] ? -1 : 1
  }
  return 0
}

async function readUpdateManifest(request, env) {
  if (!env.ASSETS || typeof env.ASSETS.fetch !== 'function') return null
  const manifestUrl = new URL(UPDATE_MANIFEST_PATH, request.url)
  const response = await env.ASSETS.fetch(new Request(manifestUrl, { method: 'GET' }))
  if (!response.ok) return null

  const manifest = await response.json()
  if (!versionParts(manifest?.version)
    || !/^bundles\/[0-9A-Za-z._-]+\.zip$/.test(manifest?.file)
    || !/^[a-fA-F0-9]{64}$/.test(manifest?.checksum)) return null
  return manifest
}

async function handleAppUpdate(request, env) {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: JSON_HEADERS })

  const manifest = await readUpdateManifest(request, env)
  if (!manifest) return json({ kind: 'failed', error: 'update_not_configured', message: 'Оновлення ще не опубліковано' }, 503)

  if (request.method === 'GET') {
    return json({ version: manifest.version, published_at: manifest.publishedAt })
  }
  if (request.method !== 'POST') return json({ detail: 'Метод не підтримується' }, 405)

  const body = await readJson(request)

  if (body?.app_id !== UPDATE_APP_ID) {
    return json({
      kind: 'blocked',
      error: 'app_id_mismatch',
      message: 'Оновлення не призначене для цього застосунку',
      version: manifest.version,
    })
  }

  const installedVersion = !body.version_name || body.version_name === 'builtin' ? '0.0.0' : body.version_name
  if (!versionParts(installedVersion)) return json({ kind: 'failed', error: 'invalid_version' }, 400)
  if (compareVersions(installedVersion, manifest.version) >= 0) {
    return json({
      kind: 'up_to_date',
      error: 'no_new_version_available',
      message: 'Встановлено останню версію',
      version: installedVersion,
    })
  }

  const bundleUrl = new URL(`/updates/${manifest.file.replace(/^\/+/, '')}`, request.url)
  return json({
    version: manifest.version,
    url: bundleUrl.href,
    checksum: manifest.checksum,
    breaking: false,
    message: 'Доступне нове оновлення',
  })
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
  const allowed = String(env.TELEGRAM_ADMIN_USER_IDS || env.TELEGRAM_ADMIN_CHAT_ID || '')
    .split(',').map((value) => value.trim()).filter((value) => /^[1-9]\d*$/.test(value))
  return allowed.includes(String(message.from?.id))
}

async function sendTelegram(env, chatId, text, options = {}) {
  const apiBaseUrl = String(env.TELEGRAM_API_BASE_URL || 'https://api.telegram.org').replace(/\/$/, '')
  const response = await fetch(`${apiBaseUrl}/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      disable_web_page_preview: true,
      ...options
    }),
    signal: AbortSignal.timeout(12000),
  })
  if (!response.ok || !(await response.json()).ok) throw new Error(`Telegram API: ${response.status}`)
}

async function runTelegramMutation(env, updateId, sql, values) {
  const guard = 'NOT EXISTS (SELECT 1 FROM telegram_updates WHERE update_id = ?)'
  const results = await env.DB.batch([
    env.DB.prepare(sql.replace('/* once */', guard)).bind(...values, updateId),
    env.DB.prepare('INSERT INTO telegram_updates (update_id) VALUES (?) ON CONFLICT DO NOTHING').bind(updateId),
  ])
  return results[0]
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


async function editTelegramMessage(env, chatId, messageId, text, options = {}) {
  const apiBaseUrl = String(env.TELEGRAM_API_BASE_URL || 'https://api.telegram.org').replace(/\/$/, '')
  await fetch(`${apiBaseUrl}/bot${env.TELEGRAM_BOT_TOKEN}/editMessageText`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, message_id: messageId, text, ...options })
  })
}

async function deleteTelegramMessage(env, chatId, messageId) {
  const apiBaseUrl = String(env.TELEGRAM_API_BASE_URL || 'https://api.telegram.org').replace(/\/$/, '')
  await fetch(`${apiBaseUrl}/bot${env.TELEGRAM_BOT_TOKEN}/deleteMessage`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, message_id: messageId })
  })
}

async function sendChatAction(env, chatId, action = 'typing') {
  const apiBaseUrl = String(env.TELEGRAM_API_BASE_URL || 'https://api.telegram.org').replace(/\/$/, '')
  await fetch(`${apiBaseUrl}/bot${env.TELEGRAM_BOT_TOKEN}/sendChatAction`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, action })
  })
}

async function handleTelegramUpdate(env, update) {
  const apiBaseUrl = String(env.TELEGRAM_API_BASE_URL || 'https://api.telegram.org').replace(/\/$/, '');
  
  const answerCb = async (cbId, text = '') => {
    await fetch(`${apiBaseUrl}/bot${env.TELEGRAM_BOT_TOKEN}/answerCallbackQuery`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ callback_query_id: cbId, text })
    });
  };

  const sleep = ms => new Promise(r => setTimeout(r, ms));

  if (update.callback_query) {
    const cb = update.callback_query;
    const data = cb.data || '';
    const chatId = cb.message.chat.id;
    const msgId = cb.message.message_id;

    if (data === 'menu_main') {
      await editTelegramMessage(env, chatId, msgId, '📚 Головне меню Кампус Пульс', {
        reply_markup: {
          inline_keyboard: [
            [{ text: '➕ Додати ДЗ на сьогодні', callback_data: 'menu_add' }],
            [{ text: '✏️ Редагувати ДЗ', callback_data: 'menu_edit' }],
            [{ text: '✅ Завершити / Видалити ДЗ', callback_data: 'menu_del' }]
          ]
        }
      });
      await answerCb(cb.id);
      return;
    }

    if (data === 'menu_add') {
      const dateInfo = kyivDateInfo();
      const weekType = currentWeekType();
      const rows = await getSchedule(env.DB, weekType, dateInfo.dayKey);
      const validRows = rows.filter(r => r.subject && r.subject.trim() && !r.subject.includes('Вікно'));
      
      if (validRows.length === 0) {
        await editTelegramMessage(env, chatId, msgId, 'Сьогодні пар немає, або розклад ще не додано.', {
          reply_markup: { inline_keyboard: [[{ text: '⬅️ Назад', callback_data: 'menu_main' }]] }
        });
      } else {
        const inline_keyboard = validRows.map(row => ([{
          text: row.subject,
          callback_data: `add_${row.subject.substring(0, 50)}`
        }]));
        inline_keyboard.push([{ text: '⬅️ Назад', callback_data: 'menu_main' }]);
        await editTelegramMessage(env, chatId, msgId, 'Оберіть предмет для додавання ДЗ на сьогодні:', { reply_markup: { inline_keyboard } });
      }
      await answerCb(cb.id);
      return;
    }

    if (data === 'menu_edit' || data === 'menu_del') {
      const isEdit = data === 'menu_edit';
      const result = await env.DB.prepare('SELECT id, subject, text FROM homework WHERE completed = 0 ORDER BY id DESC LIMIT 20').all();
      if (!result.results.length) {
        await editTelegramMessage(env, chatId, msgId, 'Немає активних домашніх завдань.', {
          reply_markup: { inline_keyboard: [[{ text: '⬅️ Назад', callback_data: 'menu_main' }]] }
        });
      } else {
        const inline_keyboard = result.results.map(item => ([{
          text: `${isEdit ? '✏️' : '✅'} ${item.subject}`,
          callback_data: `${isEdit ? 'edit' : 'del'}_${item.id}`
        }]));
        inline_keyboard.push([{ text: '⬅️ Назад', callback_data: 'menu_main' }]);
        await editTelegramMessage(env, chatId, msgId, isEdit ? 'Оберіть ДЗ для редагування:' : 'Оберіть ДЗ для завершення:', { reply_markup: { inline_keyboard } });
      }
      await answerCb(cb.id);
      return;
    }

    if (data.startsWith('add_')) {
      const subject = data.substring(4);
      await deleteTelegramMessage(env, chatId, msgId);
      await sendChatAction(env, chatId, 'typing');
      await sleep(300);
      await sendTelegram(env, chatId, `➕ Напишіть завдання для: ${subject}`, { reply_markup: { force_reply: true, selective: true } });
      await answerCb(cb.id);
      return;
    }

    if (data.startsWith('edit_')) {
      const hwId = data.substring(5);
      await deleteTelegramMessage(env, chatId, msgId);
      await sendChatAction(env, chatId, 'typing');
      await sleep(300);
      await sendTelegram(env, chatId, `✏️ Редагування ДЗ #${hwId}. Напишіть новий текст:`, { reply_markup: { force_reply: true, selective: true } });
      await answerCb(cb.id);
      return;
    }

    if (data.startsWith('del_')) {
      const hwId = Number(data.substring(4));
      await env.DB.prepare('UPDATE homework SET completed = 1 WHERE id = ?').bind(hwId).run();
      
      // Re-fetch remaining to edit the menu directly instead of flooding
      const result = await env.DB.prepare('SELECT id, subject FROM homework WHERE completed = 0 ORDER BY id DESC LIMIT 20').all();
      if (!result.results.length) {
        await editTelegramMessage(env, chatId, msgId, '✅ Всі завдання успішно завершені!', {
          reply_markup: { inline_keyboard: [[{ text: '⬅️ На головну', callback_data: 'menu_main' }]] }
        });
      } else {
        const inline_keyboard = result.results.map(item => ([{
          text: `✅ ${item.subject}`,
          callback_data: `del_${item.id}`
        }]));
        inline_keyboard.push([{ text: '⬅️ Назад', callback_data: 'menu_main' }]);
        await editTelegramMessage(env, chatId, msgId, 'Оберіть наступне ДЗ для завершення:', { reply_markup: { inline_keyboard } });
      }
      
      await answerCb(cb.id, '✅ Завдання видалено!');
      return;
    }

    return;
  }

  const message = update.message;
  if (typeof message?.text !== 'string' || !message.text.trim() || !Number.isSafeInteger(message.chat?.id)) return;
  
  if (!Number.isSafeInteger(update.update_id) || update.update_id < 0) throw new RequestError(422, 'Невірний update_id');
  
  const isDuplicate = await env.DB.prepare('SELECT update_id FROM telegram_updates WHERE update_id = ?').bind(update.update_id).first();
  if (isDuplicate) return;

  const chatId = message.chat.id;
  const text = message.text.trim();
  const command = text.split(/\s+/, 1)[0].split('@')[0].toLowerCase();

  if (!isAdmin(env, message)) {
    await sendTelegram(env, chatId, 'Ви не маєте доступу до цього бота.');
    return;
  }

  if (message.reply_to_message && message.reply_to_message.text) {
    const rText = message.reply_to_message.text;
    
    if (rText.startsWith('Напишіть завдання для: ') || rText.startsWith('➕ Напишіть завдання для: ')) {
      const subject = rText.replace('Напишіть завдання для: ', '').replace('➕ Напишіть завдання для: ', '').trim();
      await sendChatAction(env, chatId, 'typing');
      await sleep(300);
      await runTelegramMutation(env, update.update_id,
        'INSERT INTO homework (subject, text, due_date) SELECT ?, ?, NULL WHERE /* once */', [subject, text]);
      await sendTelegram(env, chatId, `✅ Додано нове завдання з предмету "${subject}"!`, {
        reply_markup: { inline_keyboard: [[{ text: '⬅️ В меню', callback_data: 'menu_main' }]] }
      });
      return;
    }
    
    if (rText.startsWith('✏️ Редагування ДЗ #')) {
      const match = rText.match(/#(\d+)\./);
      if (match && match[1]) {
        const hwId = Number(match[1]);
        await sendChatAction(env, chatId, 'typing');
        await sleep(300);
        await runTelegramMutation(env, update.update_id,
          'UPDATE homework SET text = ? WHERE id = ? AND /* once */', [text, hwId]);
        await sendTelegram(env, chatId, `✅ Завдання #${hwId} успішно оновлено!`, {
          reply_markup: { inline_keyboard: [[{ text: '⬅️ В меню', callback_data: 'menu_main' }]] }
        });
        return;
      }
    }
  }

  if (command === '/start' || command === '/menu' || command === '/homework') {
    await sendChatAction(env, chatId, 'typing');
    await sleep(400);
    await sendTelegram(env, chatId, '📚 Головне меню Кампус Пульс', {
      reply_markup: {
        inline_keyboard: [
          [{ text: '➕ Додати ДЗ на сьогодні', callback_data: 'menu_add' }],
          [{ text: '✏️ Редагувати ДЗ', callback_data: 'menu_edit' }],
          [{ text: '✅ Завершити / Видалити ДЗ', callback_data: 'menu_del' }]
        ]
      }
    });
    return;
  }

  const dateInfo = kyivDateInfo();
  const weekType = currentWeekType();

  if (command === '/today') {
    await sendChatAction(env, chatId, 'typing');
    await sleep(400);
    const reply = DAY_LABELS[dateInfo.dayKey]
      ? await scheduleText(env.DB, dateInfo.dayKey, weekType)
      : 'Сьогодні вихідний!';
    await sendTelegram(env, chatId, reply);
    return;
  }

  if (command === '/week') {
    await sendChatAction(env, chatId, 'typing');
    await sleep(600);
    const days = [];
    for (const dayKey of Object.keys(DAY_LABELS)) days.push(await scheduleText(env.DB, dayKey, weekType));
    await sendTelegram(env, chatId, days.join('\n\n'));
    return;
  }

  await sendTelegram(env, chatId, 'Невідома команда. Натисніть /start для виклику меню.');
}
async function handleApi(request, env, url) {
    // 1. Rate Limiting Protection
    const clientIP = request.headers.get('cf-connecting-ip');
    if (clientIP && isRateLimited(clientIP)) {
      return new Response('Занадто багато запитів (Rate Limit Exceeded)', { status: 429, headers: JSON_HEADERS });
    }

  const cors = getCorsHeaders(request, env)
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors })

  let response;

  const scheduleMatch = url.pathname.match(/^\/api\/schedule\/(odd|even)$/)
  if (request.method === 'GET' && scheduleMatch) {
    const dayKey = url.searchParams.get('day')
    if (dayKey && !DAY_LABELS[dayKey]) response = json({ detail: 'Невірний день тижня' }, 422)
    else response = json(await getSchedule(env.DB, scheduleMatch[1], dayKey))
  }
  else if (request.method === 'GET' && url.pathname === '/api/homework') {
    const result = await env.DB.prepare('SELECT * FROM homework WHERE completed = 0 ORDER BY due_date, id').all()
    response = json(result.results)
  }
  else if (request.method === 'POST' && url.pathname === '/api/reports') {
    const ip = request.headers.get('cf-connecting-ip') || 'unknown'
    const now = Math.floor(Date.now() / 1000)
    const key = `report-ip:${ip}`
    await env.DB.prepare(`
      INSERT INTO auth_attempts (key, attempts, reset_at) VALUES (?1, 1, ?2)
      ON CONFLICT(key) DO UPDATE SET
        attempts = CASE WHEN auth_attempts.reset_at <= ?3 THEN 1 ELSE auth_attempts.attempts + 1 END,
        reset_at = CASE WHEN auth_attempts.reset_at <= ?3 THEN ?2 ELSE auth_attempts.reset_at END
    `).bind(key, now + 3600, now).run()
    
    const row = await env.DB.prepare('SELECT attempts FROM auth_attempts WHERE key = ?1').bind(key).first()
    if (Number(row?.attempts || 0) > 3) {
      response = json({ detail: 'Забагато звітів. Спробуйте пізніше' }, 429)
    } else {
      const body = await readJson(request)
      if (!body?.text || typeof body.text !== 'string' || !body.text.trim()) {
        response = json({ detail: 'Додайте текст повідомлення' }, 422)
      } else if (body.text.trim().length > 2000) {
        response = json({ detail: 'Скоротіть повідомлення до 2000 символів' }, 422)
      } else {
        const reportText = body.text.trim()
        const result = await env.DB.prepare('INSERT INTO error_reports (text, reporter_chat_id) VALUES (?, ?)')
          .bind(reportText, body.reporter_chat_id ? String(body.reporter_chat_id).slice(0, 64) : null).run()
        response = json({ id: result.meta.last_row_id, text: reportText }, 201)
      }
    }
  } else {
    response = json({ detail: 'Маршрут API не знайдено' }, 404)
  }

  return new Response(response.body, { status: response.status, headers: cors })
}

export default {
  async fetch(request, env) {
    try {
      const url = new URL(request.url)

      if (url.pathname === '/api/app-update') {
        return await handleAppUpdate(request, env)
      }

      if (url.pathname.startsWith('/api/')) {
        if (!env.DB) return json({ detail: 'База даних ще не підключена' }, 503)
        if (url.pathname.startsWith('/api/auth/')) return await handleAuth(request, env, url)
        await ensureSeedData(env.DB)
        return await handleApi(request, env, url)
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
        await handleTelegramUpdate(env, await readJson(request, 65536))
        return json({ ok: true })
      }

      if (!env.ASSETS || typeof env.ASSETS.fetch !== 'function') {
        return new Response('Кампус Пульс: сховище статичних файлів недоступне.', { status: 503 })
      }

      const response = await env.ASSETS.fetch(request)
      if (response.status !== 404 || request.method !== 'GET') return response

      if (url.pathname.startsWith('/updates/')) return response

      url.pathname = '/index.html'
      return await env.ASSETS.fetch(new Request(url, request))
    } catch (error) {
      if (error instanceof RequestError) return json({ detail: error.message }, error.status)
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
