<template>
  <div class="monitor-page">
    <div class="status-bar">
      <div class="left">
        <h2>MAXI YACHT ROLEX CUP 2024 - Class M2</h2>
        <div class="boat-info">🛥️ NORTHSTAR OF LONDON</div>
      </div>
      <div class="right">
        <div class="poll-status" :class="{ active: isPolling }">
          <div class="indicator"></div>
          {{ isPolling ? 'Auto-polling ON' : 'Auto-polling OFF' }}
        </div>
        <button @click="togglePolling" class="btn">
          {{ isPolling ? 'Stop' : 'Start' }} Monitor
        </button>
        <button @click="refreshNow" :disabled="loading" class="btn">
          {{ loading ? 'Loading...' : 'Refresh Now' }}
        </button>
      </div>
    </div>

    <div class="updates-log">
      <h3>Recent Updates</h3>
      <div class="log-container">
        <div v-for="update in recentUpdates" :key="update.id" class="log-item" :class="update.type">
          <div class="timestamp">{{ formatTime(update.timestamp) }}</div>
          <div class="message">{{ update.message }}</div>
        </div>
      </div>
    </div>

    <div v-if="error" class="error-bar">{{ error }}</div>

    <!-- Series Results Flip Card -->
    <div class="card main-card" v-if="seriesData.length">
      <div class="flip-card" :class="{ flipped: showAllColumns }" @click="showAllColumns = !showAllColumns">
        <div class="card-front">
          <h3>Series Overall - NORTHSTAR</h3>
          <div v-if="northstarData" class="stats-grid">
            <div class="stat highlight">
              <div class="label">Position</div>
              <div class="value">{{ northstarData.position }}</div>
            </div>
            <div class="stat highlight">
              <div class="label">Total Points</div>
              <div class="value">{{ northstarData.total }}</div>
            </div>
            <div class="stat">
              <div class="label">Last Check</div>
              <div class="value small">{{ formatTime(lastUpdate) }}</div>
            </div>
            <div class="stat span-full">
              <div class="label">Race Scores</div>
              <div class="race-grid">
                <span v-for="(points, race) in northstarData.races" :key="race" class="race-badge">
                  {{ race }}: <strong>{{ points }}</strong>
                </span>
              </div>
            </div>
          </div>
          <p class="hint">Click to see ALL columns</p>
        </div>
        
        <div class="card-back">
          <h3>ALL COLUMNS - Live Series Results</h3>
          <div class="table-container">
            <table>
              <thead>
                <tr>
                  <th>Pos</th>
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
                <tr v-for="boat in seriesData" :key="boat.position" 
                    :class="{ northstar: boat.name.toUpperCase().includes('NORTHSTAR') }">
                  <td class="pos">{{ boat.position }}</td>
                  <td class="nation">{{ boat.nation }}</td>
                  <td class="yacht">{{ boat.name }}</td>
                  <td class="sail">{{ boat.sailNo }}</td>
                  <td class="type">{{ boat.type }}</td>
                  <td class="owner">{{ boat.owner }}</td>
                  <td class="club">{{ boat.club }}</td>
                  <td class="class">{{ boat.class }}</td>
                  <td class="race">{{ boat.races?.R1 || '–' }}</td>
                  <td class="race">{{ boat.races?.R2 || '–' }}</td>
                  <td class="race">{{ boat.races?.R3 || '–' }}</td>
                  <td class="race">{{ boat.races?.R4 || '–' }}</td>
                  <td class="total">{{ boat.total }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

    <!-- New Races Detection -->
    <div class="card" v-if="availableRaces.length">
      <h3>Available Races for Class M2</h3>
      <div class="races-grid">
        <div v-for="race in availableRaces" :key="race.id" class="race-item" :class="{ new: race.isNew }">
          <div class="race-info">
            <div class="race-id">Race ID: {{ race.id }}</div>
            <div class="race-number">Class Race #{{ race.raceNumber || '?' }}</div>
            <div v-if="race.isNew" class="new-badge">NEW!</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'

// Config
const EVENT_ID = 'xolfq'
const CLASS_ID = 'M2'
const BOAT_NAME = 'NORTHSTAR'
const POLL_INTERVAL = 2 * 60 * 1000 // 2 minutes

// State
const loading = ref(false)
const error = ref('')
const isPolling = ref(false)
const lastUpdate = ref(null)
const showAllColumns = ref(false)

const seriesData = ref([])
const availableRaces = ref([])
const recentUpdates = ref([])
const knownRaceIds = ref(new Set())

let pollTimer = null

// Computed
const northstarData = computed(() => 
  seriesData.value.find(boat => boat.name.toUpperCase().includes('NORTHSTAR'))
)

// Helper Functions
function addUpdate(message, type = 'info') {
  const update = {
    id: Date.now(),
    timestamp: new Date(),
    message,
    type
  }
  recentUpdates.value.unshift(update)
  if (recentUpdates.value.length > 10) {
    recentUpdates.value = recentUpdates.value.slice(0, 10)
  }
}

function formatTime(date) {
  if (!date) return '--:--'
  return date.toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit',
    second: '2-digit'
  })
}

