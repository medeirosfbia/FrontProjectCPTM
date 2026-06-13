<template>
  <label class="field">
    <span v-if="label">{{ label }}</span>
    <input v-bind="$attrs" :value="modelValue" @input="$emit('update:modelValue', $event.target.value)" />
  </label>
</template>

<script setup>
defineProps({
  modelValue: { type: [String, Number], default: '' },
  label: { type: String, default: '' }
})
defineEmits(['update:modelValue'])
</script>
