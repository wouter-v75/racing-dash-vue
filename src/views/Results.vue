<template>
  <div class="results-container">
    <!-- Header Section -->
    <header class="regatta-header">
      <div class="header-content">
        <h1 class="regatta-title">Maxi Yacht Rolex Cup 2024</h1>
        <div class="regatta-meta">
          <span class="location">ROLEX IMA MAXI 1 WORLD CHAMPIONSHIP</span>
          <span class="dates">8/9/2024 - 14/9/2024</span>
          <div class="live-indicator">
            <div class="live-dot"></div>
            <span>Live</span>
          </div>
        </div>
      </div>
    </header>

    <!-- Debug Info -->
    <div class="debug-panel" style="background: rgba(255,255,255,0.1); padding: 10px; margin: 10px 0; border-radius: 8px; font-family: monospace; font-size: 0.8rem;">
      <strong>🔧 DEBUG INFO:</strong><br>
      Event: {{ MAXI_EVENT_ID }} | Class: {{ MAXI_CLASS_ID }}<br>
      <strong>FLIP CARD:</strong> {{ cardIsFlipped ? 'FLIPPED' : 'NOT FLIPPED' }} | Clicks: {{ flipClickCount }}<br>
      <strong>SERIES:</strong> {{ seriesStatus }} ({{ allResults.length }} boats)<br>
      <strong>RACE:</strong> {{ raceStatus }} ({{ raceResults.length }} boats)<br>
      <strong>NORTHSTAR SERIES:</strong> {{ northstarResult?.name || 'Not found' }} ({{ northstarResult?.position || '–' }})<br>
      <strong>NORTHSTAR RACE:</strong> {{ northstarRaceResult?.name || 'Not found' }} ({{ northstarRaceResult?.position || '–' }})
    </div>

    <!-- Test Flip Button -->
    <div style="margin: 10px 0;">
      <button @click="testFlip" style="background: #4ecdc4; color: white; border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer; margin-right: 10px;">
        🔄 TEST FLIP (Current: {{ cardIsFlipped ? 'FLIPPED' : 'FRONT' }})
      </button>
      <button @click="forceShowRaceMetrics" style="background: #ff6b6b; color: white; border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer; margin-right: 10px;">
        🏁 FORCE SHOW RACE METRICS
      </button>
      <button @click="cardIsFlipped = false" style="background: #ffd700; color: black; border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer; margin-right: 10px;">
        ⬅️ FORCE FRONT
      </button>
      <button @click="cardIsFlipped = true" style="background: #ff9f43; color: white; border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer;">
        ➡️ FORCE BACK
      </button>
    </div>

    <!-- Main Results Section -->
    <main class="results-main">
      <!-- Latest Race Section -->
      <section class="latest-race-section">
        <h2 class="section-title">🏁 LATEST RACE - R4 RESULTS</h2>
        <p class="section-subtitle">Race 4 • 14/09/2024 • 5-Metric Analysis</p>
        
        <!-- FORCED 5-METRIC DISPLAY -->
        <div class="race-card">
          <div class="race-info">
            <h3>Race R4 - NORTHSTAR Performance</h3>
            <span class="race-date">14/09/2024</span>
          </div>
          
          <!-- ALWAYS SHOW 5 METRICS (forced display) -->
          <div class="race-stats-5-metric">
            <div class="metric-item">
              <span class="metric-label">Position</span>
              <span class="metric-value position-color">
                {{ forceRaceDisplay ? forceRaceDisplay.position : (northstarRaceResult?.position || 'Loading...') }}
              </span>
            </div>
            
            <div class="metric-item">
              <span class="metric-label">Finish Time</span>
              <span class="metric-value time-color">
                {{ forceRaceDisplay ? forceRaceDisplay.finishTime : (northstarRaceResult?.finishTime || 'Loading...') }}
              </span>
            </div>
            
            <div class="metric-item">
              <span class="metric-label">Δ to 1st</span>
              <span class="metric-value delta-color">
                {{ forceRaceDisplay ? forceRaceDisplay.deltaToFirst : (northstarRaceResult?.deltaToFirst || 'Loading...') }}
              </span>
            </div>
            
            <div class="metric-item">
              <span class="metric-label">Δ to Ahead</span>
              <span class="metric-value delta-color">
                {{ forceRaceDisplay ? forceRaceDisplay.deltaToAhead : (northstarRaceResult?.deltaToAhead || 'Loading...') }}
              </span>
              <span class="boat-name-mini" v-if="forceRaceDisplay?.boatAheadName || northstarRaceResult?.boatAheadName">
                {{ forceRaceDisplay?.boatAheadName || northstarRaceResult?.boatAheadName }}
              </span>
            </div>
            
            <div class="metric-item">
              <span class="metric-label">Δ to Behind</span>
              <span class="metric-value delta-color">
                {{ forceRaceDisplay ? forceRaceDisplay.deltaToBehind : (northstarRaceResult?.deltaToBehind || 'Loading...') }}
              </span>
              <span class="boat-name-mini" v-if="forceRaceDisplay?.boatBehindName || northstarRaceResult?.boatBehindName">
                {{ forceRaceDisplay?.boatBehindName || northstarRaceResult?.boatBehindName }}
              </span>
            </div>
          </div>

          <!-- Debug Race Info -->
          <div class="race-debug-mini" style="margin-top: 15px; padding: 8px; background: rgba(0,0,0,0.3); border-radius: 6px; font-size: 0.7rem;">
            <strong>RACE DATA:</strong>
            Loading: {{ loadingRace }} | 
            Error: {{ raceErrorMessage || 'None' }} | 
            Results: {{ raceResults.length }} boats | 
            NORTHSTAR Found: {{ !!northstarRaceResult }}
          </div>
        </div>
      </section>

      <!-- FORCED FLIP CARD SECTION -->
      <section class="series-section">
        <h2 class="section-title">🔄 SERIES RESULTS OVERALL</h2>
        <p class="section-subtitle">CLICK THE CARD BELOW TO FLIP IT</p>
        
        <!-- SIMPLIFIED FLIP CARD -->
        <div class="flip-card-container" @click="testFlip">
          <div class="flip-card-inner" :class="{ 'flipped': cardIsFlipped }">
            
            <!-- FRONT SIDE -->
            <div class="flip-card-front">
              <div class="card-header">
                <h3>🏆 NORTHSTAR Summary</h3>
                <span class="flip-indicator">{{ cardIsFlipped ? 'BACK' : 'FRONT' }}</span>
              </div>
              
              <div class="front-content">
                <div class="position-big">
                  <span class="position-label">Overall Position</span>
                  <span class="position-number">{{ northstarResult?.position || '3rd' }}</span>
                </div>
                
                <div class="points-grid">
                  <div class="points-box">
                    <span class="points-label">Total Points</span>
                    <span class="points-value">{{ northstarResult?.total || '12.00' }}</span>
                  </div>
                  <div class="points-box">
                    <span class="points-label">Yacht Name</span>
                    <span class="points-value yacht-name">NORTHSTAR OF LONDON</span>
                  </div>
                </div>
                
                <div class="race-grid">
                  <div class="race-box">R1: {{ northstarResult?.r1 || '4.00' }}</div>
                  <div class="race-box">R2: {{ northstarResult?.r2 || '2.00' }}</div>
                  <div class="race-box">R3: {{ northstarResult?.r3 || '1.00' }}</div>
                  <div class="race-box retired">R4: {{ northstarResult?.r4 || 'RET' }}</div>
                </div>
              </div>
              
              <div class="flip-instruction">🔄 CLICK TO FLIP FOR FULL TABLE</div>
            </div>

            <!-- BACK SIDE -->
            <div class="flip-card-back">
              <div class="card-header">
                <h3>📊 Full Standings</h3>
                <span class="flip-indicator">{{ cardIsFlipped ? 'BACK' : 'FRONT' }}</span>
              </div>
              
              <div class="back-content">
                <div class="standings-table">
                  <div class="table-header">
                    <span>Pos</span>
                    <span>Yacht</span>
                    <span>R1</span>
                    <span>R2</span>
                    <span>R3</span>
                    <span>R4</span>
                    <span>Total</span>
                  </div>
                  
                  <div v-for="(boat, index) in allResults.slice(0, 6)" 
                       :key="`boat-${index}`"
                       class="table-row"
                       :class="{ 'highlight': findNorthstar(boat.name) }">
                    <span>{{ boat.position }}</span>
                    <span class="boat-name">{{ boat.name }}</span>
                    <span>{{ boat.r1 || '–' }}</span>
                    <span>{{ boat.r2 || '–' }}</span>
                    <span>{{ boat.r3 || '–' }}</span>
                    <span>{{ boat.r4 || '–' }}</span>
                    <span class="total">{{ boat.total || boat.points }}</span>
                  </div>
                </div>
              </div>
              
              <div class="flip-instruction">🔄 CLICK TO FLIP BACK</div>
            </div>
          </div>
        </div>
      </section>

      <!-- Footer -->
      <div class="last-updated">
        <span>Last updated: {{ updateTime }}</span>
        <a href="https://data.orc.org/public/WEV.dll?action=index&eventid=xolfq" target="_blank" class="results-link">Event Website</a>
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

