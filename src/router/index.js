import { createRouter, createWebHistory } from 'vue-router'
import Login from '../components/Login.vue'
import Splash from '../components/Splash.vue'
import MainAdm from '../components/MainAdm.vue'
import MainUser from '../components/MainUser.vue'
import Form from '../components/Form.vue'
import UserCreation from '../components/UserCreation.vue'
import SentInspections from '../components/SentInspections.vue'
import { getIsAdmin, getToken } from '../services/api'

const routes = [
  { path: '/', component: Splash },
  { path: '/login', component: Login },
  { path: '/main-admin', component: MainAdm, meta: { requiresAuth: true } },
  { path: '/main-user', component: MainUser, meta: { requiresAuth: true } },
  { path: '/form/:id', component: Form, props: true, meta: { requiresAuth: true } },
  { path: '/create-user', component: UserCreation, meta: { requiresAuth: true } },
  { path: '/sent-inspections', component: SentInspections, meta: { requiresAuth: true } }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to, from, next) => {
  const token = getToken()
  const isAdmin = getIsAdmin()

  // If navigating to login while already authenticated, redirect to main
  if (to.path === '/login' && token) {
    return next(isAdmin ? '/main-admin' : '/main-user')
  }

  if (to.path === '/main-admin' && token && !isAdmin) {
    return next('/main-user')
  }

  // Protect routes that require auth
  if (to.meta && to.meta.requiresAuth && !token) {
    return next('/login')
  }

  next()
})

export default router