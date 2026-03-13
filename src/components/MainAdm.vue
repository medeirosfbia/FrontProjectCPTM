<template>
    <div class="container">
        <div class="admin-screen">
            <div class="admin-header">
                <div class="header-left">
                    <img src="../assets/cptm_logo_simples.png" alt="CPTM" class="logo" />
                    <div class="header-info">
                        <h1>Painel do Admin</h1>
                        <p class="subtitle">Visão geral dos subordinados</p>
                    </div>
                </div>
                <div class="user-area">
                    <button class="avatar" @click="showUserMenu = !showUserMenu" aria-label="Usuário">👤</button>
                    <div v-if="showUserMenu" class="user-menu">
                        <button class="btn" @click="createUser">Criar Usuário</button>
                        <button class="user-logout" @click="logout">Sair</button>
                    </div>
                </div>
            </div>

            <div class="controls">
                <input v-model="query" placeholder="Buscar por nome..." />
                <div class="stats">
                    <div class="stat">Total subordinados: <strong>{{ workers.length }}</strong></div>
                    <div class="stat">Online: <strong>{{ onlineCount }}</strong></div>
                </div>
            </div>

            <div class="table-wrap">
                <table class="workers">
                    <thead>
                        <tr>
                            <th @click="sortBy('name')">Nome</th>
                            <th @click="sortBy('email')">Email</th>
                            <th @click="sortBy('submissions')">Envios</th>
                            <th>Status</th>
                            <th>Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="w in filtered" :key="w.id">
                            <td>{{ w.name }}</td>
                            <td>{{ w.email }}</td>
                            <td class="mono">{{ w.submissions }}</td>
                            <td>
                                <span :class="['badge', w.online ? 'online' : 'offline']">{{ w.online ? 'Online' :
                                    'Offline'
                                    }}</span>
                            </td>
                            <td>
                                <button class="btn-small" @click="seeMore(w)">Ver mais</button>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <!-- Mobile stacked list (visible on small screens) -->
            <div class="mobile-list" aria-hidden="false">
                <div class="mobile-item" v-for="w in filtered" :key="'m-' + w.id">
                    <div class="mobile-row">
                        <div class="mobile-title">{{ w.name }}</div>
                        <div class="mobile-sub">{{ w.email }}</div>
                    </div>
                    <div class="mobile-meta">
                        <span class="mono">Envios: {{ w.submissions }}</span>
                        <span :class="['badge', w.online ? 'online' : 'offline']">{{ w.online ? 'Online' : 'Offline'
                            }}</span>
                    </div>
                    <div class="mobile-actions">
                        <button class="btn-small" @click="seeMore(w)">Ver mais</button>
                    </div>
                </div>
            </div>

            <div class="map-wrap">
                <div id="map" class="map"></div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { useRouter } from 'vue-router'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import iconUrl from 'leaflet/dist/images/marker-icon.png'
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png'
import shadowUrl from 'leaflet/dist/images/marker-shadow.png'
import markerGreen from '../assets/marker-green.svg'
import markerRed from '../assets/marker-red.svg'

const query = ref('')
const sortKey = ref('name')
const sortDir = ref(1)
const router = useRouter()

// sample workers with coordinates
const workers = ref([
    { id: 1, name: 'Mariana Silva', email: 'mariana@cptm.com', submissions: 12, online: true, lat: -23.55052, lng: -46.633308 },
    { id: 2, name: 'Carlos Pereira', email: 'carlos@cptm.com', submissions: 5, online: false, lat: -23.5587, lng: -46.6253 },
    { id: 3, name: 'Ana Costa', email: 'ana@cptm.com', submissions: 20, online: true, lat: -23.5489, lng: -46.6388 },
    { id: 4, name: 'João Souza', email: 'joao@cptm.com', submissions: 2, online: false, lat: -23.5436, lng: -46.6291 },
    { id: 5, name: 'Rafaela Gomes', email: 'rafaela@cptm.com', submissions: 7, online: true, lat: -23.5465, lng: -46.6359 }
])

