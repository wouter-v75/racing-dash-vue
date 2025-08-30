import { createRouter, createWebHistory } from 'vue-router'
import Live from './views/Live.vue'
import Results from './views/Results.vue'
import Performance from './views/Performance.vue'

const routes = [
  { path: '/', redirect: '/results' },
  { path: '/live', component: Live },
  { path: '/results', component: Results },
  { path: '/performance', component: Performance },
]

export default createRouter({
  history: createWebHistory(),
  routes,
})
