import { pbkdf2 } from 'node:crypto'

const encoder = new TextEncoder()
const SESSION_SECONDS = 60 * 60 * 24 * 30
const PASSWORD_ITERATIONS = 100_000
const PASSWORD_BYTES = 32
const PASSWORD_ALGORITHM = 'pbkdf2-sha256-hmacpepper-v1'
const AUTH_HEADERS = {
  'cache-control': 'no-store',
  'content-type': 'application/json; charset=utf-8',
  'referrer-policy': 'no-referrer',
  'x-content-type-options': 'nosniff',
}

function authJson(data, status = 200, extraHeaders = undefined) {
  const headers = new Headers(AUTH_HEADERS)
  if (extraHeaders) {
    for (const [name, value] of Object.entries(extraHeaders)) headers.append(name, value)
  }
  return new Response(JSON.stringify(data), { status, headers })
}

function bytesToBase64Url(bytes) {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '')
}

function base64UrlToBytes(value) {
  const padded = value.replaceAll('-', '+').replaceAll('_', '/') + '='.repeat((4 - value.length % 4) % 4)
  const binary = atob(padded)
  return Uint8Array.from(binary, (character) => character.charCodeAt(0))
}

function randomToken(length = 32) {
  const bytes = new Uint8Array(length)
  crypto.getRandomValues(bytes)
  return bytesToBase64Url(bytes)
}

async function sha256(value) {
  return bytesToBase64Url(new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(value))))
}

async function safeEqual(left, right) {
  if (typeof left !== 'string' || typeof right !== 'string') return false
  const [leftHash, rightHash] = await Promise.all([
    crypto.subtle.digest('SHA-256', encoder.encode(left)),
    crypto.subtle.digest('SHA-256', encoder.encode(right)),
  ])
  return crypto.subtle.timingSafeEqual(leftHash, rightHash)
}

async function pepperPassword(password, pepper) {
  const key = await crypto.subtle.importKey(
    'raw', encoder.encode(pepper), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  )
  return new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(password)))
}

async function hashPassword(password, pepper, salt = randomToken(16), iterations = PASSWORD_ITERATIONS) {
  const peppered = await pepperPassword(password, pepper)
  const derived = await new Promise((resolve, reject) => {
    pbkdf2(peppered, base64UrlToBytes(salt), iterations, PASSWORD_BYTES, 'sha256', (error, key) => {
      if (error) reject(error)
      else resolve(key)
    })
  })
  return { hash: bytesToBase64Url(new Uint8Array(derived)), salt, iterations }
}

function normalizeEmail(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : ''
}

function validEmail(value) {
  return value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)
}

function normalizeName(value) {
  return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : ''
}

function validName(value) {
  return value.length >= 1 && value.length <= 60 && /^[\p{L}\p{M}][\p{L}\p{M}'’\- ]*$/u.test(value)
}

function validPassword(value) {
  return typeof value === 'string'
    && value.length >= 10
    && value.length <= 128
    && encoder.encode(value).byteLength <= 256
}

async function readAuthJson(request) {
  if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) {
    return { error: authJson({ detail: 'Очікується JSON-запит' }, 415) }
  }
  if (Number(request.headers.get('content-length')) > 4096) {
    return { error: authJson({ detail: 'Запит завеликий' }, 413) }
  }
  const origin = request.headers.get('origin')
  if (!origin || origin !== new URL(request.url).origin) {
    return { error: authJson({ detail: 'Запит відхилено' }, 403) }
  }
  const reader = request.body?.getReader()
  if (!reader) return { error: authJson({ detail: 'Порожній запит' }, 400) }
  let size = 0
  let source = ''
  const decoder = new TextDecoder()
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      size += value.byteLength
      if (size > 4096) {
        await reader.cancel()
        return { error: authJson({ detail: 'Запит завеликий' }, 413) }
      }
      source += decoder.decode(value, { stream: true })
    }
    const body = JSON.parse(source + decoder.decode())
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('invalid')
    return { body }
  } catch {
    return { error: authJson({ detail: 'Невірний формат запиту' }, 400) }
  } finally {
    reader.releaseLock()
  }
}

function cookieName(request) {
  return new URL(request.url).protocol === 'https:' ? '__Host-campus_session' : 'campus_session'
}

