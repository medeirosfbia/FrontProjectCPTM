import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { initDB } from './services/db'
import { registerSW } from 'virtual:pwa-register'
import router from './router'
import './style.css'
import App from './App.vue'

initDB()

const app = createApp(App)
registerSW({ immediate: true })

app.use(createPinia())
app.use(router)
app.mount('#app')
