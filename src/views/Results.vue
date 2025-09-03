<template>
  <div class="debug-page">
    <h1>ORC Class ID Debug Test</h1>
    
    <div class="big-buttons">
      <button @click="testM2" class="big-btn m2">
        TEST M2 CLASS
      </button>
      <button @click="testIRC72" class="big-btn irc72">
        TEST IRC72 CLASS  
      </button>
      <button @click="loadSample" class="big-btn sample">
        LOAD SAMPLE DATA
      </button>
    </div>
    
    <div class="status-info">
      <div class="status-box">
        <h3>Current Status:</h3>
        <p><strong>Boats loaded:</strong> {{ seriesData.length }}</p>
        <p><strong>NORTHSTAR found:</strong> {{ northstarFound ? 'YES ✅' : 'NO ❌' }}</p>
        <p><strong>Last test:</strong> {{ lastTest || 'None' }}</p>
      </div>
    </div>

    <div v-if="testResult" class="test-results">
      <h3>Test Results for {{ testResult.classId }}:</h3>
      <div class="test-info">
        <p><strong>URL tested:</strong> {{ testResult.url }}</p>
        <p><strong>Success:</strong> {{ testResult.success ? 'YES ✅' : 'NO ❌' }}</p>
        <p><strong>Boats found:</strong> {{ testResult.boatsFound || 0 }}</p>
        <p><strong>HTML length:</strong> {{ testResult.htmlLength || 0 }} chars</p>
        <p><strong>Contains NORTHSTAR:</strong> {{ testResult.hasNorthstar ? 'YES ✅' : 'NO ❌' }}</p>
        <p><strong>Contains table pipes:</strong> {{ testResult.hasPipes ? 'YES ✅' : 'NO ❌' }}</p>
      </div>
      
      <div v-if="testResult.northstarLines?.length" class="northstar-lines">
        <h4>NORTHSTAR Lines Found:</h4>
        <div class="code-block">
          <div v-for="(line, i) in testResult.northstarLines" :key="i">{{ line }}</div>
        </div>
      </div>
      
      <div v-if="testResult.htmlPreview" class="html-preview-section">
        <h4>Raw HTML (first 1500 chars):</h4>
        <div class="code-block">{{ testResult.htmlPreview }}</div>
      </div>
    </div>

    <!-- Flip card (working version) -->
    <div v-if="seriesData.length" class="flip-container">
      <div class="flip-card" :class="{ flipped }" @click="flipped = !flipped">
        <div class="front">
          <h3>NORTHSTAR Results</h3>
          <div v-if="northstarFound" class="stats">
            <div class="stat">Position: {{ northstarData.position }}</div>
            <div class="stat">Total: {{ northstarData.total }}</div>
            <div class="stat">Races: {{ raceScores }}</div>
          </div>
          <p class="hint">Click to see all {{ seriesData.length }} boats</p>
        </div>
        <div class="back">
          <h3>All {{ seriesData.length }} Boats</h3>
          <table>
            <tr><th>Pos</th><th>Name</th><th>Sail</th><th>Type</th><th>Owner</th><th>R1</th><th>R2</th><th>R3</th><th>R4</th><th>Total</th></tr>
            <tr v-for="boat in seriesData" :key="boat.position" 
                :class="{ northstar: boat.name.toUpperCase().includes('NORTHSTAR') }">
              <td>{{ boat.position }}</td>
              <td>{{ boat.name }}</td>
              <td>{{ boat.sailNo }}</td>
              <td>{{ boat.type }}</td>
              <td>{{ boat.owner }}</td>
              <td>{{ boat.races?.R1 || '–' }}</td>
              <td>{{ boat.races?.R2 || '–' }}</td>
              <td>{{ boat.races?.R3 || '–' }}</td>
              <td>{{ boat.races?.R4 || '–' }}</td>
              <td>{{ boat.total }}</td>
            </tr>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const seriesData = ref([])
const flipped = ref(false)
const testResult = ref(null)
const lastTest = ref(null)

const northstarData = computed(() => 
  seriesData.value.find(boat => boat.name.toUpperCase().includes('NORTHSTAR'))
)

const northstarFound = computed(() => !!northstarData.value)

