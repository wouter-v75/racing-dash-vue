<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from './lib/supabase'

const router = useRouter()
const firstName = ref('')
let unsub = null

async function loadUser() {
  const { data } = await supabase.auth.getUser()
  const meta = data?.user?.user_metadata || {}
  firstName.value = meta.first_name || ''
}

onMounted(async () => {
  await loadUser()
  unsub = supabase.auth.onAuthStateChange((_event, _session) => {
    loadUser()
  }).data?.subscription
})

onBeforeUnmount(() => {
  unsub?.unsubscribe?.()
})

async function logout() {
  await supabase.auth.signOut()
  router.push('/login')
}
</script>

<template>
  <div class="app">
    <header class="navbar">
      <nav>
        <router-link to="/results">Results</router-link>
        <router-link to="/live">Live</router-link>
        <router-link to="/performance">Performance</router-link>
      </nav>

      <div class="nav-right">
        <span v-if="firstName" class="hello">Hi, {{ firstName }}</span>
        <button class="logout-btn" @click="logout">Log out</button>
      </div>
    </header>

    <main class="content">
      <router-view />
    </main>
  </div>
</template>

<style scoped>
.app { display:flex; flex-direction:column; height:100vh; font-family:sans-serif; }
.navbar {
  display:flex; justify-content:space-between; align-items:center;
  background:#1a1a1a; color:#fff; padding:.75rem 1rem;
}
.navbar nav { display:flex; gap:1rem; }
.navbar a { color:#fff; text-decoration:none; }
.navbar a.router-link-active { font-weight:700; text-decoration:underline; }
.nav-right { display:flex; gap:.75rem; align-items:center; }
.hello { opacity:.9; }
.logout-btn {
  background:#e63946; border:none; padding:.5rem 1rem; color:white;
  font-weight:700; border-radius:6px; cursor:pointer;
}
.logout-btn:hover { background:#d62828; }
.content { flex:1; padding:1rem; overflow-y:auto; }
</style>
