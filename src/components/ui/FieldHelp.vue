<template>
  <span
    class="field-help"
    @mouseenter="visible = true"
    @mouseleave="visible = false"
  >
    <button
      type="button"
      class="field-help-trigger"
      aria-label="Ajuda do campo"
      @click.stop="visible = !visible"
      @focus="visible = true"
      @blur="visible = false"
    >
      ?
    </button>
    <span v-if="visible" class="field-help-box" role="tooltip">
      <span>{{ text }}</span>
      <span v-if="example" class="field-help-example">Exemplo: {{ example }}</span>
    </span>
  </span>
</template>

<script setup>
import { ref } from 'vue'

defineProps({
  text: { type: String, required: true },
  example: { type: String, default: '' }
})

const visible = ref(false)
</script>

<style scoped>
.field-help {
  position: relative;
  display: inline-flex;
  align-items: center;
  flex: 0 0 auto;
}

.field-help-trigger {
  width: 22px;
  height: 22px;
  border: 1px solid var(--gray-300);
  border-radius: 999px;
  background: var(--white);
  color: var(--cptm-blue);
  font-size: 0.78rem;
  font-weight: 900;
  line-height: 1;
  cursor: help;
}

.field-help-trigger:focus-visible {
  outline: 0;
  border-color: var(--cptm-blue);
  box-shadow: 0 0 0 3px rgba(43, 92, 158, 0.18);
}

.field-help-box {
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  z-index: 80;
  display: grid;
  gap: 4px;
  width: min(320px, 72vw);
  padding: 9px 10px;
  border: 1px solid var(--gray-200);
  border-radius: 8px;
  background: var(--white);
  box-shadow: 0 12px 26px rgba(16, 24, 40, 0.16);
  color: var(--gray-700);
  font-size: 0.84rem;
  font-weight: 600;
  line-height: 1.35;
}

.field-help-example {
  color: var(--gray-500);
  font-weight: 800;
}
</style>