// Data Fetching
async function fetchORCData() {
  try {
    // Use our Vercel serverless function (no CORS issues)
    const seriesResponse = await fetch(`/api/orc-proxy?type=series&eventId=${EVENT_ID}&classId=${CLASS_ID}`)
    
    if (!seriesResponse.ok) {
      throw new Error(`Series proxy failed: ${seriesResponse.status}`)
    }
    
    const seriesResult = await seriesResponse.json()
    if (!seriesResult.success) {
      throw new Error(seriesResult.message || 'Series fetch failed')
    }
    
    // Fetch index page for race detection
    const indexResponse = await fetch(`/api/orc-proxy?type=index&eventId=${EVENT_ID}`)
    
    if (!indexResponse.ok) {
      throw new Error(`Index proxy failed: ${indexResponse.status}`)
    }
    
    const indexResult = await indexResponse.json()
    if (!indexResult.success) {
      throw new Error(indexResult.message || 'Index fetch failed')
    }
    
    return {
      seriesData: seriesResult.data,
      indexData: indexResult.data,
      timestamp: new Date()
    }
    
  } catch (err) {
    console.error('Fetch via proxy failed:', err)
    throw err
  }
}

async function refreshData() {
  loading.value = true
  error.value = ''
  
  try {
    console.log('Fetching live ORC data via proxy...')
    
    const { seriesData: newSeriesData, indexData, timestamp } = await fetchORCData()
    
    // newSeriesData is already parsed by the serverless function
    if (newSeriesData && newSeriesData.length > 0) {
      const oldCount = seriesData.value.length
      seriesData.value = newSeriesData
      lastUpdate.value = timestamp
      
      if (oldCount > 0 && newSeriesData.length !== oldCount) {
        addUpdate(`Series updated: ${newSeriesData.length} boats (was ${oldCount})`, 'update')
      }
      
      // indexData.races contains available race IDs
      const raceIds = indexData.races || []
      const newRaces = raceIds.filter(id => !knownRaceIds.value.has(id))
      
      // Update available races with race number mapping
      availableRaces.value = raceIds.map((id, index) => ({
        id,
        raceNumber: index + 1, // Race number for class (1, 2, 3, 4...)
        isNew: !knownRaceIds.value.has(id)
      }))
      
      // Detect new races
      if (newRaces.length > 0) {
        newRaces.forEach(raceId => {
          knownRaceIds.value.add(raceId)
          const raceNumber = availableRaces.value.find(r => r.id === raceId)?.raceNumber
          addUpdate(`🚨 NEW RACE detected! Race ID: ${raceId} (Class Race #${raceNumber})`, 'new-race')
        })
      }
      
      const northstar = newSeriesData.find(boat => boat.name.toUpperCase().includes('NORTHSTAR'))
      if (northstar) {
        addUpdate(`✅ NORTHSTAR: P${northstar.position} (${northstar.total} pts)`, 'success')
      } else {
        addUpdate(`✅ Data updated - ${newSeriesData.length} boats`, 'success')
      }
      
    } else {
      throw new Error('No boats found in series results')
    }
    
  } catch (err) {
    console.error('Refresh failed:', err)
    error.value = `Update failed: ${err.message}`
    addUpdate(`❌ Update failed: ${err.message}`, 'error')
    
    // Fallback to sample data for testing
    if (seriesData.value.length === 0) {
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
      addUpdate('📋 Using fallback data', 'info')
    }
  } finally {
    loading.value = false
  }
}

