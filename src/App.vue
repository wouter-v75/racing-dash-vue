<template>
  <div class="app-shell">
    <header class="navbar">
      <div class="nav-left">
        <router-link to="/results">Results</router-link>
        <router-link to="/live">Live</router-link>
        <router-link to="/performance">Performance</router-link>
        <router-link v-if="isAdmin" to="/admin/approvals">Admin</router-link>
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
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from './lib/supabase'

const router = useRouter()

const firstName = ref('')
const boatName  = ref('')
const isAdmin   = ref(false)

let authSub = null

async function loadUserSnapshot() {
  try {
    const { data, error } = await supabase.auth.getUser()
    if (error) return

    const user = data?.user
    const meta = user?.user_metadata || {}
    firstName.value = meta.first_name || ''
    boatName.value  = meta.boat_name || ''

    // Try to detect admin role (gracefully ignore errors so UI never blanks)
    if (user?.id) {
      const { data: mem } = await supabase
        .from('team_members')
        .select('role')
        .eq('user_id', user.id)
        .limit(20)

      isAdmin.value = Array.isArray(mem) && mem.some(r => r.role === 'admin')
    } else {
      isAdmin.value = false
    }
  } catch {
    // keep UI alive even if request fails
    isAdmin.value = false
  }
}

async function logout() {
  await supabase.auth.signOut()
  router.push('/login')
}

onMounted(async () => {
  await loadUserSnapshot()
  authSub = supabase.auth.onAuthStateChange((_event, _session) => {
    loadUserSnapshot()
  }).data?.subscription
})

onBeforeUnmount(() => {
  authSub?.unsubscribe?.()
})
</script>

<style scoped>
/* Page base */
.app-shell {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background:
    linear-gradient(145deg, #1e1e1f, #0f0f12) fixed,
    radial-gradient(800px 400px at 10% 10%, rgba(255,255,255,.06), transparent 60%) fixed,
    radial-gradient(900px 500px at 90% 90%, rgba(255,255,255,.05), transparent 60%) fixed;
  color: #fff;
}

/* Navbar */
.navbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: .75rem;
  padding: .7rem 1rem;
  position: sticky;
  top: 0;
  z-index: 10;

  background: rgba(255,255,255,.08);
  border-bottom: 1px solid rgba(255,255,255,.18);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}

.nav-left, .nav-right {
  display: flex;
  align-items: center;
  gap: .75rem;
  flex-wrap: wrap;
}

a {
  color: #fff;
  text-decoration: none;
  opacity: .95;
}
a.router-link-active {
  font-weight: 700;
  text-decoration: underline;
}

/* Right side bits */
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
  background: #e63946;
  border: none;
  padding: .45rem .9rem;
  border-radius: 10px;
  color: white;
  font-weight: 700;
  cursor: pointer;
}
.logout-btn:hover { background: #d62828; }

/* Main content area */
.main {
  flex: 1;
  padding: 1rem;
  overflow: auto;
}
</style>
