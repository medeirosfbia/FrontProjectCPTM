import { createApp } from 'vue'
import { createPinia } from 'pinia'
import './style.css'
import { registerSW } from 'virtual:pwa-register'
import App from './App.vue'

const app = createApp(App)
registerSW({ immediate: true })

app.use(createPinia())
app.mount('#app')
