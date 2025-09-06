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
      <strong>SERIES FLIP:</strong> {{ cardIsFlipped ? 'FLIPPED' : 'NOT FLIPPED' }} | Clicks: {{ flipClickCount }}<br>
      <strong>RACE FLIP:</strong> {{ raceCardIsFlipped ? 'FLIPPED' : 'NOT FLIPPED' }} | Clicks: {{ raceFlipClickCount }}<br>
      <strong>SERIES:</strong> {{ seriesStatus }} ({{ allResults.length }} boats)<br>
      <strong>RACE:</strong> {{ raceStatus }} ({{ raceResults.length }} boats)<br>
      <strong>NORTHSTAR SERIES:</strong> {{ northstarResult?.name || 'Not found' }} ({{ northstarResult?.position || '–' }})<br>
      <strong>NORTHSTAR RACE:</strong> {{ northstarRaceResult?.name || 'Not found' }} ({{ northstarRaceResult?.position || '–' }})
    </div>

    <!-- Test Flip Buttons -->
    <div style="margin: 10px 0;">
      <button @click="testFlip" style="background: #4ecdc4; color: white; border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer; margin-right: 10px;">
        🔄 TEST SERIES FLIP ({{ cardIsFlipped ? 'FLIPPED' : 'FRONT' }})
      </button>
      <button @click="testRaceFlip" style="background: #ff6b6b; color: white; border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer; margin-right: 10px;">
        🏁 TEST RACE FLIP ({{ raceCardIsFlipped ? 'FLIPPED' : 'FRONT' }})
      </button>
      <button @click="forceShowRaceMetrics" style="background: #ffd700; color: black; border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer; margin-right: 10px;">
        📊 FORCE SHOW RACE METRICS
      </button>
    </div>

    <!-- Main Results Section -->
    <main class="results-main">
      <!-- Race 1 Section with FLIP CARD -->
      <section class="latest-race-section">
        <h2 class="section-title">🏁 RACE 1 RESULTS</h2>
        <p class="section-subtitle">Race 1 • 09/09/2024 • CLICK CARD TO FLIP</p>
        
        <!-- RACE 1 FLIP CARD -->
        <div class="race-flip-card-container" @click="testRace1Flip">
          <div class="race-flip-card-inner" :class="{ 'flipped': race1CardIsFlipped }">
            
            <!-- RACE 1 FRONT SIDE - 5 Metrics -->
            <div class="race-flip-card-front">
              <div class="race-card-header">
                <h3>🏁 Race 1 - NORTHSTAR Performance</h3>
                <div class="race-flip-indicators">
                  <span class="race-date">09/09/2024</span>
                  <span class="race-flip-indicator">{{ race1CardIsFlipped ? 'BACK' : 'FRONT' }}</span>
                </div>
              </div>
              
              <!-- 5-Metric Display -->
              <div class="race-stats-5-metric">
                <div class="metric-item">
                  <span class="metric-label">Position</span>
                  <span class="metric-value position-color">
                    {{ northstarRace1Result?.position || '4th' }}
                  </span>
                </div>
                
                <div class="metric-item">
                  <span class="metric-label">Finish Time</span>
                  <span class="metric-value time-color">
                    {{ northstarRace1Result?.finishTime || '–' }}
                  </span>
                </div>
                
                <div class="metric-item">
                  <span class="metric-label">Δ to 1st</span>
                  <span class="metric-value delta-color">
                    {{ northstarRace1Result?.deltaToFirst || '–' }}
                  </span>
                </div>
                
                <div class="metric-item">
                  <span class="metric-label">Δ to Ahead</span>
                  <span class="metric-value delta-color">
                    {{ northstarRace1Result?.deltaToAhead || '–' }}
                  </span>
                </div>
                
                <div class="metric-item">
                  <span class="metric-label">Δ to Behind</span>
                  <span class="metric-value delta-color">
                    {{ northstarRace1Result?.deltaToBehind || '–' }}
                  </span>
                </div>
              </div>
              
              <div class="race-flip-instruction">🔄 CLICK TO FLIP FOR FULL RACE TABLE</div>
            </div>

            <!-- RACE 1 BACK SIDE - Full Race Results Table -->
            <div class="race-flip-card-back">
              <div class="race-card-header">
                <h3>📊 Full Race 1 Results</h3>
                <div class="race-flip-indicators">
                  <span class="race-date">09/09/2024</span>
                  <span class="race-flip-indicator">{{ race1CardIsFlipped ? 'BACK' : 'FRONT' }}</span>
                </div>
              </div>
              
              <div class="race-back-content">
                <div class="race-results-table">
                  <div class="race-table-header">
                    <span>Pos</span>
                    <span>Yacht</span>
                    <span>Finish</span>
                    <span>Elapsed</span>
                    <span>Corrected</span>
                    <span>Δ to 1st</span>
                    <span>Status</span>
                  </div>
                  
                  <div v-if="race1Results.length === 0" class="race-table-row">
                    <span style="grid-column: 1 / -1; text-align: center; opacity: 0.7; padding: 20px;">
                      {{ loadingRace1 ? 'Loading race data...' : 'No race data available' }}
                    </span>
                  </div>
                  
                  <div v-for="(boat, index) in race1Results.slice(0, 8)" 
                       :key="`race1-boat-${index}`"
                       class="race-table-row"
                       :class="{ 'highlight': findNorthstar(boat.name) }">
                    <span>{{ boat.position || '–' }}</span>
                    <span class="boat-name">{{ boat.name || 'Unknown' }}</span>
                    <span class="race-finish">{{ boat.finishTime || '–' }}</span>
                    <span class="race-elapsed">{{ boat.elapsed || '–' }}</span>
                    <span class="race-corrected">{{ boat.correctedTime || boat.corrected || '–' }}</span>
                    <span class="race-delta" :class="{ 
                      'winner': boat.position === '1', 
                      'retired': /^(RET|DNF|DNS|DSQ|DNC)$/i.test(boat.finishTime || boat.elapsed || '')
                    }">
                      {{ formatDeltaToFirst(boat, race1Results) }}
                    </span>
                    <span class="race-status" :class="{ 
                      'finished': !/^(RET|DNF|DNS|DSQ|DNC)$/i.test(boat.finishTime || boat.elapsed || ''),
                      'retired': /^(RET|DNF|DNS|DSQ|DNC)$/i.test(boat.finishTime || boat.elapsed || '')
                    }">
                      {{ /^(RET|DNF|DNS|DSQ|DNC)$/i.test(boat.finishTime || boat.elapsed || '') ? 
                         (boat.finishTime || boat.elapsed || 'RETIRED') : 'FINISHED' }}
                    </span>
                  </div>
                </div>
              </div>
              
              <div class="race-flip-instruction">🔄 CLICK TO FLIP BACK TO METRICS</div>
            </div>
          </div>
        </div>
      </section>

      <!-- Latest Race Section with FLIP CARD -->
      <section class="latest-race-section">
        <h2 class="section-title">🏁 LATEST RACE - R4 RESULTS</h2>
        <p class="section-subtitle">Race 4 • 14/09/2024 • CLICK CARD TO FLIP</p>
        
        <!-- RACE FLIP CARD -->
        <div class="race-flip-card-container" @click="testRaceFlip">
          <div class="race-flip-card-inner" :class="{ 'flipped': raceCardIsFlipped }">
            
            <!-- RACE FRONT SIDE - 5 Metrics -->
            <div class="race-flip-card-front">
              <div class="race-card-header">
                <h3>🏁 Race R4 - NORTHSTAR Performance</h3>
                <div class="race-flip-indicators">
                  <span class="race-date">14/09/2024</span>
                  <span class="race-flip-indicator">{{ raceCardIsFlipped ? 'BACK' : 'FRONT' }}</span>
                </div>
              </div>
              
              <!-- 5-Metric Display -->
              <div class="race-stats-5-metric">
                <div class="metric-item">
                  <span class="metric-label">Position</span>
                  <span class="metric-value position-color">
                    {{ forceRaceDisplay ? forceRaceDisplay.position : (northstarRaceResult?.position || 'RET') }}
                  </span>
                </div>
                
                <div class="metric-item">
                  <span class="metric-label">Finish Time</span>
                  <span class="metric-value time-color">
                    {{ forceRaceDisplay ? forceRaceDisplay.finishTime : (northstarRaceResult?.finishTime || 'RET') }}
                  </span>
                </div>
                
                <div class="metric-item">
                  <span class="metric-label">Δ to 1st</span>
                  <span class="metric-value delta-color">
                    {{ forceRaceDisplay ? forceRaceDisplay.deltaToFirst : (northstarRaceResult?.deltaToFirst || 'RET') }}
                  </span>
                </div>
                
                <div class="metric-item">
                  <span class="metric-label">Δ to Ahead</span>
                  <span class="metric-value delta-color">
                    {{ forceRaceDisplay ? forceRaceDisplay.deltaToAhead : (northstarRaceResult?.deltaToAhead || 'RET') }}
                  </span>
                  <span class="boat-name-mini" v-if="forceRaceDisplay?.boatAheadName || northstarRaceResult?.boatAheadName">
                    {{ forceRaceDisplay?.boatAheadName || northstarRaceResult?.boatAheadName }}
                  </span>
                </div>
                
                <div class="metric-item">
                  <span class="metric-label">Δ to Behind</span>
                  <span class="metric-value delta-color">
                    {{ forceRaceDisplay ? forceRaceDisplay.deltaToBehind : (northstarRaceResult?.deltaToBehind || 'RET') }}
                  </span>
                  <span class="boat-name-mini" v-if="forceRaceDisplay?.boatBehindName || northstarRaceResult?.boatBehindName">
                    {{ forceRaceDisplay?.boatBehindName || northstarRaceResult?.boatBehindName }}
                  </span>
                </div>
              </div>
              
              <div class="race-flip-instruction">🔄 CLICK TO FLIP FOR FULL RACE TABLE</div>
            </div>

            <!-- RACE BACK SIDE - Full Race Results Table -->
            <div class="race-flip-card-back">
              <div class="race-card-header">
                <h3>📊 Full Race R4 Results</h3>
                <div class="race-flip-indicators">
                  <span class="race-date">14/09/2024</span>
                  <span class="race-flip-indicator">{{ raceCardIsFlipped ? 'BACK' : 'FRONT' }}</span>
                </div>
              </div>
              
              <div class="race-back-content">
                <div class="race-results-table">
                  <div class="race-table-header">
                    <span>Pos</span>
                    <span>Yacht</span>
                    <span>Finish</span>
                    <span>Elapsed</span>
                    <span>Corrected</span>
                    <span>Δ to 1st</span>
                    <span>Status</span>
                  </div>
                  
                  <!-- REAL RACE DATA ONLY - from raceResults array -->
                  <div v-if="raceResults.length === 0" class="race-table-row">
                    <span style="grid-column: 1 / -1; text-align: center; opacity: 0.7; padding: 20px;">
                      {{ loadingRace ? 'Loading race data...' : 'No race data available' }}
                    </span>
                  </div>
                  
                  <div v-for="(boat, index) in raceResults.slice(0, 8)" 
                       :key="`race-boat-${index}`"
                       class="race-table-row"
                       :class="{ 'highlight': findNorthstar(boat.name) }">
                    <span>{{ boat.position || '–' }}</span>
                    <span class="boat-name">{{ boat.name || 'Unknown' }}</span>
                    <span class="race-finish">{{ boat.finishTime || '–' }}</span>
                    <span class="race-elapsed">{{ boat.elapsed || '–' }}</span>
                    <span class="race-corrected">{{ boat.correctedTime || boat.corrected || '–' }}</span>
                    <span class="race-delta" :class="{ 
                      'winner': boat.position === '1', 
                      'retired': /^(RET|DNF|DNS|DSQ|DNC)$/i.test(boat.finishTime || boat.elapsed || '')
                    }">
                      {{ formatDeltaToFirst(boat, raceResults) }}
                    </span>
                    <span class="race-status" :class="{ 
                      'finished': !/^(RET|DNF|DNS|DSQ|DNC)$/i.test(boat.finishTime || boat.elapsed || ''),
                      'retired': /^(RET|DNF|DNS|DSQ|DNC)$/i.test(boat.finishTime || boat.elapsed || '')
                    }">
                      {{ /^(RET|DNF|DNS|DSQ|DNC)$/i.test(boat.finishTime || boat.elapsed || '') ? 
                         (boat.finishTime || boat.elapsed || 'RETIRED') : 'FINISHED' }}
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
              
              <div class="race-flip-instruction">🔄 CLICK TO FLIP BACK TO METRICS</div>
            </div>
          </div>
        </div>
      </section>

      <!-- SERIES FLIP CARD SECTION -->
      <section class="series-section">
        <h2 class="section-title">🔄 SERIES RESULTS OVERALL</h2>
        <p class="section-subtitle">CLICK THE CARD BELOW TO FLIP IT</p>
        
        <!-- SERIES FLIP CARD -->
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
const raceCardIsFlipped = ref(false)
const raceFlipClickCount = ref(0)
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
  console.log('🔄 SERIES FLIP TEST:', cardIsFlipped.value, 'Clicks:', flipClickCount.value)
}