// Constants
const MAXI_EVENT_ID = 'xolfq'
const MAXI_CLASS_ID = 'M2'

// Reactive state
const cardIsFlipped = ref(false)
const flipClickCount = ref(0)
const allResults = ref([])
const raceResults = ref([])
const northstarResult = ref(null)
const northstarRaceResult = ref(null)
const loadingData = ref(false)
const loadingRace = ref(false)
const errorMessage = ref(null)
const raceErrorMessage = ref(null)
const updateTime = ref('17:04')
const seriesStatus = ref('Not loaded')
const raceStatus = ref('Not loaded')

// Force display data (fallback)
const forceRaceDisplay = ref({
  position: 'RET',
  finishTime: 'RET',
  deltaToFirst: 'RET',
  deltaToAhead: 'RET',
  deltaToBehind: 'RET',
  boatAheadName: '–',
  boatBehindName: '–'
})

// Test functions
const testFlip = () => {
  cardIsFlipped.value = !cardIsFlipped.value
  flipClickCount.value++
  console.log('🔄 FLIP TEST:', cardIsFlipped.value, 'Clicks:', flipClickCount.value)
}

const forceShowRaceMetrics = () => {
  console.log('🏁 FORCING RACE METRICS DISPLAY')
  forceRaceDisplay.value = {
    position: '4th',
    finishTime: 'RET',
    deltaToFirst: 'RET',
    deltaToAhead: 'RET',
    deltaToBehind: 'RET',
    boatAheadName: 'JETHOU',
    boatBehindName: '–'
  }
}

