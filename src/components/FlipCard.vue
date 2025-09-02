<!-- src/components/FlipCard.vue -->
<template>
  <div class="flip-card" :class="{ flipped }" @click="toggle">
    <div class="flip-card-inner">
      <div class="flip-card-front">
        <slot name="front"></slot>
      </div>
      <div class="flip-card-back">
        <slot name="back"></slot>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const flipped = ref(false)

function toggle() {
  flipped.value = !flipped.value
}

// Expose toggle method in case parent needs it
defineExpose({ toggle })
</script>

<style scoped>
.flip-card {
  background-color: transparent;
  width: 100%;
  height: 100%;
  perspective: 1000px;
  cursor: pointer;
  min-height: 220px;
}

.flip-card-inner {
  position: relative;
  width: 100%;
  height: 100%;
  text-align: left;
  transition: transform 0.6s;
  transform-style: preserve-3d;
}

.flip-card.flipped .flip-card-inner {
  transform: rotateY(180deg);
}

.flip-card-front, .flip-card-back {
  position: absolute;
  width: 100%;
  height: 100%;
  -webkit-backface-visibility: hidden;
  backface-visibility: hidden;
  border-radius: 16px;
  padding: 0; /* Remove padding since parent card has it */
}

.flip-card-front {
  background-color: transparent;
}

.flip-card-back {
  background-color: transparent;
  transform: rotateY(180deg);
}

/* Ensure content doesn't overflow during flip */
.flip-card-front > *,
.flip-card-back > * {
  height: 100%;
  overflow: hidden;
}
</style>
