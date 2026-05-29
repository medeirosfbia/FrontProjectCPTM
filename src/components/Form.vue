<template>
  <div class="container">
    <div class="admin-screen">
      <div class="admin-header">
        <div class="header-left">
          <img src="../assets/cptm_logo_simples.png" alt="CPTM" class="logo" />
          <div class="header-info">
            <h1>{{ isEditMode ? 'Editar Inspeção' : 'Formulário de Inspeção' }}</h1>
            <p class="subtitle">{{ isEditMode ? 'Altere os dados e salve a inspeção' : 'Preencha e envie a inspeção' }}</p>
          </div>
        </div>
        <div class="user-area">
          <button class="avatar" @click="showUserMenu = !showUserMenu">👤</button>
          <div v-if="showUserMenu" class="user-menu">
            <button class="user-logout" @click="logout">Sair</button>
          </div>
        </div>
      </div>

      <div class="table-wrap">
        <form class="form" @submit.prevent="submitForm">
          <!-- Paginated pages: render only fields for current page -->
          <div class="page">
            <div v-for="field in pages[currentPage]" :key="field.key" class="row">
              <label>{{ field.label }}</label>

              <template v-if="field.type === 'textarea'">
                <textarea v-model="form[field.key]" rows="4" :placeholder="field.placeholder">
      </textarea>
              </template>

              <template v-else>
                <input v-model="form[field.key]" :placeholder="field.placeholder" />
              </template>

              <!-- Injetar mapa se campo for location -->
              <div v-if="field.key === 'location'" class="map-section">
                <label>Coordenadas (captura GPS)</label>
                <div v-if="form.latitude && form.longitude" class="coords-display">
                  Lat: <input type="number" step="any" v-model.number="form.latitude" @change="updateMapFromInputs" />
                  Lng: <input type="number" step="any" v-model.number="form.longitude" @change="updateMapFromInputs" />
                </div>
                <div class="map-wrap">
                  <div id="inspection-map" style="height:280px; z-index: 1;"></div>
                </div>
                <div class="map-controls">
                  <button type="button" class="btn" @click="captureGPS">Capturar Localização Atual</button>
                </div>
              </div>

            </div>

            <div v-if="currentPage === 1" class="row photo-row">
              <label>Foto da inspeção</label>
              <div class="photo-actions">
                <button type="button" class="btn" @click="toggleCamera">
                  {{ cameraActive ? 'Fechar câmera' : 'Abrir câmera' }}
                </button>
                <label class="btn file-btn">
                  Escolher arquivos
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    multiple
                    @change="onImagesSelected"
                    hidden
                  />
                </label>
              </div>
              <small class="photo-help">Use a câmera ou selecione uma ou mais imagens (máx. 20MB por arquivo).</small>

              <div v-if="cameraError" class="photo-error">{{ cameraError }}</div>

              <div v-if="cameraActive" class="camera-panel">
                <video ref="cameraVideo" autoplay playsinline class="camera-video"></video>
                <div class="camera-controls">
                  <button type="button" class="btn-primary" @click="captureFromCamera">Tirar foto</button>
                  <button type="button" class="btn" @click="toggleCamera">Cancelar</button>
                </div>
              </div>

              <div v-if="imagePreviewUrls.length" class="photo-preview-grid">
                <div v-for="(previewUrl, index) in imagePreviewUrls" :key="`${previewUrl}-${index}`" class="photo-preview-item">
                  <img :src="previewUrl" :alt="`Pré-visualização da foto ${index + 1}`" class="photo-preview" />
                  <button type="button" class="photo-remove-btn" @click="removePhoto(index)">Remover</button>
                </div>
              </div>

              <div v-if="photoFiles.length" class="photo-count">
                {{ photoFiles.length }} foto(s) adicionada(s)
              </div>
            </div>
          </div>

          <!-- Pagination controls -->
          <div class="pagination">
            <div class="page-buttons">
              <button v-for="n in totalPages" :key="n" type="button" class="btn page-btn"
                :class="{ active: currentPage === (n - 1) }" @click="goToPage(n - 1)">
                {{ n }}
              </button>
            </div>
          </div>
          <div class="pagination arrows">
            <button type="button" class="btn" @click="prevPage" :disabled="currentPage === 0">Anterior</button>
            <button v-if="currentPage === totalPages - 1" type="button" class="btn-primary"
              @click="submitForm">{{ isEditMode ? 'Salvar alterações' : 'Enviar' }}</button>
            <button v-else type="button" class="btn" @click="nextPage" :disabled="currentPage >= totalPages - 1">
              Próxima
            </button>
          </div>

          <!-- Actions: submit on last page, otherwise Next also available -->
          <div class="actions">
            <button type="button" class="btn draw" @click="saveDraft">{{ isEditMode ? 'Salvar alterações' : 'Salvar rascunho' }}</button>
            <button type="button" class="btn ghost" @click="cancel">Cancelar</button>
          </div>

          <div v-if="status" :class="['status', statusType]">{{ status }}</div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onBeforeUnmount, nextTick } from 'vue'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