const findNorthstar = (yachtName) => {
  return yachtName && (
    yachtName.toUpperCase().includes('NORTHSTAR') || 
    yachtName.toUpperCase().includes('NORTHSTAR OF LONDON')
  )
}

// API functions
const fetchData = async (type, additionalParams = {}) => {
  const url = `/api/results-orc?type=${type}&eventId=${MAXI_EVENT_ID}&classId=${MAXI_CLASS_ID}&${new URLSearchParams(additionalParams)}`
  console.log('📡 API CALL:', url)
  
  const response = await fetch(url)
  const data = await response.json()
  
  if (!data.success) {
    throw new Error(data.message || 'API failed')
  }
  
  return data.results || []
}

const loadSeriesData = async () => {
  try {
    seriesStatus.value = 'Loading...'
    const results = await fetchData('overall')
    allResults.value = results
    
    const northstar = results.find(boat => findNorthstar(boat.name))
    if (northstar) {
      northstarResult.value = northstar
    }
    
    seriesStatus.value = `Success (${results.length} boats)`
    console.log('✅ Series data loaded:', results.length, 'boats')
  } catch (err) {
    seriesStatus.value = `Error: ${err.message}`
    console.error('❌ Series error:', err)
  }
}

const loadRaceData = async () => {
  try {
    raceStatus.value = 'Loading...'
    const results = await fetchData('race', { raceId: '13' })
    raceResults.value = results
    
    const northstarRace = results.find(boat => findNorthstar(boat.name))
    if (northstarRace) {
      northstarRaceResult.value = {
        ...northstarRace,
        deltaToFirst: 'RET',
        deltaToAhead: 'RET',
        deltaToBehind: 'RET',
        boatAheadName: '–',
        boatBehindName: '–'
      }
    }
    
    raceStatus.value = `Success (${results.length} boats)`
    console.log('✅ Race data loaded:', results.length, 'boats')
  } catch (err) {
    raceStatus.value = `Error: ${err.message}`
    console.error('❌ Race error:', err)
  }
}

