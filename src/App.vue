<script setup>
import { ref, onMounted } from 'vue'
import Login from './components/Login.vue'
import Splash from './components/Splash.vue'
import MainAdm from './components/MainAdm.vue'
import MainUser from './components/MainUser.vue'
import Form from './components/Form.vue'
import UserCreation from './components/UserCreation.vue'

const showSplash = ref(true)
const showMainAdm = ref(false)
const showMainUser = ref(false)
const showForm = ref(false)
const showUserCreation = ref(false)
const currentInspection = ref(null)

onMounted(() => {
  setTimeout(() => (showSplash.value = false), 2000)
})
</script>

<template>
  <div id="app">
    <transition name="fade" mode="out-in">
      <Splash v-if="showSplash" key="splash" />
      <div v-else key="main" class="main-content">
        <MainAdm v-if="showMainAdm" @logout="showMainAdm = false" @create-user="showUserCreation = true; showMainAdm = false" />
        <UserCreation v-else-if="showUserCreation" @create-user-success="showUserCreation = false; showMainAdm = true" />
        <MainUser v-else-if="showMainUser" @logout="showMainUser = false" @goToForm="(ins) => { showMainUser = false; currentInspection = ins; showForm = true }" />
        <Form v-else-if="showForm" :initialInspection="currentInspection" @submit="() => { showForm = false; showMainUser = true }" @cancel="() => { showForm = false; showMainUser = true }" />
        <Login v-else @login-adm-success="showMainAdm = true" @login-user-success="showMainUser = true" />
      </div>
    </transition>
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.5s;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.main-content {
  padding-top: 1rem;
}

.logo {
  height: 6em;
  padding: 1.5em;
  will-change: filter;
  transition: filter 300ms;
}

.logo:hover {
  filter: drop-shadow(0 0 2em #646cffaa);
}

.logo.vue:hover {
  filter: drop-shadow(0 0 2em #42b883aa);
}
</style>
