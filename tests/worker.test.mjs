import test, { before, beforeEach, after } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { Miniflare } from 'miniflare'
import { weeklySchedules } from '../src/data/schedule.js'

let runtime, db, messages, failTelegram, badManifest
let updateId = 1000
const manifest = { version: '1.0.2', file: 'bundles/campus-pulse-1.0.2.zip', checksum: 'a'.repeat(64) }
const call = (path, options) => runtime.dispatchFetch(`https://campus.test${path}`, options)
const authCall = (path, body, cookie) => call(path, {
  method: 'POST',
  headers: {
    'content-type': 'application/json',
    origin: 'https://campus.test',
    ...(cookie ? { cookie } : {}),
  },
  body: JSON.stringify(body),
})
const hook = (text, { sender = 123, chat = sender, secret = 'test-secret', id = ++updateId } = {}) => call('/telegram/webhook', {
  method: 'POST', headers: { 'x-telegram-bot-api-secret-token': secret, 'content-type': 'application/json' },
  body: JSON.stringify({ update_id: id, message: { chat: { id: chat }, from: { id: sender }, text } }),
})

before(async () => {
  runtime = new Miniflare({
    cf: false,
    workers: [{ config: {
      name: 'campus-test', type: 'worker',
      compatibilityDate: '2026-09-03', compatibilityFlags: ['nodejs_compat'],
      manifest: { mainModule: 'index.js', modules: {
        'index.js': {
          type: 'esm', contents: await readFile(new URL('../worker/index.js', import.meta.url), 'utf8'),
        },
        'auth.js': {
          type: 'esm', contents: await readFile(new URL('../worker/auth.js', import.meta.url), 'utf8'),
        },
      } },
      env: {
        DB: { type: 'd1' },
        TELEGRAM_BOT_TOKEN: { type: 'text', value: 'fake-token' },
        TELEGRAM_ADMIN_CHAT_ID: { type: 'text', value: '123' },
        TELEGRAM_WEBHOOK_SECRET: { type: 'text', value: 'test-secret' },
        SESSION_SECRET: { type: 'text', value: 'test-session-secret-with-at-least-32-characters' },
        PASSWORD_PEPPER: { type: 'text', value: 'test-password-pepper-with-at-least-32-characters' },
        PUBLIC_ORIGIN: { type: 'text', value: 'https://campus.test' },
        ASSETS: { type: 'fetcher', handler: async () => badManifest ? new Response('invalid-json') : Response.json(manifest) },
      },
    }, dev: { outboundService: { type: 'fetcher', handler: async (request) => {
      assert.equal(new URL(request.url).hostname, 'api.telegram.org')
      messages.push(await request.json())
      return failTelegram ? new Response('error', { status: 503 }) : Response.json({ ok: true })
    } } } }],
  })
  db = await runtime.getD1Database('DB')
  for (const file of ['0000_shiny_roughhouse.sql', '0001_telegram_updates.sql', '0002_accounts.sql', '0003_password_algorithm.sql']) {
    const sql = await readFile(new URL(`../drizzle/${file}`, import.meta.url), 'utf8')
    for (const statement of sql.split(';').filter((part) => part.trim())) await db.prepare(statement).run()
  }
})

beforeEach(async () => {
  messages = []; failTelegram = false; badManifest = false
  await db.batch(['sessions', 'users', 'auth_attempts', 'schedule_entries', 'homework', 'error_reports', 'telegram_updates'].map((table) => db.prepare(`DELETE FROM ${table}`)))
})
after(async () => { await runtime?.dispose() })

test('D1 seed matches the frontend and validates schedule requests', async () => {
  const response = await call('/api/schedule/odd')
  assert.equal(response.status, 200)
  const rows = await response.json()
  assert.equal(rows.length, 20)
  for (const row of rows) {
    const lesson = weeklySchedules.odd[row.day_key].find((item) => item.period === row.period)
    assert.equal(row.subject, lesson.isEmpty ? null : lesson.subject)
    assert.equal(row.room, lesson.isEmpty ? null : lesson.room)
  }
  assert.equal((await call('/api/schedule/odd?day=invalid')).status, 422)
})

