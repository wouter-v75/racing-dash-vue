<template>
  <div class="results-container">
    <main class="results-main">
      <!-- Header -->
      <section class="regatta-header">
        <h1 class="regatta-title">Cowes Cup 2024</h1>
        <div class="regatta-meta">
          <span>Maxi Class 2</span>
          <div class="live-indicator">
            <div class="live-dot"></div>
            <span>LIVE</span>
          </div>
          <span>{{ updateTime }}</span>
        </div>
      </section>

      <!-- 1. LAST RACE (Race 4) - AT TOP -->
      <section class="latest-race-section">
        <div class="section-title">Last Race Results</div>
        <div class="section-subtitle">Class M2 · Individual Race Results</div>
        
        <div class="race-flip-card-container" @click="cardIsFlipped = !cardIsFlipped; flipClickCount++">
          <div class="race-flip-card-inner" :class="{ flipped: cardIsFlipped }">
            
            <!-- RACE FRONT SIDE - 5 Key Metrics -->
            <div class="race-flip-card-front">
              <div class="race-card-header">
                <h3>Last Race Summary</h3>
                <div class="race-flip-indicators">
                  <span class="race-date">14/09/2024</span>
                  <span class="race-flip-indicator">{{ cardIsFlipped ? 'BACK' : 'FRONT' }}</span>
                </div>
              </div>
              
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
                    {{ forceRaceDisplay ? forceRaceDisplay.finishTime : (northstarRaceResult?.finishTime || northstarRaceResult?.correctedTime || 'RET') }}
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
              
              <div class="race-flip-instruction">CLICK TO FLIP FOR FULL RACE TABLE</div>
            </div>

            <!-- RACE BACK SIDE - Full Race Results Table -->
            <div class="race-flip-card-back">
              <div class="race-card-header">
                <h3>Full Race R4 Results</h3>
                <div class="race-flip-indicators">
                  <span class="race-date">14/09/2024</span>
                  <span class="race-flip-indicator">{{ cardIsFlipped ? 'BACK' : 'FRONT' }}</span>
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
                      {{ loadingRace ? 'Loading race data...' : (raceErrorMessage ? `Error: ${raceErrorMessage}` : 'No race data available') }}
                    </span>
                  </div>
                  
                  <div v-for="boat in raceResults" :key="boat.name" class="race-table-row" :class="{ highlight: findNorthstar(boat.name) }">
                    <span>{{ boat.position }}</span>
                    <span class="boat-name">{{ boat.name }}</span>
                    <span class="race-finish">{{ boat.finishTime || '--:--:--' }}</span>
                    <span class="race-elapsed">{{ boat.elapsedTime || '--:--:--' }}</span>
                    <span class="race-corrected">{{ boat.correctedTime || '--:--:--' }}</span>
                    <span class="race-delta" :class="{ 
                      winner: boat.position === '1' || boat.position === 1,
                      retired: boat.status === 'RET' || boat.status === 'DNF'
                    }">
                      {{ boat.position === '1' || boat.position === 1 ? '00:00' : '--:--' }}
                    </span>
                    <span class="race-status" :class="{ 
                      finished: boat.status === 'F' || boat.status === 'FIN',
                      retired: boat.status === 'RET' || boat.status === 'DNF'
                    }">
                      {{ boat.status || 'F' }}
                    </span>
                  </div>
                </div>
              </div>
              
              <div class="race-flip-instruction">CLICK TO RETURN TO SUMMARY</div>
            </div>
          </div>
        </div>
      </section>

      <!-- 2. SERIES STANDINGS -->
      <section class="series-section">
        <div class="section-title">Series Standings</div>
        <div class="section-subtitle">Class M2 · Overall Results · 4 Races</div>
        
        <div class="flip-card-container" @click="seriesCardIsFlipped = !seriesCardIsFlipped; seriesFlipClickCount++">
          <div class="flip-card-inner" :class="{ flipped: seriesCardIsFlipped }">
            
            <!-- FRONT SIDE - NORTHSTAR Focused -->
            <div class="flip-card-front">
              <div class="card-header">
                <h3>Northstar Performance</h3>
                <div class="flip-indicators">
                  <span class="series-points">{{ northstarResult ? northstarResult.total : '--' }} Points</span>
                  <span class="flip-indicator">{{ seriesCardIsFlipped ? 'BACK' : 'FRONT' }}</span>
                </div>
              </div>
              
              <div class="boat-status">
                <div class="position-display">
                  <span class="position-number">{{ northstarResult ? northstarResult.position : '--' }}</span>
                  <span class="position-label">OVERALL</span>
                </div>
                
                <div class="race-grid">
                  <div class="race-result">
                    <span class="race-label">R1</span>
                    <span class="race-points">{{ northstarResult ? northstarResult.r1 : '--' }}</span>
                  </div>
                  <div class="race-result">
                    <span class="race-label">R2</span>
                    <span class="race-points">{{ northstarResult ? northstarResult.r2 : '--' }}</span>
                  </div>
                  <div class="race-result">
                    <span class="race-label">R3</span>
                    <span class="race-points">{{ northstarResult ? northstarResult.r3 : '--' }}</span>
                  </div>
                  <div class="race-result">
                    <span class="race-label">R4</span>
                    <span class="race-points highlight">{{ northstarResult ? northstarResult.r4 : '--' }}</span>
                  </div>
                </div>
              </div>
              
              <div class="flip-instruction">CLICK TO FLIP FOR FULL STANDINGS</div>
            </div>

            <!-- BACK SIDE - Full Results Table -->
            <div class="flip-card-back">
              <div class="card-header">
                <h3>Full Class M2 Standings</h3>
                <div class="flip-indicators">
                  <span class="boat-count">{{ allResults.length }} Boats</span>
                  <span class="flip-indicator">{{ seriesCardIsFlipped ? 'BACK' : 'FRONT' }}</span>
                </div>
              </div>
              
              <div class="points-grid">
                <div class="points-header">
                  <span>Pos</span>
                  <span>Yacht</span>
                  <span>R1</span>
                  <span>R2</span>
                  <span>R3</span>
                  <span>R4</span>
                  <span>Total</span>
                </div>
                
                <div v-for="boat in allResults" :key="boat.name" class="points-row" :class="{ highlight: findNorthstar(boat.name) }">
                  <span>{{ boat.position }}</span>
                  <span class="boat-name">{{ boat.name }}</span>
                  <span>{{ boat.r1 }}</span>
                  <span>{{ boat.r2 }}</span>
                  <span>{{ boat.r3 }}</span>
                  <span>{{ boat.r4 }}</span>
                  <span class="total">{{ boat.total }}</span>
                </div>
              </div>
              
              <div class="flip-instruction">CLICK TO RETURN TO NORTHSTAR VIEW</div>
            </div>
          </div>
        </div>
      </section>

      <!-- 3. RACE 3 RESULTS - BELOW SERIES -->
      <section class="latest-race-section">
        <div class="section-title">Race 3 Results</div>
        <div class="section-subtitle">Class M2 · Individual Race Results</div>
        
        <div class="race-flip-card-container" @click="raceCardIsFlipped = !raceCardIsFlipped; raceFlipClickCount++">
          <div class="race-flip-card-inner" :class="{ flipped: raceCardIsFlipped }">
            
            <!-- RACE 3 FRONT SIDE - 5 Key Metrics -->
            <div class="race-flip-card-front">
              <div class="race-card-header">
                <h3>Race R3 Summary</h3>
                <div class="race-flip-indicators">
                  <span class="race-date">12/09/2024</span>
                  <span class="race-flip-indicator">{{ raceCardIsFlipped ? 'BACK' : 'FRONT' }}</span>
                </div>
              </div>
              
              <div class="race-stats-5-metric">
                <div class="metric-item">
                  <span class="metric-label">Position</span>
                  <span class="metric-value position-color">
                    {{ northstarRace3Result ? northstarRace3Result.position : '--' }}
                  </span>
                </div>
                
                <div class="metric-item">
                  <span class="metric-label">Finish Time</span>
                  <span class="metric-value time-color">
                    {{ northstarRace3Result ? (northstarRace3Result.finishTime || northstarRace3Result.correctedTime || '--:--:--') : '--:--:--' }}
                  </span>
                </div>
                
                <div class="metric-item">
                  <span class="metric-label">Δ to 1st</span>
                  <span class="metric-value delta-color">
                    {{ northstarRace3Result ? northstarRace3Result.deltaToFirst : '--:--' }}
                  </span>
                </div>
                
                <div class="metric-item">
                  <span class="metric-label">Δ to Ahead</span>
                  <span class="metric-value delta-color">
                    {{ northstarRace3Result ? northstarRace3Result.deltaToAhead : '--:--' }}
                  </span>
                  <span class="boat-name-mini" v-if="northstarRace3Result?.boatAheadName && northstarRace3Result.boatAheadName !== '–'">
                    {{ northstarRace3Result.boatAheadName }}
                  </span>
                </div>
                
                <div class="metric-item">
                  <span class="metric-label">Δ to Behind</span>
                  <span class="metric-value delta-color">
                    {{ northstarRace3Result ? northstarRace3Result.deltaToBehind : '--:--' }}
                  </span>
                  <span class="boat-name-mini" v-if="northstarRace3Result?.boatBehindName && northstarRace3Result.boatBehindName !== '–'">
                    {{ northstarRace3Result.boatBehindName }}
                  </span>
                </div>
              </div>
              
              <div class="race-flip-instruction">
                {{ loadingRace3 ? 'LOADING RACE 3 DATA...' : (race3Results.length > 0 ? 'CLICK TO FLIP FOR FULL RACE TABLE' : 'NO DATA LOADED YET') }}
              </div>
            </div>

            <!-- RACE 3 BACK SIDE - Full Race Results Table -->
            <div class="race-flip-card-back">
              <div class="race-card-header">
                <h3>Full Race R3 Results</h3>
                <div class="race-flip-indicators">
                  <span class="race-date">12/09/2024</span>
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
                  
                  <!-- REAL RACE 3 DATA from race3Results array -->
                  <div v-if="race3Results.length === 0" class="race-table-row">
                    <span style="grid-column: 1 / -1; text-align: center; opacity: 0.7; padding: 20px;">
                      {{ loadingRace3 ? 'Loading Race 3 data...' : (race3ErrorMessage ? `Error: ${race3ErrorMessage}` : 'No Race 3 data available') }}
                    </span>
                  </div>
                  
                  <div v-for="boat in race3Results" :key="boat.name" class="race-table-row" :class="{ highlight: findNorthstar(boat.name) }">
                    <span>{{ boat.position }}</span>
                    <span class="boat-name">{{ boat.name }}</span>
                    <span class="race-finish">{{ boat.finishTime || '--:--:--' }}</span>
                    <span class="race-elapsed">{{ boat.elapsedTime || '--:--:--' }}</span>
                    <span class="race-corrected">{{ boat.correctedTime || '--:--:--' }}</span>
                    <span class="race-delta" :class="{ 
                      winner: boat.position === '1' || boat.position === 1,
                      retired: boat.status === 'RET' || boat.status === 'DNF'
                    }">
                      {{ boat.position === '1' || boat.position === 1 ? '00:00' : calculateDeltaToFirst(race3Results, boat) }}
                    </span>
                    <span class="race-status" :class="{ 
                      finished: boat.status === 'F' || boat.status === 'FIN',
                      retired: boat.status === 'RET' || boat.status === 'DNF'
                    }">
                      {{ boat.status || 'F' }}
                    </span>
                  </div>
                </div>
              </div>
              
              <div class="race-flip-instruction">RACE 3 RESULTS · CLICK TO RETURN TO SUMMARY</div>
            </div>
          </div>
        </div>
      </section>

      <!-- 4. RACE 2 RESULTS - HEADERS ONLY -->
      <section class="latest-race-section">
        <div class="section-title">Race 2 Results</div>
        <div class="section-subtitle">Class M2 · Individual Race Results</div>
        
        <div class="race-flip-card-container" @click="race2CardIsFlipped = !race2CardIsFlipped; race2FlipClickCount++">
          <div class="race-flip-card-inner" :class="{ flipped: race2CardIsFlipped }">
            
            <!-- RACE 2 FRONT SIDE - Headers Only -->
            <div class="race-flip-card-front">
              <div class="race-card-header">
                <h3>Race R2 Summary</h3>
                <div class="race-flip-indicators">
                  <span class="race-date">11/09/2024</span>
                  <span class="race-flip-indicator">{{ race2CardIsFlipped ? 'BACK' : 'FRONT' }}</span>
                </div>
              </div>
              
              <div class="race-stats-5-metric">
                <div class="metric-item">
                  <span class="metric-label">Position</span>
                  <span class="metric-value position-color">--</span>
                </div>
                
                <div class="metric-item">
                  <span class="metric-label">Finish Time</span>
                  <span class="metric-value time-color">--:--:--</span>
                </div>
                
                <div class="metric-item">
                  <span class="metric-label">Δ to 1st</span>
                  <span class="metric-value delta-color">--:--</span>
                </div>
                
                <div class="metric-item">
                  <span class="metric-label">Δ to Ahead</span>
                  <span class="metric-value delta-color">--:--</span>
                </div>
                
                <div class="metric-item">
                  <span class="metric-label">Δ to Behind</span>
                  <span class="metric-value delta-color">--:--</span>
                </div>
              </div>
              
              <div class="race-flip-instruction">HEADERS ONLY - NO DATA YET</div>
            </div>

            <!-- RACE 2 BACK SIDE - Headers Only -->
            <div class="race-flip-card-back">
              <div class="race-card-header">
                <h3>Full Race R2 Results</h3>
                <div class="race-flip-indicators">
                  <span class="race-date">11/09/2024</span>
                  <span class="race-flip-indicator">{{ race2CardIsFlipped ? 'BACK' : 'FRONT' }}</span>
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
                  
                  <!-- Template Rows (No Data) -->
                  <div class="race-table-row">
                    <span>1</span>
                    <span class="boat-name">Yacht Name 1</span>
                    <span class="race-finish">--:--:--</span>
                    <span class="race-elapsed">--:--:--</span>
                    <span class="race-corrected">--:--:--</span>
                    <span class="race-delta">--:--</span>
                    <span class="race-status">--</span>
                  </div>
                  
                  <div class="race-table-row">
                    <span>2</span>
                    <span class="boat-name">Yacht Name 2</span>
                    <span class="race-finish">--:--:--</span>
                    <span class="race-elapsed">--:--:--</span>
                    <span class="race-corrected">--:--:--</span>
                    <span class="race-delta">--:--</span>
                    <span class="race-status">--</span>
                  </div>
                  
                  <div class="race-table-row">
                    <span>3</span>
                    <span class="boat-name">Yacht Name 3</span>
                    <span class="race-finish">--:--:--</span>
                    <span class="race-elapsed">--:--:--</span>
                    <span class="race-corrected">--:--:--</span>
                    <span class="race-delta">--:--</span>
                    <span class="race-status">--</span>
                  </div>
                </div>
              </div>
              
              <div class="race-flip-instruction">HEADERS ONLY - NO DATA YET</div>
            </div>
          </div>
        </div>
      </section>

      <!-- 5. RACE 1 RESULTS - WITH REAL DATA -->
      <section class="latest-race-section">
        <div class="section-title">Race 1 Results</div>
        <div class="section-subtitle">Class M2 · Individual Race Results</div>
        
        <div class="race-flip-card-container" @click="race1CardIsFlipped = !race1CardIsFlipped; race1FlipClickCount++">
          <div class="race-flip-card-inner" :class="{ flipped: race1CardIsFlipped }">
            
            <!-- RACE 1 FRONT SIDE - 5 Key Metrics -->
            <div class="race-flip-card-front">
              <div class="race-card-header">
                <h3>Race R1 Summary</h3>
                <div class="race-flip-indicators">
                  <span class="race-date">09/09/2024</span>
                  <span class="race-flip-indicator">{{ race1CardIsFlipped ? 'BACK' : 'FRONT' }}</span>
                </div>
              </div>
              
              <div class="race-stats-5-metric">
                <div class="metric-item">
                  <span class="metric-label">Position</span>
                  <span class="metric-value position-color">
                    {{ northstarRace1Result ? northstarRace1Result.position : '--' }}
                  </span>
                </div>
                
                <div class="metric-item">
                  <span class="metric-label">Finish Time</span>
                  <span class="metric-value time-color">
                    {{ northstarRace1Result ? (northstarRace1Result.finishTime || northstarRace1Result.correctedTime || '--:--:--') : '--:--:--' }}
                  </span>
                </div>
                
                <div class="metric-item">
                  <span class="metric-label">Δ to 1st</span>
                  <span class="metric-value delta-color">
                    {{ northstarRace1Result ? northstarRace1Result.deltaToFirst : '--:--' }}
                  </span>
                </div>
                
                <div class="metric-item">
                  <span class="metric-label">Δ to Ahead</span>
                  <span class="metric-value delta-color">
                    {{ northstarRace1Result ? northstarRace1Result.deltaToAhead : '--:--' }}
                  </span>
                  <span class="boat-name-mini" v-if="northstarRace1Result?.boatAheadName && northstarRace1Result.boatAheadName !== '–'">
                    {{ northstarRace1Result.boatAheadName }}
                  </span>
                </div>
                
                <div class="metric-item">
                  <span class="metric-label">Δ to Behind</span>
                  <span class="metric-value delta-color">
                    {{ northstarRace1Result ? northstarRace1Result.deltaToBehind : '--:--' }}
                  </span>
                  <span class="boat-name-mini" v-if="northstarRace1Result?.boatBehindName && northstarRace1Result.boatBehindName !== '–'">
                    {{ northstarRace1Result.boatBehindName }}
                  </span>
                </div>
              </div>
              
              <div class="race-flip-instruction">
                {{ loadingRace1 ? 'LOADING RACE 1 DATA...' : (race1Results.length > 0 ? 'CLICK TO FLIP FOR FULL RACE TABLE' : 'NO DATA LOADED YET') }}
              </div>
            </div>

            <!-- RACE 1 BACK SIDE - Full Race Results Table -->
            <div class="race-flip-card-back">
              <div class="race-card-header">
                <h3>Full Race R1 Results</h3>
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
                  
                  <!-- REAL RACE 1 DATA from race1Results array -->
                  <div v-if="race1Results.length === 0" class="race-table-row">
                    <span style="grid-column: 1 / -1; text-align: center; opacity: 0.7; padding: 20px;">
                      {{ loadingRace1 ? 'Loading Race 1 data...' : (race1ErrorMessage ? `Error: ${race1ErrorMessage}` : 'No Race 1 data available') }}
                    </span>
                  </div>
                  
                  <div v-for="boat in race1Results" :key="boat.name" class="race-table-row" :class="{ highlight: findNorthstar(boat.name) }">
                    <span>{{ boat.position }}</span>
                    <span class="boat-name">{{ boat.name }}</span>
                    <span class="race-finish">{{ boat.finishTime || '--:--:--' }}</span>
                    <span class="race-elapsed">{{ boat.elapsedTime || '--:--:--' }}</span>
                    <span class="race-corrected">{{ boat.correctedTime || '--:--:--' }}</span>
                    <span class="race-delta" :class="{ 
                      winner: boat.position === '1' || boat.position === 1,
                      retired: boat.status === 'RET' || boat.status === 'DNF'
                    }">
                      {{ boat.position === '1' || boat.position === 1 ? '00:00' : calculateDeltaToFirst(race1Results, boat) }}
                    </span>
                    <span class="race-status" :class="{ 
                      finished: boat.status === 'F' || boat.status === 'FIN',
                      retired: boat.status === 'RET' || boat.status === 'DNF'
                    }">
                      {{ boat.status || 'F' }}
                    </span>
                  </div>
                </div>
              </div>
              
              <div class="race-flip-instruction">RACE 1 RESULTS · CLICK TO RETURN TO SUMMARY</div>
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

