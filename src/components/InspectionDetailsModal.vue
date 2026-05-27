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
import { computed, ref, watch } from 'vue'

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

function close() {
    emit('close')
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
    }
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