test('account registration stores only a password hash and creates a protected session', async () => {
  const response = await authCall('/api/auth/register', {
    firstName: 'Олена', lastName: 'Коваль', email: 'Olena@example.com', password: 'довга парольна фраза 2026',
  })
  assert.equal(response.status, 201)
  const cookie = response.headers.get('set-cookie')
  assert.match(cookie, /^__Host-campus_session=/)
  assert.match(cookie, /HttpOnly/i)
  assert.match(cookie, /Secure/i)
  assert.match(cookie, /SameSite=Lax/i)
  const payload = await response.json()
  assert.equal(payload.user.email, 'olena@example.com')
  assert.equal(payload.user.hasPassword, true)
  assert.equal(payload.user.passwordHash, undefined)

  const stored = await db.prepare('SELECT password_hash, password_salt, password_iterations FROM users WHERE email = ?1').bind('olena@example.com').first()
  assert.notEqual(stored.password_hash, 'довга парольна фраза 2026')
  assert.ok(stored.password_salt)
  assert.equal(stored.password_iterations, 100000)

  const sessionCookie = cookie.split(';', 1)[0]
  const me = await call('/api/auth/me', { headers: { cookie: sessionCookie } })
  assert.equal((await me.json()).user.firstName, 'Олена')

  const logout = await authCall('/api/auth/logout', {}, sessionCookie)
  assert.equal(logout.status, 200)
  assert.equal((await (await call('/api/auth/me', { headers: { cookie: sessionCookie } })).json()).user, null)
})

test('account login uses generic errors and rejects cross-origin mutations', async () => {
  await authCall('/api/auth/register', {
    firstName: 'Іван', lastName: 'Петренко', email: 'ivan@example.com', password: 'correct horse battery staple',
  })
  const wrong = await authCall('/api/auth/login', { email: 'ivan@example.com', password: 'wrong password' })
  assert.equal(wrong.status, 401)
  assert.equal((await wrong.json()).detail, 'Невірна пошта або пароль')

  const crossOrigin = await call('/api/auth/login', {
    method: 'POST', headers: { origin: 'https://evil.example', 'content-type': 'application/json' },
    body: JSON.stringify({ email: 'ivan@example.com', password: 'correct horse battery staple' }),
  })
  assert.equal(crossOrigin.status, 403)

  const valid = await authCall('/api/auth/login', { email: 'ivan@example.com', password: 'correct horse battery staple' })
  assert.equal(valid.status, 200)
  assert.match(valid.headers.get('set-cookie'), /HttpOnly/i)
})

test('Google login stays disabled until OAuth credentials are configured', async () => {
  const config = await (await call('/api/auth/config')).json()
  assert.equal(config.googleEnabled, false)
  assert.equal((await call('/api/auth/google')).status, 503)
})

test('webhook secret and sender identity are required, even in the admin chat', async () => {
  assert.equal((await hook('/cancel odd monday 1', { secret: 'wrong' })).status, 403)
  assert.equal((await hook('/cancel odd monday 1', { sender: 999, chat: 123 })).status, 200)
  const rows = await (await call('/api/schedule/odd?day=monday')).json()
  assert.equal(rows[0].subject, 'Екологія')
  assert.match(messages.at(-1).text, /лише куратору/)
})

test('replacing an empty slot clears obsolete teacher and route metadata', async () => {
  assert.equal((await hook('/setlesson odd monday 4 Новий предмет | 123')).status, 200)
  const row = await db.prepare("SELECT * FROM schedule_entries WHERE week_type='odd' AND day_key='monday' AND period=4").first()
  assert.equal(row.subject, 'Новий предмет')
  assert.equal(row.teacher, null)
  assert.equal(row.dossier, null)
  assert.equal(row.route, null)
})

