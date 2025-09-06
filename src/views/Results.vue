<!-- Latest Race Section (Race 3) -->
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