// Em projetos Vite, o Leaflet pode perder os caminhos das imagens
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'

import { useInspectionStore } from '../stores/inspectionStore'
import { useRouter, useRoute } from 'vue-router'
import { computed } from 'vue'
import { saveInspection } from '../services/db'
import { getAllInspections } from '../services/db'
import { syncInspections } from '../services/sync'
import { sendInspectionNow } from '../services/sync'
import { getToken, getIsAdmin, getInspectionsAPI, updateInspectionAPI } from '../services/api'
import { watch } from 'vue'

// Conserta os ícones do mapa Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow
})

const router = useRouter()
const route = useRoute()
const store = useInspectionStore()
const isEditMode = computed(() => route.params.id !== 'new')
const inspectionSource = ref('local')
const loadedStatus = ref('')
const photoFiles = ref([])
const imagePreviewUrls = ref([])
const cameraActive = ref(false)
const cameraError = ref('')
const cameraVideo = ref(null)
const cameraStream = ref(null)

// map refs
const mapRef = ref(null)
const mapMarker = ref(null)
const personMarker = ref(null)

const showUserMenu = ref(false)
const status = ref('')
const statusType = ref('') // 'success' | 'error' | 'info' | 'warning'

function setStatus(msg = '', type = 'info', duration = 3000) {
  status.value = msg
  statusType.value = type
  if (duration > 0 && msg) {
    setTimeout(() => {
      status.value = ''
      statusType.value = ''
    }, duration)
  }
}

// pegar id da rota
const inspectionId = route.params.id

// estado do formulário
const form = reactive({
  id: null,
  title: '',
  location: '',
  address: '',
  latitude: null,
  longitude: null,
  notes: '',
  q1: '',
  q2: '',
  q3: '',
  q4: '',
  q5: '',
  q6: '',
  userEmail: '',
  status: '',
  photo: null,
  photos: [],
  photoName: '',
  photoType: ''
})

function revokePhotoPreviews() {
  for (const previewUrl of imagePreviewUrls.value) {
    if (typeof previewUrl === 'string' && previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl)
    }
  }
}

function syncPhotoFields() {
  const files = [...photoFiles.value]
  form.photos = files
  form.photo = files[0] || null
  form.photoName = form.photo?.name || ''
  form.photoType = form.photo?.type || ''
}

function setPhotoPreviews(sources = []) {
  revokePhotoPreviews()
  imagePreviewUrls.value = []

  const items = Array.isArray(sources) ? sources : [sources]
  for (const source of items) {
    if (!source) continue

    if (typeof source === 'string') {
      imagePreviewUrls.value.push(source)
      continue
    }

    if (source instanceof Blob) {
      imagePreviewUrls.value.push(URL.createObjectURL(source))
    }
  }
}