function cookieValue(request, name) {
  const source = request.headers.get('cookie') || ''
  for (const part of source.split(';')) {
    const separator = part.indexOf('=')
    if (separator < 0) continue
    if (part.slice(0, separator).trim() === name) return part.slice(separator + 1).trim()
  }
  return null
}

function sessionCookie(request, token, maxAge = SESSION_SECONDS) {
  const secure = new URL(request.url).protocol === 'https:' ? '; Secure' : ''
  return `${cookieName(request)}=${token}; Path=/; HttpOnly${secure}; SameSite=Lax; Max-Age=${maxAge}`
}

function oauthCookie(request, suffix, value, maxAge = 600) {
  const secureRequest = new URL(request.url).protocol === 'https:'
  const prefix = secureRequest ? '__Host-' : ''
  const secure = secureRequest ? '; Secure' : ''
  return `${prefix}campus_oauth_${suffix}=${value}; Path=/; HttpOnly${secure}; SameSite=Lax; Max-Age=${maxAge}`
}

function oauthCookieValue(request, suffix) {
  const prefix = new URL(request.url).protocol === 'https:' ? '__Host-' : ''
  return cookieValue(request, `${prefix}campus_oauth_${suffix}`)
}

function publicUser(row) {
  return {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    email: row.email,
    isAdmin: Boolean(row.is_admin),
    hasPassword: Boolean(row.password_hash),
    googleConnected: Boolean(row.google_sub),
  }
}

async function createSession(request, db, userId) {
  const token = randomToken()
  const tokenHash = await sha256(token)
  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_SECONDS
  await db.batch([
    db.prepare('DELETE FROM sessions WHERE expires_at <= ?1').bind(Math.floor(Date.now() / 1000)),
    db.prepare('INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?1, ?2, ?3)')
      .bind(tokenHash, userId, expiresAt),
  ])
  return { token, expiresAt }
}

async function currentSession(request, db) {
  const token = cookieValue(request, cookieName(request))
  if (!token) return null
  const tokenHash = await sha256(token)
  const row = await db.prepare(`
    SELECT u.id, u.first_name, u.last_name, u.email, u.password_hash, u.google_sub, u.is_admin
    FROM sessions s
    INNER JOIN users u ON u.id = s.user_id
    WHERE s.token_hash = ?1 AND s.expires_at > ?2
  `).bind(tokenHash, Math.floor(Date.now() / 1000)).first()
  return row ? { tokenHash, user: publicUser(row) } : null
}

async function rateKey(env, scope, value) {
  const secret = await crypto.subtle.importKey(
    'raw', encoder.encode(env.SESSION_SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  )
  const signature = await crypto.subtle.sign('HMAC', secret, encoder.encode(`${scope}:${value}`))
  return bytesToBase64Url(new Uint8Array(signature))
}

async function consumeLimit(db, key, maximum, windowSeconds) {
  const now = Math.floor(Date.now() / 1000)
  const resetAt = now + windowSeconds
  await db.prepare(`
    INSERT INTO auth_attempts (key, attempts, reset_at) VALUES (?1, 1, ?2)
    ON CONFLICT(key) DO UPDATE SET
      attempts = CASE WHEN auth_attempts.reset_at <= ?3 THEN 1 ELSE auth_attempts.attempts + 1 END,
      reset_at = CASE WHEN auth_attempts.reset_at <= ?3 THEN ?2 ELSE auth_attempts.reset_at END
  `).bind(key, resetAt, now).run()
  const row = await db.prepare('SELECT attempts, reset_at FROM auth_attempts WHERE key = ?1').bind(key).first()
  return { allowed: Number(row?.attempts || 0) <= maximum, retryAfter: Math.max(1, Number(row?.reset_at || resetAt) - now) }
}

async function applyLoginLimit(request, env, email) {
  const ip = request.headers.get('cf-connecting-ip') || 'unknown'
  const [identityKey, ipKey] = await Promise.all([
    rateKey(env, 'login-email', email),
    rateKey(env, 'login-ip', ip),
  ])
  const [identity, network] = await Promise.all([
    consumeLimit(env.DB, identityKey, 10, 15 * 60),
    consumeLimit(env.DB, ipKey, 60, 15 * 60),
  ])
  return { allowed: identity.allowed && network.allowed, retryAfter: Math.max(identity.retryAfter, network.retryAfter), identityKey }
}

async function applyRegisterLimit(request, env, email) {
  const ip = request.headers.get('cf-connecting-ip') || 'unknown'
  const [identityKey, ipKey] = await Promise.all([
    rateKey(env, 'register-email', email),
    rateKey(env, 'register-ip', ip),
  ])
  const [identity, network] = await Promise.all([
    consumeLimit(env.DB, identityKey, 4, 60 * 60),
    consumeLimit(env.DB, ipKey, 15, 60 * 60),
  ])
  return { allowed: identity.allowed && network.allowed, retryAfter: Math.max(identity.retryAfter, network.retryAfter) }
}

function configurationReady(env) {
  return typeof env.SESSION_SECRET === 'string' && env.SESSION_SECRET.length >= 32
    && typeof env.PASSWORD_PEPPER === 'string' && env.PASSWORD_PEPPER.length >= 32
}

function googleReady(env) {
  return configurationReady(env) && Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET)
}