const testRaceFlip = () => {
  raceCardIsFlipped.value = !raceCardIsFlipped.value
  raceFlipClickCount.value++
  console.log('🏁 RACE FLIP TEST:', raceCardIsFlipped.value, 'Clicks:', raceFlipClickCount.value)
}

const forceShowRaceMetrics = () => {
  console.log('🏁 FORCING RACE METRICS DISPLAY')
  forceRaceDisplay.value = {
    position: 'RET',
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

// Format delta time to first place in mm:ss
const formatDeltaToFirst = (boat, allRaceResults) => {
  // Handle retired boats
  if (/^(RET|DNF|DNS|DSQ|DNC)$/i.test(boat.finishTime || boat.elapsed || '')) {
    return 'RET'
  }
  
  // Winner gets 00:00
  if (boat.position === '1') {
    return '00:00'
  }
  
  // If deltaToFirst is already provided by API, use it
  if (boat.deltaToFirst && boat.deltaToFirst !== '–') {
    return boat.deltaToFirst
  }
  
  // Calculate delta from corrected times
  try {
    const winnerTime = allRaceResults.find(b => b.position === '1')?.correctedTime || 
                       allRaceResults.find(b => b.position === '1')?.corrected
    const boatTime = boat.correctedTime || boat.corrected
    
    if (!winnerTime || !boatTime) return '–'
    
    // Convert time strings to seconds for calculation
    const winnerSeconds = timeToSeconds(winnerTime)
    const boatSeconds = timeToSeconds(boatTime)
    
    if (winnerSeconds === null || boatSeconds === null) return '–'
    
    const deltaSeconds = boatSeconds - winnerSeconds
    if (deltaSeconds <= 0) return '00:00'
    
    // Format as mm:ss
    const minutes = Math.floor(deltaSeconds / 60)
    const seconds = deltaSeconds % 60
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
    
  } catch (e) {
    console.error('Delta calculation error:', e)
    return '–'
  }
}

// Helper function to convert time string to seconds
const timeToSeconds = (timeStr) => {
  if (!timeStr || typeof timeStr !== 'string') return null
  
  // Handle formats like "14:23:45" or "2:23:45"
  const timeParts = timeStr.split(':')
  if (timeParts.length === 3) {
    const hours = parseInt(timeParts[0], 10) || 0
    const minutes = parseInt(timeParts[1], 10) || 0
    const seconds = parseInt(timeParts[2], 10) || 0
    return hours * 3600 + minutes * 60 + seconds
  }
  
  // Handle formats like "23:45" (mm:ss)
  if (timeParts.length === 2) {
    const minutes = parseInt(timeParts[0], 10) || 0
    const seconds = parseInt(timeParts[1], 10) || 0
    return minutes * 60 + seconds
  }
  
  return null
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

/* RACE FLIP CARD STYLES */
.latest-race-section {
  margin-bottom: 40px;
}

.race-flip-card-container {
  width: 100%;
  height: 400px;
  perspective: 1000px;
  cursor: pointer;
  position: relative;
}

.race-flip-card-container:hover {
  transform: scale(1.02);
  transition: transform 0.3s ease;
}

.race-flip-card-inner {
  position: relative;
  width: 100%;
  height: 100%;
  text-align: left;
  transition: transform 0.8s;
  transform-style: preserve-3d;
}

.race-flip-card-inner.flipped {
  transform: rotateY(180deg);
}

.race-flip-card-front, .race-flip-card-back {
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

.race-flip-card-back {
  transform: rotateY(180deg);
}

.race-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.15);
}

.race-card-header h3 {
  font-size: 1.3rem;
  margin: 0;
}

.race-flip-indicators {
  display: flex;
  align-items: center;
  gap: 10px;
}

.race-date {
  background: rgba(255, 255, 255, 0.15);
  padding: 6px 12px;
  border-radius: 12px;
  font-size: 0.9rem;
}

.race-flip-indicator {
  background: rgba(255, 255, 255, 0.15);
  padding: 4px 10px;
  border-radius: 10px;
  font-size: 0.8rem;
  font-weight: 600;
}

/* 5-Metric Display */
.race-stats-5-metric {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 15px;
  margin-bottom: 20px;
  flex: 1;
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

/* Race Results Table - WITH 7 COLUMNS INCLUDING ELAPSED */
.race-back-content {
  flex: 1;
}

.race-results-table {
  font-size: 0.85rem;
}

.race-table-header {
  display: grid;
  grid-template-columns: 40px 1fr 70px 70px 70px 70px 70px;
  gap: 8px;
  background: rgba(255, 255, 255, 0.1);
  padding: 10px 8px;
  border-radius: 8px;
  font-weight: 600;
  margin-bottom: 8px;
}

.race-table-row {
  display: grid;
  grid-template-columns: 40px 1fr 70px 70px 70px 70px 70px;
  gap: 8px;
  padding: 8px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  align-items: center;
}

.race-table-row:hover {
  background: rgba(255, 255, 255, 0.05);
}

.race-table-row.highlight {
  background: rgba(255, 215, 0, 0.1);
  border-left: 3px solid #ffd700;
  border-radius: 4px;
}

.race-finish, .race-corrected, .race-elapsed {
  font-family: monospace;
  font-size: 0.8rem;
}

.race-delta {
  font-family: monospace;
  font-size: 0.8rem;
  font-weight: 600;
  text-align: center;
}

.race-delta.winner {
  color: #ffd700;
}

.race-delta.retired {
  color: #ff6b6b;
}

.race-delta:not(.winner):not(.retired) {
  color: #ff9f43;
}

.race-status {
  font-size: 0.75rem;
  padding: 2px 6px;
  border-radius: 6px;
  text-align: center;
  font-weight: 600;
}

.race-status.finished {
  background: rgba(0, 255, 0, 0.1);
  color: #4ecdc4;
}

.race-status.retired {
  background: rgba(255, 107, 107, 0.1);
  color: #ff6b6b;
}

.race-flip-instruction {
  text-align: center;
  font-size: 0.85rem;
  opacity: 0.7;
  margin-top: auto;
  padding: 10px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  border: 1px dashed rgba(255, 255, 255, 0.2);
}

/* SERIES FLIP CARD STYLES (existing) */
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

/* Responsive - Updated for 7 columns */
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
  
  /* Race flip card responsive - Hide Finish column, show 6 columns */
  .race-flip-card-container {
    height: 380px;
  }
  
  .race-table-header, .race-table-row {
    grid-template-columns: 40px 1fr 60px 60px 60px 60px;
    gap: 4px;
    font-size: 0.75rem;
  }
  
  .race-finish {
    display: none;
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
  
  /* Mobile - Show only essential columns */
  .race-table-header, .race-table-row {
    grid-template-columns: 30px 1fr 50px 50px;
    gap: 4px;
  }
  
  .race-finish, .race-elapsed, .race-corrected {
    display: none;
  }
}
</style>
