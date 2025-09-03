<template>
  <div class="test-page">
    <h1>ORC Results Test - NORTHSTAR</h1>
    
    <!-- Simple flip card (no component import) -->
    <div class="flip-container">
      <div class="flip-card" :class="{ flipped }" @click="flipped = !flipped">
        <div class="card-front">
          <h3>Series Results - NORTHSTAR OF LONDON</h3>
          <div class="stats">
            <div class="stat">
              <div class="label">Position</div>
              <div class="value">3</div>
            </div>
            <div class="stat">
              <div class="label">Total Points</div>
              <div class="value">12</div>
            </div>
            <div class="stat">
              <div class="label">Race Scores</div>
              <div class="value">R1:4 R2:2 R3:1 R4:5 RET</div>
            </div>
          </div>
          <p class="hint">Click to see ALL columns</p>
        </div>
        
        <div class="card-back">
          <h3>ALL COLUMNS - Series Results</h3>
          <div class="table-container">
            <table>
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Nation</th>
                  <th>Yacht Name</th>
                  <th>Sail No</th>
                  <th>Type</th>
                  <th>Owner</th>
                  <th>Club</th>
                  <th>Class</th>
                  <th>R1</th>
                  <th>R2</th>
                  <th>R3</th>
                  <th>R4</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>1</td>
                  <td>USA</td>
                  <td>PROTEUS</td>
                  <td>USA60722</td>
                  <td>IRC 72</td>
                  <td>George & Christina Sakellaris</td>
                  <td>New York YC</td>
                  <td>M2</td>
                  <td>2</td>
                  <td>1</td>
                  <td>4</td>
                  <td>1</td>
                  <td><strong>8</strong></td>
                </tr>
                <tr>
                  <td>2</td>
                  <td>GBR</td>
                  <td>JOLT</td>
                  <td>GBR7237</td>
                  <td>IRC 72</td>
                  <td>Peter Harrison</td>
                  <td>YC Costa Smeralda</td>
                  <td>M2</td>
                  <td>1</td>
                  <td>3</td>
                  <td>2</td>
                  <td>2</td>
                  <td><strong>8</strong></td>
                </tr>
                <tr class="highlight">
                  <td>3</td>
                  <td>GBR</td>
                  <td><strong>NORTHSTAR OF LONDON</strong></td>
                  <td>GBR72X</td>
                  <td>IRC 72</td>
                  <td>Peter Dubens</td>
                  <td>YC Costa Smeralda / Royal Thames YC</td>
                  <td>M2</td>
                  <td>4</td>
                  <td>2</td>
                  <td>1</td>
                  <td>5 RET</td>
                  <td><strong>12</strong></td>
                </tr>
                <tr>
                  <td>4</td>
                  <td>GBR</td>
                  <td>JETHOU</td>
                  <td>GBR74R</td>
                  <td>IRC 77</td>
                  <td>Sir Peter Ogden</td>
                  <td>Royal Yacht Squadron</td>
                  <td>M2</td>
                  <td>3</td>
                  <td>4</td>
                  <td>3</td>
                  <td>3</td>
                  <td><strong>13</strong></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
    
    <div class="debug-info">
      <h3>Debug Info</h3>
      <p>Flipped: {{ flipped ? 'YES' : 'NO' }}</p>
      <p>Click the card above to flip it and see all columns</p>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const flipped = ref(false)
</script>

<style scoped>
.test-page {
  padding: 20px;
  color: #fff;
  background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
  min-height: 100vh;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.flip-container {
  margin: 30px auto;
  max-width: 800px;
}

.flip-card {
  position: relative;
  width: 100%;
  height: 400px;
  perspective: 1000px;
  cursor: pointer;
}

.card-front, .card-back {
  position: absolute;
  width: 100%;
  height: 100%;
  backface-visibility: hidden;
  border-radius: 16px;
  background: rgba(255,255,255,.15);
  border: 2px solid rgba(255,255,255,.3);
  backdrop-filter: blur(20px);
  padding: 25px;
  transition: transform 0.8s ease-in-out;
  box-shadow: 0 15px 35px rgba(0,0,0,.3);
}

.card-front {
  transform: rotateY(0deg);
  z-index: 2;
}

.card-back {
  transform: rotateY(180deg);
  overflow-y: auto;
}

.flip-card.flipped .card-front {
  transform: rotateY(-180deg);
}

.flip-card.flipped .card-back {
  transform: rotateY(0deg);
  z-index: 2;
}

h1, h3 {
  margin-top: 0;
  color: #fff;
  text-shadow: 0 2px 4px rgba(0,0,0,.5);
}

.stats {
  display: grid;
  gap: 20px;
  grid-template-columns: repeat(3, 1fr);
  margin: 30px 0;
}

.stat {
  background: rgba(255,255,255,.2);
  padding: 20px;
  border-radius: 12px;
  text-align: center;
  border: 1px solid rgba(255,255,255,.3);
}

.label {
  font-size: 0.9rem;
  opacity: 0.9;
  margin-bottom: 8px;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.value {
  font-size: 1.8rem;
  font-weight: bold;
  color: #00ffaa;
  text-shadow: 0 2px 4px rgba(0,255,170,.3);
}

.hint {
  text-align: center;
  opacity: 0.8;
  font-size: 1rem;
  margin-top: 20px;
  background: rgba(255,255,255,.1);
  padding: 12px;
  border-radius: 8px;
}

.table-container {
  overflow: auto;
  border-radius: 12px;
  background: rgba(0,0,0,.3);
  max-height: 320px;
}

table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.8rem;
}

th, td {
  padding: 10px 8px;
  text-align: left;
  border-bottom: 1px solid rgba(255,255,255,.2);
  white-space: nowrap;
}

th {
  background: rgba(255,255,255,.2);
  font-weight: bold;
  position: sticky;
  top: 0;
  z-index: 10;
}

.highlight {
  background: rgba(0,255,170,.3) !important;
  border-left: 4px solid #00ffaa;
}

.highlight td {
  font-weight: 600;
}

.debug-info {
  margin-top: 30px;
  background: rgba(255,255,255,.1);
  padding: 20px;
  border-radius: 12px;
  text-align: center;
}

.debug-info h3 {
  margin-bottom: 15px;
}

.debug-info p {
  margin: 10px 0;
  font-size: 1.1rem;
}

/* Responsive */
@media (max-width: 768px) {
  .stats {
    grid-template-columns: 1fr;
  }
  
  .flip-card {
    height: 500px;
  }
  
  table {
    font-size: 0.7rem;
  }
  
  th, td {
    padding: 6px 4px;
  }
}
</style>