function togglePolling() {
  if (isPolling.value) {
    // Stop polling
    if (pollTimer) {
      clearInterval(pollTimer)
      pollTimer = null
    }
    isPolling.value = false
    addUpdate('🔴 Auto-polling stopped', 'info')
  } else {
    // Start polling
    refreshData() // Immediate check
    pollTimer = setInterval(refreshData, POLL_INTERVAL)
    isPolling.value = true
    addUpdate(`🟢 Auto-polling started (every 2 minutes)`, 'info')
  }
}

async function refreshNow() {
  if (!loading.value) {
    await refreshData()
  }
}

// Lifecycle
onMounted(() => {
  // Don't auto-load or auto-poll initially
  // Let user click "Load Sample" first to see interface
  addUpdate('👋 Ready! Click "Load Sample" to see interface, or "Debug ORC" to troubleshoot', 'info')
})

onUnmounted(() => {
  if (pollTimer) {
    clearInterval(pollTimer)
  }
})
</script>

<style scoped>
.monitor-page {
  padding: 20px;
  color: #fff;
  background: linear-gradient(135deg, #0f1419 0%, #1e3c72 50%, #2a5298 100%);
  min-height: 100vh;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.status-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 25px;
  flex-wrap: wrap;
  gap: 15px;
}

.left h2 {
  margin: 0;
  font-size: 1.4rem;
}

.boat-info {
  font-size: 1.1rem;
  opacity: 0.9;
  margin-top: 5px;
}

.right {
  display: flex;
  align-items: center;
  gap: 15px;
  flex-wrap: wrap;
}

.poll-status {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 20px;
  background: rgba(255,255,255,.1);
  border: 1px solid rgba(255,255,255,.2);
  font-size: 0.9rem;
}

.indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #666;
}

.poll-status.active .indicator {
  background: #00ff88;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.btn {
  background: rgba(255,255,255,.15);
  border: 1px solid rgba(255,255,255,.3);
  color: #fff;
  padding: 10px 16px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.2s;
}