function configuredOrigin(request, env) {
  if (!env.PUBLIC_ORIGIN) return new URL(request.url).origin
  const parsed = new URL(env.PUBLIC_ORIGIN)
  if (parsed.protocol !== 'https:' || parsed.origin !== parsed.href.replace(/\/$/, '')) {
    throw new Error('PUBLIC_ORIGIN must be a bare HTTPS origin')
  }
  return parsed.origin
}

function googleFailure(request, env, reason = 'unknown') {
  const allowedReason = /^[a-z0-9_-]{1,64}$/.test(reason) ? reason : 'unknown'
  console.warn(JSON.stringify({ event: 'google_auth_rejected', reason: allowedReason }))
  const target = new URL('/', configuredOrigin(request, env))
  target.searchParams.set('auth', 'google-error')
  target.searchParams.set('reason', allowedReason)
  const response = new Response(null, { status: 302, headers: { location: target.href } })
  response.headers.append('set-cookie', oauthCookie(request, 'state', '', 0))
  response.headers.append('set-cookie', oauthCookie(request, 'verifier', '', 0))
  return response
}

async function startGoogle(request, env) {
  if (!googleReady(env)) return authJson({ detail: 'Вхід через Google ще не налаштовано' }, 503)
  const state = randomToken(24)
  const verifier = randomToken(48)
  const challenge = await sha256(verifier)
  const redirectUri = `${configuredOrigin(request, env)}/api/auth/google/callback`
  const authorization = new URL('https://accounts.google.com/o/oauth2/v2/auth')
  authorization.search = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    code_challenge: challenge,
    code_challenge_method: 'S256',
    prompt: 'select_account',
  }).toString()
  const response = new Response(null, { status: 302, headers: { location: authorization.href } })
  response.headers.append('set-cookie', oauthCookie(request, 'state', state))
  response.headers.append('set-cookie', oauthCookie(request, 'verifier', verifier))
  response.headers.set('cache-control', 'no-store')
  return response
}

