<template>
  <div class="debug-page">
    <h1>Debug ORC Data Loading</h1>
    
    <div class="button-section">
      <h3>Test Buttons:</h3>
      <button @click="loadFourBoats" class="btn green">Load 4 Boats</button>
      <button @click="loadOneBoat" class="btn blue">Load 1 Boat</button>
      <button @click="clearData" class="btn red">Clear Data</button>
      <button @click="testAPI" class="btn yellow">Test API</button>
    </div>
    
    <div class="data-section">
      <h3>Current Data State:</h3>
      <div class="info-box">
        <p><strong>Boats loaded:</strong> {{ seriesData.length }}</p>
        <p><strong>NORTHSTAR found:</strong> {{ northstarData ? 'YES' : 'NO' }}</p>
        <p><strong>Last update:</strong> {{ lastUpdate || 'Never' }}</p>
      </div>
    </div>
    
    <div class="raw-data">
      <h3>Raw Data:</h3>
      <pre>{{ JSON.stringify(seriesData, null, 2) }}</pre>
    </div>

    <!-- Simple flip card test -->
    <div class="flip-container" v-if="seriesData.length">
      <div class="flip-card" :class="{ flipped }" @click="flipped = !flipped">
        <div class="card-front">
          <h3>NORTHSTAR Status</h3>
          <div v-if="northstarData">
            <p>Position: {{ northstarData.position }}</p>
            <p>Total: {{ northstarData.total }}</p>
            <p>Races: {{ Object.entries(northstarData.races || {}).map(([r,p]) => `${r}:${p}`).join(', ') }}</p>
          </div>
          <div v-else>
            <p>NORTHSTAR not found in {{ seriesData.length }} boats</p>
          </div>
          <p class="hint">Click to see table</p>
        </div>
        
        <div class="card-back">
          <h3>All Boats ({{ seriesData.length }})</h3>
          <table>
            <thead>
              <tr>
                <th>Pos</th><th>Name</th><th>Sail</th><th>Total</th><th>R1</th><th>R2</th><th>R3</th><th>R4</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="boat in seriesData" :key="boat.position" 
                  :class="{ highlight: boat.name.toUpperCase().includes('NORTHSTAR') }">
                <td>{{ boat.position }}</td>
                <td>{{ boat.name }}</td>
                <td>{{ boat.sailNo }}</td>
                <td>{{ boat.total }}</td>
                <td>{{ boat.races?.R1 || '–' }}</td>
                <td>{{ boat.races?.R2 || '–' }}</td>
                <td>{{ boat.races?.R3 || '–' }}</td>
                <td>{{ boat.races?.R4 || '–' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <div class="api-test" v-if="apiResult">
      <h3>API Test Result:</h3>
      <pre>{{ JSON.stringify(apiResult, null, 2) }}</pre>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const seriesData = ref([])
const flipped = ref(false)
const lastUpdate = ref(null)
const apiResult = ref(null)

const northstarData = computed(() => 
  seriesData.value.find(boat => boat.name.toUpperCase().includes('NORTHSTAR'))
)

function loadFourBoats() {
  seriesData.value = [
    {
      position: "1",
      nation: "USA",
      name: "PROTEUS",
      sailNo: "USA60722",
      type: "IRC 72",
      owner: "George & Christina Sakellaris",
      club: "New York YC",
      class: "M2",
      total: 8,
      races: { R1: 2, R2: 1, R3: 4, R4: 1 }
    },
    {
      position: "2",
      nation: "GBR",
      name: "JOLT",
      sailNo: "GBR7237",
      type: "IRC 72",
      owner: "Peter Harrison",
      club: "YC Costa Smeralda",
      class: "M2",
      total: 8,
      races: { R1: 1, R2: 3, R3: 2, R4: 2 }
    },
    {
      position: "3",
      nation: "GBR",
      name: "NORTHSTAR OF LONDON",
      sailNo: "GBR72X",
      type: "IRC 72",
      owner: "Peter Dubens",
      club: "YC Costa Smeralda / Royal Thames YC",
      class: "M2",
      total: 12,
      races: { R1: 4, R2: 2, R3: 1, R4: "5 RET" }
    },
    {
      position: "4",
      nation: "GBR",
      name: "JETHOU",
      sailNo: "GBR74R",
      type: "IRC 77",
      owner: "Sir Peter Ogden",
      club: "Royal Yacht Squadron",
      class: "M2",
      total: 13,
      races: { R1: 3, R2: 4, R3: 3, R4: 3 }
    }
  ]
  lastUpdate.value = new Date().toLocaleTimeString()
  console.log('Loaded 4 boats:', seriesData.value)
}

function loadOneBoat() {
  seriesData.value = [
    {
      position: "3",
      nation: "GBR",
      name: "NORTHSTAR OF LONDON",
      sailNo: "GBR72X",
      type: "IRC 72",
      owner: "Peter Dubens",
      club: "YC Costa Smeralda / Royal Thames YC",
      class: "M2",
      total: 12,
      races: { R1: 4, R2: 2, R3: 1, R4: "5 RET" }
    }
  ]
  lastUpdate.value = new Date().toLocaleTimeString()
  console.log('Loaded 1 boat:', seriesData.value)
}

function clearData() {
  seriesData.value = []
  apiResult.value = null
  lastUpdate.value = null
  console.log('Data cleared')
}

async function testAPI() {
  try {
    console.log('Testing API call...')
    
    // Test with debug=true to get raw HTML
    console.log('Testing with debug mode to see raw HTML...')
    const testResponse = await fetch('/api/orc-proxy?type=series&eventId=xolfq&classId=M2&debug=true')
    console.log('Debug API response status:', testResponse.status)
    
    if (testResponse.ok) {
      const result = await testResponse.json()
      apiResult.value = result
      console.log('✅ API working! Debug result:', result)
      
      // Show what HTML we're getting
      if (result.html) {
        console.log('📄 HTML length:', result.html.length)
        console.log('📄 HTML preview (first 1000 chars):', result.html.substring(0, 1000))
        
        // Look for NORTHSTAR specifically
        const northstarLines = result.html.split('\n').filter(line => 
          line.toUpperCase().includes('NORTHSTAR')
        )
        console.log('🎯 Lines containing NORTHSTAR:', northstarLines)
        
        // Look for table structure
        const pipeLines = result.html.split('\n').filter(line => 
          line.includes('|') && line.split('|').length > 5
        )
        console.log('📊 Lines with pipe separators (table data):', pipeLines.slice(0, 5))
        
        // Look for common header patterns
        const headerPatterns = ['Rank', 'Position', 'Yacht', 'Name', 'Total', 'Points']
        headerPatterns.forEach(pattern => {
          const found = result.html.split('\n').filter(line => 
            line.toUpperCase().includes(pattern.toUpperCase())
          )
          if (found.length > 0) {
            console.log(`📋 Lines with "${pattern}":`, found.slice(0, 3))
          }
        })
      }
    } else {
      const errorText = await testResponse.text()
      console.log('❌ API error:', testResponse.status, errorText)
      apiResult.value = { 
        error: `${testResponse.status}: ${errorText}`,
        status: testResponse.status
      }
    }
  } catch (err) {
    console.log('❌ API test completely failed:', err)
    apiResult.value = { 
      error: err.message,
      type: 'Network/Connection Error'
    }
  }
}
</script>

<style scoped>
.debug-page {
  padding: 20px;
  color: #fff;
  background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
  min-height: 100vh;
}

.button-section, .data-section {
  background: rgba(255,255,255,.1);
  padding: 20px;
  border-radius: 12px;
  margin-bottom: 20px;
}

.button-section {
  display: flex;
  gap: 15px;
  flex-wrap: wrap;
  align-items: center;
}

.btn {
  padding: 12px 20px;
  border: none;
  border-radius: 8px;
  color: white;
  cursor: pointer;
  font-size: 1rem;
  font-weight: 600;
}

.btn.green { background: #00aa55; }
.btn.blue { background: #0066cc; }
.btn.red { background: #cc3333; }
.btn.yellow { background: #cc9900; }
.btn.orange { background: #ff6600; }

.info-box {
  background: rgba(0,0,0,.2);
  padding: 15px;
  border-radius: 8px;
}

.info-box p {
  margin: 8px 0;
  font-size: 1.1rem;
}

.raw-data {
  background: rgba(255,255,255,.05);
  padding: 20px;
  border-radius: 12px;
  margin-bottom: 20px;
}

.raw-data pre {
  background: rgba(0,0,0,.3);
  padding: 15px;
  border-radius: 8px;
  font-size: 0.8rem;
  max-height: 300px;
  overflow: auto;
  white-space: pre-wrap;
}

.flip-container {
  margin: 20px 0;
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
  transition: transform 0.8s ease;
}

.card-front {
  transform: rotateY(0deg);
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
}

table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;
}

th, td {
  padding: 8px 12px;
  text-align: left;
  border-bottom: 1px solid rgba(255,255,255,.2);
}

th {
  background: rgba(255,255,255,.2);
  font-weight: 600;
}

.highlight {
  background: rgba(0,255,170,.3) !important;
  border-left: 4px solid #00ffaa;
}

.hint {
  margin-top: 15px;
  opacity: 0.7;
  text-align: center;
}

.api-test {
  background: rgba(255,255,255,.05);
  padding: 20px;
  border-radius: 12px;
}

.api-test pre {
  background: rgba(0,0,0,.3);
  padding: 15px;
  border-radius: 8px;
  font-size: 0.8rem;
  max-height: 400px;
  overflow: auto;
  white-space: pre-wrap;
}

.result-info {
  background: rgba(0,0,0,.2);
  padding: 15px;
  border-radius: 8px;
  margin-bottom: 15px;
}

.result-info p {
  margin: 5px 0;
  font-family: monospace;
}

.html-section, .preview-section, .error-section {
  background: rgba(0,0,0,.2);
  padding: 15px;
  border-radius: 8px;
  margin: 15px 0;
}

.html-preview {
  background: rgba(0,0,0,.4);
  padding: 15px;
  border-radius: 8px;
  font-family: monospace;
  font-size: 0.75rem;
  white-space: pre-wrap;
  max-height: 300px;
  overflow: auto;
  border: 1px solid rgba(255,255,255,.3);
  margin: 10px 0;
}

.analysis {
  background: rgba(0,0,0,.3);
  padding: 10px;
  border-radius: 6px;
  font-family: monospace;
  font-size: 0.9rem;
}

.analysis p {
  margin: 5px 0;
}

.raw-json {
  font-size: 0.7rem !important;
  max-height: 200px;
}

h1, h3 {
  margin-top: 0;
}
</style>