// Initialize
onMounted(async () => {
  console.log('🚀 COMPONENT MOUNTED')
  
  // Load data
  await Promise.all([
    loadSeriesData(),
    loadRaceData()
  ])
  
  // Set static fallback data if needed
  if (allResults.value.length === 0) {
    allResults.value = [
      { position: '1', name: 'PROTEUS', r1: '2.00', r2: '1.00', r3: '4.00', r4: '1.00', total: '8.00' },
      { position: '2', name: 'JOLT', r1: '1.00', r2: '3.00', r3: '2.00', r4: '2.00', total: '8.00' },
      { position: '3', name: 'NORTHSTAR OF LONDON', r1: '4.00', r2: '2.00', r3: '1.00', r4: 'RET', total: '12.00' },
      { position: '4', name: 'JETHOU', r1: '3.00', r2: '4.00', r3: '3.00', r4: '3.00', total: '13.00' }
    ]
    northstarResult.value = allResults.value.find(boat => findNorthstar(boat.name))
    console.log('📋 Using fallback data')
  }
  
  updateTime.value = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  console.log('✅ COMPONENT READY')
})
</script>

<style scoped>
/* Global Container */
.results-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #1e3c72 0%, #2a5298 50%, #1e3c72 100%);
  color: white;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  padding: 20px;
}

/* Header */
.regatta-header {
  margin-bottom: 30px;
}

.regatta-title {
  font-size: 2.5rem;
  font-weight: 700;
  margin: 0 0 10px 0;
  background: linear-gradient(45deg, #ffffff, #e0e8ff);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.regatta-meta {
  display: flex;
  align-items: center;
  gap: 20px;
  font-size: 1rem;
  opacity: 0.9;
}

.live-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(0, 255, 0, 0.1);
  padding: 4px 12px;
  border-radius: 20px;
  border: 1px solid rgba(0, 255, 0, 0.3);
}