async function finishGoogle(request, env, url) {
  if (!googleReady(env)) return googleFailure(request, env, 'configuration')
  const expectedState = oauthCookieValue(request, 'state')
  const verifier = oauthCookieValue(request, 'verifier')
  const state = url.searchParams.get('state')
  const code = url.searchParams.get('code')
  const issuer = url.searchParams.get('iss')
  const providerError = url.searchParams.get('error')
  if (providerError) return googleFailure(request, env, providerError === 'access_denied' ? 'access_denied' : 'provider_error')
  if (!code) return googleFailure(request, env, 'missing_code')
  if (!verifier || !expectedState || !await safeEqual(state, expectedState)) return googleFailure(request, env, 'invalid_state')
  if (issuer && issuer !== 'https://accounts.google.com') return googleFailure(request, env, 'invalid_issuer')

  try {
    const redirectUri = `${configuredOrigin(request, env)}/api/auth/google/callback`
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: env.GOOGLE_CLIENT_ID,
        client_secret: env.GOOGLE_CLIENT_SECRET,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
        code_verifier: verifier,
      }),
      signal: AbortSignal.timeout(10_000),
    })
    if (!tokenResponse.ok) {
      const failure = await tokenResponse.json().catch(() => ({}))
      const reason = typeof failure.error === 'string' && /^[a-z_]{1,40}$/.test(failure.error)
        ? `token_${failure.error}` : `token_http_${tokenResponse.status}`
      return googleFailure(request, env, reason)
    }
    const tokens = await tokenResponse.json()
    if (typeof tokens.access_token !== 'string') return googleFailure(request, env, 'missing_access_token')

    const profileResponse = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
      headers: { authorization: `Bearer ${tokens.access_token}` },
      signal: AbortSignal.timeout(10_000),
    })
    if (!profileResponse.ok) return googleFailure(request, env, `profile_http_${profileResponse.status}`)
    const profile = await profileResponse.json()
    const email = normalizeEmail(profile.email)
    if (!profile.sub || profile.email_verified !== true || !validEmail(email)) return googleFailure(request, env, 'invalid_profile')

    let user = await env.DB.prepare(`
      SELECT id, first_name, last_name, email, password_hash, google_sub, is_admin
      FROM users WHERE google_sub = ?1 OR email = ?2 COLLATE NOCASE
      ORDER BY CASE WHEN google_sub = ?1 THEN 0 ELSE 1 END LIMIT 1
    `).bind(String(profile.sub), email).first()

    if (user?.google_sub && user.google_sub !== String(profile.sub)) return googleFailure(request, env, 'account_conflict')
    if (user) {
      await env.DB.prepare(`
        UPDATE users SET google_sub = ?1, last_login_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?2
      `).bind(String(profile.sub), user.id).run()
      user = { ...user, google_sub: String(profile.sub) }
    } else {
      const id = crypto.randomUUID()
      const firstName = normalizeName(profile.given_name) || normalizeName(profile.name?.split(' ')[0]) || 'Студент'
      const lastName = normalizeName(profile.family_name) || normalizeName(profile.name?.split(' ').slice(1).join(' ')) || 'Кампусу'
      await env.DB.prepare(`
        INSERT INTO users (id, first_name, last_name, email, google_sub, last_login_at)
        VALUES (?1, ?2, ?3, ?4, ?5, CURRENT_TIMESTAMP)
      `).bind(id, firstName.slice(0, 60), lastName.slice(0, 60), email, String(profile.sub)).run()
      user = { id, first_name: firstName.slice(0, 60), last_name: lastName.slice(0, 60), email, password_hash: null, google_sub: String(profile.sub), is_admin: 0 }
    }

    const session = await createSession(request, env.DB, user.id)
    const response = new Response(null, { status: 302, headers: { location: `${configuredOrigin(request, env)}/?auth=google-success` } })
    response.headers.append('set-cookie', oauthCookie(request, 'state', '', 0))
    response.headers.append('set-cookie', oauthCookie(request, 'verifier', '', 0))
    response.headers.append('set-cookie', sessionCookie(request, session.token))
    response.headers.set('cache-control', 'no-store')
    return response
  } catch (error) {
    console.error(JSON.stringify({ event: 'google_auth_failed', message: error instanceof Error ? error.message : 'unknown' }))
    return googleFailure(request, env, 'internal_error')
  }
}

async function register(request, env) {
  const parsed = await readAuthJson(request)
  if (parsed.error) return parsed.error
  const firstName = normalizeName(parsed.body.firstName)
  const lastName = normalizeName(parsed.body.lastName)
  const email = normalizeEmail(parsed.body.email)
  const password = parsed.body.password
  if (!validName(firstName) || !validName(lastName) || !validEmail(email) || !validPassword(password)) {
    return authJson({ detail: 'Перевірте ім’я, прізвище, пошту та пароль від 10 символів' }, 422)
  }
  const limit = await applyRegisterLimit(request, env, email)
  if (!limit.allowed) return authJson({ detail: 'Забагато спроб. Спробуйте пізніше' }, 429, { 'retry-after': String(limit.retryAfter) })
  if (await env.DB.prepare('SELECT id FROM users WHERE email = ?1 COLLATE NOCASE').bind(email).first()) {
    return authJson({ detail: 'Не вдалося створити акаунт із цими даними' }, 409)
  }

  const passwordRecord = await hashPassword(password, env.PASSWORD_PEPPER)
  const id = crypto.randomUUID()
  try {
    await env.DB.prepare(`
      INSERT INTO users
        (id, first_name, last_name, email, password_hash, password_salt, password_iterations, password_algorithm, last_login_at)
      VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, CURRENT_TIMESTAMP)
    `).bind(id, firstName, lastName, email, passwordRecord.hash, passwordRecord.salt, passwordRecord.iterations, PASSWORD_ALGORITHM).run()
  } catch {
    return authJson({ detail: 'Не вдалося створити акаунт із цими даними' }, 409)
  }
  const session = await createSession(request, env.DB, id)
  return authJson({ user: publicUser({ id, first_name: firstName, last_name: lastName, email, password_hash: passwordRecord.hash, google_sub: null, is_admin: 0 }) }, 201, {
    'set-cookie': sessionCookie(request, session.token),
  })
}

