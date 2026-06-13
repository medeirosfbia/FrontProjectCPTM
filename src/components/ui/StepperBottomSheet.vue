<template>
  <div v-if="visible" class="sheet-overlay" role="dialog" aria-modal="true" @click.self="$emit('close')">
    <section class="step-sheet">
      <header class="sheet-header">
        <div>
          <strong>Etapas do formulario</strong>
          <span>{{ currentStep + 1 }} de {{ steps.length }}</span>
        </div>
        <button type="button" class="btn ghost" @click="$emit('close')">Fechar</button>
      </header>

      <div class="sheet-list">
        <button
          v-for="(step, index) in steps"
          :key="step.title"
          type="button"
          class="sheet-step"
          :class="{ active: index === currentStep, done: index < currentStep, error: stepErrors[index] }"
          @click="select(index)"
        >
          <span>{{ marker(index) }}</span>
          <div>
            <strong>{{ step.title }}</strong>
            <small>{{ step.description }}</small>
          </div>
        </button>
      </div>
    </section>
  </div>
</template>

<script setup>
const props = defineProps({
  visible: { type: Boolean, default: false },
  steps: { type: Array, required: true },
  currentStep: { type: Number, required: true },
  stepErrors: { type: Array, default: () => [] }
})

const emit = defineEmits(['close', 'go-to-step'])

function marker(index) {
  if (props.stepErrors[index]) return '!'
  if (index < props.currentStep) return '✓'
  return index + 1
}

function select(index) {
  emit('go-to-step', index)
  emit('close')
}
</script>

<style scoped>
.sheet-overlay {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  background: rgba(16, 24, 40, 0.52);
  padding: 12px;
}

.step-sheet {
  width: min(720px, 100%);
  max-height: min(78vh, 680px);
  display: flex;
  flex-direction: column;
  border: 1px solid var(--gray-200);
  border-radius: 16px 16px var(--radius) var(--radius);
  background: #fff;
  box-shadow: 0 24px 60px rgba(16, 24, 40, 0.24);
}

.sheet-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  border-bottom: 1px solid var(--gray-200);
  padding: 14px;
}

.sheet-header div {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.sheet-header strong {
  color: var(--gray-900);
  font-weight: 900;
}

.sheet-header span {
  color: var(--gray-500);
  font-size: 0.84rem;
  font-weight: 800;
}

.sheet-list {
  min-height: 0;
  overflow-y: auto;
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.sheet-step {
  display: grid;
  grid-template-columns: 34px minmax(0, 1fr);
  gap: 10px;
  align-items: center;
  min-height: 56px;
  border: 1px solid var(--gray-200);
  border-radius: var(--radius);
  background: #fff;
  padding: 10px;
  text-align: left;
}

.sheet-step span {
  width: 32px;
  height: 32px;
  display: grid;
  place-items: center;
  border-radius: 999px;
  background: var(--gray-100);
  font-weight: 900;
}

.sheet-step strong,
.sheet-step small {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sheet-step small {
  color: var(--gray-500);
  font-weight: 700;
}

.sheet-step.active {
  border-color: rgba(215, 25, 32, 0.32);
  background: #fff1f1;
}

.sheet-step.active span,
.sheet-step.done span {
  background: var(--cptm-red);
  color: #fff;
}

.sheet-step.error {
  border-color: #fecaca;
}

.sheet-step.error span {
  background: #b42318;
  color: #fff;
}
</style>