function setPhotos(sources = []) {
  photoFiles.value = Array.isArray(sources) ? sources.filter(Boolean) : [sources].filter(Boolean)
  syncPhotoFields()
  setPhotoPreviews(photoFiles.value)
}

function addPhotos(files = []) {
  const incomingFiles = Array.isArray(files) ? files : [files]
  const validFiles = []

  for (const file of incomingFiles) {
    if (!file) continue

    if (!file.type || !file.type.startsWith('image/')) {
      setStatus('Selecione apenas arquivos de imagem.', 'error', 4000)
      continue
    }

    const maxSize = 20 * 1024 * 1024
    if (file.size > maxSize) {
      setStatus(`A imagem ${file.name || ''} deve ter no máximo 20MB.`, 'error', 4000)
      continue
    }

    validFiles.push(file)
  }

  if (!validFiles.length) return

  setPhotos([...photoFiles.value, ...validFiles])
}

// carregar inspeção existente
onMounted(async () => {

  const inspections = await getAllInspections()
  store.inspections = inspections

  if (!isEditMode.value) return

  let inspection = inspections.find(i => String(i.id) === String(inspectionId))

  if (inspection) {
    inspectionSource.value = 'local'
    loadedStatus.value = inspection.status || ''
    Object.assign(form, inspection)
    setPhotos(Array.isArray(inspection.photos) && inspection.photos.length
      ? inspection.photos
      : inspection.photo
        ? [inspection.photo]
        : [])
    return
  }

  try {
    const res = await getInspectionsAPI()
    const arr = Array.isArray(res) ? res : res?.data ?? []
    inspection = arr.find(i => String(i.id ?? i.Id) === String(inspectionId))

    if (inspection) {
      inspectionSource.value = 'api'
      const normalized = {
        ...inspection,
        id: inspection.id ?? inspection.Id,
        title: inspection.title ?? inspection.Title ?? inspection.titulo ?? '',
        location: inspection.location ?? inspection.Location ?? '',
        address: inspection.address ?? inspection.Address ?? '',
        latitude: inspection.latitude ?? inspection.Latitude ?? null,
        longitude: inspection.longitude ?? inspection.Longitude ?? null,
        notes: inspection.notes ?? inspection.Notes ?? '',
        q1: inspection.q1 ?? inspection.Q1 ?? '',
        q2: inspection.q2 ?? inspection.Q2 ?? '',
        q3: inspection.q3 ?? inspection.Q3 ?? '',
        q4: inspection.q4 ?? inspection.Q4 ?? '',
        q5: inspection.q5 ?? inspection.Q5 ?? '',
        q6: inspection.q6 ?? inspection.Q6 ?? '',
        userEmail: inspection.userEmail ?? inspection.UserEmail ?? '',
        status: inspection.status ?? 'Enviado'
      }

      loadedStatus.value = normalized.status || 'Enviado'
      Object.assign(form, normalized)
      setPhotos(Array.isArray(normalized.photos) && normalized.photos.length
        ? normalized.photos
        : normalized.photo
          ? [normalized.photo]
          : [])
    }
  } catch (err) {
    console.error('Erro ao carregar inspeção para edição', err)
    setStatus('Não foi possível carregar a inspeção para edição.', 'error', 5000)
  }

})

onMounted(() => {
  // init map only on the page that contains the Local field (page 0)
  // create a deferred init so it doesn't run when viewing other pages
  tryInitMap()
})

onBeforeUnmount(() => {
  stopCamera()

  revokePhotoPreviews()

  if (mapRef.value) {
    mapRef.value.remove()
    mapRef.value = null
  }
})

// ----------------------
// Autosave
// ----------------------
let autosaveTimer = null

