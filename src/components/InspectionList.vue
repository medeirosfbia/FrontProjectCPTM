<template>
  <section v-if="items && items.length" class="list">
    <h2 v-if="title">{{ title }} ({{ items.length }})</h2>
    <div v-for="ins in items" :key="itemId(ins)" class="inspection">
      <div class="left">
        <strong class="inspection-title">{{ itemTitle(ins) }}</strong>
        <div class="meta">{{ itemLocation(ins) }}</div>
        <div class="meta subtle">{{ itemMeta(ins) }}</div>
      </div>

      <div class="right">
        <div :class="['status', statusClass(ins)]">{{ statusLabel(ins) }}</div>

        <div class="action-menu-container">
          <button class="btn-small dots-btn" @click.stop="toggle(ins)">...</button>
          <div class="action-menu" v-if="openFor === uid(ins)">
            <button v-if="showDetails && shouldShowDetails(ins)" class="btn" @click="onDetails && onDetails(ins); close()">{{ detailsLabel(ins) }}</button>
            <button v-if="showContinue && shouldShowContinue(ins)" class="btn" @click="onContinue && onContinue(ins); close()">{{ primaryActionLabel(ins) }}</button>
            <button v-if="showSend && shouldShowSend(ins)" class="btn" :style="sendStyle" @click="onSend && onSend(ins); close()">{{ sendLabel(ins) }}</button>
            <button v-if="shouldShowCancelPending(ins)" class="btn" @click="onCancelPending && onCancelPending(ins); close()">Cancelar envio</button>
            <button v-if="isSent(ins)" class="btn" @click="downloadPdf(ins)">Baixar PDF</button>
            <button v-if="showDelete && !isPending(ins) && (allowDeleteSent || !isSent(ins))" class="btn" :style="deleteStyle" @click="onDelete && onDelete(ins); close()">{{ deleteLabel(ins) }}</button>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref } from 'vue'
import {
  getEfluenteCardSubtitle,
  getEfluenteCardTitle,
  getEfluenteCardMeta,
  getSyncStatusLabel,
  getSyncStatusVariant,
  SYNC_STATUS
} from '../services/efluenteModel'

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
  onCancelPending: Function,
  onDownloadPdf: Function,
  sendStyle: { type: Object, default: () => ({ background: '#4CAF50', color: '#fff' }) },
  deleteStyle: { type: Object, default: () => ({ background: '#dc1c22', color: '#fff' }) }
})

const openFor = ref(null)

function itemId(ins) {
  if (ins?.syncStatus && ins.syncStatus !== SYNC_STATUS.SENT) {
    return ins?.localId ?? ins?.id ?? ''
  }

  return ins?.pkCdMeioAmbienteCptm ?? ins?.serverId ?? ''
}

function itemTitle(ins) {
  return getEfluenteCardTitle(ins)
}

function itemLocation(ins) {
  return getEfluenteCardSubtitle(ins)
}

function itemMeta(ins) {
  return getEfluenteCardMeta(ins)
}

function uid(ins) {
  return `${props.idPrefix}${itemId(ins)}`
}

function toggle(ins) {
  openFor.value = openFor.value === uid(ins) ? null : uid(ins)
}

function close() {
  openFor.value = null
}

function statusLabel(ins) {
  return getSyncStatusLabel(ins?.syncStatus || SYNC_STATUS.SENT)
}

function normalizedStatus(ins) {
  return String(statusLabel(ins)).trim().toLowerCase()
}

function isSent(ins) {
  return (ins?.syncStatus || SYNC_STATUS.SENT) === SYNC_STATUS.SENT
}

function isDraft(ins) {
  return ins?.syncStatus === SYNC_STATUS.DRAFT
}

function isPending(ins) {
  return ins?.syncStatus === SYNC_STATUS.PENDING_SYNC
}

function isError(ins) {
  return ins?.syncStatus === SYNC_STATUS.ERROR
}

function statusClass(ins) {
  return getSyncStatusVariant(ins?.syncStatus || SYNC_STATUS.SENT)
}

function primaryActionLabel(ins) {
  if (ins?.syncStatus === SYNC_STATUS.DRAFT) return 'Continuar'
  if (ins?.syncStatus === SYNC_STATUS.ERROR) return 'Continuar'
  return 'Editar'
}

function shouldShowContinue(ins) {
  return !isPending(ins)
}

function shouldShowSend(ins) {
  return isDraft(ins) || isError(ins)
}

function sendLabel(ins) {
  if (isError(ins)) return 'Tentar Novamente'
  return 'Enviar'
}

function shouldShowCancelPending(ins) {
  return false
}

function shouldShowDetails(ins) {
  return isSent(ins) || isPending(ins)
}

function detailsLabel(ins) {
  return isSent(ins) ? 'Ver detalhes' : 'Ver'
}

function deleteLabel(ins) {
  if (isDraft(ins) || isError(ins) || isPending(ins)) return 'Excluir'
  return 'Apagar'
}

function downloadPdf(ins) {
  if (props.onDownloadPdf) props.onDownloadPdf(ins)
  else window.print()
  close()
}
</script>

<style scoped>
.list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.inspection {
  box-sizing: border-box;
  max-width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #fff;
  padding: 1rem 1.25rem;
  border-radius: 8px;
  border: 1px solid #eaeaea;
}

.inspection .left {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  min-width: 0;
}

.inspection-title {
  font-size: 1.05rem;
  color: #111;
  overflow-wrap: anywhere;
}

.meta {
  color: #4b5563;
}

.meta.subtle {
  color: #667085;
  font-size: 0.88rem;
}

.mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, 'Roboto Mono', monospace;
  color: #666;
  overflow-wrap: anywhere;
}

.inspection .right {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.status {
  padding: 0.3rem 0.6rem;
  border-radius: 999px;
  font-size: 0.8rem;
  font-weight: 700;
  border: 1px solid transparent;
  white-space: nowrap;
}

.status--sent {
  background: #e7f7ec;
  color: #1f7a3f;
  border-color: #bfe8cb;
}

.status--waiting {
  background: #fff2de;
  color: #a85d00;
  border-color: #ffd29a;
}

.status--draft {
  background: #f3f4f6;
  color: #4b5563;
  border-color: #e5e7eb;
}

.status--error {
  background: #fde7e9;
  color: #9f1239;
  border-color: #f5b4b4;
}

.status--neutral {
  background: #f3f4f6;
  color: #4b5563;
  border-color: #e5e7eb;
}

.action-menu-container {
  position: relative;
  display: inline-block;
}

.dots-btn {
  background: none;
  border: none;
  font-size: 1.2rem;
  cursor: pointer;
  padding: 0 0.5rem;
  color: #555;
}

.action-menu {
  position: absolute;
  right: 0;
  top: 100%;
  background: #fff;
  border: 1px solid #ccc;
  border-radius: 8px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  padding: 0.5rem;
  gap: 0.5rem;
  z-index: 100;
  min-width: 120px;
}

.action-menu button {
  width: 100%;
  text-align: center;
}

.btn {
  padding: 0.45rem 0.7rem;
  border-radius: 8px;
  border: 1px solid #eee;
  background-color: #fff;
  color: #333;
  cursor: pointer;
  font-weight: 600;
}

@media (max-width: 720px) {
  .inspection {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }

  .inspection .right {
    width: 100%;
    justify-content: space-between;
  }
}
</style>