const raceScores = computed(() => {
  if (!northstarData.value?.races) return 'None'
  return Object.entries(northstarData.value.races)
    .map(([race, score]) => `${race}:${score}`)
    .join(', ')
})

async function testM2() {
  lastTest.value = 'M2'
  testResult.value = null
  
  try {
    console.log('🟡 Testing M2 class...')
    const response = await fetch('/api/orc-proxy?type=series&eventId=xolfq&classId=M2&debug=true')
    
    if (response.ok) {
      const result = await response.json()
      console.log('M2 result:', result)
      
      testResult.value = {
        classId: 'M2',
        url: result.meta?.url,
        success: result.success,
        boatsFound: result.data?.length || 0,
        htmlLength: result.html?.length || 0,
        hasNorthstar: result.html?.includes('NORTHSTAR') || false,
        hasPipes: result.html?.includes('|') || false,
        northstarLines: result.html?.split('\n').filter(line => line.toUpperCase().includes('NORTHSTAR')) || [],
        htmlPreview: result.html?.substring(0, 1500) || 'No HTML'
      }
      
      if (result.data?.length > 0) {
        seriesData.value = result.data
        console.log('✅ M2 has boats! Loaded:', result.data.length)
      }
      
    } else {
      console.log('❌ M2 test failed:', response.status)
      testResult.value = {
        classId: 'M2',
        success: false,
        error: `HTTP ${response.status}`
      }
    }
  } catch (err) {
    console.log('❌ M2 test error:', err)
    testResult.value = {
      classId: 'M2', 
      success: false,
      error: err.message
    }
  }
}

async function testIRC72() {
  lastTest.value = 'IRC72'
  testResult.value = null
  
  try {
    console.log('🟠 Testing IRC72 class...')
    const response = await fetch('/api/orc-proxy?type=series&eventId=xolfq&classId=IRC72&debug=true')
    
    if (response.ok) {
      const result = await response.json()
      console.log('IRC72 result:', result)
      
      testResult.value = {
        classId: 'IRC72',
        url: result.meta?.url,
        success: result.success,
        boatsFound: result.data?.length || 0,
        htmlLength: result.html?.length || 0,
        hasNorthstar: result.html?.includes('NORTHSTAR') || false,
        hasPipes: result.html?.includes('|') || false,
        northstarLines: result.html?.split('\n').filter(line => line.toUpperCase().includes('NORTHSTAR')) || [],
        htmlPreview: result.html?.substring(0, 1500) || 'No HTML'
      }
      
      if (result.data?.length > 0) {
        seriesData.value = result.data
        console.log('✅ IRC72 has boats! Loaded:', result.data.length)
      }
      
    } else {
      console.log('❌ IRC72 test failed:', response.status)
      testResult.value = {
        classId: 'IRC72',
        success: false,
        error: `HTTP ${response.status}`
      }
    }
  } catch (err) {
    console.log('❌ IRC72 test error:', err)
    testResult.value = {
      classId: 'IRC72',
      success: false,
      error: err.message
    }
  }
}

function loadSample() {
  seriesData.value = [
    {
      position: "1", nation: "USA", name: "PROTEUS", sailNo: "USA60722", type: "IRC 72",
      owner: "George & Christina Sakellaris", club: "New York YC", class: "M2",
      total: 8, races: { R1: 2, R2: 1, R3: 4, R4: 1 }
    },
    {
      position: "2", nation: "GBR", name: "JOLT", sailNo: "GBR7237", type: "IRC 72", 
      owner: "Peter Harrison", club: "YC Costa Smeralda", class: "M2",
      total: 8, races: { R1: 1, R2: 3, R3: 2, R4: 2 }
    },
    {
      position: "3", nation: "GBR", name: "NORTHSTAR OF LONDON", sailNo: "GBR72X", type: "IRC 72",
      owner: "Peter Dubens", club: "YC Costa Smeralda / Royal Thames YC", class: "M2", 
      total: 12, races: { R1: 4, R2: 2, R3: 1, R4: "5 RET" }
    },
    {
      position: "4", nation: "GBR", name: "JETHOU", sailNo: "GBR74R", type: "IRC 77",
      owner: "Sir Peter Ogden", club: "Royal Yacht Squadron", class: "M2",
      total: 13, races: { R1: 3, R2: 4, R3: 3, R4: 3 }
    }
  ]
  lastTest.value = 'Sample Data'
  testResult.value = null
  console.log('✅ Sample data loaded - 4 boats')
}
</script>