async function login(request, env) {
  const parsed = await readAuthJson(request)
  if (parsed.error) return parsed.error
  const email = normalizeEmail(parsed.body.email)
  const password = parsed.body.password
  if (!validEmail(email) || typeof password !== 'string' || password.length > 128 || encoder.encode(password).byteLength > 256) {
    return authJson({ detail: 'Невірна пошта або пароль' }, 401)
  }
  const limit = await applyLoginLimit(request, env, email)
  if (!limit.allowed) return authJson({ detail: 'Забагато спроб. Спробуйте пізніше' }, 429, { 'retry-after': String(limit.retryAfter) })

  const row = await env.DB.prepare(`
    SELECT id, first_name, last_name, email, password_hash, password_salt, password_iterations, password_algorithm, google_sub, is_admin
    FROM users WHERE email = ?1 COLLATE NOCASE
  `).bind(email).first()
  const storedSalt = row?.password_salt || 'quVxVcn2qQbQLpQdxkXsxQ'
  const storedIterations = Number(row?.password_iterations || PASSWORD_ITERATIONS)
  const supportedAlgorithm = !row || row.password_algorithm === PASSWORD_ALGORITHM
  const candidate = await hashPassword(password, env.PASSWORD_PEPPER, storedSalt, storedIterations)
  const valid = supportedAlgorithm && row?.password_hash ? await safeEqual(candidate.hash, row.password_hash) : false
  if (!valid) return authJson({ detail: 'Невірна пошта або пароль' }, 401)

  await env.DB.batch([
    env.DB.prepare('DELETE FROM auth_attempts WHERE key = ?1').bind(limit.identityKey),
    env.DB.prepare('UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = ?1').bind(row.id),
  ])
  const session = await createSession(request, env.DB, row.id)
  return authJson({ user: publicUser(row) }, 200, { 'set-cookie': sessionCookie(request, session.token) })
}

async function logout(request, env) {
  const parsed = await readAuthJson(request)
  if (parsed.error) return parsed.error
  const session = await currentSession(request, env.DB)
  if (session) await env.DB.prepare('DELETE FROM sessions WHERE token_hash = ?1').bind(session.tokenHash).run()
  return authJson({ ok: true }, 200, { 'set-cookie': sessionCookie(request, '', 0) })
}

export async function requireAdmin(request, env) {
  const session = await currentSession(request, env.DB)
  if (!session || !session.user.isAdmin) {
    return authJson({ detail: 'Недостатньо прав' }, 403)
  }
  return { user: session.user }
}

export async function handleAuth(request, env, url) {

  if (!configurationReady(env)) return authJson({ detail: 'Система акаунтів ще не налаштована' }, 503)

  if (request.method === 'GET' && url.pathname === '/api/auth/config') {
    return authJson({ googleEnabled: googleReady(env) })
  }
  if (request.method === 'GET' && url.pathname === '/api/auth/me') {
    const session = await currentSession(request, env.DB)
    return authJson({ user: session?.user || null })
  }
  if (request.method === 'POST' && url.pathname === '/api/auth/register') return register(request, env)
  if (request.method === 'POST' && url.pathname === '/api/auth/login') return login(request, env)
  if (request.method === 'POST' && url.pathname === '/api/auth/logout') return logout(request, env)
  if (request.method === 'GET' && url.pathname === '/api/auth/google') return startGoogle(request, env)
  if (request.method === 'GET' && url.pathname === '/api/auth/google/callback') return finishGoogle(request, env, url)
  return authJson({ detail: 'Маршрут акаунтів не знайдено' }, 404)
}
