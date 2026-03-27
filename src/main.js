import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { initDB } from './services/db'
import { registerSW } from 'virtual:pwa-register'
import router from './router'
import './style.css'
import App from './App.vue'
import { initSync, syncInspections } from './services/sync'
import { getToken } from './services/api'

const app = createApp(App)
registerSW({ immediate: true })

app.use(createPinia())
app.use(router)
app.mount('#app')

async function boot() {
	try {
		await initDB()
		initSync()
		if (navigator.onLine) {
			const token = getToken()
			if (token) await syncInspections()
		}
	} catch (e) {
		// keep offline functionality working
		console.error('Bootstrap error:', e)
	}
}

boot()
