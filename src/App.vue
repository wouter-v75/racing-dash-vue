<template>
  <div class="app-shell">
    <!-- Nav (hidden on /login) -->
    <header v-if="!onLogin" class="navbar">
      <div class="nav-left">
        <router-link to="/results">Results</router-link>
        <router-link to="/account">Account</router-link>
      </div>
      <div class="nav-right">
        <span v-if="boatName" class="pill">Boat: {{ boatName }}</span>
        <router-link v-if="firstName" class="hello" to="/account">Hi, {{ firstName }}</router-link>
        <button class="logout-btn" @click="logout">Log out</button>
      </div>
    </header>

    <main class="main">
      <router-view />
    </main>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { supabase } from './lib/supabase'

const route = useRoute()
const router = useRouter()
const onLogin = computed(() => route.path === '/login')

const firstName = ref('')
const boatName  = ref('')
let authSub = null

async function loadUser() {
  const { data } = await supabase.auth.getUser()
  const meta = data?.user?.user_metadata || {}
  firstName.value = meta.first_name || ''
  boatName.value  = meta.boat_name || ''
}

async function logout() {
  await supabase.auth.signOut()
  router.push('/login')
}

onMounted(async () => {
  await loadUser()
  authSub = supabase.auth.onAuthStateChange(() => loadUser()).data?.subscription
})
onBeforeUnmount(() => authSub?.unsubscribe?.())
</script>

<style>
/* Global dark background so text is readable */
html, body, #app { height: 100%; }
body {
  margin: 0;
  color: #fff;
  background:
    linear-gradient(145deg, #1b1c1f, #0e0f12) fixed,
    radial-gradient(800px 400px at 10% 10%, rgba(255,255,255,.06), transparent 60%) fixed,
    radial-gradient(900px 500px at 90% 90%, rgba(255,255,255,.05), transparent 60%) fixed;
  font-family: system-ui, -apple-system, Segoe UI, Roboto, "Helvetica Neue", Arial;
}

/* App shell */
.app-shell { min-height: 100%; display: flex; flex-direction: column; }
.navbar {
  display:flex; justify-content:space-between; align-items:center; gap:.75rem;
  padding:.7rem 1rem; position:sticky; top:0; z-index:10;
  background: rgba(255,255,255,.08);
  border-bottom: 1px solid rgba(255,255,255,.18);
  backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
}
.nav-left, .nav-right { display:flex; align-items:center; gap:.75rem; flex-wrap:wrap; }
a { color:#fff; text-decoration:none; opacity:.95; }
a.router-link-active { font-weight:700; text-decoration:underline; }

.pill {
  background: rgba(255,255,255,.12);
  border: 1px solid rgba(255,255,255,.25);
  border-radius: 999px;
  padding: .3rem .55rem;
  font-size: .9rem;
}
.hello{ opacity:.9; color:#fff; text-decoration:none; }
.hello.router-link-active{ text-decoration:underline; }

.logout-btn {
  background:#e63946; border:none; padding:.45rem .9rem;
  border-radius:10px; color:white; font-weight:700; cursor:pointer;
}
.logout-btn:hover { background:#d62828; }

.main { flex:1; padding:1rem; overflow:auto; }
</style>
