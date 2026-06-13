<template>
  <div v-if="visible" class="modal-overlay" role="dialog" aria-modal="true" @click.self="$emit('close')">
    <div class="modal">
      <header v-if="title" class="modal-header">
        <h3>{{ title }}</h3>
        <button class="btn ghost" type="button" @click="$emit('close')">Fechar</button>
      </header>
      <slot />
      <footer v-if="$slots.footer" class="modal-actions">
        <slot name="footer" />
      </footer>
    </div>
  </div>
</template>

<script setup>
defineProps({
  visible: { type: Boolean, default: false },
  title: { type: String, default: '' }
})
defineEmits(['close'])
</script>
