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

// ORC Parsing Functions
function cleanup(s) {
  return String(s || '')
    .replace(/<[^>]+>/g, " ")
    .replace(/[\u00A0\u2007\u202F]/g, " ")
    .replace(/█/g, '')
    .replace(/\s+/g, " ")
    .trim()
}

function extractPoints(str) {
  if (!str) return null
  const cleaned = cleanup(str)
  
  if (/^(DNF|DNS|DSQ|DNC|RET|RAF|BFD|UFD|SCP|ZFP)$/i.test(cleaned)) {
    return cleaned.toUpperCase()
  }
  
  const match = cleaned.match(/(\d+(?:\.\d+)?)/)
  return match ? parseFloat(match[1]) : null
}

function parseORCSeriesData(html) {
  const lines = html.split('\n').map(line => line.trim()).filter(line => line)
  
  let rawDataLines = []
  let inTable = false
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    
    if (/^[\|\-\s]+$/.test(line)) continue
    
    if (line.includes('Rank') && line.includes('Yacht Name') && line.includes('Total')) {
      inTable = true
      continue
    }
    
    if (inTable) {
      if (line.includes('[') && line.includes(']') && line.match(/\d{2}\/\d{2}\/\d{4}/)) break
      if (line.includes('|')) {
        rawDataLines.push(line)
      }
    }
  }
  
  if (!rawDataLines.length) return []
  
  // Reconstruct complete rows
  const completeRows = []
  let currentRow = null
  
  for (const line of rawDataLines) {
    const cells = line.split('|').map(cell => cleanup(cell))
    
    if (cells.length > 8 && /^\d+$/.test(cells[0])) {
      if (currentRow) completeRows.push(currentRow)
      currentRow = [...cells]
    } else if (currentRow && cells.length > 0) {
      const firstNonEmpty = cells.find(cell => cell && cell.trim())
      if (firstNonEmpty && /^\d+(\.\d+)?$/.test(firstNonEmpty)) {
        currentRow.push(`TOTAL:${firstNonEmpty}`)
      }
    }
  }
  
  if (currentRow) completeRows.push(currentRow)
  
  return completeRows.map(cells => {
    let totalScore = null
    const totalCell = cells.find(cell => cell.startsWith('TOTAL:'))
    if (totalCell) {
      totalScore = extractPoints(totalCell.replace('TOTAL:', ''))
    } else {
      for (let i = 12; i < cells.length; i++) {
        const points = extractPoints(cells[i])
        if (points !== null && typeof points === 'number' && points > 0) {
          totalScore = points
          break
        }
      }
    }
    
    const result = {
      position: cells[0] || '',
      nation: cells[1] || '',
      name: cells[2] || '',
      sailNo: cells[3] || '',
      type: cells[4] || '',
      owner: cells[5] || '',
      club: cells[6] || '',
      class: cells[7] || '',
      total: totalScore || '',
      races: {}
    }
    
    // Extract race results (R1-R4)
    const raceColumns = [8, 9, 10, 11]
    raceColumns.forEach((colIndex, raceIndex) => {
      const raceNum = raceIndex + 1
      if (cells[colIndex]) {
        const racePoints = extractPoints(cells[colIndex])
        if (racePoints !== null) {
          result.races[`R${raceNum}`] = racePoints
        }
      }
    })
    
    return result
  })
}

function parseRaceIds(html) {
  // Extract all race IDs from the index page for our class
  const raceIds = []
  
  // Look for race links in the HTML
  const raceRegex = /action=race[^"'>]*raceid=([^"'&>\s]+)/gi
  let match
  
  while ((match = raceRegex.exec(html)) !== null) {
    const raceId = match[1].trim()
    if (raceId && !raceIds.includes(raceId)) {
      raceIds.push(raceId)
    }
  }
  
  return raceIds.sort((a, b) => {
    // Try to sort numerically if possible
    const numA = parseInt(a, 10)
    const numB = parseInt(b, 10)
    if (!isNaN(numA) && !isNaN(numB)) return numA - numB
    return a.localeCompare(b)
  })
}

// Data Fetching
async function fetchORCData() {
  const corsProxy = 'https://api.allorigins.win/get?url='
  
  try {
    // Fetch series results
    const seriesUrl = `https://data.orc.org/public/WEV.dll?action=series&eventid=${EVENT_ID}&classid=${CLASS_ID}`
    const seriesResponse = await fetch(corsProxy + encodeURIComponent(seriesUrl))
    
    if (!seriesResponse.ok) {
      throw new Error(`Series fetch failed: ${seriesResponse.status}`)
    }
    
    const seriesData = await seriesResponse.json()
    const seriesHtml = seriesData.contents
    
    // Fetch index page for race IDs
    const indexUrl = `https://data.orc.org/public/WEV.dll?action=index&eventid=${EVENT_ID}`
    const indexResponse = await fetch(corsProxy + encodeURIComponent(indexUrl))
    
    if (!indexResponse.ok) {
      throw new Error(`Index fetch failed: ${indexResponse.status}`)
    }
    
    const indexData = await indexResponse.json()
    const indexHtml = indexData.contents
    
    return {
      seriesHtml,
      indexHtml,
      timestamp: new Date()
    }
    
  } catch (err) {
    console.error('Fetch failed:', err)
    throw err
  }
}

async function refreshData() {
  loading.value = true
  error.value = ''
  
  try {
    console.log('Fetching live ORC data...')
    
    const { seriesHtml, indexHtml, timestamp } = await fetchORCData()
    
    // Parse series results
    const parsed = parseORCSeriesData(seriesHtml)
    
    if (parsed.length > 0) {
      const oldCount = seriesData.value.length
      seriesData.value = parsed
      lastUpdate.value = timestamp
      
      if (oldCount > 0 && parsed.length !== oldCount) {
        addUpdate(`Series updated: ${parsed.length} boats (was ${oldCount})`, 'update')
      }
      
      // Parse available races
      const raceIds = parseRaceIds(indexHtml)
      const newRaces = raceIds.filter(id => !knownRaceIds.value.has(id))
      
      // Update available races with race number mapping
      availableRaces.value = raceIds.map((id, index) => ({
        id,
        raceNumber: index + 1, // Race number for the class (1, 2, 3, 4...)
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
      
      addUpdate(`✅ Data updated successfully - ${parsed.length} boats`, 'success')
      
    } else {
      throw new Error('No boats found in series results')
    }
    
  } catch (err) {
    console.error('Refresh failed:', err)
    error.value = `Update failed: ${err.message}`
    addUpdate(`❌ Update failed: ${err.message}`, 'error')
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
  // Initial load
  refreshData()
  // Auto-start polling
  setTimeout(() => togglePolling(), 1000)
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
