<template>
  <div class="results-container">
    <!-- Header Section -->
    <header class="regatta-header">
      <div class="header-content">
        <h1 class="regatta-title">Giorgio Armani Superyacht Regatta</h1>
        <div class="regatta-meta">
          <span class="location">MOAT • Porto Cervo</span>
          <span class="dates">27/5/2025 - 31/5/2025</span>
          <div class="live-indicator">
            <div class="live-dot"></div>
            <span>Live</span>
          </div>
        </div>
      </div>
    </header>

    <!-- Main Results Section -->
    <main class="results-main">
      <!-- Latest Race Section -->
      <section class="latest-race-section">
        <h2 class="section-title">LATEST RACE - R3 RESULTS</h2>
        <p class="section-subtitle">HOVER FOR FULL RACE RESULTS</p>
        
        <div class="race-card">
          <div class="race-info">
            <h3>Race R3</h3>
            <span class="race-date">Today</span>
          </div>
          <div class="race-stats">
            <div class="stat-group">
              <span class="label">Position</span>
              <span class="value position-value">3rd</span>
            </div>
            <div class="stat-group">
              <span class="label">Delta Ahead</span>
              <span class="value delta-ahead">+0:00:00</span>
            </div>
            <div class="stat-group">
              <span class="label">Delta Behind</span>
              <span class="value delta-behind">+0:00:00</span>
            </div>
          </div>
        </div>
      </section>

      <!-- Series Results Flip Card -->
      <section class="series-section">
        <h2 class="section-title">SERIES RESULTS OVERALL</h2>
        <p class="section-subtitle">HOVER FOR POINTS BREAKDOWN</p>
        
        <div class="flip-card" @click="toggleCard">
          <div class="flip-card-inner" :class="{ 'is-flipped': isFlipped }">
            <!-- Front of Card -->
            <div class="flip-card-front">
              <div class="card-header">
                <h3>Superyacht Class</h3>
                <span class="race-count">3 races</span>
              </div>
              
              <div class="northstar-summary">
                <div class="position-display">
                  <span class="position-label">Position</span>
                  <span class="position-number">{{ northstarData?.position || '2nd' }}</span>
                </div>
                
                <div class="points-summary">
                  <div class="points-item">
                    <span class="points-label">Total Points</span>
                    <span class="points-value">{{ northstarData?.total || '6.0' }}</span>
                  </div>
                  <div class="points-item">
                    <span class="points-label">Net Points</span>
                    <span class="points-value">{{ northstarData?.points || '6.0' }}</span>
                  </div>
                </div>
                
                <div class="race-scores">
                  <div class="race-score" v-if="northstarData?.r1">
                    <span class="race-label">R1</span>
                    <span class="race-value">{{ northstarData.r1 }}</span>
                  </div>
                  <div class="race-score" v-if="northstarData?.r2">
                    <span class="race-label">R2</span>
                    <span class="race-value">{{ northstarData.r2 }}</span>
                  </div>
                  <div class="race-score" v-if="northstarData?.r3">
                    <span class="race-label">R3</span>
                    <span class="race-value">{{ northstarData.r3 }}</span>
                  </div>
                  <div class="race-score" v-if="northstarData?.r4">
                    <span class="race-label">R4</span>
                    <span class="race-value">{{ northstarData.r4 }}</span>
                  </div>
                </div>
              </div>
              
              <p class="flip-hint">Click card to flip</p>
            </div>

            <!-- Back of Card -->
            <div class="flip-card-back">
              <div class="card-header">
                <h3>Series Standings</h3>
                <span class="class-name">Superyacht Class</span>
              </div>
              
              <div class="table-container">
                <table class="results-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Yacht</th>
                      <th>Sail No</th>
                      <th>Owner</th>
                      <th>R1</th>
                      <th>R2</th>
                      <th>R3</th>
                      <th>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(boat, index) in seriesResults" 
                        :key="`boat-${index}`"
                        :class="{ 'highlight-row': isNorthstar(boat.name) }">
                      <td class="position">{{ boat.position }}</td>
                      <td class="yacht-name">{{ boat.name }}</td>
                      <td class="sail-no">{{ boat.sailNo }}</td>
                      <td class="owner">{{ boat.skipper || boat.owner }}</td>
                      <td class="race-score">{{ boat.r1 || '–' }}</td>
                      <td class="race-score">{{ boat.r2 || '–' }}</td>
                      <td class="race-score">{{ boat.r3 || '–' }}</td>
                      <td class="total-points">{{ boat.total || boat.points }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Race Details Section -->
      <section class="race-details-section">
        <h2 class="section-title">RACE RESULT DETAILS</h2>
        <p class="section-subtitle">HOVER TO VIEW FULL RESULTS</p>
        
        <div class="race-details-grid">
          <div class="race-detail-card">
            <div class="race-header">
              <h4>Race R1</h4>
              <span class="race-status">2nd</span>
            </div>
            <div class="finish-details">
              <div class="finish-item">
                <span class="label">Finish:</span>
                <span class="value">13:58:42</span>
              </div>
              <div class="finish-item">
                <span class="label">No gap data</span>
                <span class="value"></span>
              </div>
            </div>
          </div>

          <div class="race-detail-card">
            <div class="race-header">
              <h4>Race R2</h4>
              <span class="race-status">1st</span>
            </div>
            <div class="finish-details">
              <div class="finish-item">
                <span class="label">Finish:</span>
                <span class="value">15:02:18</span>
              </div>
              <div class="finish-item">
                <span class="label">No gap data</span>
                <span class="value"></span>
              </div>
            </div>
          </div>

          <div class="race-detail-card highlight-card">
            <div class="race-header">
              <h4>Race R3</h4>
              <span class="race-status">3rd</span>
            </div>
            <div class="finish-details">
              <div class="finish-item">
                <span class="label">Finish:</span>
                <span class="value">14:45:33</span>
              </div>
              <div class="finish-item">
                <span class="label">Gap:</span>
                <span class="value">-0:05:45 behind</span>
              </div>
            </div>
          </div>

          <div class="race-detail-card upcoming">
            <div class="race-header">
              <h4>Race R4</h4>
              <span class="race-status">–</span>
            </div>
            <div class="finish-details">
              <div class="finish-item">
                <span class="label">Tomorrow</span>
                <span class="value">09:15</span>
              </div>
            </div>
          </div>

          <div class="race-detail-card upcoming">
            <div class="race-header">
              <h4>Race R5</h4>
              <span class="race-status">–</span>
            </div>
            <div class="finish-details">
              <div class="finish-item">
                <span class="label">Scheduled</span>
                <span class="value">TBD</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Footer -->
      <div class="last-updated">
        <span>Last updated: {{ lastUpdateTime || '07:57' }}</span>
        <a href="#" class="results-link">Results on Event Website</a>
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'

// Reactive data
const isFlipped = ref(false)
const seriesResults = ref([])
const raceResults = ref([])
const northstarData = ref(null)
const lastUpdateTime = ref('07:57')
const loading = ref(false)
const error = ref(null)

// Configuration
const eventId = 'xolfq'
const classId = 'Superyacht'

// Helper functions
const toggleCard = () => {
  isFlipped.value = !isFlipped.value
}

const isNorthstar = (yachtName) => {
  return yachtName && yachtName.toUpperCase().includes('NORTHSTAR')
}

// API function
const fetchResults = async (type, additionalParams = {}) => {
  try {
    const params = new URLSearchParams({
      type,
      eventId,
      classId,
      ...additionalParams
    })
    
    const response = await fetch(`/api/results-orc?${params}`)
    const data = await response.json()
    
    if (!data.success) {
      throw new Error(data.message || 'Failed to fetch results')
    }
    
    return data.results || []
  } catch (err) {
    console.error(`Error fetching ${type} results:`, err)
    error.value = err.message
    return []
  }
}

// Load series results
const loadSeriesResults = async () => {
  loading.value = true
  try {
    const results = await fetchResults('overall')
    seriesResults.value = results
    
    const northstar = results.find(boat => isNorthstar(boat.name))
    if (northstar) {
      northstarData.value = northstar
    }
  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}

// Load race results
const loadRaceResults = async (raceId) => {
  try {
    const results = await fetchResults('race', { raceId })
    return results
  } catch (err) {
    console.error(`Error loading race ${raceId}:`, err)
    return []
  }
}

// Initialize
onMounted(async () => {
  await loadSeriesResults()
  
  lastUpdateTime.value = new Date().toLocaleTimeString('en-GB', { 
    hour: '2-digit', 
    minute: '2-digit' 
  })
})

// Static fallback data for testing
if (seriesResults.value.length === 0) {
  seriesResults.value = [
    {
      position: '1',
      name: 'Example Yacht 1',
      sailNo: 'EX1',
      skipper: 'Captain Example',
      r1: '1',
      r2: '2', 
      r3: '1',
      total: '4.0'
    },
    {
      position: '2',
      name: 'NORTHSTAR',
      sailNo: 'NS1',
      skipper: 'NORTHSTAR Owner',
      r1: '2',
      r2: '1',
      r3: '3', 
      total: '6.0'
    }
  ]
  
  northstarData.value = seriesResults.value.find(boat => isNorthstar(boat.name))
}
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
  height: 400px;
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

/* Race Details */
.race-details-section {
  margin-bottom: 40px;
}

.race-details-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 20px;
}

.race-detail-card {
  background: rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(15px);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 15px;
  padding: 20px;
  transition: all 0.3s ease;
}

.race-detail-card:hover {
  background: rgba(255, 255, 255, 0.12);
  transform: translateY(-2px);
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
}

.race-detail-card.highlight-card {
  border: 1px solid rgba(255, 215, 0, 0.4);
  background: rgba(255, 215, 0, 0.05);
}

.race-detail-card.upcoming {
  opacity: 0.7;
  border-style: dashed;
}

.race-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.race-header h4 {
  margin: 0;
  font-size: 1.1rem;
}

.race-status {
  background: rgba(255, 255, 255, 0.15);
  padding: 4px 10px;
  border-radius: 10px;
  font-size: 0.9rem;
  font-weight: 600;
}

.finish-details {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.finish-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.finish-item .label {
  opacity: 0.8;
  font-size: 0.9rem;
}

.finish-item .value {
  font-weight: 600;
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
@media (max-width: 1024px) {
  .race-stats {
    grid-template-columns: 1fr;
    gap: 15px;
  }
  
  .race-details-grid {
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  }
}

@media (max-width: 768px) {
  .results-container {
    padding: 15px;
  }
  
  .regatta-title {
    font-size: 2rem;
  }
  
  .regatta-meta {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }
  
  .flip-card {
    height: 450px;
  }
  
  .points-summary {
    grid-template-columns: 1fr;
  }
  
  .race-scores {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .last-updated {
    flex-direction: column;
    gap: 15px;
    text-align: center;
  }
}
</style>