<style scoped>
.debug-page {
  padding: 30px;
  color: #fff;
  background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
  min-height: 100vh;
}

.big-buttons {
  display: flex;
  gap: 20px;
  margin: 30px 0;
  flex-wrap: wrap;
  justify-content: center;
}

.big-btn {
  padding: 20px 30px;
  border: none;
  border-radius: 12px;
  color: white;
  cursor: pointer;
  font-size: 1.2rem;
  font-weight: bold;
  text-transform: uppercase;
  letter-spacing: 1px;
  min-width: 200px;
  transition: transform 0.2s;
}

.big-btn:hover {
  transform: translateY(-2px);
}

.big-btn.m2 { background: linear-gradient(45deg, #cc9900, #ffcc33); }
.big-btn.irc72 { background: linear-gradient(45deg, #ff6600, #ff9933); }
.big-btn.sample { background: linear-gradient(45deg, #00aa55, #33cc66); }

.status-info {
  margin: 30px 0;
}

.status-box {
  background: rgba(255,255,255,.15);
  padding: 25px;
  border-radius: 15px;
  border: 2px solid rgba(255,255,255,.3);
}

.status-box h3 {
  margin-top: 0;
  color: #00ffaa;
}

.status-box p {
  margin: 12px 0;
  font-size: 1.1rem;
  font-family: monospace;
}

.test-results {
  background: rgba(0,0,0,.2);
  padding: 25px;
  border-radius: 15px;
  margin: 30px 0;
  border: 2px solid rgba(255,255,255,.2);
}

.test-info {
  background: rgba(255,255,255,.1);
  padding: 20px;
  border-radius: 10px;
  margin: 15px 0;
}

.test-info p {
  margin: 8px 0;
  font-family: monospace;
  font-size: 1rem;
}

.northstar-lines, .html-preview-section {
  background: rgba(255,255,255,.05);
  padding: 20px;
  border-radius: 10px;
  margin: 15px 0;
}

.code-block {
  background: rgba(0,0,0,.4);
  padding: 15px;
  border-radius: 8px;
  font-family: monospace;
  font-size: 0.85rem;
  white-space: pre-wrap;
  max-height: 300px;
  overflow: auto;
  border: 1px solid rgba(255,255,255,.3);
}

.flip-container {
  margin: 30px 0;
  max-width: 900px;
}

.flip-card {
  position: relative;
  width: 100%;
  height: 400px;
  perspective: 1200px;
  cursor: pointer;
}

.front, .back {
  position: absolute;
  width: 100%;
  height: 100%;
  backface-visibility: hidden;
  border-radius: 16px;
  background: rgba(255,255,255,.15);
  border: 3px solid rgba(255,255,255,.4);
  backdrop-filter: blur(20px);
  padding: 25px;
  transition: transform 0.8s ease;
  box-shadow: 0 15px 35px rgba(0,0,0,.3);
}

.front {
  transform: rotateY(0deg);
}

.back {
  transform: rotateY(180deg);
  overflow-y: auto;
}

.flip-card.flipped .front {
  transform: rotateY(-180deg);
}

.flip-card.flipped .back {
  transform: rotateY(0deg);
}

.stats {
  margin: 20px 0;
}

.stat {
  background: rgba(0,255,170,.2);
  padding: 15px;
  border-radius: 10px;
  margin: 10px 0;
  font-size: 1.2rem;
  font-weight: bold;
  text-align: center;
}

.hint {
  text-align: center;
  opacity: 0.8;
  margin-top: 20px;
  font-size: 1.1rem;
}

table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.85rem;
}

th, td {
  padding: 8px 10px;
  text-align: left;
  border-bottom: 1px solid rgba(255,255,255,.2);
  white-space: nowrap;
}

th {
  background: rgba(255,255,255,.2);
  font-weight: bold;
}

.northstar {
  background: rgba(0,255,170,.4) !important;
  border-left: 4px solid #00ffaa;
}

h1, h3, h4 {
  margin-top: 0;
}
</style>