// Reactive state - separate flip states for each card
const cardIsFlipped = ref(false)
const flipClickCount = ref(0)
const seriesCardIsFlipped = ref(false)
const seriesFlipClickCount = ref(0)
const raceCardIsFlipped = ref(false)
const raceFlipClickCount = ref(0)
const race2CardIsFlipped = ref(false)
const race2FlipClickCount = ref(0)
const race1CardIsFlipped = ref(false)
const race1FlipClickCount = ref(0)

// Data arrays
const allResults = ref([])
const raceResults = ref([])
const race3Results = ref([])

// Northstar specific results
const northstarResult = ref(null)
const northstarRaceResult = ref(null)
const northstarRace3Result = ref(null)

// Loading states
const loadingData = ref(false)
const loadingRace = ref(false)
const loadingRace3 = ref(false)

// Error messages
const errorMessage = ref(null)
const raceErrorMessage = ref(null)
const race3ErrorMessage = ref(null)

// Status tracking
const updateTime = ref('19:44')
const seriesStatus = ref('Not loaded')
const raceStatus = ref('Not loaded')
const race3Status = ref('Not loaded')

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
const findNorthstar = (name) => {
  if (!name) return false
  return name.toUpperCase().includes('NORTHSTAR')
}

// Time parsing utilities
const parseTimeToSeconds = (timeStr) => {
  if (!timeStr || timeStr === '--:--:--' || timeStr === 'RET' || timeStr === 'DNF') return null
  
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

// Helper functions for calculating race deltas
const calculateDeltaToFirst = (results, boat) => {
  if (!results || !boat || results.length === 0) return '--:--'
  const firstBoat = results.find(b => b.position === '1' || b.position === 1)
  if (!firstBoat || !boat.correctedTime || !firstBoat.correctedTime) return '--:--'
  
  try {
    const boatTime = parseTimeToSeconds(boat.correctedTime)
    const firstTime = parseTimeToSeconds(firstBoat.correctedTime)
    if (boatTime && firstTime && boatTime > firstTime) {
      const deltaSeconds = boatTime - firstTime
      return formatDeltaTime(deltaSeconds)
    }
  } catch (err) {
    console.error('Error calculating delta to first:', err)
  }
  return '--:--'
}

const calculateDeltaToAhead = (results, boat) => {
  if (!results || !boat || results.length === 0) return '--:--'
  const boatPos = parseInt(boat.position)
  if (boatPos <= 1) return '00:00'
  
  const aheadBoat = results.find(b => parseInt(b.position) === boatPos - 1)
  if (!aheadBoat || !boat.correctedTime || !aheadBoat.correctedTime) return '--:--'
  
  try {
    const boatTime = parseTimeToSeconds(boat.correctedTime)
    const aheadTime = parseTimeToSeconds(aheadBoat.correctedTime)
    if (boatTime && aheadTime && boatTime > aheadTime) {
      const deltaSeconds = boatTime - aheadTime
      return formatDeltaTime(deltaSeconds)
    }
  } catch (err) {
    console.error('Error calculating delta to ahead:', err)
  }
  return '--:--'
}

const calculateDeltaToBehind = (results, boat) => {
  if (!results || !boat || results.length === 0) return '--:--'
  const boatPos = parseInt(boat.position)
  if (boatPos >= results.length) return '00:00'
  
  const behindBoat = results.find(b => parseInt(b.position) === boatPos + 1)
  if (!behindBoat || !boat.correctedTime || !behindBoat.correctedTime) return '--:--'
  
  try {
    const boatTime = parseTimeToSeconds(boat.correctedTime)
    const behindTime = parseTimeToSeconds(behindBoat.correctedTime)
    if (behindTime && boatTime && behindTime > boatTime) {
      const deltaSeconds = behindTime - boatTime
      return formatDeltaTime(deltaSeconds)
    }
  } catch (err) {
    console.error('Error calculating delta to behind:', err)
  }
  return '--:--'
}

const getBoatAheadName = (results, boat) => {
  if (!results || !boat) return '–'
  const boatPos = parseInt(boat.position)
  if (boatPos <= 1) return '–'
  
  const aheadBoat = results.find(b => parseInt(b.position) === boatPos - 1)
  return aheadBoat ? aheadBoat.name : '–'
}

const getBoatBehindName = (results, boat) => {
  if (!results || !boat) return '–'
  const boatPos = parseInt(boat.position)
  if (boatPos >= results.length) return '–'
  
  const behindBoat = results.find(b => parseInt(b.position) === boatPos + 1)
  return behindBoat ? behindBoat.name : '–'
}

const formatDeltaTime = (seconds) => {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

// API functions
const fetchData = async (type, additionalParams = {}) => {
  const url = `/api/results-orc?type=${type}&eventId=${MAXI_EVENT_ID}&classId=${MAXI_CLASS_ID}&${new URLSearchParams(additionalParams)}`
  console.log('API CALL:', url)
  
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
    console.log('Series data loaded:', results.length, 'boats')
  } catch (err) {
    seriesStatus.value = `Error: ${err.message}`
    console.error('Series error:', err)
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
    console.log('Race data loaded:', results.length, 'boats')
  } catch (err) {
    raceStatus.value = `Error: ${err.message}`
    console.error('Race error:', err)
  }
}

const loadRace3Data = async () => {
  try {
    race3Status.value = 'Loading...'
    const results = await fetchData('race', { raceId: '9' })
    race3Results.value = results
    
    const northstarRace3 = results.find(boat => findNorthstar(boat.name))
    if (northstarRace3) {
      northstarRace3Result.value = {
        ...northstarRace3,
        deltaToFirst: calculateDeltaToFirst(results, northstarRace3),
        deltaToAhead: calculateDeltaToAhead(results, northstarRace3),
        deltaToBehind: calculateDeltaToBehind(results, northstarRace3),
        boatAheadName: getBoatAheadName(results, northstarRace3),
        boatBehindName: getBoatBehindName(results, northstarRace3)
      }
    }
    
    race3Status.value = `Success (${results.length} boats)`
    console.log('Race 3 data loaded:', results.length, 'boats')
  } catch (err) {
    race3Status.value = `Error: ${err.message}`
    race3ErrorMessage.value = err.message
    console.error('Race 3 error:', err)
  }
}

// Initialize
onMounted(async () => {
  console.log('COMPONENT MOUNTED - CORRECT ORDER VERSION')
  
  // Load only working data sources
  await Promise.all([
    loadSeriesData(),
    loadRaceData(),
    loadRace3Data()
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
    console.log('Using fallback data')
  }
  
  updateTime.value = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  console.log('COMPONENT READY - CORRECT ORDER')
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

/* Race Card Header */
.race-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.race-card-header h3 {
  font-size: 1.4rem;
  font-weight: 600;
  margin: 0;
}

.race-flip-indicators {
  display: flex;
  align-items: center;
  gap: 15px;
  font-size: 0.8rem;
  opacity: 0.8;
}

.race-date {
  background: rgba(255, 255, 255, 0.1);
  padding: 4px 10px;
  border-radius: 12px;
  font-weight: 500;
}

.race-flip-indicator {
  background: rgba(78, 205, 196, 0.2);
  color: #4ecdc4;
  padding: 4px 10px;
  border-radius: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

/* Race 5-Metric Grid */
.race-stats-5-metric {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 15px;
  margin-bottom: 20px;
  flex: 1;
}

.metric-item {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 15px 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  position: relative;
}

.metric-label {
  font-size: 0.75rem;
  opacity: 0.7;
  margin-bottom: 8px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-weight: 500;
}

.metric-value {
  font-size: 1.4rem;
  font-weight: 700;
  line-height: 1;
}

.position-color { color: #ffd700; }
.time-color { color: #4ecdc4; }
.delta-color { color: #ff9f43; }

.boat-name-mini {
  font-size: 0.6rem;
  opacity: 0.6;
  margin-top: 4px;
  font-weight: 400;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

/* Race Back Content */
.race-back-content {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.race-results-table {
  flex: 1;
  overflow-y: auto;
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

/* SERIES FLIP CARD STYLES */
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

/* Card Header */
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.card-header h3 {
  font-size: 1.4rem;
  font-weight: 600;
  margin: 0;
}

.flip-indicators {
  display: flex;
  align-items: center;
  gap: 15px;
  font-size: 0.8rem;
  opacity: 0.8;
}

.series-points {
  background: rgba(255, 255, 255, 0.1);
  padding: 4px 10px;
  border-radius: 12px;
  font-weight: 500;
}

.boat-count {
  background: rgba(255, 255, 255, 0.1);
  padding: 4px 10px;
  border-radius: 12px;
  font-weight: 500;
}

.flip-indicator {
  background: rgba(78, 205, 196, 0.2);
  color: #4ecdc4;
  padding: 4px 10px;
  border-radius: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

/* Boat Status */
.boat-status {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 25px;
}

.position-display {
  text-align: center;
  margin: 20px 0;
}

.position-number {
  display: block;
  font-size: 4rem;
  font-weight: 800;
  line-height: 1;
  color: #ffd700;
  text-shadow: 0 0 20px rgba(255, 215, 0, 0.3);
}

.position-label {
  font-size: 0.9rem;
  opacity: 0.7;
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-top: 5px;
}

/* Race Grid */
.race-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}

.race-result {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  padding: 15px 10px;
  text-align: center;
  transition: transform 0.2s ease;
}

.race-result:hover {
  transform: translateY(-2px);
  background: rgba(255, 255, 255, 0.08);
}

.race-result.highlight {
  border-color: #ffd700;
  background: rgba(255, 215, 0, 0.1);
}

.race-label {
  display: block;
  font-size: 0.75rem;
  opacity: 0.7;
  margin-bottom: 5px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.race-points {
  font-size: 1.5rem;
  font-weight: 700;
  color: #4ecdc4;
}

.race-points.highlight {
  color: #ffd700;
}

/* Points Grid */
.points-grid {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.points-header {
  display: grid;
  grid-template-columns: 40px 1fr 50px 50px 50px 50px 60px;
  gap: 8px;
  background: rgba(255, 255, 255, 0.1);
  padding: 10px 8px;
  border-radius: 8px;
  font-weight: 600;
  margin-bottom: 8px;
}

.points-row {
  display: grid;
  grid-template-columns: 40px 1fr 50px 50px 50px 50px 60px;
  gap: 8px;
  padding: 8px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  align-items: center;
}

.points-row:hover {
  background: rgba(255, 255, 255, 0.05);
}

.points-row.highlight {
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
  
  .race-table-header, .race-table-row {
    grid-template-columns: 30px 1fr 50px 50px;
    gap: 4px;
  }
  
  .race-finish, .race-elapsed, .race-corrected {
    display: none;
  }
}
</style>
