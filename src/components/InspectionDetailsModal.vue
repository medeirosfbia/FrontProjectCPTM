<template>
    <div class="modal-overlay" v-if="visible" role="dialog" aria-modal="true" @click.self="close">
        <div class="modal details-modal">
            <div class="modal-header">
                <h3>Inspeção: {{ inspection?.title || inspection?.titulo || 'Sem Título' }}</h3>
                <button class="close-btn" @click="close">×</button>
            </div>
            
            <div class="modal-content">
                <div class="info-group">
                    <p><strong>ID:</strong> {{ inspection?.id }}</p>
                    <p><strong>Status:</strong> {{ inspection?.status || 'Enviado' }}</p>
                    <p><strong>Criada em:</strong> {{ formattedDate }}</p>
                </div>

                <div class="info-group">
                    <h4>Foto</h4>
                    <div v-if="photoLoading" class="photo-status">Carregando foto...</div>
                    <div v-else-if="photoUrl" class="photo-wrap">
                        <img :src="photoUrl" alt="Foto da inspeção" class="photo-image" />
                    </div>
                    <div v-else class="photo-status">Nenhuma foto disponível.</div>
                </div>

                <div class="info-group">
                    <h4>Respostas</h4>
                    <p><strong>Q1:</strong> {{ inspection?.q1 || inspection?.Q1 }}</p>
                    <p><strong>Q2:</strong> {{ inspection?.q2 || inspection?.Q2 }}</p>
                    <p><strong>Q3:</strong> {{ inspection?.q3 || inspection?.Q3 }}</p>
                    <p><strong>Q4:</strong> {{ inspection?.q4 || inspection?.Q4 }}</p>
                    <p><strong>Q5:</strong> {{ inspection?.q5 || inspection?.Q5 }}</p>
                    <p><strong>Q6:</strong> {{ inspection?.q6 || inspection?.Q6 }}</p>
                    <p><strong>Observações:</strong> {{ inspection?.notes || inspection?.Notes || 'Não informado' }}</p>
                </div>

                <div class="info-group">
                    <h4>Localização</h4>
                    <p><strong>Endereço:</strong> {{ fetchedAddress || inspection?.address || inspection?.Address || 'Não informado' }}</p>
                    <p><strong>Coordenadas:</strong> {{ displayCoordinates || 'Não informado' }}</p>
                    
                    <div class="map-container" v-if="latLng">
                        <iframe 
                            width="100%" 
                            height="200" 
                            style="border:0; border-radius: 8px; margin-top: 10px;"
                            loading="lazy" 
                            allowfullscreen 
                            :src="mapUrl">
                        </iframe>
                        <a :href="googleMapsLink" target="_blank" rel="noopener noreferrer" class="btn block-btn open-maps-btn">
                            Abrir no Google Maps
                        </a>
                    </div>
                </div>
            </div>

            <div class="modal-actions">
                <button class="btn cancel" @click="close">Fechar</button>
            </div>
        </div>
    </div>
</template>

<script setup>
import { computed, ref, watch, onBeforeUnmount } from 'vue'
import { getInspectionImageBlobAPI } from '../services/api'

const props = defineProps({
    visible: {
        type: Boolean,
        default: false
    },
    inspection: {
        type: Object,
        default: () => null
    }
})

const emit = defineEmits(['close'])

const fetchedAddress = ref('')
const photoUrl = ref('')
const photoLoading = ref(false)
let photoObjectUrl = ''

function close() {
    emit('close')
}

function clearPhotoUrl() {
    if (photoObjectUrl) {
        URL.revokeObjectURL(photoObjectUrl)
        photoObjectUrl = ''
    }
    photoUrl.value = ''
    photoLoading.value = false
}

function setPhotoFromBlob(blob) {
    clearPhotoUrl()

    if (!blob) return

    photoObjectUrl = URL.createObjectURL(blob)
    photoUrl.value = photoObjectUrl
}

async function loadInspectionPhoto() {
    clearPhotoUrl()

    const photo = props.inspection?.photo
    if (photo instanceof Blob) {
        setPhotoFromBlob(photo)
        return
    }

    const directPhotoUrl = props.inspection?.photoUrl || props.inspection?.PhotoUrl
    if (typeof directPhotoUrl === 'string' && directPhotoUrl.trim()) {
        photoUrl.value = directPhotoUrl.trim()
        return
    }

    const id = props.inspection?.serverId || props.inspection?.id || props.inspection?.Id
    if (!id) return

    photoLoading.value = true
    try {
        const blob = await getInspectionImageBlobAPI(id)
        if (blob) setPhotoFromBlob(blob)
    } catch (err) {
        const message = String(err?.message || '')
        if (!message.includes('404')) {
            console.error('Erro ao carregar foto da inspeção:', err)
        }
    } finally {
        photoLoading.value = false
    }
}

