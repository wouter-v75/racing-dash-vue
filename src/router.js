import { createRouter, createWebHashHistory } from 'vue-router'
import { supabase } from './lib/supabase'

import Results from './views/Results.vue'
import Login from './views/Login.vue'
import Account from './views/Account.vue'

const routes = [
  { path: '/', redirect: '/results' },
  { path: '/results', component: Results, meta: { requiresAuth: true } },
  { path: '/account', component: Account, meta: { requiresAuth: true } },
  { path: '/login', component: Login },
]

const router = createRouter({
  history: createWebHashHistory(),
  routes,
})

router.beforeEach(async (to) => {
  if (to.path === '/login') return true
  if (!to.meta.requiresAuth) return true

  const { data } = await supabase.auth.getSession()
  return data.session ? true : '/login'
})

export default router
