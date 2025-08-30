// src/router.js
import { createRouter, createWebHistory } from 'vue-router'
import Results from './views/Results.vue'
import Live from './views/Live.vue'
import Performance from './views/Performance.vue'
import Login from './views/Login.vue'
import { supabase } from './lib/supabase'

const routes = [
  { path: '/', redirect: '/results' },
  { path: '/login', component: Login },
  { path: '/results', component: Results, meta: { requiresAuth: true } },
  { path: '/live', component: Live, meta: { requiresAuth: true } },
  { path: '/performance', component: Performance, meta: { requiresAuth: true } },
]

const router = createRouter({ history: createWebHistory(), routes })

router.beforeEach(async (to) => {
  if (to.path === '/login') return true
  if (!to.meta.requiresAuth) return true
  const { data } = await supabase.auth.getSession()
  return data.session ? true : '/login'
})

export default router
