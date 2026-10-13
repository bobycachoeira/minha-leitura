import { createRouter, createWebHistory } from 'vue-router'
import { useSessionStore } from '../stores/session.js'

export const router = createRouter({
  history: createWebHistory(),
  scrollBehavior: () => ({ top: 0 }),
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('../features/feed/FeedView.vue'),
      meta: { requiresAuth: true },
    },
    { path: '/feed', redirect: '/' },
    {
      path: '/library',
      name: 'library',
      component: () => import('../features/library/LibraryView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/library/:id',
      name: 'book-detail',
      component: () => import('../features/library/BookDetailView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/journal',
      name: 'journal',
      component: () => import('../features/journal/JournalView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/goals',
      name: 'goals',
      component: () => import('../features/dashboard/DashboardView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/achievements',
      name: 'achievements',
      component: () => import('../features/achievements/AchievementView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/recommend',
      name: 'recommend',
      component: () => import('../features/recommend/RecommendationsView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/people',
      name: 'people',
      component: () => import('../features/people/PeopleView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/me',
      name: 'me',
      component: () => import('../features/profile/MyProfileView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/notifications',
      name: 'notifications',
      component: () => import('../features/notifications/NotificationsView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/diagnostics',
      name: 'diagnostics',
      component: () => import('../features/diagnostics/DiagnosticsView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/u/:id',
      name: 'profile',
      component: () => import('../features/people/ProfileView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/challenges',
      name: 'challenges',
      component: () => import('../features/challenges/ChallengesView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('../features/auth/LoginView.vue'),
    },
    {
      path: '/2fa',
      name: 'two-factor',
      component: () => import('../features/auth/TwoFactorView.vue'),
    },
    {
      path: '/onboarding',
      name: 'onboarding',
      component: () => import('../features/space/OnboardingView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/space',
      name: 'space',
      component: () => import('../features/space/SpaceView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/security',
      name: 'security',
      component: () => import('../features/settings/SecurityView.vue'),
      meta: { requiresAuth: true },
    },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
})

router.beforeEach((to) => {
  const session = useSessionStore()
  if (to.meta.requiresAuth && !session.isAuthenticated) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }
  if (
    session.isAuthenticated &&
    !session.hasSpace &&
    !to.query.invite &&
    to.name !== 'onboarding' &&
    to.name !== 'login' &&
    to.name !== 'two-factor'
  ) {
    return { name: 'onboarding' }
  }
  // Already has a space → don't let onboarding create another.
  if (session.isAuthenticated && session.hasSpace && to.name === 'onboarding') {
    return { path: '/' }
  }
  return true
})
