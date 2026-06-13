<template>
  <label class="field domain-select">
    <div class="field-label-row">
      <span>{{ label }}</span>
      <FieldHelp v-if="help" :text="help" :example="example" />
    </div>

    <select
      :value="modelValue"
      :disabled="disabled || loading || failed"
      @change="$emit('update:modelValue', $event.target.value)"
    >
      <option value="">{{ loading ? 'Carregando opções...' : 'Selecione...' }}</option>
      <option v-for="item in normalizedOptions" :key="item.codigo || item.descricao" :value="item.codigo">
        {{ item.descricao }}
      </option>
    </select>

    <span v-if="failed" class="domain-select-message">Não foi possível carregar esta lista.</span>
  </label>
</template>

<script setup>
import { computed } from 'vue'
import FieldHelp from './FieldHelp.vue'

const props = defineProps({
  label: { type: String, required: true },
  modelValue: { type: [String, Number], default: '' },
  options: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
  help: { type: String, default: '' },
  example: { type: String, default: '' }
})

defineEmits(['update:modelValue'])

const normalizedOptions = computed(() => (
  Array.isArray(props.options)
    ? props.options.filter((item) => item && item.descricao !== undefined && item.descricao !== null)
    : []
))

const failed = computed(() => !props.loading && normalizedOptions.value.length === 0)
</script>

<style scoped>
.domain-select {
  gap: 6px;
}

.domain-select-message {
  color: #ef4444;
  font-size: 0.82rem;
  font-weight: 800;
  line-height: 1.25;
}
</style>
