<template>
  <div class="flip" :class="{ flipped }" @click="flipped = !flipped">
    <div class="face front">
      <slot name="front" />
    </div>
    <div class="face back">
      <slot name="back" />
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
const flipped = ref(false)
</script>

<style scoped>
.flip {
  position: relative;
  perspective: 1200px;
  width: 100%;
  height: 100%;
  min-height: 160px;
}
.face {
  position: absolute;
  inset: 0;
  border-radius: 16px;
  background: rgba(255,255,255,.12);
  border: 1px solid rgba(255,255,255,.25);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  box-shadow: 0 12px 40px rgba(0,0,0,.25);
  transform-style: preserve-3d;
  transition: transform .6s;
  padding: 14px;
  color: #fff;
}
.front { transform: rotateY(0deg); }
.back  { transform: rotateY(180deg); overflow: auto; }
.flip.flipped .front { transform: rotateY(-180deg); }
.flip.flipped .back  { transform: rotateY(0deg); }
</style>
