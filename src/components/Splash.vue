<template>
    <LoadingTrain message="Carregando sistema..." fullscreen />
</template>

<script setup>
import { onMounted } from "vue"
import { useRouter } from "vue-router"
import { getIsAdmin } from "../services/api"
import LoadingTrain from "./ui/LoadingTrain.vue"

const router = useRouter()

onMounted(async () => {

    // Simula carregamento de dados ou verificação de autenticação
    await new Promise(resolve => setTimeout(resolve, 2000))

    const token = localStorage.getItem("auth_token")
    const isAdmin = getIsAdmin()

    if (!token) {
        router.replace("/login")
    }
    else if (isAdmin) {
        router.replace("/main-admin")
    }
    else {
        router.replace("/main-user")
    }

})
</script>