watch(
  form,
  () => {

    clearTimeout(autosaveTimer)

    autosaveTimer = setTimeout(async () => {

      if (!form.title || !form.title.trim()) {
        return
      }

      // If this inspection is already marked as Aguardando Rede in the store,
      // do not overwrite it back to 'Não enviada' (this would block sending).
      const existing = store.inspections.find(i => i.id === form.id)
      if (existing && existing.status === 'Aguardando Rede') {
        // keep awaiting status
        return
      }

      const saved = await persistInspection(isEditMode.value ? (loadedStatus.value || form.status || 'Enviado') : "Não enviada")

      if (saved) {
        setStatus('Salvo automaticamente', 'success', 2500)
      }

    }, 2000)

  },
  { deep: true }
)



// ----------------------
// Paginação
// ----------------------

const currentPage = ref(0)

const pages = [
  [
    { key: 'title', label: 'Título', placeholder: 'Título da inspeção', type: 'text' },
    { key: 'location', label: 'Local', placeholder: 'Local/Estação', type: 'text' }
  ],
  [
    { key: 'address', label: 'Endereço', placeholder: 'Endereço (opcional)', type: 'text' },
    { key: 'q1', label: 'Pergunta 1', placeholder: 'Resposta da pergunta 1', type: 'text' },
    { key: 'q5', label: 'Pergunta 1.1', placeholder: 'Resposta adicional 1', type: 'text' },
    { key: 'q6', label: 'Pergunta 1.2', placeholder: 'Resposta adicional 2', type: 'text' }
  ],
  [
    { key: 'q2', label: 'Pergunta 2', placeholder: 'Resposta da pergunta 2', type: 'text' },
    { key: 'q3', label: 'Pergunta 3', placeholder: 'Resposta da pergunta 3', type: 'text' }
  ],
  [
    { key: 'q4', label: 'Observações', placeholder: 'Anotações da inspeção', type: 'textarea' }
  ]
]


const totalPages = computed(() => pages.length)

watch(currentPage, async (newPage) => {
  if (newPage === 0) {
    await nextTick()
    setTimeout(() => {
      tryInitMap()
    }, 150)
  } else {
    if (mapRef.value) {
      mapRef.value.remove()
      mapRef.value = null
      mapMarker.value = null
      personMarker.value = null
    }
  }
})

function prevPage() {
  if (currentPage.value > 0) {
    currentPage.value--
  }
}

function nextPage() {
  if (currentPage.value < totalPages.value - 1) {
    currentPage.value++
  }
}

function goToPage(i) {
  if (i >= 0 && i < totalPages.value) {
    currentPage.value = i
  }
}


// ----------------------
// Salvar inspeção
// ----------------------

async function submitForm() {
  // avoid autosave racing with submit
  clearTimeout(autosaveTimer)

  if (isEditMode.value) {
    await saveDraft()
    return
  }

  if (!form.title || !form.title.trim()) {
    setStatus('Preencha o Título da inspeção.', 'error', 4000)
    return
  }

  setStatus('Salvando...', 'info', 0)

  if (!form.id) form.id = "i" + Date.now()

  // persist as awaiting network (blocked until sync runs)
  const persisted = await persistInspection('Aguardando Rede')

  if (!persisted) {
    setStatus('Não foi possível salvar a inspeção sem título.', 'error', 4000)
    return
  }

  // if offline, notify user and return
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    setStatus('Sem conexão. A inspeção ficará em Aguardando Rede.', 'warning', 5000)
    setTimeout(() => returnToMain(), 1000)
    return
  }

  // only attempt sync when authenticated
  const token = getToken()
  if (!token) {
    setStatus('Não autenticado. Faça login para sincronizar com o banco.', 'error', 4000)
    setTimeout(() => router.push('/login'), 1000)
    return
  }

  // attempt synchronization / send now
  try {
      const result = await sendInspectionNow({
        ...form,
        status: 'Aguardando Rede',
        userEmail: form.userEmail || localStorage.getItem('user_email') || ''
      })

      if (result && result.status === 'Enviado') {
        setStatus('Enviado com sucesso para o banco de dados Oracle!', 'success', 3500)
      } else {
        setStatus('Back-end inacessível! Salvo offline e tentaremos reenviar em breve.', 'warning', 6000)
      }

      await syncInspections()
  } catch (err) {
      setStatus('Erro de conexão com o Back-end/Banco.', 'error', 6000)
  }

  setTimeout(() => returnToMain(), 1200)

}

