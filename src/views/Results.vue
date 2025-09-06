<template>
  <div class="results-container">
    <!-- Results.vue -->
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
    <div class="debug-panel" style="background: rgba(255,255,255,0.1); padding: 10px; margin: 10px 0; border-radius: 8px; font-family: monospace; font-size: 0.9rem;">
      <strong>DEBUG INFO:</strong><br>
      Event: {{ MAXI_EVENT_ID }}<br>
      Class: {{ MAXI_CLASS_ID }}<br>
      API URL: {{ debugUrl }}<br>
      Status: {{ debugStatus }}
    </div>

    <!-- Main Results Section -->
    <main class="results-main">
      <!-- Latest Race Section -->
      <section class="latest-race-section">
        <h2 class="section-title">LATEST RACE - R4 RESULTS</h2>
        <p class="section-subtitle">HOVER FOR FULL RACE RESULTS</p>
        
        <div class="race-card">
          <div class="race-info">
            <h3>Race R4</h3>
            <span class="race-date">14/09/2024</span>
          </div>
          <div class="race-stats">
            <div class="stat-group">
              <span class="label">Position</span>
              <span class="value position-value">{{ northstarResult?.position || 'Loading...' }}</span>
            </div>
            <div class="stat-group">
              <span class="label">Status</span>
              <span class="value delta-ahead">{{ northstarResult?.r4 || 'Loading...' }}</span>
            </div>
            <div class="stat-group">
              <span class="label">Points</span>
              <span class="value delta-behind">{{ northstarResult?.total || 'Loading...' }}</span>
            </div>
          </div>
        </div>
      </section>

      <!-- Series Results Flip Card -->
      <section class="series-section">
        <h2 class="section-title">SERIES RESULTS OVERALL</h2>
        <p class="section-subtitle">HOVER FOR POINTS BREAKDOWN</p>
        
        <div class="flip-card" @click="flipCardToggle">
          <div class="flip-card-inner" :class="{ 'is-flipped': cardFlipped }">
            <!-- Front of Card -->
            <div class="flip-card-front">
              <div class="card-header">
                <h3>Maxi 2 Class</h3>
                <span class="race-count">4 races</span>
              </div>
              
              <div class="northstar-summary">
                <div v-if="loadingData" class="loading-state">
                  <div class="loading-spinner">Loading NORTHSTAR data...</div>
                </div>
                
                <div v-else-if="errorMessage" class="error-state">
                  <div class="error-message">{{ errorMessage }}</div>
                  <button @click="loadMaxiData" class="retry-button">Retry</button>
                </div>
                
                <div v-else-if="!northstarResult" class="no-data-state">
                  <div class="no-data-message">NORTHSTAR OF LONDON not found</div>
                  <div class="debug-info">
                    <p>Found {{ allResults.length }} boats:</p>
                    <ul>
                      <li v-for="boat in allResults.slice(0, 5)" :key="boat.name">
                        {{ boat.name }}
                      </li>
                    </ul>
                  </div>
                </div>
                
                <div v-else>
                  <div class="position-display">
                    <span class="position-label">Position</span>
                    <span class="position-number">{{ northstarResult.position }}</span>
                  </div>
                  
                  <div class="points-summary">
                    <div class="points-item">
                      <span class="points-label">Total Points</span>
                      <span class="points-value">{{ northstarResult.total || northstarResult.points }}</span>
                    </div>
                    <div class="points-item">
                      <span class="points-label">Yacht</span>
                      <span class="points-value boat-name">{{ northstarResult.name }}</span>
                    </div>
                  </div>
                  
                  <div class="race-scores">
                    <div class="race-score">
                      <span class="race-label">R1</span>
                      <span class="race-value">{{ northstarResult.r1 || '–' }}</span>
                    </div>
                    <div class="race-score">
                      <span class="race-label">R2</span>
                      <span class="race-value">{{ northstarResult.r2 || '–' }}</span>
                    </div>
                    <div class="race-score">
                      <span class="race-label">R3</span>
                      <span class="race-value">{{ northstarResult.r3 || '–' }}</span>
                    </div>
                    <div class="race-score" :class="{ 'retired': northstarResult.r4 === 'RET' }">
                      <span class="race-label">R4</span>
                      <span class="race-value">{{ northstarResult.r4 || '–' }}</span>
                    </div>
                  </div>

                  <div class="boat-details" v-if="northstarResult.skipper || northstarResult.sailNo">
                    <div class="detail-row" v-if="northstarResult.skipper">
                      <span class="detail-label">Owner:</span>
                      <span class="detail-value">{{ northstarResult.skipper }}</span>
                    </div>
                    <div class="detail-row" v-if="northstarResult.sailNo">
                      <span class="detail-label">Sail No:</span>
                      <span class="detail-value">{{ northstarResult.sailNo }}</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <p class="flip-hint">Click card to flip</p>
            </div>

            <!-- Back of Card -->
            <div class="flip-card-back">
              <div class="card-header">
                <h3>Series Standings - Maxi 2</h3>
                <span class="class-name">Provisional Overall</span>
              </div>
              
              <div class="table-container">
                <div v-if="loadingData" class="loading-state">
                  <div class="loading-spinner">Loading series results...</div>
                </div>
                
                <div v-else-if="errorMessage" class="error-state">
                  <div class="error-message">{{ errorMessage }}</div>
                </div>
                
                <div v-else-if="allResults.length === 0" class="no-data-state">
                  <div class="no-data-message">No series results available</div>
                </div>
                
                <table v-else class="results-table">
                  <thead>
                    <tr>
                      <th>Rank</th>
                      <th>Yacht</th>
                      <th>Sail No</th>
                      <th>Owner</th>
                      <th>R1</th>
                      <th>R2</th>
                      <th>R3</th>
                      <th>R4</th>
                      <th>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(boat, index) in allResults" 
                        :key="`boat-${index}`"
                        :class="{ 'highlight-row': findNorthstar(boat.name) }">
                      <td class="position">{{ boat.position }}</td>
                      <td class="yacht-name">{{ boat.name }}</td>
                      <td class="sail-no">{{ boat.sailNo }}</td>
                      <td class="owner">{{ boat.skipper || boat.owner }}</td>
                      <td class="race-score">{{ boat.r1 || '–' }}</td>
                      <td class="race-score">{{ boat.r2 || '–' }}</td>
                      <td class="race-score">{{ boat.r3 || '–' }}</td>
                      <td class="race-score">{{ boat.r4 || '–' }}</td>
                      <td class="total-points">{{ boat.total || boat.points }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Footer -->
      <div class="last-updated">
        <span>Last updated: {{ updateTime }}</span>
        <a href="https://data.orc.org/public/WEV.dll?action=index&eventid=xolfq" target="_blank" class="results-link">Results on Event Website</a>
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

// ===== CRITICAL: FIXED VALUES - NO VARIABLES =====
const MAXI_EVENT_ID = 'xolfq'  // NEVER CHANGE THIS
const MAXI_CLASS_ID = 'M2'     // NEVER CHANGE THIS

// Reactive state with new names
const cardFlipped = ref(false)
const allResults = ref([])
const northstarResult = ref(null)
const loadingData = ref(false)
const errorMessage = ref(null)
const updateTime = ref('17:04')
const debugUrl = ref('')
const debugStatus = ref('Initializing...')

// Helper functions with new names
const flipCardToggle = () => {
  cardFlipped.value = !cardFlipped.value
}

const findNorthstar = (yachtName) => {
  return yachtName && (
    yachtName.toUpperCase().includes('NORTHSTAR') || 
    yachtName.toUpperCase().includes('NORTHSTAR OF LONDON')
  )
}

// API function with explicit URL construction
// API function with explicit URL construction
const fetchMaxiData = async () => {
  try {
    // EXPLICIT URL construction to prevent any variable confusion
    const apiUrl = `/api/results-orc?type=overall&eventId=${MAXI_EVENT_ID}&classId=${MAXI_CLASS_ID}`
    debugUrl.value = apiUrl
    debugStatus.value = 'Fetching...'
    
    console.log('=== MAXI YACHT API CALL ===')
    console.log('Event ID (hardcoded):', MAXI_EVENT_ID)
    console.log('Class ID (hardcoded):', MAXI_CLASS_ID)
    console.log('API URL:', apiUrl)
    console.log('Expected backend URL:', `https://data.orc.org/public/WEV.dll?action=series&eventid=${MAXI_EVENT_ID}&classid=${MAXI_CLASS_ID}`)
    
    const response = await fetch(apiUrl)
    console.log('Response status:', response.status)
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error('API Error:', errorText)
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
    
    const data = await response.json()
    console.log('API Response:', data)
    
    if (!data.success) {
      throw new Error(data.message || 'API returned success: false')
    }
    
    debugStatus.value = `Success - ${data.results?.length || 0} boats found`
    return data.results || []
    
  } catch (err) {
    console.error('API Error:', err)
    debugStatus.value = `Error: ${err.message}`
    throw err
  }
}

// Load data function
const loadMaxiData = async () => {
  loadingData.value = true
  errorMessage.value = null
  
  try {
    console.log('Loading Maxi Yacht data...')
    const results = await fetchMaxiData()
    console.log('Results received:', results)
    
    if (!results || results.length === 0) {
      throw new Error('No results returned from API')
    }
    
    allResults.value = results
    console.log('All results set:', allResults.value)
    
    // Find NORTHSTAR
    const northstar = results.find(boat => findNorthstar(boat.name))
    console.log('NORTHSTAR search result:', northstar)
    console.log('Available boat names:', results.map(b => b.name))
    
    if (northstar) {
      northstarResult.value = northstar
      console.log('NORTHSTAR found:', northstarResult.value)
    } else {
      console.warn('NORTHSTAR OF LONDON not found in results')
    }
    
  } catch (err) {
    console.error('Error loading data:', err)
    errorMessage.value = `Failed to load results: ${err.message}`
  } finally {
    loadingData.value = false
  }
}

// Initialize on mount
onMounted(async () => {
  console.log('=== MAXI YACHT COMPONENT MOUNTED ===')
  console.log('Event ID:', MAXI_EVENT_ID)
  console.log('Class ID:', MAXI_CLASS_ID)
  
  await loadMaxiData()
  
  updateTime.value = new Date().toLocaleTimeString('en-GB', { 
    hour: '2-digit', 
    minute: '2-digit' 
  })
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
  margin-bottom: 40px;
}

.header-content {
  text-align: left;
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

.location, .dates {
  color: #b0c4de;
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

/* Sections */
.results-main {
  max-width: 1400px;
  margin: 0 auto;
}

.section-title {
  font-size: 1.2rem;
  font-weight: 600;
  margin: 0 0 5px 0;
  letter-spacing: 0.5px;
}

.section-subtitle {
  font-size: 0.9rem;
  opacity: 0.7;
  margin: 0 0 20px 0;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

/* Latest Race */
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
  margin-bottom: 20px;
}

.race-info h3 {
  font-size: 1.5rem;
  margin: 0;
}

.race-date {
  background: rgba(255, 255, 255, 0.15);
  padding: 6px 12px;
  border-radius: 12px;
  font-size: 0.9rem;
}

.race-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
}

.stat-group {
  text-align: center;
}

.stat-group .label {
  display: block;
  font-size: 0.9rem;
  opacity: 0.8;
  margin-bottom: 8px;
}

.stat-group .value {
  display: block;
  font-size: 2rem;
  font-weight: 700;
}

.position-value {
  color: #ffd700;
}

.delta-ahead {
  color: #ff6b6b;
}

.delta-behind {
  color: #4ecdc4;
}

/* Flip Card */
.series-section {
  margin-bottom: 40px;
}

.flip-card {
  background: transparent;
  width: 100%;
  height: 500px;
  perspective: 1000px;
  cursor: pointer;
}

.flip-card-inner {
  position: relative;
  width: 100%;
  height: 100%;
  text-align: left;
  transition: transform 0.8s;
  transform-style: preserve-3d;
}

.flip-card-inner.is-flipped {
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
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 20px;
  padding: 30px;
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
  margin-bottom: 25px;
  padding-bottom: 15px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.15);
}

.card-header h3 {
  font-size: 1.4rem;
  margin: 0;
}

.race-count, .class-name {
  background: rgba(255, 255, 255, 0.15);
  padding: 6px 12px;
  border-radius: 12px;
  font-size: 0.9rem;
}

/* NORTHSTAR Summary */
.northstar-summary {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 25px;
}

.position-display {
  text-align: center;
  background: rgba(255, 215, 0, 0.1);
  border: 1px solid rgba(255, 215, 0, 0.3);
  border-radius: 15px;
  padding: 20px;
}

.position-label {
  display: block;
  font-size: 1rem;
  opacity: 0.8;
  margin-bottom: 10px;
}

.position-number {
  display: block;
  font-size: 3rem;
  font-weight: 700;
  color: #ffd700;
}

.points-summary {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 15px;
}

.points-item {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 15px;
  text-align: center;
}

.points-label {
  display: block;
  font-size: 0.9rem;
  opacity: 0.8;
  margin-bottom: 8px;
}

.points-value {
  display: block;
  font-size: 1.8rem;
  font-weight: 600;
  color: #4ecdc4;
}

.boat-name {
  font-size: 1.2rem !important;
  color: #ffd700 !important;
  font-weight: 700 !important;
}

.boat-details {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 15px;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.detail-row:last-child {
  margin-bottom: 0;
}

.detail-label {
  font-size: 0.9rem;
  opacity: 0.8;
}

.detail-value {
  font-weight: 600;
  color: #e0e8ff;
}

.race-scores {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
}

.race-score {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  padding: 12px;
  text-align: center;
}

.race-label {
  display: block;
  font-size: 0.8rem;
  opacity: 0.7;
  margin-bottom: 5px;
}

.race-value {
  display: block;
  font-size: 1.2rem;
  font-weight: 600;
}

.race-score.retired {
  border-color: rgba(255, 107, 107, 0.3);
  background: rgba(255, 107, 107, 0.05);
}

.race-score.retired .race-value {
  color: #ff6b6b;
  font-weight: 700;
}

.flip-hint {
  text-align: center;
  font-size: 0.9rem;
  opacity: 0.6;
  margin-top: auto;
  margin-bottom: 0;
}

/* Table */
.table-container {
  flex: 1;
  overflow-y: auto;
  border-radius: 12px;
  background: rgba(0, 0, 0, 0.1);
}

.results-table {
  width: 100%;
  border-collapse: collapse;
}

.results-table th {
  background: rgba(255, 255, 255, 0.1);
  padding: 12px 10px;
  text-align: left;
  font-weight: 600;
  font-size: 0.9rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  position: sticky;
  top: 0;
}

.results-table td {
  padding: 10px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  font-size: 0.9rem;
}

.results-table tr:hover {
  background: rgba(255, 255, 255, 0.05);
}

.highlight-row {
  background: rgba(255, 215, 0, 0.1) !important;
  border-left: 3px solid #ffd700;
}

.position {
  font-weight: 600;
  color: #ffd700;
}

.yacht-name {
  font-weight: 600;
  max-width: 150px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.total-points {
  font-weight: 600;
  color: #4ecdc4;
}

/* Loading and Error States */
.loading-state, .error-state, .no-data-state {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 200px;
  text-align: center;
}

.loading-spinner {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 10px;
  padding: 20px;
  color: #4ecdc4;
  font-weight: 600;
}

.error-message {
  background: rgba(255, 107, 107, 0.1);
  border: 1px solid rgba(255, 107, 107, 0.3);
  border-radius: 10px;
  padding: 15px;
  margin-bottom: 15px;
  color: #ff6b6b;
}

.retry-button {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 8px;
  padding: 8px 16px;
  color: white;
  cursor: pointer;
  transition: all 0.3s ease;
}

.retry-button:hover {
  background: rgba(255, 255, 255, 0.2);
}

.no-data-message {
  background: rgba(255, 193, 7, 0.1);
  border: 1px solid rgba(255, 193, 7, 0.3);
  border-radius: 10px;
  padding: 15px;
  color: #ffc107;
  margin-bottom: 15px;
}

.debug-info {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  padding: 12px;
  font-size: 0.9rem;
  opacity: 0.8;
}

.debug-info ul {
  list-style: none;
  padding: 0;
  margin: 8px 0 0 0;
}

.debug-info li {
  padding: 2px 0;
  font-size: 0.8rem;
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
  border-color: rgba(78, 205, 196, 0.5);
}

/* Responsive */
@media (max-width: 768px) {
  .results-container {
    padding: 15px;
  }
  
  .regatta-title {
    font-size: 2rem;
  }
  
  .flip-card {
    height: 550px;
  }
  
  .points-summary {
    grid-template-columns: 1fr;
  }
  
  .race-scores {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