.btn:hover:not(:disabled) {
  background: rgba(255,255,255,.25);
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn.debug {
  background: rgba(255,193,7,.2);
  border-color: #ffc107;
}

.btn.close-debug {
  background: rgba(255,67,67,.2);
  border-color: #ff4343;
  margin-top: 15px;
}

.debug-card {
  background: rgba(255,255,255,.05);
  border: 1px solid rgba(255,193,7,.3);
}

.debug-content {
  color: #fff;
}

.debug-section {
  margin-bottom: 20px;
}

.debug-section h4 {
  color: #ffc107;
  margin: 0 0 10px 0;
  font-size: 1rem;
}

.html-preview {
  background: rgba(0,0,0,.3);
  padding: 15px;
  border-radius: 8px;
  font-family: monospace;
  font-size: 0.8rem;
  white-space: pre-wrap;
  max-height: 300px;
  overflow-y: auto;
  border: 1px solid rgba(255,255,255,.2);
}

.updates-log {
  background: rgba(0,0,0,.2);
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 25px;
}

.updates-log h3 {
  margin: 0 0 15px 0;
  font-size: 1.1rem;
}

.log-container {
  max-height: 150px;
  overflow-y: auto;
  border-radius: 8px;
}

.log-item {
  display: flex;
  gap: 12px;
  padding: 8px 12px;
  border-radius: 6px;
  margin-bottom: 4px;
  font-size: 0.9rem;
}

.log-item.success { background: rgba(0,255,136,.15); border-left: 3px solid #00ff88; }
.log-item.error { background: rgba(255,67,67,.15); border-left: 3px solid #ff4343; }
.log-item.new-race { background: rgba(255,193,7,.15); border-left: 3px solid #ffc107; }
.log-item.update { background: rgba(0,191,255,.15); border-left: 3px solid #00bfff; }
.log-item.info { background: rgba(255,255,255,.08); }

.timestamp {
  font-family: monospace;
  opacity: 0.7;
  white-space: nowrap;
}

.error-bar {
  background: rgba(255,0,0,.2);
  border: 1px solid rgba(255,0,0,.4);
  color: #ffcccc;
  padding: 12px;
  border-radius: 8px;
  margin-bottom: 20px;
}

.main-card {
  margin-bottom: 25px;
}

.card {
  background: rgba(255,255,255,.08);
  border-radius: 16px;
  padding: 25px;
  margin-bottom: 20px;
  border: 1px solid rgba(255,255,255,.15);
}

.flip-card {
  position: relative;
  width: 100%;
  height: 400px;
  perspective: 1200px;
  cursor: pointer;
}

.card-front, .card-back {
  position: absolute;
  width: 100%;
  height: 100%;
  backface-visibility: hidden;
  border-radius: 16px;
  background: rgba(255,255,255,.12);
  border: 2px solid rgba(255,255,255,.25);
  backdrop-filter: blur(20px);
  padding: 25px;
  transition: transform 0.8s ease;
  box-shadow: 0 15px 35px rgba(0,0,0,.2);
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

.stats-grid {
  display: grid;
  gap: 20px;
  grid-template-columns: repeat(3, 1fr);
  margin: 25px 0;
}

.stat {
  background: rgba(255,255,255,.15);
  padding: 20px;
  border-radius: 12px;
  text-align: center;
}

.stat.highlight {
  background: rgba(0,255,170,.2);
  border: 2px solid rgba(0,255,170,.4);
}

.stat.span-full {
  grid-column: 1 / -1;
}

.label {
  font-size: 0.9rem;
  opacity: 0.8;
  margin-bottom: 8px;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.value {
  font-size: 1.8rem;
  font-weight: bold;
  color: #00ffaa;
}

.value.small {
  font-size: 1.2rem;
}

.race-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: center;
}

.race-badge {
  background: rgba(255,255,255,.2);
  padding: 6px 12px;
  border-radius: 8px;
  font-size: 0.9rem;
  border: 1px solid rgba(255,255,255,.3);
}

.hint {
  text-align: center;
  opacity: 0.7;
  margin-top: 20px;
  font-size: 1rem;
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
  padding: 8px 10px;
  text-align: left;
  border-bottom: 1px solid rgba(255,255,255,.15);
  white-space: nowrap;
}

th {
  background: rgba(255,255,255,.2);
  font-weight: 600;
  position: sticky;
  top: 0;
  z-index: 10;
}

.pos { text-align: center; width: 50px; font-weight: bold; }
.nation { text-align: center; width: 60px; font-weight: 600; }
.yacht { min-width: 180px; font-weight: 700; }
.sail { text-align: center; width: 90px; font-family: monospace; }
.type { width: 80px; text-align: center; }
.owner { min-width: 200px; }
.club { min-width: 150px; }
.class { text-align: center; width: 60px; }
.race { text-align: center; width: 45px; font-weight: 600; font-family: monospace; }
.total { text-align: center; width: 60px; font-weight: bold; background: rgba(0,255,170,.15); }

.northstar {
  background: rgba(0,255,170,.25) !important;
  border: 2px solid rgba(0,255,170,.6) !important;
}

.northstar .yacht {
  color: #00ffaa;
  text-shadow: 0 0 10px rgba(0,255,170,.4);
}

.races-grid {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
}

.race-item {
  background: rgba(255,255,255,.1);
  padding: 15px;
  border-radius: 10px;
  border: 1px solid rgba(255,255,255,.2);
  position: relative;
}

.race-item.new {
  background: rgba(255,193,7,.2);
  border: 2px solid #ffc107;
  animation: newRaceGlow 2s ease-in-out infinite alternate;
}

@keyframes newRaceGlow {
  from { box-shadow: 0 0 10px rgba(255,193,7,.3); }
  to { box-shadow: 0 0 20px rgba(255,193,7,.6); }
}

.race-info {
  text-align: center;
}

.race-id {
  font-size: 0.9rem;
  opacity: 0.8;
  margin-bottom: 4px;
}

.race-number {
  font-size: 1.1rem;
  font-weight: bold;
}

.new-badge {
  position: absolute;
  top: -8px;
  right: -8px;
  background: #ffc107;
  color: #000;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 0.7rem;
  font-weight: bold;
  animation: bounce 1s ease-in-out infinite;
}

@keyframes bounce {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.1); }
}

/* Responsive */
@media (max-width: 768px) {
  .status-bar {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .stats-grid {
    grid-template-columns: 1fr;
  }
  
  .flip-card {
    height: 500px;
  }
  
  .races-grid {
    grid-template-columns: 1fr;
  }
}
</style>