// geolocation helpers
function setMarker(latlng) {
  if (!mapRef.value) return
  if (mapMarker.value) {
    mapMarker.value.setLatLng(latlng)
  } else {
    mapMarker.value = L.marker(latlng, { draggable: true }).addTo(mapRef.value)
    mapMarker.value.on('dragend', (e) => {
      const p = e.target.getLatLng()
      updatePosition(p.lat, p.lng)
    })
  }
}

function setPersonMarker(latlng) {
  if (!mapRef.value) return
  if (personMarker.value) {
    personMarker.value.setLatLng(latlng)
  } else {
    const icon = L.divIcon({
      html: '<div style="font-size: 36px; line-height: 1; filter: drop-shadow(0px 2px 3px rgba(0,0,0,0.8));">🧍</div>',
      className: 'person-icon',
      iconSize: [36, 36],
      iconAnchor: [18, 36] // point to bottom center
    })
    personMarker.value = L.marker(latlng, { 
      icon, 
      zIndexOffset: 1000, 
      interactive: false 
    }).addTo(mapRef.value)
  }
}

function updatePosition(lat, lng) {
  form.latitude = Number(lat.toFixed(6))
  form.longitude = Number(lng.toFixed(6))
}

function captureGPS() {
  if (!navigator.geolocation) {
    setStatus('Geolocalização não disponível no navegador', 'error', 4000)
    return
  }

  setStatus('Capturando posição...', 'info', 0)

  navigator.geolocation.getCurrentPosition((pos) => {
    const lat = pos.coords.latitude
    const lng = pos.coords.longitude
    updatePosition(lat, lng)
    if (mapRef.value) {
      setMarker([lat, lng])
      setPersonMarker([lat, lng])
      mapRef.value.setView([lat, lng], 17) // Zoom mais próximo (era 16, agora 17)
    }
    setStatus('Posição capturada', 'success', 2000)
  }, (err) => {
    // Tratamento de erro detalhado para ajudar o usuário
    if (err.code === 1) { // PERMISSION_DENIED
      setStatus('Localização bloqueada pelo navegador. Permita o acesso ao GPS na barra de endereço.', 'error', 6000)
    } else {
      setStatus('Erro ao obter posição: ' + err.message, 'error', 4000)
    }
  }, { enableHighAccuracy: true, timeout: 10000 })
}

function tryInitMap() {
  // initialize map container if present
  setTimeout(() => {
    const el = document.getElementById('inspection-map')
    if (!el) return

    if (mapRef.value) {
      mapRef.value.invalidateSize()
      return
    }

    mapRef.value = L.map(el, { center: [ -23.55052, -46.633308 ], zoom: 13 })

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(mapRef.value)

    // if we already have coordinates, show marker
    if (form.latitude && form.longitude) {
      setMarker([form.latitude, form.longitude])
      mapRef.value.setView([form.latitude, form.longitude], 17)
    }

    // Sempre mostrar onde o usuário está com o ícone da pessoinha
    if (navigator.geolocation) {
      if (inspectionId === 'new' && !form.latitude) setStatus('Capturando posição...', 'info', 0);
      
      navigator.geolocation.getCurrentPosition((pos) => {
        if (mapRef.value) {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          
          setPersonMarker([lat, lng]);
          
          // Se for uma nova inspeção e estiver vazia, assume essa posição logada como a inicial!
          if (inspectionId === 'new' && !form.latitude) {
            updatePosition(lat, lng);
            setMarker([lat, lng]);
            mapRef.value.setView([lat, lng], 17);
            setStatus('Posição inicial capturada', 'success', 2000);
          }
        }
      }, (err) => {
        console.warn("Não foi possível obter a posição atual:", err)
        if (inspectionId === 'new' && !form.latitude) {
           if (err.code === 1) setStatus('Acesso ao GPS bloqueado.', 'error', 4000);
           else setStatus('Falha ao capturar posição: ' + err.message, 'error', 4000);
        }
      }, { enableHighAccuracy: true, timeout: 10000 })
    }

    // allow clicking on map to set marker
    mapRef.value.on('click', (e) => {
      const { lat, lng } = e.latlng
      updatePosition(lat, lng)
      setMarker([lat, lng])
    })
    
    // Assegura que o mapa ajuste ao tamanho do container
    setTimeout(() => {
      if (mapRef.value) mapRef.value.invalidateSize()
    }, 200)

  }, 100)
}

