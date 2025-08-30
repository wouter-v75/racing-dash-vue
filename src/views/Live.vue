<template>
  <div class="page">
    <h1>Live Input</h1>
    <p>This page will be used for crew to input live race data.</p>

    <form @submit.prevent="submitForm">
      <label>
        True Wind Speed (TWS):
        <input v-model="form.tws" type="number" step="0.1" />
      </label>
      <label>
        True Wind Angle (TWA):
        <input v-model="form.twa" type="number" step="1" />
      </label>
      <label>
        Boat Speed (BSP):
        <input v-model="form.bsp" type="number" step="0.1" />
      </label>
      <button type="submit">Submit</button>
    </form>

    <p v-if="submitted">✅ Entry submitted (stub)</p>
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue'

const form = reactive({
  tws: '',
  twa: '',
  bsp: '',
})

const submitted = ref(false)

function submitForm() {
  console.log('Form data:', form)
  submitted.value = true
}
</script>

<style scoped>
.page {
  padding: 1rem;
}
form {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  max-width: 300px;
}
</style>
