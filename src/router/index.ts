import { createRouter, createWebHashHistory } from 'vue-router';
import MainLayout from '@/shared/Layout/MainLayout.vue';
const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  scrollBehavior: () => ({ top: 0 }),
  routes: [
    {
      path: '/',
      component: MainLayout,
      children: [
        {
          path: '',
          name: 'home',
          component: () => import('@/pages/HomePage.vue'),
          meta: { title: 'Encontrar unidades' },
        },
        {
          path: 'guia',
          component: () => import('@/pages/GuidePage.vue'),
          meta: { title: 'Entenda o atendimento' },
        },
        {
          path: 'sobre',
          component: () => import('@/pages/AboutPage.vue'),
          meta: { title: 'Sobre os dados' },
        },
        {
          path: ':pathMatch(.*)*',
          component: () => import('@/pages/NotFoundPage.vue'),
          meta: { title: 'Página não encontrada' },
        },
      ],
    },
  ],
});
router.afterEach((to) => {
  document.title = `${to.meta.title || 'Saúde pública'} | Saúde360`;
});
export default router;