async function persistInspection(status = "Rascunho") {

  if (!form.title || !form.title.trim()) {
    return false
  }

  if (!form.id) {
    form.id = "i" + Date.now()
  }

  const payload = {
    ...form,
    photos: [...photoFiles.value],
    status: isEditMode.value ? (loadedStatus.value || form.status || status) : status,
    userEmail: form.userEmail || localStorage.getItem('user_email') || ''
  }

  if (isEditMode.value) {
    const apiPayload = { ...payload }
    delete apiPayload.photo
    delete apiPayload.photos
    delete apiPayload.photoName
    delete apiPayload.photoType

    if (inspectionSource.value === 'api') {
      await updateInspectionAPI(payload.id, apiPayload)
    }

    await saveInspection(payload)

    const index = store.inspections.findIndex(i => i.id === payload.id)

    if (index !== -1) {
      store.inspections[index] = payload
    } else {
      store.inspections.push(payload)
    }

    loadedStatus.value = payload.status
    form.status = payload.status
    return true
  }

  await saveInspection(payload)

  const index = store.inspections.findIndex(i => i.id === payload.id)

  if (index !== -1) {
    store.inspections[index] = payload
  } else {
    store.inspections.push(payload)
  }

  return true

}


async function saveDraft() {

  const saved = await persistInspection(isEditMode.value ? (loadedStatus.value || form.status || 'Enviado') : "Não enviada")

  if (!saved) {
    setStatus('Preencha o Título da inspeção.', 'error', 4000)
    return
  }

  setStatus(isEditMode.value ? 'Alterações salvas' : 'Rascunho salvo', 'success', 2000)

  returnToMain()
}

function returnToMain() {
  if (getIsAdmin()) {
    router.push('/main-admin')
  } else {
    router.push('/main-user')
  }
}

function cancel() {
  returnToMain()
}

function logout() {
  localStorage.removeItem("auth_token")
  localStorage.removeItem("user_role")

  showUserMenu.value = false
  router.push('/login')
}
function updateMapFromInputs() {
  if (mapRef.value && form.latitude && form.longitude) {
    setMarker([form.latitude, form.longitude])
    mapRef.value.setView([form.latitude, form.longitude], 17)
  }
}

async function toggleCamera() {
  cameraError.value = ''

  if (cameraActive.value) {
    stopCamera()
    return
  }

  if (!navigator.mediaDevices?.getUserMedia) {
    cameraError.value = 'Seu navegador não suporta acesso à câmera.'
    return
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: 'environment' } },
      audio: false
    })

    cameraStream.value = stream
    cameraActive.value = true

    await nextTick()
    if (cameraVideo.value) {
      cameraVideo.value.srcObject = stream
      await cameraVideo.value.play()
    }
  } catch (err) {
    console.error('Erro ao abrir câmera:', err)
    cameraError.value = 'Não foi possível acessar a câmera. Verifique as permissões do navegador.'
  }
}

function stopCamera() {
  cameraActive.value = false
  cameraError.value = ''

  if (cameraVideo.value) {
    cameraVideo.value.srcObject = null
  }

  if (cameraStream.value) {
    cameraStream.value.getTracks().forEach(track => track.stop())
    cameraStream.value = null
  }
}

