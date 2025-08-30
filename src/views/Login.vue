<template>
  <div class="login-wrap">
    <div class="glass-card">
      <h1 class="title">{{ mode === 'login' ? 'Sign in' : mode === 'signup' ? 'Create account' : 'Magic link' }}</h1>
      <p class="muted">RacingDash — secure access for your sailing team</p>

      <form class="form" @submit.prevent="submit">
        <template v-if="mode === 'signup'">
          <label>First name</label>
          <input v-model.trim="firstName" type="text" required placeholder="Jane" />
          <label>Last name</label>
          <input v-model.trim="lastName" type="text" required placeholder="Doe" />
        </template>

        <label>Email</label>
        <input v-model.trim="email" type="email" autocomplete="username" required placeholder="you@example.com" />

        <label v-if="mode !== 'magic'">
          Password
          <span v-if="mode==='signup'" class="muted">(min 6 chars)</span>
        </label>
        <input
          v-if="mode !== 'magic'"
          v-model="password"
          type="password"
          autocomplete="current-password"
          minlength="6"
          required
          placeholder="••••••••"
        />

        <button class="btn primary" :disabled="loading">
          {{ loading ? 'Please wait…'
            : mode==='login' ? 'Sign in'
            : mode==='signup' ? 'Create account'
            : 'Send magic link' }}
        </button>
      </form>

      <div class="row tabs">
        <button class="btn link" @click="setMode('login')" :class="{active:mode==='login'}">Password login</button>
        <button class="btn link" @click="setMode('signup')" :class="{active:mode==='signup'}">Sign up</button>
        <button class="btn link" @click="setMode('magic')" :class="{active:mode==='magic'}">Magic link</button>
      </div>

      <div class="row">
        <button class="btn ghost" @click="resendVerification" :disabled="!email || loading">Resend verification</button>
      </div>

      <p v-if="notice" class="notice">{{ notice }}</p>
      <p v-if="error" class="error">{{ error }}</p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '../lib/supabase'

const router = useRouter()

const email = ref('')
const password = ref('')
const firstName = ref('')
const lastName = ref('')
const mode = ref('login') // 'login' | 'signup' | 'magic'
const loading = ref(false)
const error = ref('')
const notice = ref('')
let unsub = null

onMounted(async () => {
  const { data } = await supabase.auth.getSession()
  if (data.session) {
    router.replace('/results')
    return
  }
  unsub = supabase.auth.onAuthStateChange((_event, session) => {
    if (session) router.replace('/results')
  }).data?.subscription
})

onBeforeUnmount(() => {
  unsub?.unsubscribe?.()
})

function setMode(m) {
  mode.value = m
  error.value = ''
  notice.value = ''
}

async function submit () {
  error.value = ''
  notice.value = ''
  loading.value = true
  try {
    if (mode.value === 'signup') {
      // Require names
      if (!firstName.value || !lastName.value) {
        throw new Error('Please provide first and last name.')
      }
      const { error: e } = await supabase.auth.signUp({
        email: email.value,
        password: password.value,
        options: {
          emailRedirectTo: window.location.origin,
          data: {
            first_name: firstName.value,
            last_name: lastName.value
          }
        }
      })
      if (e) throw e
      notice.value = 'Check your inbox to confirm your email, then sign in.'
      return
    }

    if (mode.value === 'magic') {
      const { error: e } = await supabase.auth.signInWithOtp({
        email: email.value,
        options: { emailRedirectTo: window.location.origin }
      })
      if (e) throw e
      notice.value = 'Magic link sent. Check your email.'
      return
    }

    const { error: e2 } = await supabase.auth.signInWithPassword({
      email: email.value,
      password: password.value
    })
    if (e2) throw e2

    const { data: s } = await supabase.auth.getSession()
    if (s.session) router.replace('/results')
  } catch (e) {
    const msg = e?.message || String(e)
    if (/Email not confirmed/i.test(msg)) {
      error.value = 'Please confirm your email first. Use "Resend verification" if needed.'
    } else if (/Invalid login credentials/i.test(msg)) {
      error.value = 'Invalid email or password.'
    } else if (/redirect/i.test(msg)) {
      error.value = 'Redirect URL not allowed. Add your domain in Supabase → Auth → URL Configuration.'
    } else {
      error.value = msg
    }
  } finally {
    loading.value = false
  }
}

async function resendVerification () {
  error.value = ''
  notice.value = ''
  try {
    const { error: e } = await supabase.auth.resend({
      type: 'signup',
      email: email.value,
      options: { emailRedirectTo: window.location.origin }
    })
    if (e) throw e
    notice.value = 'Verification email sent.'
  } catch (e) {
    error.value = e?.message || 'Could not send verification email.'
  }
}
</script>

<style scoped>
.login-wrap {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 24px;
  background: linear-gradient(145deg, #2c2c2c, #1c1c1c);
  color: #fff;
}
.glass-card {
  width: 100%;
  max-width: 460px;
  background: rgba(255,255,255,.1);
  border: 1px solid rgba(255,255,255,.25);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border-radius: 18px;
  padding: 20px 20px 16px;
  box-shadow: 0 18px 60px rgba(0,0,0,.4);
  color: #fff;
}
.title { margin: 6px 0 4px; font-weight: 800; }
.muted { opacity: .88; margin: 0 0 8px; }
.form { margin-top: 12px; display: grid; gap: 8px; }
label { font-size: .9rem; opacity: .9; }
input {
  width: 100%;
  padding: .7rem .85rem;
  border-radius: 12px;
  border: 1px solid rgba(255,255,255,.35);
  background: rgba(255,255,255,.08);
  color: #fff;
  outline: none;
}
input::placeholder { color: rgba(255,255,255,.65); }
.btn {
  border: 0;
  border-radius: 12px;
  padding: .7rem 1rem;
  cursor: pointer;
  color: #fff;
}
.btn.primary {
  margin-top: 6px;
  width: 100%;
  background: linear-gradient(135deg,#4facfe,#00f2fe);
  color: #0b2239;
  font-weight: 800;
}
.btn.link { background: transparent; text-decoration: underline; padding: .25rem .4rem; opacity: .95; }
.btn.link.active { text-decoration: none; font-weight: 700; }
.btn.ghost { background: rgba(255,255,255,.12); border: 1px solid rgba(255,255,255,.25); }
.row { display: flex; gap: .5rem; justify-content: center; margin-top: .5rem; flex-wrap: wrap; }
.notice {
  margin-top: 8px; color: #fff7d6; background: rgba(255,198,0,.12);
  border: 1px solid rgba(255,198,0,.25); padding: .55rem .7rem; border-radius: 10px;
}
.error {
  margin-top: 8px; color: #ffd4d4; background: rgba(255,0,0,.12);
  border: 1px solid rgba(255,0,0,.25); padding: .55rem .7rem; border-radius: 10px;
}
</style>
