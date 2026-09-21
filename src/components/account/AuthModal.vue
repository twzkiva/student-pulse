<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, useTemplateRef, watch } from 'vue'
import {
  ArrowRightStartOnRectangleIcon,
  CheckCircleIcon,
  EyeIcon,
  EyeSlashIcon,
  ShieldCheckIcon,
  UserCircleIcon,
  XMarkIcon,
} from '@heroicons/vue/24/outline'

const props = defineProps({
  user: { type: Object, default: null },
  status: { type: String, required: true },
  error: { type: String, default: '' },
  notice: { type: String, default: '' },
  googleEnabled: { type: Boolean, default: false },
  googleUrl: { type: String, required: true },
})

const emit = defineEmits(['close', 'login', 'register', 'logout', 'clear-error'])
const mode = ref('login')
const showPassword = ref(false)
const firstName = ref('')
const lastName = ref('')
const email = ref('')
const password = ref('')
const panel = useTemplateRef('panel')
const closeButton = useTemplateRef('closeButton')
let previouslyFocused
let previousOverflow

const submitting = computed(() => props.status === 'submitting')
const title = computed(() => props.user ? 'Мій акаунт' : mode.value === 'login' ? 'Раді бачити знову' : 'Створити акаунт')

function setMode(nextMode) {
  mode.value = nextMode
  password.value = ''
  emit('clear-error')
}

function submit() {
  if (submitting.value) return
  if (mode.value === 'login') emit('login', { email: email.value, password: password.value })
  else emit('register', {
    firstName: firstName.value,
    lastName: lastName.value,
    email: email.value,
    password: password.value,
  })
}

function handleKeydown(event) {
  if (event.key === 'Escape') {
    emit('close')
    return
  }
  if (event.key !== 'Tab' || !panel.value) return
  const focusable = [...panel.value.querySelectorAll(
    'button:not([disabled]), a[href], input:not([disabled]), [tabindex]:not([tabindex="-1"])',
  )].filter((element) => element.tabIndex >= 0)
  if (!focusable.length) return
  const first = focusable[0]
  const last = focusable.at(-1)
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault(); last.focus()
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault(); first.focus()
  }
}

watch([mode, email, password, firstName, lastName], () => emit('clear-error'))

onMounted(async () => {
  previouslyFocused = document.activeElement
  previousOverflow = document.body.style.overflow
  document.body.style.overflow = 'hidden'
  document.addEventListener('keydown', handleKeydown)
  await nextTick()
  closeButton.value?.focus()
})

onBeforeUnmount(() => {
  document.body.style.overflow = previousOverflow
  document.removeEventListener('keydown', handleKeydown)
  previouslyFocused?.focus?.()
})
</script>

