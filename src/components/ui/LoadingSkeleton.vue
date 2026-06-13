<template>
  <div class="skeleton" :style="{ width, height }" />
</template>

<script setup>
defineProps({
  width: { type: String, default: '100%' },
  height: { type: String, default: '18px' }
})
</script>
