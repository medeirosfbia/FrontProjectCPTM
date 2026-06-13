<template>
  <div class="empty-state">
    <strong>{{ title }}</strong>
    <p v-if="message">{{ message }}</p>
  </div>
</template>

<script setup>
defineProps({
  title: { type: String, default: 'Nenhum registro encontrado' },
  message: { type: String, default: '' }
})
</script>
