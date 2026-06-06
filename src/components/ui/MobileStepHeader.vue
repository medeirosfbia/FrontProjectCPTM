<template>
  <section class="mobile-step-header">
    <div class="mobile-step-main">
      <span>Etapa {{ currentStep + 1 }} de {{ steps.length }}</span>
      <strong>{{ current.title }}</strong>
      <small>{{ progressPercent }}% concluido</small>
    </div>
    <button type="button" class="btn" @click="$emit('open-steps')">Ver etapas</button>
    <div class="progress-track">
      <div class="progress-bar" :style="{ width: `${progressPercent}%` }"></div>
    </div>
  </section>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  steps: { type: Array, required: true },
  currentStep: { type: Number, required: true },
  progressPercent: { type: Number, required: true }
})

defineEmits(['open-steps'])

const current = computed(() => props.steps[props.currentStep] || {})
</script>

<style scoped>
.mobile-step-header {
  display: none;
}

@media (max-width: 767px) {
  .mobile-step-header {
    position: sticky;
    top: 0;
    z-index: 40;
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 10px;
    align-items: center;
    margin-top: 10px;
    border: 1px solid var(--gray-200);
    border-radius: var(--radius);
    background: rgba(255, 255, 255, 0.96);
    padding: 10px;
    box-shadow: var(--shadow-sm);
    backdrop-filter: blur(12px);
  }

  .mobile-step-main {
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 1px;
  }

  .mobile-step-main span,
  .mobile-step-main small {
    color: var(--gray-500);
    font-size: 0.78rem;
    font-weight: 800;
  }

  .mobile-step-main strong {
    overflow: hidden;
    color: var(--gray-900);
    font-size: 1rem;
    font-weight: 900;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .progress-track {
    grid-column: 1 / -1;
    height: 7px;
    overflow: hidden;
    border-radius: 999px;
    background: var(--gray-200);
  }

  .progress-bar {
    height: 100%;
    border-radius: inherit;
    background: var(--cptm-red);
  }
}
</style>