<template>
  <Teleport to="body">
    <Transition name="auth" appear>
      <div class="auth-backdrop" @mousedown.self="emit('close')">
        <section ref="panel" class="auth-panel" role="dialog" aria-modal="true" aria-labelledby="auth-title">
          <header class="auth-header">
            <div class="auth-heading">
              <span class="auth-mark" aria-hidden="true"><UserCircleIcon /></span>
              <div>
                <p class="eyebrow">Кампус Пульс</p>
                <h2 id="auth-title">{{ title }}</h2>
              </div>
            </div>
            <button ref="closeButton" class="icon-button" type="button" aria-label="Закрити" @click="emit('close')">
              <XMarkIcon aria-hidden="true" />
            </button>
          </header>

          <div v-if="user" class="profile-content">
            <div class="profile-card">
              <span class="profile-avatar" aria-hidden="true">{{ user.firstName?.[0] }}{{ user.lastName?.[0] }}</span>
              <div>
                <h3>{{ user.firstName }} {{ user.lastName }}</h3>
                <p>{{ user.email }}</p>
              </div>
            </div>
            <div class="connection-list">
              <div>
                <CheckCircleIcon aria-hidden="true" />
                <span><strong>Акаунт активний</strong><small>Сесія захищена HttpOnly cookie</small></span>
              </div>
              <div v-if="user.googleConnected">
                <CheckCircleIcon aria-hidden="true" />
                <span><strong>Google підключено</strong><small>Можна входити через Google</small></span>
              </div>
            </div>
            <p v-if="error" class="auth-message error" role="alert">{{ error }}</p>
            <button class="secondary-action danger-action" type="button" :disabled="submitting" @click="emit('logout')">
              <ArrowRightStartOnRectangleIcon aria-hidden="true" />
              {{ submitting ? 'Виходимо…' : 'Вийти з акаунта' }}
            </button>
          </div>

          <div v-else class="auth-content">
            <div class="mode-switch" role="tablist" aria-label="Вхід або реєстрація">
              <button type="button" role="tab" :aria-selected="mode === 'login'" :class="{ active: mode === 'login' }" @click="setMode('login')">Вхід</button>
              <button type="button" role="tab" :aria-selected="mode === 'register'" :class="{ active: mode === 'register' }" @click="setMode('register')">Реєстрація</button>
            </div>

            <p v-if="notice" class="auth-message success" role="status">{{ notice }}</p>

            <a v-if="googleEnabled" class="google-action" :href="googleUrl">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M21.6 12.2c0-.7-.1-1.4-.2-2H12v3.8h5.4a4.6 4.6 0 0 1-2 3v2.5h3.2c1.9-1.7 3-4.3 3-7.3Z"/><path fill="#34A853" d="M12 22c2.7 0 5-.9 6.6-2.4l-3.2-2.5c-.9.6-2 1-3.4 1a5.8 5.8 0 0 1-5.4-4h-3.3v2.6A10 10 0 0 0 12 22Z"/><path fill="#FBBC05" d="M6.6 14a6 6 0 0 1 0-4V7.4H3.3a10 10 0 0 0 0 9.2L6.6 14Z"/><path fill="#EA4335" d="M12 6.1c1.5 0 2.8.5 3.8 1.5l2.8-2.8A9.4 9.4 0 0 0 3.3 7.4L6.6 10A5.8 5.8 0 0 1 12 6.1Z"/></svg>
              Продовжити з Google
            </a>
            <div v-else class="google-disabled" aria-label="Вхід через Google ще налаштовується">
              <ShieldCheckIcon aria-hidden="true" />
              Google-вхід буде доступний після підключення ключів
            </div>

            <div class="divider"><span>або через пошту</span></div>

            <form class="auth-form" @submit.prevent="submit">
              <div v-if="mode === 'register'" class="name-grid">
                <label>
                  <span>Ім’я</span>
                  <input v-model="firstName" name="given-name" autocomplete="given-name" required maxlength="60" placeholder="Олексій" />
                </label>
                <label>
                  <span>Прізвище</span>
                  <input v-model="lastName" name="family-name" autocomplete="family-name" required maxlength="60" placeholder="Коваль" />
                </label>
              </div>
              <label>
                <span>Пошта</span>
                <input v-model="email" name="email" type="email" autocomplete="email" inputmode="email" required maxlength="254" placeholder="name@gmail.com" />
              </label>
              <label>
                <span>Пароль</span>
                <span class="password-field">
                  <input v-model="password" name="password" :type="showPassword ? 'text' : 'password'" :autocomplete="mode === 'login' ? 'current-password' : 'new-password'" required minlength="10" maxlength="128" placeholder="Щонайменше 10 символів" />
                  <button type="button" :aria-label="showPassword ? 'Сховати пароль' : 'Показати пароль'" @click="showPassword = !showPassword">
                    <EyeSlashIcon v-if="showPassword" aria-hidden="true" />
                    <EyeIcon v-else aria-hidden="true" />
                  </button>
                </span>
                <small v-if="mode === 'register'">Дозволені довгі фрази, пробіли й українські символи.</small>
              </label>

              <p v-if="error" class="auth-message error" role="alert">{{ error }}</p>
              <button class="primary-action" type="submit" :disabled="submitting">
                {{ submitting ? 'Зачекайте…' : mode === 'login' ? 'Увійти' : 'Створити акаунт' }}
              </button>
            </form>

            <p class="security-note"><ShieldCheckIcon aria-hidden="true" />Пароль хешується на сервері й ніколи не зберігається відкритим текстом.</p>
          </div>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.auth-backdrop { position: fixed; z-index: 120; inset: 0; display: flex; align-items: flex-end; justify-content: center; padding: 0.75rem 0.75rem max(0.75rem, env(safe-area-inset-bottom)); background: var(--overlay); backdrop-filter: blur(12px); }
