<template>
  <header class="app-header">
    <div class="header-left">
      <img v-if="logo" :src="logo" alt="CPTM" class="logo" />
      <div class="header-info">
        <h1>{{ title }}</h1>
        <p v-if="subtitle" class="subtitle">{{ subtitle }}</p>
      </div>
    </div>
    <slot name="actions" />
  </header>
</template>

<script setup>
defineProps({
  title: { type: String, required: true },
  subtitle: { type: String, default: '' },
  logo: { type: String, default: '' }
})
</script>
