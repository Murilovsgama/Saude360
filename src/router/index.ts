import { createRouter, createWebHistory } from 'vue-router'
import MainLayout from '@/shared/Layout/MainLayout.vue'
import Home from '@/pages/HomePage.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      component: MainLayout,
      children: [
        {
          path: '',
          name: 'home',
          component: Home
        }
      ]
    }
  ]
})

export default router