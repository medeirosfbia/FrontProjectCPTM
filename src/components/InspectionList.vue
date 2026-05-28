<template>
  <section v-if="items && items.length" class="list">
    <h2 v-if="title">{{ title }} ({{ items.length }})</h2>
    <div v-for="ins in items" :key="ins.id" class="inspection">
      <div class="left">
        <strong class="inspection-title">{{ ins.title || ins.titulo || 'Sem título' }}</strong>
        <div class="mono">ID: {{ ins.id }}</div>
      </div>

      <div class="right">
        <div :class="['status', statusClass(ins)]">{{ statusLabel(ins) }}</div>

        <div class="action-menu-container">
          <button class="btn-small dots-btn" @click.stop="toggle(ins)">⋮</button>
          <div class="action-menu" v-if="openFor === uid(ins)">
            <button v-if="showContinue && !isSent(ins)" class="btn" @click="onContinue && onContinue(ins); close()">Continuar</button>
            <button v-if="showSend && !isSent(ins)" class="btn" :style="sendStyle" @click="onSend && onSend(ins); close()">Enviar</button>
            <button v-if="showDetails" class="btn" @click="onDetails && onDetails(ins); close()">Ver mais</button>
            <button v-if="showDelete && (allowDeleteSent || !isSent(ins))" class="btn" :style="deleteStyle" @click="onDelete && onDelete(ins); close()">Apagar</button>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref } from 'vue'

const props = defineProps({
  items: { type: Array, default: () => [] },
  title: { type: String, default: '' },
  idPrefix: { type: String, default: '' },
  showContinue: { type: Boolean, default: false },
  showSend: { type: Boolean, default: false },
  showDetails: { type: Boolean, default: true },
  showDelete: { type: Boolean, default: false },
  allowDeleteSent: { type: Boolean, default: false },
  onContinue: Function,
  onSend: Function,
  onDetails: Function,
  onDelete: Function,
  sendStyle: { type: Object, default: () => ({ background: '#4CAF50', color: '#fff' }) },
  deleteStyle: { type: Object, default: () => ({ background: '#dc1c22', color: '#fff' }) }
})

const openFor = ref(null)

function uid(ins) {
  return `${props.idPrefix}${ins.id}`
}
function toggle(ins) {
  openFor.value = openFor.value === uid(ins) ? null : uid(ins)
}
function close() { openFor.value = null }

function statusLabel(ins) {
  return ins.status || 'Enviado'
}

function normalizedStatus(ins) {
  return String(ins?.status || 'Enviado').trim().toLowerCase()
}

function isSent(ins) {
  return normalizedStatus(ins) === 'enviado'
}

function statusClass(ins) {
  const value = normalizedStatus(ins)

  if (value === 'enviado') return 'status--sent'
  if (value.includes('aguard')) return 'status--waiting'
  if (value.includes('não enviada') || value.includes('nao enviada') || value.includes('não enviado') || value.includes('nao enviado')) return 'status--draft'
  return 'status--neutral'
}
</script>

<style scoped>
.list { display:flex; flex-direction:column; gap:0.75rem }
.inspection { box-sizing:border-box; max-width:100%; display:flex; justify-content:space-between; align-items:center; background:#fff; padding:1rem 1.25rem; border-radius:8px; border:1px solid #eaeaea }
.inspection .left { display:flex; flex-direction:column; gap:0.25rem }
.inspection-title { font-size:1.05rem; color:#111 }
.mono { font-family:ui-monospace, SFMono-Regular, Menlo, Monaco, 'Roboto Mono', monospace; color:#666 }
.inspection .right { display:flex; align-items:center; gap:0.75rem }
.status {
  padding:0.3rem 0.6rem;
  border-radius:999px;
  font-size:0.8rem;
  font-weight:700;
  letter-spacing:0.01em;
  border:1px solid transparent;
  white-space:nowrap;
}
.status--sent { background:#e7f7ec; color:#1f7a3f; border-color:#bfe8cb }
.status--waiting { background:#fff2de; color:#a85d00; border-color:#ffd29a }
.status--draft { background:#ffe6e6; color:#b42318; border-color:#f5b4b4 }
.status--neutral { background:#f3f4f6; color:#4b5563; border-color:#e5e7eb }
.action-menu-container { position:relative; display:inline-block }
.dots-btn { background:none; border:none; font-size:1.4rem; cursor:pointer; padding:0 0.5rem; color:#555 }
.action-menu { position:absolute; right:0; top:100%; background:#fff; border:1px solid #ccc; border-radius:8px; box-shadow:0 4px 6px rgba(0,0,0,0.1); display:flex; flex-direction:column; padding:0.5rem; gap:0.5rem; z-index:100; min-width:120px }
.action-menu button { width:100%; text-align:center }

@media (max-width:720px) {
  .inspection { flex-direction:column; align-items:flex-start; gap:1rem }
  .inspection .right { width:100%; justify-content:space-between }
}
</style>
