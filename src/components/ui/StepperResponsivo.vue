<template>
  <nav class="stepper-responsive" aria-label="Etapas do formulario">
    <div class="stepper-progress">
      <div>
        <span>Etapa {{ currentStep + 1 }} de {{ steps.length }}</span>
        <strong>{{ progressPercent }}%</strong>
      </div>
      <div class="progress-track">
        <div class="progress-bar" :style="{ width: `${progressPercent}%` }"></div>
      </div>
    </div>

    <div class="stepper-list">
      <button
        v-for="(step, index) in steps"
        :key="step.title"
        type="button"
        class="stepper-item"
        :class="stepClass(index)"
        :aria-current="index === currentStep ? 'step' : undefined"
        @click="$emit('go-to-step', index)"
      >
        <span class="stepper-index">{{ marker(index) }}</span>
        <span class="stepper-copy">
          <strong>{{ step.title }}</strong>
          <small>{{ step.description }}</small>
        </span>
      </button>
    </div>
  </nav>
</template>

<script setup>
const props = defineProps({
  steps: { type: Array, required: true },
  currentStep: { type: Number, required: true },
  progressPercent: { type: Number, required: true },
  stepErrors: { type: Array, default: () => [] }
})

defineEmits(['go-to-step'])

function hasError(index) {
  return Boolean(props.stepErrors[index])
}

function stepClass(index) {
  return {
    active: index === props.currentStep,
    done: index < props.currentStep && !hasError(index),
    error: hasError(index)
  }
}

function marker(index) {
  if (hasError(index)) return '!'
  if (index < props.currentStep) return '✓'
  return index + 1
}
</script>

<style scoped>
.stepper-responsive {
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-height: calc(100vh - 128px);
  overflow: hidden;
}

.stepper-progress {
  flex: 0 0 auto;
  border-radius: var(--radius);
  background: var(--gray-50);
  padding: 12px;
}

.stepper-progress > div:first-child {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 8px;
}

.stepper-progress span {
  color: var(--gray-500);
  font-weight: 800;
}

.stepper-progress strong {
  color: var(--cptm-red);
}

.progress-track {
  height: 8px;
  overflow: hidden;
  border-radius: 999px;
  background: var(--gray-200);
}

.progress-bar {
  height: 100%;
  border-radius: inherit;
  background: var(--cptm-red);
}

.stepper-list {
  min-height: 0;
  overflow-y: auto;
  padding-right: 2px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.stepper-item {
  width: 100%;
  display: grid;
  grid-template-columns: 30px minmax(0, 1fr);
  gap: 9px;
  align-items: center;
  text-align: left;
  border: 1px solid transparent;
  border-radius: var(--radius);
  background: transparent;
  color: var(--gray-700);
  padding: 9px;
}

.stepper-item:focus-visible {
  outline: 3px solid rgba(215, 25, 32, 0.2);
  outline-offset: 2px;
}

.stepper-index {
  width: 28px;
  height: 28px;
  display: grid;
  place-items: center;
  border-radius: 999px;
  background: var(--gray-100);
  color: var(--gray-700);
  font-size: 0.82rem;
  font-weight: 900;
}

.stepper-copy {
  min-width: 0;
}

.stepper-copy strong,
.stepper-copy small {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.stepper-copy small {
  color: var(--gray-500);
  font-size: 0.78rem;
  font-weight: 700;
}

.stepper-item.active {
  border-color: rgba(215, 25, 32, 0.26);
  background: #fff1f1;
}

.stepper-item.active .stepper-index,
.stepper-item.done .stepper-index {
  background: var(--cptm-red);
  color: #fff;
}

.stepper-item.error {
  border-color: #fecaca;
  background: #fff5f5;
}

.stepper-item.error .stepper-index {
  background: #b42318;
  color: #fff;
}

@media (max-width: 1100px) {
  .stepper-responsive {
    max-height: none;
    overflow: visible;
  }

  .stepper-list {
    overflow-x: auto;
    overflow-y: hidden;
    flex-direction: row;
    padding-bottom: 4px;
  }

  .stepper-item {
    width: min(260px, 72vw);
    flex: 0 0 auto;
  }
}
</style>
