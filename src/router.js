// src/router.js
import { createRouter, createWebHistory } from 'vue-router'
import Results from './views/Results.vue'
import Live from './views/Live.vue'
import Performance from './views/Performance.vue'
import Login from './views/Login.vue'
import { account } from './lib/appwrite'

const routes = [
  { path: '/', redirect: '/results' },
  { path: '/login', component: Login },
  { path: '/results', component: Results, meta: { requiresAuth: true } },
  { path: '/live', component: Live, meta: { requiresAuth: true } },
  { path: '/performance', component: Performance, meta: { requiresAuth: true } },
]

const router = createRouter({ history: createWebHistory(), routes })

router.beforeEach(async (to) => {
  if (!to.meta.requiresAuth) return true

  // DEBUG: log to confirm this runs
  console.log('[guard] checking auth for', to.fullPath)

  try {
    const me = await account.get()
    console.log('[guard] user session OK', me.$id)
    return true
  } catch (e) {
    console.log('[guard] no session, redirecting to /login')
    return '/login'
  }
})

export default router
