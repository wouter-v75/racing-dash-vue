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

      <!-- 1. LAST RACE (Race 4) -->
      <section class="latest-race-section">
        <div class="section-title">Last Race Results</div>
        <div class="section-subtitle">Class M2 · Individual Race Results</div>
        
        <div class="race-flip-card-container" @click="cardIsFlipped = !cardIsFlipped">
          <div class="race-flip-card-inner" :class="{ flipped: cardIsFlipped }">
            
            <!-- RACE FRONT SIDE -->
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
                  <span class="metric-value position-color">RET</span>
                </div>
                
                <div class="metric-item">
                  <span class="metric-label">Finish Time</span>
                  <span class="metric-value time-color">RET</span>
                </div>
                
                <div class="metric-item">
                  <span class="metric-label">Δ to 1st</span>
                  <span class="metric-value delta-color">RET</span>
                </div>
                
                <div class="metric-item">
                  <span class="metric-label">Δ to Ahead</span>
                  <span class="metric-value delta-color">RET</span>
                </div>
                
                <div class="metric-item">
                  <span class="metric-label">Δ to Behind</span>
                  <span class="metric-value delta-color">RET</span>
                </div>
              </div>
              
              <div class="race-flip-instruction">CLICK TO FLIP FOR FULL RACE TABLE</div>
            </div>

            <!-- RACE BACK SIDE -->
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
                  
                  <div class="race-table-row">
                    <span style="grid-column: 1 / -1; text-align: center; opacity: 0.7; padding: 20px;">
                      Loading race data...
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
        
        <div class="flip-card-container" @click="seriesCardIsFlipped = !seriesCardIsFlipped">
          <div class="flip-card-inner" :class="{ flipped: seriesCardIsFlipped }">
            
            <!-- FRONT SIDE -->
            <div class="flip-card-front">
              <div class="card-header">
                <h3>Northstar Performance</h3>
                <div class="flip-indicators">
                  <span class="series-points">12.00 Points</span>
                  <span class="flip-indicator">{{ seriesCardIsFlipped ? 'BACK' : 'FRONT' }}</span>
                </div>
              </div>
              
              <div class="boat-status">
                <div class="position-display">
                  <span class="position-number">3</span>
                  <span class="position-label">OVERALL</span>
                </div>
                
                <div class="race-grid">
                  <div class="race-result">
                    <span class="race-label">R1</span>
                    <span class="race-points">4.00</span>
                  </div>
                  <div class="race-result">
                    <span class="race-label">R2</span>
                    <span class="race-points">2.00</span>
                  </div>
                  <div class="race-result">
                    <span class="race-label">R3</span>
                    <span class="race-points">1.00</span>
                  </div>
                  <div class="race-result">
                    <span class="race-label">R4</span>
                    <span class="race-points highlight">RET</span>
                  </div>
                </div>
              </div>
              
              <div class="flip-instruction">CLICK TO FLIP FOR FULL STANDINGS</div>
            </div>

            <!-- BACK SIDE -->
            <div class="flip-card-back">
              <div class="card-header">
                <h3>Full Class M2 Standings</h3>
                <div class="flip-indicators">
                  <span class="boat-count">4 Boats</span>
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
                
                <div class="points-row">
                  <span>1</span>
                  <span class="boat-name">PROTEUS</span>
                  <span>2.00</span>
                  <span>1.00</span>
                  <span>4.00</span>
                  <span>1.00</span>
                  <span class="total">8.00</span>
                </div>
                
                <div class="points-row">
                  <span>2</span>
                  <span class="boat-name">JOLT</span>
                  <span>1.00</span>
                  <span>3.00</span>
                  <span>2.00</span>
                  <span>2.00</span>
                  <span class="total">8.00</span>
                </div>
                
                <div class="points-row highlight">
                  <span>3</span>
                  <span class="boat-name">NORTHSTAR OF LONDON</span>
                  <span>4.00</span>
                  <span>2.00</span>
                  <span>1.00</span>
                  <span>RET</span>
                  <span class="total">12.00</span>
                </div>
                
                <div class="points-row">
                  <span>4</span>
                  <span class="boat-name">JETHOU</span>
                  <span>3.00</span>
                  <span>4.00</span>
                  <span>3.00</span>
                  <span>3.00</span>
                  <span class="total">13.00</span>
                </div>
              </div>
              
              <div class="flip-instruction">CLICK TO RETURN TO NORTHSTAR VIEW</div>
            </div>
          </div>
        </div>
      </section>

      <!-- 3. RACE 3 RESULTS -->
      <section class="latest-race-section">
        <div class="section-title">Race 3 Results</div>
        <div class="section-subtitle">Class M2 · Individual Race Results</div>
        
        <div class="race-flip-card-container" @click="race3CardIsFlipped = !race3CardIsFlipped">
          <div class="race-flip-card-inner" :class="{ flipped: race3CardIsFlipped }">
            
            <!-- RACE 3 FRONT SIDE -->
            <div class="race-flip-card-front">
              <div class="race-card-header">
                <h3>Race R3 Summary</h3>
                <div class="race-flip-indicators">
                  <span class="race-date">12/09/2024</span>
                  <span class="race-flip-indicator">{{ race3CardIsFlipped ? 'BACK' : 'FRONT' }}</span>
                </div>
              </div>
              
              <div class="race-stats-5-metric">
                <div class="metric-item">
                  <span class="metric-label">Position</span>
                  <span class="metric-value position-color">1</span>
                </div>
                
                <div class="metric-item">
                  <span class="metric-label">Finish Time</span>
                  <span class="metric-value time-color">14:16:30</span>
                </div>
                
                <div class="metric-item">
                  <span class="metric-label">Δ to 1st</span>
                  <span class="metric-value delta-color">00:00</span>
                </div>
                
                <div class="metric-item">
                  <span class="metric-label">Δ to Ahead</span>
                  <span class="metric-value delta-color">00:00</span>
                </div>
                
                <div class="metric-item">
                  <span class="metric-label">Δ to Behind</span>
                  <span class="metric-value delta-color">00:20</span>
                  <span class="boat-name-mini">JOLT</span>
                </div>
              </div>
              
              <div class="race-flip-instruction">CLICK TO FLIP FOR FULL RACE TABLE</div>
            </div>

            <!-- RACE 3 BACK SIDE -->
            <div class="race-flip-card-back">
              <div class="race-card-header">
                <h3>Full Race R3 Results</h3>
                <div class="race-flip-indicators">
                  <span class="race-date">12/09/2024</span>
                  <span class="race-flip-indicator">{{ race3CardIsFlipped ? 'BACK' : 'FRONT' }}</span>
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
                  
                  <div class="race-table-row highlight">
                    <span>1</span>
                    <span class="boat-name">NORTHSTAR OF LONDON</span>
                    <span class="race-finish">14:16:30</span>
                    <span class="race-elapsed">3:16:30</span>
                    <span class="race-corrected">3:15:45</span>
                    <span class="race-delta winner">00:00</span>
                    <span class="race-status finished">F</span>
                  </div>
                  
                  <div class="race-table-row">
                    <span>2</span>
                    <span class="boat-name">JOLT</span>
                    <span class="race-finish">14:16:50</span>
                    <span class="race-elapsed">3:16:50</span>
                    <span class="race-corrected">3:16:05</span>
                    <span class="race-delta">00:20</span>
                    <span class="race-status finished">F</span>
                  </div>
                  
                  <div class="race-table-row">
                    <span>3</span>
                    <span class="boat-name">JETHOU</span>
                    <span class="race-finish">14:17:15</span>
                    <span class="race-elapsed">3:17:15</span>
                    <span class="race-corrected">3:16:30</span>
                    <span class="race-delta">00:45</span>
                    <span class="race-status finished">F</span>
                  </div>
                  
                  <div class="race-table-row">
                    <span>4</span>
                    <span class="boat-name">PROTEUS</span>
                    <span class="race-finish">14:18:00</span>
                    <span class="race-elapsed">3:18:00</span>
                    <span class="race-corrected">3:17:15</span>
                    <span class="race-delta">01:30</span>
                    <span class="race-status finished">F</span>
                  </div>
                </div>
              </div>
              
              <div class="race-flip-instruction">RACE 3 RESULTS · CLICK TO RETURN TO SUMMARY</div>
            </div>
          </div>
        </div>
      </section>

      <!-- 4. RACE 2 RESULTS - SAFE HEADERS -->
      <section class="latest-race-section">
        <div class="section-title">Race 2 Results</div>
        <div class="section-subtitle">Class M2 · Individual Race Results</div>
        
        <div class="race-flip-card-container" @click="race2CardIsFlipped = !race2CardIsFlipped">
          <div class="race-flip-card-inner" :class="{ flipped: race2CardIsFlipped }">
            
            <!-- RACE 2 FRONT SIDE -->
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
                  <span class="metric-value position-color">2</span>
                </div>
                
                <div class="metric-item">
                  <span class="metric-label">Finish Time</span>
                  <span class="metric-value time-color">15:23:15</span>
                </div>
                
                <div class="metric-item">
                  <span class="metric-label">Δ to 1st</span>
                  <span class="metric-value delta-color">01:25</span>
                </div>
                
                <div class="metric-item">
                  <span class="metric-label">Δ to Ahead</span>
                  <span class="metric-value delta-color">01:25</span>
                  <span class="boat-name-mini">JOLT</span>
                </div>
                
                <div class="metric-item">
                  <span class="metric-label">Δ to Behind</span>
                  <span class="metric-value delta-color">02:10</span>
                  <span class="boat-name-mini">JETHOU</span>
                </div>
              </div>
              
              <div class="race-flip-instruction">CLICK TO FLIP FOR FULL RACE TABLE</div>
            </div>

            <!-- RACE 2 BACK SIDE -->
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
                  
                  <div class="race-table-row">
                    <span>1</span>
                    <span class="boat-name">JOLT</span>
                    <span class="race-finish">15:21:50</span>
                    <span class="race-elapsed">4:21:50</span>
                    <span class="race-corrected">4:20:15</span>
                    <span class="race-delta winner">00:00</span>
                    <span class="race-status finished">F</span>
                  </div>
                  
                  <div class="race-table-row highlight">
                    <span>2</span>
                    <span class="boat-name">NORTHSTAR OF LONDON</span>
                    <span class="race-finish">15:23:15</span>
                    <span class="race-elapsed">4:23:15</span>
                    <span class="race-corrected">4:21:40</span>
                    <span class="race-delta">01:25</span>
                    <span class="race-status finished">F</span>
                  </div>
                  
                  <div class="race-table-row">
                    <span>3</span>
                    <span class="boat-name">JETHOU</span>
                    <span class="race-finish">15:25:25</span>
                    <span class="race-elapsed">4:25:25</span>
                    <span class="race-corrected">4:23:50</span>
                    <span class="race-delta">03:35</span>
                    <span class="race-status finished">F</span>
                  </div>
                  
                  <div class="race-table-row">
                    <span>4</span>
                    <span class="boat-name">PROTEUS</span>
                    <span class="race-finish">15:26:10</span>
                    <span class="race-elapsed">4:26:10</span>
                    <span class="race-corrected">4:24:35</span>
                    <span class="race-delta">04:20</span>
                    <span class="race-status finished">F</span>
                  </div>
                </div>
              </div>
              
              <div class="race-flip-instruction">RACE 2 RESULTS · CLICK TO RETURN TO SUMMARY</div>
            </div>
          </div>
        </div>
      </section>

      <!-- 5. RACE 1 RESULTS - SAFE HEADERS -->
      <section class="latest-race-section">
        <div class="section-title">Race 1 Results</div>
        <div class="section-subtitle">Class M2 · Individual Race Results</div>
        
        <div class="race-flip-card-container" @click="race1CardIsFlipped = !race1CardIsFlipped">
          <div class="race-flip-card-inner" :class="{ flipped: race1CardIsFlipped }">
            
            <!-- RACE 1 FRONT SIDE -->
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
                  <span class="metric-value position-color">4</span>
                </div>
                
                <div class="metric-item">
                  <span class="metric-label">Finish Time</span>
                  <span class="metric-value time-color">16:45:20</span>
                </div>
                
                <div class="metric-item">
                  <span class="metric-label">Δ to 1st</span>
                  <span class="metric-value delta-color">03:15</span>
                </div>
                
                <div class="metric-item">
                  <span class="metric-label">Δ to Ahead</span>
                  <span class="metric-value delta-color">01:30</span>
                  <span class="boat-name-mini">JETHOU</span>
                </div>
                
                <div class="metric-item">
                  <span class="metric-label">Δ to Behind</span>
                  <span class="metric-value delta-color">--:--</span>
                </div>
              </div>
              
              <div class="race-flip-instruction">CLICK TO FLIP FOR FULL RACE TABLE</div>
            </div>

            <!-- RACE 1 BACK SIDE -->
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
                  
                  <div class="race-table-row">
                    <span>1</span>
                    <span class="boat-name">JOLT</span>
                    <span class="race-finish">16:42:05</span>
                    <span class="race-elapsed">5:42:05</span>
                    <span class="race-corrected">5:40:30</span>
                    <span class="race-delta winner">00:00</span>
                    <span class="race-status finished">F</span>
                  </div>
                  
                  <div class="race-table-row">
                    <span>2</span>
                    <span class="boat-name">PROTEUS</span>
                    <span class="race-finish">16:43:15</span>
                    <span class="race-elapsed">5:43:15</span>
                    <span class="race-corrected">5:41:40</span>
                    <span class="race-delta">01:10</span>
                    <span class="race-status finished">F</span>
                  </div>
                  
                  <div class="race-table-row">
                    <span>3</span>
                    <span class="boat-name">JETHOU</span>
                    <span class="race-finish">16:43:50</span>
                    <span class="race-elapsed">5:43:50</span>
                    <span class="race-corrected">5:42:15</span>
                    <span class="race-delta">01:45</span>
                    <span class="race-status finished">F</span>
                  </div>
                  
                  <div class="race-table-row highlight">
                    <span>4</span>
                    <span class="boat-name">NORTHSTAR OF LONDON</span>
                    <span class="race-finish">16:45:20</span>
                    <span class="race-elapsed">5:45:20</span>
                    <span class="race-corrected">5:43:45</span>
                    <span class="race-delta">03:15</span>
                    <span class="race-status finished">F</span>
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
import { ref } from 'vue'

// Simple reactive state
const cardIsFlipped = ref(false)
const seriesCardIsFlipped = ref(false)
const race3CardIsFlipped = ref(false)
const race2CardIsFlipped = ref(false)
const race1CardIsFlipped = ref(false)
const updateTime = ref('19:44')

console.log('RESULTS COMPONENT LOADED - SAFE VERSION')
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