test('impossible homework dates and invalid period numbers do not create records', async () => {
  for (const date of ['2026-99-99', '2026-02-29', '2026-04-31']) assert.equal((await hook(`/homework Math | Task | ${date}`)).status, 200)
  await hook('/cancel odd monday 6')
  await hook('/setlesson odd monday 5    | 123')
  assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM homework').first()).n, 0)
  assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM schedule_entries WHERE period=6').first()).n, 0)
  assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM schedule_entries WHERE period=5').first()).n, 0)
})

test('duplicate deliveries, including concurrent ones, create only one task', async () => {
  const id = ++updateId
  const replies = await Promise.all([hook('/homework Math | Task | 2026-09-10', { id }), hook('/homework Math | Task | 2026-09-10', { id })])
  assert.ok(replies.every((response) => response.status === 200))
  assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM homework').first()).n, 1)
})

test('a notification failure followed by a retry does not duplicate the mutation', async () => {
  const id = ++updateId
  failTelegram = true
  assert.equal((await hook('/homework Math | Task | 2026-09-10', { id })).status, 500)
  failTelegram = false
  assert.equal((await hook('/homework Math | Task | 2026-09-10', { id })).status, 200)
  assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM homework').first()).n, 1)
})

test('only the curator can complete homework, which disappears from active tasks', async () => {
  await hook('/homework Math | Task | 2026-09-10')
  const row = await db.prepare('SELECT id FROM homework').first()
  await hook('/homework', { sender: 999 })
  assert.match(messages.at(-1).text, new RegExp(`#${row.id}`))
  await hook(`/done ${row.id}`, { sender: 999 })
  assert.equal((await (await call('/api/homework')).json()).length, 1)
  await hook(`/done ${row.id}`)
  assert.equal((await (await call('/api/homework')).json()).length, 0)
})

test('malformed and oversized reports have controlled errors without trusting Content-Length', async () => {
  assert.equal((await call('/api/reports', { method: 'POST', body: 'oops' })).status, 400)
  assert.equal((await call('/api/reports', { method: 'POST', body: JSON.stringify({ text: 'x'.repeat(9000) }) })).status, 413)
  assert.equal((await call('/api/reports', { method: 'POST', body: 'null' })).status, 400)
  assert.equal((await call('/api/reports', { method: 'POST', body: JSON.stringify({ text: 'x'.repeat(2001) }) })).status, 422)
})

test('OTA understands prereleases and does not report a downgrade as the installed version', async () => {
  const update = async (version) => (await call('/api/app-update', { method: 'POST', body: JSON.stringify({ app_id: 'ua.edu.campus.pulse', version_name: version }) })).json()
  assert.equal((await update('1.0.2-beta')).version, '1.0.2')
  assert.ok((await update('1.0.1')).url)
  assert.equal((await update('1.0.2')).kind, 'up_to_date')
  assert.equal((await update('1.0.3')).version, '1.0.3')
  for (const version of ['1.0.2-01', '1.0.2-beta..1', '1.0.2+build..1', '999999999999999999999.0.0']) {
    const response = await call('/api/app-update', { method: 'POST', body: JSON.stringify({ app_id: 'ua.edu.campus.pulse', version_name: version }) })
    assert.equal(response.status, 400)
  }
  badManifest = true
  const response = await call('/api/app-update')
  assert.equal(response.status, 500)
  assert.equal((await response.json()).detail, 'Внутрішня помилка сервера')
})

test('asynchronous database errors are caught by the request handler', async () => {
  await call('/api/schedule/odd')
  await db.prepare('ALTER TABLE homework RENAME TO homework_hidden').run()
  try {
    const response = await call('/api/homework')
    assert.equal(response.status, 500)
    assert.equal((await response.json()).detail, 'Внутрішня помилка сервера')
  } finally { await db.prepare('ALTER TABLE homework_hidden RENAME TO homework').run() }
})
