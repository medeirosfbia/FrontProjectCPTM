import { createRouter, createWebHistory } from 'vue-router'

import Login from '../components/Login.vue'
import Splash from '../components/Splash.vue'
import MainAdm from '../components/MainAdm.vue'
import MainUser from '../components/MainUser.vue'
import Form from '../components/Form.vue'
import UserCreation from '../components/UserCreation.vue'

const routes = [
    {
        path: '/',
        component: Splash
    },
    {
        path: '/login',
        component: Login
    },
    {
        path: '/main-admin',
        component: MainAdm,
        meta: { requiresAuth: true }
    },
    {
        path: '/main-user',
        component: MainUser,
        meta: { requiresAuth: true }
    },
    {
        path: '/form/:id',
        component: Form,
        props: true,
        meta: { requiresAuth: true }
    },
    {
        path: '/create-user',
        component: UserCreation,
        meta: { requiresAuth: true }
    }
]

const router = createRouter({
    history: createWebHistory(),
    routes
})

router.beforeEach((to, from, next) => {

    const token = localStorage.getItem("auth_token")

    const publicPages = ['/', '/login']

    if (!token && !publicPages.includes(to.path)) {
        next('/login')
    } else {
        next()
    }
})

export default router