// Format the date using Intl.DateTimeFormat
const formattedDate = computed(() => {
    const d = props.inspection?.createdAt || props.inspection?.CreatedAt;
    if (!d) return 'Não informado';
    
    try {
        const dateObj = new Date(d);
        if (isNaN(dateObj.getTime())) return d;
        
        return new Intl.DateTimeFormat('pt-BR', {
            day: '2-digit', 
            month: '2-digit', 
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        }).format(dateObj);
    } catch {
        return d;
    }
})

// Extract location considering possible properties
const locationData = computed(() => {
    return props.inspection?.location || props.inspection?.Location;
})

const latLng = computed(() => {
    // If we have direct latitude and longitude properties
    if (props.inspection?.latitude && props.inspection?.longitude) {
        return { lat: props.inspection.latitude, lng: props.inspection.longitude }
    }
    
    // Fallback to searching inside location string
    if (!locationData.value) return null;
    const parts = locationData.value.split(',');
    if (parts.length >= 2) {
        return { lat: parts[0].trim(), lng: parts[1].trim() }
    }
    return null;
})

const displayCoordinates = computed(() => {
    if (latLng.value) {
        return `${latLng.value.lat}, ${latLng.value.lng}`
    }
    return locationData.value || null
})

const mapUrl = computed(() => {
    if (!latLng.value) return '';
    // Use OSM for map preview
    return `https://www.openstreetmap.org/export/embed.html?bbox=${Number(latLng.value.lng)-0.005},${Number(latLng.value.lat)-0.005},${Number(latLng.value.lng)+0.005},${Number(latLng.value.lat)+0.005}&layer=mapnik&marker=${latLng.value.lat},${latLng.value.lng}`;
})

const googleMapsLink = computed(() => {
    if (!latLng.value) return '';
    return `https://www.google.com/maps/search/?api=1&query=${latLng.value.lat},${latLng.value.lng}`;
})

async function updateAddressFromCoords() {
    fetchedAddress.value = ''
    
    // Don't overwrite if address is already explicitly provided
    if (props.inspection?.address || props.inspection?.Address) return;
    
    if (latLng.value) {
        try {
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latLng.value.lat}&lon=${latLng.value.lng}`)
            const data = await res.json()
            if (data && data.display_name) {
                fetchedAddress.value = data.display_name
            }
        } catch (e) {
            console.error('Erro ao buscar endereço:', e)
        }
    }
}

watch(() => props.visible, (newVal) => {
    if (newVal) {
        updateAddressFromCoords()
        loadInspectionPhoto()
    } else {
        clearPhotoUrl()
    }
})

watch(() => props.inspection, () => {
    if (props.visible) {
        loadInspectionPhoto()
    } else {
        clearPhotoUrl()
    }
}, { deep: true })

onBeforeUnmount(() => {
    clearPhotoUrl()
})

</script>

<style scoped>
.modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
}
.modal.details-modal {
    background: #fff;
    color: #333;
    border-radius: 12px;
    padding: 20px;
    max-width: 500px;
    width: 90%;
    max-height: 90vh;
    display: flex;
    flex-direction: column;
}
.modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid #eee;
    padding-bottom: 10px;
    margin-bottom: 15px;
    color: #333;
}
.modal-header h3 {
    margin: 0;
    color: #222;
}
.close-btn {
    background: none;
    border: none;
    font-size: 1.5rem;
    cursor: pointer;
    line-height: 1;
    color: #666;
}
.modal-content {
    flex: 1;
    overflow-y: auto;
    text-align: left;
    padding-right: 5px;
    color: #444;
}

/* Scrollbar fina */
.modal-content::-webkit-scrollbar {
    width: 6px;
}
.modal-content::-webkit-scrollbar-track {
    background: #f9f9f9;
    border-radius: 4px;
}
.modal-content::-webkit-scrollbar-thumb {
    background: #d0d0d0;
    border-radius: 4px;
}
.modal-content::-webkit-scrollbar-thumb:hover {
    background: #a0a0a0;
}

.info-group {
    margin-bottom: 15px;
    padding-bottom: 15px;
    border-bottom: 1px solid #efefef;
}
.photo-wrap {
    margin-top: 8px;
}
.photo-image {
    width: 100%;
    max-height: 260px;
    object-fit: contain;
    border-radius: 10px;
    border: 1px solid #e5e7eb;
    background: #fafafa;
}
.photo-status {
    color: #6b7280;
    font-size: 0.95rem;
}
.info-group:last-child {
    border-bottom: none;
}
.info-group h4 {
    margin-bottom: 8px;
    color: #444;
}
.map-container {
    margin-top: 10px;
}
.open-maps-btn {
    margin-top: 10px;
    display: block;
    text-align: center;
    width: 100%;
    box-sizing: border-box;
    text-decoration: none;
    background-color: var(--primary-color, #C2185B);
    color: white;
    padding: 10px;
    border-radius: 8px;
}
.modal-actions {
    margin-top: 15px;
    display: flex;
    justify-content: flex-end;
    border-top: 1px solid #eee;
    padding-top: 15px;
}
.btn.cancel {
    background: #ccc;
    color: #333;
    padding: 8px 16px;
    border: none;
    border-radius: 8px;
    cursor: pointer;
}
</style>