.live-dot {
  width: 8px;
  height: 8px;
  background: #00ff00;
  border-radius: 50%;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

/* Main Sections */
.results-main {
  max-width: 1400px;
  margin: 0 auto;
}

.section-title {
  font-size: 1.3rem;
  font-weight: 600;
  margin: 0 0 8px 0;
  letter-spacing: 0.5px;
}

.section-subtitle {
  font-size: 0.95rem;
  opacity: 0.7;
  margin: 0 0 20px 0;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

/* Race Card */
.latest-race-section {
  margin-bottom: 40px;
}

.race-card {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 20px;
  padding: 25px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
}

.race-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 25px;
}

.race-info h3 {
  font-size: 1.4rem;
  margin: 0;
}

.race-date {
  background: rgba(255, 255, 255, 0.15);
  padding: 6px 12px;
  border-radius: 12px;
  font-size: 0.9rem;
}

/* 5-Metric Display */
.race-stats-5-metric {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 15px;
  margin-bottom: 20px;
}

.metric-item {
  text-align: center;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 15px 8px;
}

.metric-label {
  display: block;
  font-size: 0.8rem;
  opacity: 0.8;
  margin-bottom: 8px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.metric-value {
  display: block;
  font-size: 1.3rem;
  font-weight: 700;
  margin-bottom: 4px;
}

.boat-name-mini {
  display: block;
  font-size: 0.65rem;
  opacity: 0.7;
  color: #b0c4de;
  margin-top: 4px;
}

.position-color { color: #ffd700; }
.time-color { color: #4ecdc4; font-family: monospace; }
.delta-color { color: #ff9f43; font-family: monospace; }

/* Flip Card */
.series-section {
  margin-bottom: 40px;
}

.flip-card-container {
  width: 100%;
  height: 400px;
  perspective: 1000px;
  cursor: pointer;
  position: relative;
}

.flip-card-container:hover {
  transform: scale(1.02);
  transition: transform 0.3s ease;
}

.flip-card-inner {
  position: relative;
  width: 100%;
  height: 100%;
  text-align: left;
  transition: transform 0.8s;
  transform-style: preserve-3d;
}

.flip-card-inner.flipped {
  transform: rotateY(180deg);
}

.flip-card-front, .flip-card-back {
  position: absolute;
  width: 100%;
  height: 100%;
  -webkit-backface-visibility: hidden;
  backface-visibility: hidden;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(20px);
  border: 2px solid rgba(255, 255, 255, 0.2);
  border-radius: 20px;
  padding: 25px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
}

.flip-card-back {
  transform: rotateY(180deg);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.15);
}

.card-header h3 {
  font-size: 1.3rem;
  margin: 0;
}

.flip-indicator {
  background: rgba(255, 255, 255, 0.15);
  padding: 4px 10px;
  border-radius: 10px;
  font-size: 0.8rem;
  font-weight: 600;
}

/* Front Content */
.front-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.position-big {
  text-align: center;
  background: rgba(255, 215, 0, 0.1);
  border: 1px solid rgba(255, 215, 0, 0.3);
  border-radius: 15px;
  padding: 20px;
}

.position-label {
  display: block;
  font-size: 0.9rem;
  opacity: 0.8;
  margin-bottom: 10px;
}

.position-number {
  display: block;
  font-size: 2.5rem;
  font-weight: 700;
  color: #ffd700;
}

.points-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 15px;
}

.points-box {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 15px;
  text-align: center;
}

.points-label {
  display: block;
  font-size: 0.8rem;
  opacity: 0.8;
  margin-bottom: 8px;
}

.points-value {
  display: block;
  font-size: 1.4rem;
  font-weight: 600;
  color: #4ecdc4;
}

.yacht-name {
  font-size: 1rem !important;
  color: #ffd700 !important;
  font-weight: 700 !important;
}

.race-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
}

.race-box {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 10px;
  text-align: center;
  font-size: 0.9rem;
  font-weight: 600;
}

.race-box.retired {
  border-color: rgba(255, 107, 107, 0.3);
  background: rgba(255, 107, 107, 0.05);
  color: #ff6b6b;
}

/* Back Content */
.back-content {
  flex: 1;
}

.standings-table {
  font-size: 0.85rem;
}

.table-header {
  display: grid;
  grid-template-columns: 40px 1fr 40px 40px 40px 40px 60px;
  gap: 8px;
  background: rgba(255, 255, 255, 0.1);
  padding: 10px 8px;
  border-radius: 8px;
  font-weight: 600;
  margin-bottom: 8px;
}

.table-row {
  display: grid;
  grid-template-columns: 40px 1fr 40px 40px 40px 40px 60px;
  gap: 8px;
  padding: 8px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  align-items: center;
}

.table-row:hover {
  background: rgba(255, 255, 255, 0.05);
}

.table-row.highlight {
  background: rgba(255, 215, 0, 0.1);
  border-left: 3px solid #ffd700;
  border-radius: 4px;
}

.boat-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: 600;
}

.total {
  font-weight: 600;
  color: #4ecdc4;
}

/* Flip Instruction */
.flip-instruction {
  text-align: center;
  font-size: 0.85rem;
  opacity: 0.7;
  margin-top: auto;
  padding: 10px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  border: 1px dashed rgba(255, 255, 255, 0.2);
}

/* Footer */
.last-updated {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 40px;
  padding: 20px 0;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  font-size: 0.9rem;
  opacity: 0.8;
}

.results-link {
  color: #4ecdc4;
  text-decoration: none;
  padding: 8px 16px;
  border: 1px solid rgba(78, 205, 196, 0.3);
  border-radius: 10px;
  transition: all 0.3s ease;
}

.results-link:hover {
  background: rgba(78, 205, 196, 0.1);
}

/* Responsive */
@media (max-width: 768px) {
  .race-stats-5-metric {
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
  }
  
  .metric-item {
    padding: 10px;
  }
  
  .metric-value {
    font-size: 1.1rem;
  }
  
  .points-grid {
    grid-template-columns: 1fr;
  }
  
  .race-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  
  /* Race flip card responsive */
  .race-flip-card-container {
    height: 380px;
  }
  
  .race-table-header, .race-table-row {
    grid-template-columns: 40px 1fr 70px 60px 50px;
    gap: 4px;
    font-size: 0.75rem;
  }
  
  .race-card-header h3 {
    font-size: 1.1rem;
  }
  
  .race-flip-instruction {
    font-size: 0.75rem;
    padding: 8px;
  }
}

@media (max-width: 480px) {
  .race-stats-5-metric {
    grid-template-columns: 1fr;
    gap: 8px;
  }
  
  .metric-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px;
  }
  
  .metric-label {
    margin-bottom: 0;
  }
  
  .metric-value {
    font-size: 1rem;
  }
  
  .race-flip-card-container {
    height: 360px;
  }
  
  .race-table-header, .race-table-row {
    grid-template-columns: 30px 1fr 60px;
    gap: 4px;
  }
  
  .race-finish, .race-corrected {
    display: none;
  }
}
</style>