const filtered = computed(() => {
    const q = query.value.trim().toLowerCase()
    let list = workers.value.filter(w => !q || w.name.toLowerCase().includes(q) || w.email.toLowerCase().includes(q))
    list = list.slice().sort((a, b) => {
        const A = a[sortKey.value]
        const B = b[sortKey.value]
        if (typeof A === 'string') return sortDir.value * A.localeCompare(B)
        return sortDir.value * (A - B)
    })
    return list
})

const onlineCount = computed(() => workers.value.filter(w => w.online).length)

function sortBy(key) {
    if (sortKey.value === key) sortDir.value = -sortDir.value
    else { sortKey.value = key; sortDir.value = 1 }
}

function seeMore(w) {
    alert('Mais detalhes em breve. Ainda em desenvolvimento!')
}

function createUser() {
    router.push('/create-user')
}

const showUserMenu = ref(false)
function logout() {

    localStorage.removeItem("auth_token")
    localStorage.removeItem("user_role")
    showUserMenu.value = false
    router.push('/login')
}

let map = null
let markersLayer = null

// custom icons for online/offline
const onlineIcon = L.icon({
    iconUrl: markerGreen,
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    popupAnchor: [0, -30]
})

const offlineIcon = L.icon({
    iconUrl: markerRed,
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    popupAnchor: [0, -30]
})

function addMarkers(list) {
    if (!map) return
    if (markersLayer) markersLayer.clearLayers()
    markersLayer = L.layerGroup()
    list.forEach(w => {
        if (w.lat && w.lng) {
            const marker = L.marker([w.lat, w.lng], { icon: w.online ? onlineIcon : offlineIcon })
            marker.bindPopup(`<strong>${w.name}</strong><br/>Envios: ${w.submissions}<br/>${w.online ? '<span style="color:green">Online</span>' : '<span style="color:#b71c1c">Offline</span>'}`)
            markersLayer.addLayer(marker)
        }
    })
    markersLayer.addTo(map)
}

onMounted(() => {
    // fix default icon paths for many bundlers
    L.Icon.Default.mergeOptions({ iconUrl, iconRetinaUrl, shadowUrl })
    map = L.map('map', { scrollWheelZoom: false }).setView([-23.55, -46.63], 13)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap contributors' }).addTo(map)
    addMarkers(filtered.value)
    // ensure correct sizing after render
    setTimeout(() => { if (map) map.invalidateSize() }, 200)
})

onBeforeUnmount(() => { if (map) map.remove() })

watch(filtered, (n) => addMarkers(n))
watch(workers, () => addMarkers(filtered.value), { deep: true })
</script>

