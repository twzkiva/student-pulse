<script setup>
import { computed } from 'vue'
import { UserCircleIcon } from '@heroicons/vue/24/outline'

const props = defineProps({
  user: { type: Object, default: null },
  loading: { type: Boolean, default: false },
})

defineEmits(['open'])

const initials = computed(() => props.user
  ? `${props.user.firstName?.[0] || ''}${props.user.lastName?.[0] || ''}`.toUpperCase()
  : '')
</script>

<template>
  <button
    class="account-trigger"
    type="button"
    :aria-label="user ? `Відкрити акаунт ${user.firstName} ${user.lastName}` : 'Увійти в акаунт'"
    :disabled="loading"
    @click="$emit('open')"
  >
    <span v-if="user" class="account-avatar" aria-hidden="true">{{ initials }}</span>
    <UserCircleIcon v-else class="account-icon" aria-hidden="true" />
    <span class="account-copy">
      <strong>{{ user ? user.firstName : 'Увійти' }}</strong>
      <small>{{ user ? 'Мій акаунт' : 'Акаунт' }}</small>
    </span>
  </button>
</template>

<style scoped>
.account-trigger {
  display: inline-flex;
  min-height: 3rem;
  align-items: center;
  gap: 0.6rem;
  padding: 0.35rem 0.75rem 0.35rem 0.4rem;
  border: 1px solid var(--border);
  border-radius: 0.95rem;
  color: var(--text-primary);
  background: var(--surface);
  box-shadow: var(--shadow-sm);
  font: inherit;
  text-align: left;
  transition: border-color 160ms ease, background-color 160ms ease;
}
.account-trigger:hover:not(:disabled) { border-color: var(--accent-border); background: var(--accent-soft); }
.account-trigger:disabled { cursor: wait; opacity: 0.68; }
.account-avatar,
.account-icon { width: 2.2rem; height: 2.2rem; flex: none; }
.account-avatar {
  display: grid;
  place-items: center;
  border-radius: 0.7rem;
  color: var(--on-accent);
  background: var(--accent);
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.04em;
}
.account-icon { color: var(--accent); }
.account-copy { display: grid; min-width: 0; line-height: 1.1; }
.account-copy strong { max-width: 7rem; overflow: hidden; font-size: 0.78rem; text-overflow: ellipsis; white-space: nowrap; }
.account-copy small { margin-top: 0.2rem; color: var(--text-secondary); font-size: 0.62rem; }
@media (max-width: 520px) {
  .account-trigger { width: 3rem; justify-content: center; padding: 0.35rem; }
  .account-copy { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); }
}
</style>
