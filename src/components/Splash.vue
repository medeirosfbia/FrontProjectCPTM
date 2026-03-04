<template>
    <div class="splash">
        <div class="splash-inner">
            <img src="../assets/cptm_logo_simples.png" alt="CPTM logo" class="cptm-logo" />
            <span>CPTM + FATEC</span>
            <div class="loader" aria-hidden="true"></div>
        </div>
    </div>
</template>

<script setup>
</script>

<style scoped>
.splash {
    position: fixed;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(180deg, #f7f7f8, #ffd5d5);
    color: #111;
    z-index: 9999;
}

.splash-inner {
    text-align: center;
}

.cptm-logo {
    width: 180px;
    height: auto;
    margin-bottom: 1rem;
    filter: drop-shadow(0 8px 20px rgba(0, 0, 0, 0.08));
}

.loader {
    width: 48px;
    height: 48px;
    border: 5px solid rgba(0, 0, 0, 0.08);
    border-top-color: #b71c1c;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin: 0 auto;
}

span {
    display: block;
    margin: 1rem;
    font-size: 1.25rem;
    font-weight: 500;
    color: #333;
}

@keyframes spin {
    to {
        transform: rotate(360deg);
    }
}
</style>