<style scoped>
.container {
    min-height: 100vh;
    width: 100%;
    border-radius: 8px;
    background: linear-gradient(180deg, #f7f7f8, #ffd5d5);
}

.admin-screen {
    max-width: 1200px;
    margin: 0 auto;
    padding: 3rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    color: #111;
    font-family: system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial;
}

.admin-header {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-bottom: 1rem;
}

.logo {
    width: 62px
}

.header-info h1 {
    margin: 0;
    font-size: 1.6rem
}

.subtitle {
    margin: 0;
    color: #666
}

.user-area {
    margin-left: auto;
    position: relative;
    display: flex;
    align-items: center
}

.avatar {
    background: #fff;
    border: 1px solid #eee;
    border-radius: 50%;
    width: 40px;
    height: 40px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    font-size: 18px
}

.user-menu {
    position: absolute;
    right: 0;
    top: 48px;
    background: #fff;
    border-radius: 8px;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
    padding: 0.35rem;
    min-width: 110px;
    z-index: 50
}

.user-menu .btn {
    background: none;
    border: none;
    margin: auto;
    padding: 0.5rem 0.75rem;
    width: 100%;
    text-align: left;
    color: #494949;
    cursor: pointer;
    font-weight: 600;
    border-radius: 6px
}

.user-menu .btn:hover {
    background: #f0f0f0
}

.user-logout {
    background: #ffffff;
    border: none;
    padding: 0.5rem 0.75rem;
    width: 100%;
    text-align: left;
    color: #b71c1c;
    cursor: pointer;
    font-weight: 600;
    border-radius: 6px
}

.user-logout:hover {
    background: #fff0f0
}



.controls {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-bottom: 1rem
}

.controls input {
    flex: 1;
    padding: 0.6rem 0.8rem;
    border-radius: 10px;
    border: 1px solid #eee
}

.stats {
    display: flex;
    gap: 1rem;
    align-items: center
}

.stat {
    color: #444
}

.table-wrap {
    background: #fff;
    border-radius: 12px;
    padding: 1rem;
    box-shadow: 0 12px 36px rgba(0, 0, 0, 0.06);
    overflow: auto
}

.map-wrap {
    margin-top: 1rem
}

.map {
    width: 100%;
    height: 420px;
    border-radius: 12px
}

.workers {
    width: 100%;
    border-collapse: collapse;
    min-width: 700px
}

.workers th {
    text-align: left;
    padding: 0.75rem 0.75rem;
    color: #666;
    cursor: pointer;
    font-weight: 600
}

.workers td {
    text-align: left;
    padding: 0.65rem 0.75rem;
    border-top: 1px solid #f2f2f4
}

.mono {
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, 'Roboto Mono', monospace
}

.badge {
    padding: 0.25rem 0.6rem;
    border-radius: 999px;
    font-weight: 600
}

.badge.online {
    background: #e6f7ef;
    color: #0b7a3a
}

.badge.offline {
    background: #fff0f0;
    color: #b71c1c
}

.btn-small {
    padding: 0.4rem 0.6rem;
    border-radius: 8px;
    border: 1px solid #eee;
    background: #fff;
    color: #494949;
    cursor: pointer
}

/* Responsive adjustments */
@media (max-width: 1024px) {
    .admin-screen {
        padding: 2rem
    }

    .map {
        height: 360px
    }

    .workers {
        min-width: 600px;
    }
}

@media (max-width: 720px) {
    .admin-screen {
        padding: 1.25rem
    }

    .controls {
        flex-direction: column;
        align-items: stretch
    }

    .stats {
        justify-content: flex-start
    }

    .logo {
        width: 56px
    }

    .header-info h1 {
        font-size: 1.25rem
    }

    .table-wrap {
        padding: 0.75rem
    }

    .map {
        height: 260px
    }

    .workers {
        min-width: 100%
    }

    .workers th,
    .workers td {
        padding: 0.6rem
    }
}

@media (max-width: 420px) {
    .map {
        height: 200px
    }

    .controls input {
        font-size: 0.95rem
    }
}

/* Mobile stacked list styles (shown on narrow screens) */
.mobile-list {
    display: none
}

.mobile-item {
    background: #fff;
    border-radius: 10px;
    padding: 0.85rem;
    box-shadow: 0 6px 18px rgba(0, 0, 0, 0.04);
    margin-bottom: 0.75rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem
}

.mobile-row {
    display: flex;
    flex-direction: column
}

.mobile-title {
    font-weight: 700;
    font-size: 1rem;
    color: #111
}

.mobile-sub {
    font-size: 0.9rem;
    color: #666
}

.mobile-meta {
    display: flex;
    gap: 0.75rem;
    align-items: center;
    font-size: 0.9rem;
    color: #444
}

.mobile-actions {
    display: flex;
    justify-content: flex-end;
    margin-top: 0.25rem
}

@media (max-width: 720px) {
    .workers {
        display: none
    }

    .mobile-list {
        display: block
    }

    .table-wrap {
        overflow: visible
    }
}
</style>
