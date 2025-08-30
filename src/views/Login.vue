<template>
  <div class="login-wrap">
    <div class="glass-card">
      <h1>{{ mode === 'login' ? 'Sign in' : 'Create account' }}</h1>

      <form @submit.prevent="submit">
        <input v-model.trim="email" type="email" placeholder="you@example.com" required />
        <input v-model="password" type="password" placeholder="Password (min 6 chars)" minlength="6" required />
        <button class="btn primary" :disabled="loading">
          {{ loading ? 'Please wait…' : (mode==='login' ? 'Sign in' : 'Create account') }}
        </button>
      </form>

      <p v-if="error" class="error">{{ error }}</p>

      <div class="switch">
        <span>{{ mode==='login' ? "Don't have an account?" : 'Already have an account?' }}</span>
        <button class="btn link" @click="mode = mode==='login' ? 'signup' : 'login'">
          {{ mode==='login' ? 'Create one' : 'Sign in' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '../lib/supabase'

const router = useRouter()
const email = ref('')
const password = ref('')
const mode = ref('login')
const loading = ref(false)
const error = ref('')

onMounted(async () => {
  const { data } = await supabase.auth.getSession()
  if (data.session) router.replace('/results')
})

async function submit() {
  error.value = ''
  loading.value = true
  try {
    if (mode.value === 'signup') {
      const { error: e } = await supabase.auth.signUp({ email: email.value, password: password.value })
      if (e) throw e
      // optional: Supabase may require email confirmation depending on settings
    }
    const { error: e2 } = await supabase.auth.signInWithPassword({ email: email.value, password: password.value })
    if (e2) throw e2
    router.push('/results')
  } catch (e) {
    error.value = e?.message || 'Authentication failed'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-wrap { min-height: calc(100vh - 120px); display:grid; place-items:center; padding:24px; }
.glass-card { width:100%; max-width:420px; background:rgba(255,255,255,.12); border:1px solid rgba(255,255,255,.25); backdrop-filter:blur(16px); border-radius:18px; padding:20px; color:#fff; }
input { width:100%; margin:.4rem 0; padding:.7rem .85rem; border-radius:12px; border:1px solid rgba(255,255,255,.35); background:rgba(255,255,255,.08); color:#fff; }
.btn { border:0; border-radius:12px; padding:.7rem 1rem; cursor:pointer; }
.btn.primary { background:linear-gradient(135deg,#4facfe,#00f2fe); color:#0b2239; font-weight:800; width:100%; margin-top:.6rem; }
.btn.link { background:transparent; text-decoration:underline; color:#fff; }
.switch { display:flex; justify-content:center; align-items:center; gap:.4rem; margin-top:.6rem; }
.error { color:#ffd4d4; background:rgba(255,0,0,.12); border:1px solid rgba(255,0,0,.25); padding:.5rem .6rem; border-radius:10px; margin-top:.6rem; }
</style>