async function captureFromCamera() {
  if (!cameraVideo.value) return

  const video = cameraVideo.value
  const canvas = document.createElement('canvas')
  canvas.width = video.videoWidth || 1280
  canvas.height = video.videoHeight || 720

  const context = canvas.getContext('2d')
  if (!context) {
    cameraError.value = 'Não foi possível capturar a foto.'
    return
  }

  context.drawImage(video, 0, 0, canvas.width, canvas.height)

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.92))
  if (!blob) {
    cameraError.value = 'Não foi possível gerar a imagem capturada.'
    return
  }

  const file = new File([blob], `inspecao_${Date.now()}.jpg`, { type: 'image/jpeg' })

  addPhotos([file])
  stopCamera()
}

function onImagesSelected(event) {
  const files = Array.from(event?.target?.files || [])
  if (!files.length) return

  addPhotos(files)

  if (event?.target) {
    event.target.value = ''
  }
}

function removePhoto(index) {
  if (index < 0 || index >= photoFiles.value.length) return

  const nextFiles = [...photoFiles.value]
  nextFiles.splice(index, 1)
  setPhotos(nextFiles)
}
</script>

<style scoped>
/* Keep visual language consistent with admin screens */
.container {
  min-height: 100vh;
  width: 100%;
  background: #fff;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 2rem 0
}

.admin-screen {
  width: 100%;
  max-width: 1100px;
  background: #fff;
  border-radius: 12px;
  padding: 1.25rem 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1rem
}

.admin-header {
  display: flex;
  align-items: center;
  gap: 1rem
}

.header-left {
  display: flex;
  align-items: center;
  gap: 0.75rem
}

.logo {
  width: 56px
}

.header-info h1 {
  margin: 0;
  font-size: 1.4rem
}

.subtitle {
  margin: 0;
  color: #666
}

.user-area {
  margin-left: auto;
  position: relative
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
  cursor: pointer
}

.user-menu {
  position: absolute;
  right: 0;
  top: 48px;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  padding: 0.35rem
}

.user-logout {
  background: none;
  border: none;
  padding: 0.5rem 0.75rem;
  color: #b71c1c;
  cursor: pointer
}

.table-wrap {
  background: transparent;
  padding: 0
}

.map-section {
  margin-top: 1rem;
}

.map-wrap {
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid #e6e6e9;
}

.map-controls {
  margin-top: 0.5rem;
  display: flex;
  gap: 0.75rem;
  align-items: center;
}

.coords-display {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  margin-bottom: 0.5rem;
  font-size: 0.85rem;
  color: #444;
}

.coords-display input {
  width: 100px;
  padding: 0.25rem 0.5rem;
  font-size: 0.85rem;
  background-color: #fff;
  border: 1px solid #ccc;
  border-radius: 4px;
}

.form {
  display: flex;
  flex-direction: column;
  gap: 0.75rem
}

.row {
  display: flex;
  flex-direction: column
}

.photo-row {
  margin-top: 0.25rem;
}

.photo-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: center;
}

.file-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.photo-help {
  color: #6b7280;
  font-size: 0.85rem;
  margin-top: 0.25rem;
}

.photo-error {
  margin-top: 0.5rem;
  color: #b42318;
  font-weight: 600;
}

