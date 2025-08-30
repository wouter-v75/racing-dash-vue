<script setup>
import { useRouter } from 'vue-router'
import { supabase } from './lib/supabase'
const router = useRouter()
async function logout(){
  await supabase.auth.signOut()
  router.push('/login')
}
</script>

<template>
  <div class="app">
    <!-- Navigation -->
    <header class="navbar">
      <nav>
        <router-link to="/results">Results</router-link>
        <router-link to="/live">Live</router-link>
        <router-link to="/performance">Performance</router-link>
      </nav>

      <!-- Logout button -->
      <button class="logout-btn" @click="logout">Log out</button>
    </header>

    <!-- Routed views -->
    <main class="content">
      <router-view />
    </main>
  </div>
</template>

<style scoped>
.app {
  display: flex;
  flex-direction: column;
  height: 100vh;
  font-family: sans-serif;
}

.navbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #1a1a1a;
  color: #fff;
  padding: 0.75rem 1rem;
}

.navbar nav {
  display: flex;
  gap: 1rem;
}

.navbar a {
  color: #fff;
  text-decoration: none;
}

.navbar a.router-link-active {
  font-weight: bold;
  text-decoration: underline;
}

.logout-btn {
  background: #e63946;
  border: none;
  padding: 0.5rem 1rem;
  color: white;
  font-weight: bold;
  border-radius: 4px;
  cursor: pointer;
}

.logout-btn:hover {
  background: #d62828;
}

.content {
  flex: 1;
  padding: 1rem;
  overflow-y: auto;
}
</style>