.auth-panel { width: min(100%, 31rem); max-height: calc(100svh - 1.5rem); overflow-y: auto; border: 1px solid var(--border); border-radius: 1.5rem; color: var(--text-primary); background: var(--surface-raised); box-shadow: var(--shadow-modal); }
.auth-header { position: sticky; z-index: 2; top: 0; display: flex; align-items: center; justify-content: space-between; gap: 1rem; padding: 1rem; border-bottom: 1px solid var(--border); background: color-mix(in srgb, var(--surface-raised) 94%, transparent); backdrop-filter: blur(16px); }
.auth-heading { display: flex; align-items: center; gap: 0.75rem; }
.auth-heading h2 { margin: 0.25rem 0 0; font-size: 1.2rem; letter-spacing: -0.03em; }
.auth-mark, .icon-button { display: grid; width: 3rem; height: 3rem; flex: none; place-items: center; border: 1px solid var(--border); border-radius: 0.9rem; }
.auth-mark { color: var(--accent); background: var(--accent-soft); }
.auth-mark svg, .icon-button svg { width: 1.3rem; height: 1.3rem; }
.icon-button { color: var(--text-primary); background: var(--surface-soft); }
.auth-content, .profile-content { display: grid; gap: 1rem; padding: 1rem; }
.mode-switch { display: grid; grid-template-columns: 1fr 1fr; gap: 0.25rem; padding: 0.25rem; border: 1px solid var(--border); border-radius: 0.9rem; background: var(--surface-soft); }
.mode-switch button { min-height: 2.75rem; border: 0; border-radius: 0.68rem; color: var(--text-secondary); background: transparent; font: inherit; font-size: 0.8rem; font-weight: 750; }
.mode-switch button.active { color: var(--text-primary); background: var(--surface); box-shadow: var(--shadow-sm); }
.google-action, .google-disabled { display: flex; min-height: 3.2rem; align-items: center; justify-content: center; gap: 0.7rem; padding: 0.75rem; border: 1px solid var(--border); border-radius: 0.9rem; color: var(--text-primary); background: var(--surface); font-size: 0.82rem; font-weight: 750; text-decoration: none; }
.google-action:hover { border-color: var(--accent-border); background: var(--surface-hover); }
.google-action svg, .google-disabled svg { width: 1.25rem; height: 1.25rem; flex: none; }
.google-disabled { color: var(--text-secondary); background: var(--surface-soft); font-size: 0.72rem; font-weight: 650; text-align: center; }
.divider { display: flex; align-items: center; gap: 0.7rem; color: var(--text-tertiary); font-size: 0.68rem; }
.divider::before, .divider::after { height: 1px; flex: 1; background: var(--border); content: ''; }
.auth-form { display: grid; gap: 0.9rem; }
.auth-form label { display: grid; gap: 0.4rem; color: var(--text-secondary); font-size: 0.72rem; font-weight: 700; }
.auth-form input { width: 100%; min-height: 3rem; padding: 0.7rem 0.8rem; border: 1px solid var(--border); border-radius: 0.8rem; color: var(--text-primary); background: var(--surface); font: inherit; font-size: 0.85rem; }
.auth-form input::placeholder { color: var(--text-tertiary); }
.auth-form label small { color: var(--text-tertiary); font-size: 0.66rem; font-weight: 500; line-height: 1.45; }
.name-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; }
.password-field { position: relative; display: block; }
.password-field input { padding-right: 3rem; }
.password-field button { position: absolute; top: 0; right: 0; display: grid; width: 3rem; height: 3rem; place-items: center; border: 0; color: var(--text-secondary); background: transparent; }
.password-field svg { width: 1.15rem; height: 1.15rem; }
.primary-action, .secondary-action { display: inline-flex; min-height: 3.1rem; align-items: center; justify-content: center; gap: 0.55rem; padding: 0.7rem 1rem; border-radius: 0.85rem; font: inherit; font-size: 0.8rem; font-weight: 750; }
.primary-action { border: 1px solid var(--accent); color: var(--on-accent); background: var(--accent); }
.primary-action:hover:not(:disabled) { background: var(--accent-hover); }
.primary-action:disabled, .secondary-action:disabled { cursor: wait; opacity: 0.65; }
.security-note { display: flex; align-items: flex-start; gap: 0.45rem; margin: 0; color: var(--text-tertiary); font-size: 0.66rem; line-height: 1.5; }
.security-note svg { width: 1rem; height: 1rem; flex: none; color: var(--accent); }
.auth-message { margin: 0; padding: 0.7rem 0.8rem; border: 1px solid var(--border); border-radius: 0.75rem; font-size: 0.74rem; line-height: 1.45; }
.auth-message.error { border-color: color-mix(in srgb, var(--danger) 45%, transparent); color: var(--danger); background: color-mix(in srgb, var(--danger) 8%, transparent); }
.auth-message.success { border-color: var(--accent-border); color: var(--text-primary); background: var(--accent-soft); }
.profile-card { display: flex; align-items: center; gap: 0.9rem; padding: 1rem; border: 1px solid var(--accent-border); border-radius: 1rem; background: var(--accent-soft); }
.profile-avatar { display: grid; width: 3.2rem; height: 3.2rem; flex: none; place-items: center; border-radius: 1rem; color: var(--on-accent); background: var(--accent); font-size: 0.85rem; font-weight: 800; text-transform: uppercase; }
.profile-card h3 { margin: 0; font-size: 1rem; }
.profile-card p { margin: 0.25rem 0 0; color: var(--text-secondary); font-size: 0.75rem; overflow-wrap: anywhere; }
.connection-list { display: grid; gap: 0.6rem; }
.connection-list > div { display: flex; align-items: center; gap: 0.7rem; padding: 0.8rem; border: 1px solid var(--border); border-radius: 0.85rem; background: var(--surface); }
.connection-list svg { width: 1.2rem; height: 1.2rem; flex: none; color: var(--accent); }
.connection-list span { display: grid; gap: 0.15rem; }
.connection-list strong { font-size: 0.76rem; }
.connection-list small { color: var(--text-secondary); font-size: 0.66rem; }
.secondary-action { border: 1px solid var(--border); color: var(--text-primary); background: var(--surface); }
.secondary-action svg { width: 1.1rem; height: 1.1rem; }
.danger-action { color: var(--danger); }
.auth-enter-active, .auth-leave-active { transition: opacity 180ms ease; }
.auth-enter-active .auth-panel, .auth-leave-active .auth-panel { transition: transform 260ms var(--ease-out), opacity 180ms ease; }
.auth-enter-from, .auth-leave-to { opacity: 0; }
.auth-enter-from .auth-panel, .auth-leave-to .auth-panel { opacity: 0; transform: translateY(1rem); }
@media (min-width: 640px) { .auth-backdrop { align-items: center; padding: 1.5rem; } }
@media (max-width: 430px) { .name-grid { grid-template-columns: 1fr; } }
</style>