.camera-panel {
  margin-top: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.camera-video {
  width: 100%;
  max-width: 520px;
  aspect-ratio: 4 / 3;
  background: #0f172a;
  border-radius: 12px;
  border: 1px solid #e5e7eb;
  object-fit: cover;
}

.camera-controls {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.photo-preview-wrap {
  margin-top: 0.65rem;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  overflow: hidden;
  max-width: 360px;
}

.photo-preview-grid {
  margin-top: 0.65rem;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 0.75rem;
}

.photo-preview-item {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.photo-preview {
  width: 100%;
  height: auto;
  display: block;
  border-radius: 10px;
  border: 1px solid #e5e7eb;
  object-fit: cover;
}

.photo-remove-btn {
  border: none;
  background: #f3f4f6;
  color: #991b1b;
  border-radius: 8px;
  padding: 0.45rem 0.75rem;
  cursor: pointer;
}

.photo-count {
  margin-top: 0.65rem;
  color: #666;
  font-size: 0.95rem;
}

.row.two {
  display: flex;
  gap: 0.75rem
}

label {
  font-weight: 600;
  margin-bottom: 0.4rem
}

input {
  width: 100%;
  background-color: #f5f5f5;
  font-weight: bolder;
  padding: 0.65rem 0.75rem;
  color: #606060;
  border-radius: 8px;
  border: 1px solid #e6e6e9;
  font-size: 1rem;
}

input:focus {
  outline: none;
  border: 1px solid #ccc;
}

textarea {
  width: 100%;
  background-color: #f5f5f5;
  font-weight: bolder;
  padding: 0.65rem 0.75rem;
  color: #606060;
  border-radius: 8px;
  border: 1px solid #e6e6e9;
  font-size: 1rem;
}

textarea:focus {
  outline: none;
  border: 1px solid #ccc;
}

.btn:focus {
  outline: none;
  border: 1px solid #ccc;
}

.actions {
  display: flex;
  gap: 0.6rem;
  margin-top: 0.25rem
}

.btn-primary {
  background: #097a5e;
  color: #fff;
  border: none;
  padding: 0.6rem 0.9rem;
  border-radius: 8px;
  cursor: pointer;
  width: 100%;
}

.btn {
  padding: 0.45rem 0.7rem;
  border-radius: 8px;
  border: 1px solid #eee;
  background-color: #ffffff;
  color: #333333;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.2s;
}

.btn:hover {
  background-color: #f0f0f0;
}

.btn.draw {
  color: #f7f7f8;
  background: #929288;
}

.btn.ghost {
  color: #ee3338;
  background-color: transparent;
  border-color: #ee3338;
}

.btn.ghost:hover {
  background-color: rgba(238, 51, 56, 0.1);
}

.status {
  margin-top: 0.5rem;
  color: #444;
  font-weight: 600
}

.status.success {
  color: #155724;
  background: #d4edda;
  padding: 0.45rem 0.6rem;
  border-radius: 6px
}

.status.error {
  color: #721c24;
  background: #f8d7da;
  padding: 0.45rem 0.6rem;
  border-radius: 6px
}

.status.info {
  color: #0c5460;
  background: #d1ecf1;
  padding: 0.45rem 0.6rem;
  border-radius: 6px
}

.status.warning {
  color: #856404;
  background: #fff3cd;
  padding: 0.45rem 0.6rem;
  border-radius: 6px
}

@media (max-width:720px) {
  .row.two {
    flex-direction: column
  }

  .actions {
    flex-direction: column
  }
}

/* Pagination styles */
.pagination {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.6rem;
  margin: 0.5rem 0
}

.pagination.arrows {
  justify-content: center;
  gap: 0.6rem;
}

.page-buttons {
  display: flex;
  gap: 0.4rem;
  justify-content: center;
  flex: 1
}

.page-btn {
  padding: 0.35rem 0.6rem;
  border-radius: 6px;
  border: 1px solid #ccc;
  background-color: #ffffff;
  color: #333333;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.page-btn:hover {
  background-color: #f0f0f0;
}

.page-btn.active {
  background-color: #097a5e;
  color: #ffffff;
  border-color: transparent;
}

@media (max-width:480px) {
  .pagination {
    flex-direction: column;
    gap: 0.5rem
  }

  .pagination.arrows {
    flex-direction: row;
    justify-content: center;
    gap: 0.6rem;
  }

  .page-buttons {
    width: 100%;
    overflow-x: auto
  }

  .page-btn {
    flex: 0 0 auto
  }

  .actions {
    flex-direction: column
  }
}
.person-icon {
  background: transparent;
  border: none;
  cursor: default;
}
</style>