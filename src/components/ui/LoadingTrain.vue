<template>
  <div
    class="loading-train"
    :class="{ fullscreen, compact }"
    role="status"
    aria-live="polite"
  >
    <div class="loading-train__panel">
      <img class="loading-train__logo" :src="logo" alt="CPTM" />

      <div class="loading-train__scene" aria-hidden="true">
        <div class="loading-train__track">
          <span></span>
          <span></span>
        </div>

        <div class="loading-train__train">
          <div class="loading-train__car main-car">
            <div class="loading-train__front"></div>
            <div class="loading-train__stripe"></div>
            <div class="loading-train__windows">
              <i></i>
              <i></i>
              <i></i>
            </div>
            <div class="loading-train__doors"></div>
            <div class="loading-train__wheels">
              <b></b>
              <b></b>
              <b></b>
            </div>
          </div>
          <div class="loading-train__car rear-car">
            <div class="loading-train__stripe"></div>
            <div class="loading-train__windows">
              <i></i>
              <i></i>
            </div>
            <div class="loading-train__wheels">
              <b></b>
              <b></b>
            </div>
          </div>
        </div>
      </div>

      <p>{{ message }}</p>
    </div>
  </div>
</template>

<script setup>
import logo from '../../assets/cptm_logo_simples.png'

defineProps({
  message: { type: String, default: 'Carregando sistema...' },
  fullscreen: { type: Boolean, default: false },
  compact: { type: Boolean, default: false }
})
</script>

<style scoped>
.loading-train {
  --cptm-red: #d71920;
  --cptm-red-dark: #a80f15;
  --track: #2f3742;
  --muted: #6b7280;
  --window: #dbeafe;
  display: grid;
  place-items: center;
  width: 100%;
  min-height: 190px;
  padding: 24px 16px;
  background: #fff;
}

.loading-train.fullscreen {
  position: fixed;
  inset: 0;
  z-index: 1500;
  min-height: 100vh;
}

.loading-train.compact {
  min-height: 120px;
  padding: 14px 10px;
}

.loading-train__panel {
  width: min(460px, 100%);
  display: grid;
  justify-items: center;
  gap: 14px;
  text-align: center;
}

.loading-train__logo {
  width: clamp(92px, 18vw, 150px);
  height: auto;
  object-fit: contain;
  filter: drop-shadow(0 8px 18px rgba(15, 23, 42, 0.08));
}

.loading-train.compact .loading-train__logo {
  width: 82px;
}

.loading-train__scene {
  position: relative;
  width: min(360px, 86vw);
  height: 92px;
  overflow: hidden;
}

.loading-train.compact .loading-train__scene {
  height: 72px;
}

.loading-train__track {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 16px;
  height: 18px;
}

.loading-train__track::before,
.loading-train__track::after {
  content: "";
  position: absolute;
  left: 0;
  right: 0;
  height: 3px;
  border-radius: 999px;
  background: var(--track);
}

.loading-train__track::before {
  top: 3px;
}

.loading-train__track::after {
  bottom: 2px;
}

.loading-train__track span {
  position: absolute;
  left: -12px;
  right: -12px;
  bottom: 5px;
  height: 8px;
  background: repeating-linear-gradient(
    90deg,
    transparent 0 18px,
    rgba(47, 55, 66, 0.9) 18px 24px
  );
}

.loading-train__track span+span {
  opacity: 0.25;
  transform: translateY(-10px);
}

.loading-train__train {
  position: absolute;
  left: 0;
  bottom: 25px;
  display: flex;
  align-items: flex-end;
  gap: 6px;
  animation: trainMove 2.8s linear infinite;
}

.loading-train__car {
  position: relative;
  width: 136px;
  height: 44px;
  border: 2px solid var(--cptm-red-dark);
  border-radius: 10px 8px 8px 10px;
  background: linear-gradient(180deg, #ffffff 0 46%, var(--cptm-red) 46% 100%);
  box-shadow: 0 8px 18px rgba(15, 23, 42, 0.18);
}

.loading-train__car.rear-car {
  width: 94px;
  border-radius: 8px;
}

.loading-train__front {
  position: absolute;
  right: -10px;
  top: 7px;
  width: 18px;
  height: 30px;
  border-radius: 0 16px 16px 0;
  background: var(--cptm-red);
  border: 2px solid var(--cptm-red-dark);
  border-left: 0;
}

.loading-train__stripe {
  position: absolute;
  left: 10px;
  right: 10px;
  top: 24px;
  height: 4px;
  border-radius: 999px;
  background: #ffffff;
}

.loading-train__windows {
  position: absolute;
  left: 12px;
  top: 8px;
  display: flex;
  gap: 7px;
}

.loading-train__windows i {
  display: block;
  width: 25px;
  height: 12px;
  border-radius: 4px;
  background: linear-gradient(135deg, #eff6ff, var(--window));
  border: 1px solid #9db9d8;
}

.loading-train__doors {
  position: absolute;
  right: 22px;
  top: 7px;
  width: 18px;
  height: 29px;
  border-radius: 4px;
  border: 1px solid rgba(47, 55, 66, 0.28);
  background: rgba(255, 255, 255, 0.46);
}

.loading-train__wheels {
  position: absolute;
  left: 12px;
  right: 12px;
  bottom: -9px;
  display: flex;
  justify-content: space-between;
}

.loading-train__wheels b {
  width: 15px;
  height: 15px;
  display: block;
  border-radius: 999px;
  background:
    radial-gradient(circle at center, #f8fafc 0 22%, transparent 24%),
    conic-gradient(from 0deg, #111827, #6b7280, #111827);
  border: 2px solid #111827;
  animation: wheelSpin 0.55s linear infinite;
}

.loading-train p {
  margin: 0;
  color: #1f2937;
  font-size: clamp(0.95rem, 2vw, 1.08rem);
  font-weight: 900;
}

.loading-train.compact p {
  font-size: 0.9rem;
}

@keyframes trainMove {
  0% {
    transform: translateX(-250px);
  }
  100% {
    transform: translateX(calc(100% + 250px));
  }
}

@keyframes wheelSpin {
  to {
    transform: rotate(360deg);
  }
}

@media (prefers-reduced-motion: reduce) {
  .loading-train__train {
    animation: none;
    left: 50%;
    transform: translateX(-50%);
  }

  .loading-train__wheels b {
    animation: none;
  }
}
</style>
