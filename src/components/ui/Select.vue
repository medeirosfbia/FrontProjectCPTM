<template>
  <label class="field">
    <span v-if="label">{{ label }}</span>
    <select v-bind="$attrs" :value="modelValue" @change="$emit('update:modelValue', $event.target.value)">
      <slot />
    </select>
  </label>
</template>

<script setup>
defineProps({
  modelValue: { type: [String, Number], default: '' },
  label: { type: String, default: '' }
})
defineEmits(['update:modelValue'])
</script>
