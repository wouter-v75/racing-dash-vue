// src/router/index.js (or wherever your router is configured)
import { createRouter, createWebHistory } from 'vue-router'

// Import your existing views
import Results from '../views/Results.vue'
import ResultsDynamic from '../views/ResultsDynamic.vue'

const routes = [
  // Your existing routes...
  {
    path: '/results',
    name: 'Results',
    component: Results,
    meta: {
      title: 'Race Results - Static'
    }
  },
  
  // NEW: Dynamic results page
  {
    path: '/results/dynamic',
    name: 'ResultsDynamic',
    component: ResultsDynamic,
    meta: {
      title: 'Race Results - Live Dashboard'
    }
  },
  
  // Optional: Redirect /results/live to dynamic
  {
    path: '/results/live',
    redirect: '/results/dynamic'
  },
  
  // Optional: Support query parameters for event/class
  {
    path: '/results/dynamic/:eventId?/:classId?',
    name: 'ResultsDynamicWithParams',
    component: ResultsDynamic,
    props: true,
    meta: {
      title: 'Race Results - Live Dashboard'
    }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
