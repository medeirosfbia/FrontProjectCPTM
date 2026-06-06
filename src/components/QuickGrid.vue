<template>
  <div class="quick-grid">
    <button class="quick-btn green" @click="$emit('openNewInspection')" aria-label="Abrir novo registro">
      <Plus :size="28" />
      <div class="label">Novo Registro</div>
    </button>

    <button
      class="quick-btn yellow"
      :class="{ active: viewFilter === 'scheduled' }"
      @click="$emit('setFilter', 'scheduled')"
      :aria-pressed="viewFilter === 'scheduled'"
      aria-label="Rascunhos locais"
    >
      <Calendar :size="28" />
      <div class="label">Rascunhos</div>
    </button>

    <button
      class="quick-btn blue"
      :class="{ active: viewFilter === 'sent' }"
      @click="$emit('setFilter', 'sent')"
      :aria-pressed="viewFilter === 'sent'"
      aria-label="Registros enviados"
    >
      <Send :size="28" />
      <div class="label">Registros Enviados</div>
    </button>

    <button
      class="quick-btn red"
      :class="{ active: viewFilter === 'all' }"
      @click="$emit('setFilter', 'all')"
      :aria-pressed="viewFilter === 'all'"
      aria-label="Meus registros"
    >
      <ClipboardList :size="28" />
      <div class="label">Meus Registros</div>
    </button>
  </div>
</template>

<script setup>
import { Calendar, ClipboardList, Plus, Send } from 'lucide-vue-next'

defineProps({
  viewFilter: {
    type: String,
    required: true
  }
})

defineEmits(['setFilter', 'openNewInspection'])
</script>

<style scoped>
.quick-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.9rem;
  width: 100%;
}

.quick-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 1.15rem;
  border-radius: 8px;
  background-color: #dc1c22;
  color: #fff;
  border: none;
  cursor: pointer;
  box-shadow: 0 6px 18px #ccc;
  min-height: 88px;
  text-align: center;
}

.quick-btn .label {
  font-weight: 700;
  font-size: 0.95rem;
}

.quick-btn:hover {
  transform: translateY(-3px);
  box-shadow: 0 12px 26px #ccc;
}

.quick-btn.active {
  box-shadow: 0 10px 24px #ccc;
}

.quick-btn:focus {
  outline: 3px solid #ccc;
}

.quick-btn.green {
  background-color: #097a5e;
}

.quick-btn.yellow {
  background-color: #f2c036;
  color: #262626;
}

.quick-btn.blue {
  background-color: #2b5c9e;
}

.quick-btn.red {
  background-color: #de221d;
}

@media (max-width: 900px) {
  .quick-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 480px) {
  .quick-grid {
    grid-template-columns: 1fr;
  }

  .quick-btn {
    min-height: 72px;
    padding: 0.85rem;
  }
}
</style>
