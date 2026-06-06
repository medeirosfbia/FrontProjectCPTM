<template>
  <AppLayout>
    <PageContainer>
      <Header :logo="logo" title="Mapa" subtitle="Localizacao atual e referencia CPTM">
        <template #actions>
          <button class="btn" type="button" @click="goBack">Voltar</button>
          <button class="btn info" type="button" @click="capture">Pegar minha localizacao atual</button>
        </template>
      </Header>

      <section class="map-page-card">
        <div id="standalone-map"></div>
        <ToastAlert :message="status" :type="statusType" />
      </section>
    </PageContainer>
  </AppLayout>
</template>

<script setup>
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'
import logo from '../assets/cptm_logo_simples.png'
import AppLayout from './ui/AppLayout.vue'
import Header from './ui/Header.vue'
import PageContainer from './ui/PageContainer.vue'
import ToastAlert from './ui/ToastAlert.vue'

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({ iconRetinaUrl: markerIcon2x, iconUrl: markerIcon, shadowUrl: markerShadow })

const router = useRouter()
const status = ref('')
const statusType = ref('info')
let map = null
let marker = null

onMounted(async () => {
  await nextTick()
  map = L.map('standalone-map', { center: [-23.55052, -46.633308], zoom: 13 })
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: 'OpenStreetMap' }).addTo(map)
  capture()
})

onBeforeUnmount(() => {
  if (map) map.remove()
})

function capture() {
  if (!navigator.geolocation) {
    status.value = 'Geolocalizacao nao disponivel no navegador.'
    statusType.value = 'error'
    return
  }

  status.value = 'Capturando localizacao...'
  statusType.value = 'info'
  navigator.geolocation.getCurrentPosition(
    (position) => {
      const point = [position.coords.latitude, position.coords.longitude]
      if (marker) marker.setLatLng(point)
      else marker = L.marker(point).addTo(map)
      map.setView(point, 17)
      status.value = 'Localizacao atual capturada.'
      statusType.value = 'success'
    },
    (err) => {
      status.value = `Erro ao capturar localizacao: ${err.message}`
      statusType.value = 'error'
    },
    { enableHighAccuracy: true, timeout: 10000 }
  )
}

function goBack() {
  router.back()
}
</script>

<style scoped>
@reference "../style.css";

.map-page-card {
  @apply mt-5 flex flex-col gap-4 rounded-app border border-slate-200 bg-white p-4 shadow-sm;
}

#standalone-map {
  @apply min-h-[70vh] overflow-hidden rounded-app;
  z-index: 1;
}
</style>
