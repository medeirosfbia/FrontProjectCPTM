<template>
  <button class="ui-button" :class="variant" :type="type" :disabled="disabled">
    <slot />
  </button>
</template>

<script setup>
defineProps({
  variant: { type: String, default: '' },
  type: { type: String, default: 'button' },
  disabled: { type: Boolean, default: false }
})
</script>
