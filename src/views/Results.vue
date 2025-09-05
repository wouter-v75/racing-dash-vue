<template>
  <div class="results-page">
    <div class="background-overlay" :style="backgroundStyle"></div>
    
    <div class="container">
      <!-- Header -->
      <div class="header">
        <div class="header-top">
          <h1 class="regatta-name">{{ currentEvent?.name || 'Maxi Worlds 2024' }}</h1>
          <div class="last-update">
            <div class="live-indicator"></div>
            <span>{{ lastUpdateTime }}</span>
          </div>
        </div>
        
        <!-- Swipable Regatta Selector -->
        <div class="regatta-selector">
          <div class="regatta-scroll">
            <button 
              v-for="regatta in regattas" 
              :key="regatta.id"
              :class="['regatta-pill', { active: selectedRegattaId === regatta.id }]"
              @click="selectRegatta(regatta.id)"
            >
              {{ regatta.name }}
            </button>
          </div>
        </div>
        
        <div class="controls">
          <button class="refresh-btn" @click="refreshData" :disabled="loading.any">
            {{ loading.any ? '⏳' : '🔄' }}
          </button>
        </div>

        <div v-if="myBoatName" class="boat-info">
          <span class="boat-pill">{{ myBoatName }}</span>
        </div>
      </div>

      <!-- Error display -->
      <div v-if="error" class="error">{{ error }}</div>

      <!-- Series Overall Section -->
      <div class="section">
        <h2 class="section-title">Series Results Overall</h2>
        
        <div class="flip-card-container">
          <div class="flip-card" :class="{ flipped: overallFlipped }" @click="overallFlipped = !overallFlipped">
            <!-- Front: NORTHSTAR specific data -->
            <div class="flip-card-front">
              <div class="race-header">
                <div class="race-title">NORTHSTAR</div>
                <div class="race-subtitle">M2 Class</div>
              </div>
              
              <div v-if="loading.overall" class="loading">
                <div class="spinner"></div>
                Loading standings...
              </div>
              
              <div v-else-if="myOverall" class="northstar-summary">
                <div class="boat-name-display">{{ myOverall.name }}</div>
                <div class="position-points-grid">
                  <div class="stat-item">
                    <div class="stat-value">{{ myOverall.position }}</div>
                    <div class="stat-label">Position</div>
                  </div>
                  <div class="stat-item">
                    <div class="stat-value">{{ myOverall.total || myOverall.points }}</div>
                    <div class="stat-label">Total Points</div>
                  </div>
                </div>
              </div>
              
              <div v-else class="empty-state">
                <div>NORTHSTAR not found</div>
                <div class="race-subtitle">Boat: "{{ myBoatName }}"</div>
              </div>
              
              <div class="tap-hint">👆 Tap for full standings</div>
            </div>
            
            <!-- Back: Full standings table -->
            <div class="flip-card-back">
              <div class="race-header">
                <div class="race-title">M2 - Full Standings</div>
              </div>
              
              <div v-if="overallRows.length > 0" class="table-container">
                <table class="results-table">
                  <thead>
                    <tr>
                      <th>Pos</th>
                      <th>Boat</th>
                      <th>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr 
                      v-for="row in overallRows" 
                      :key="row._key"
                      :class="{ 'boat-highlight': isMyBoat(row.name) }"
                    >
                      <td>{{ row.position }}</td>
                      <td>{{ row.name }}</td>
                      <td>{{ row.total || row.points }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              
              <div v-else class="empty-state">
                No standings available
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- SIMPLE DEBUG SECTION -->
    <div style="margin: 20px; padding: 20px; background: rgba(255,0,0,0.2); border: 2px solid red; border-radius: 10px;">
      <h3 style="color: yellow;">🚨 DEBUG INFO</h3>
      <div style="font-family: monospace; font-size: 12px; color: white;">
        <div><strong>My Boat Name:</strong> "{{ myBoatName }}"</div>
        <div><strong>Event ID:</strong> "{{ evId() }}"</div>
        <div><strong>Overall Rows:</strong> {{ overallRows.length }}</div>
        <div><strong>API Base:</strong> "{{ API_BASE }}"</div>
        <div><strong>Loading:</strong> {{ JSON.stringify(loading) }}</div>
        <div><strong>Error:</strong> {{ error || 'None' }}</div>
        
        <div v-if="overallRows.length > 0">
          <strong>First 3 boats:</strong>
          <div v-for="boat in overallRows.slice(0, 3)" :key="boat._key" style="margin: 2px 0;">
            {{ boat.position }}. "{{ boat.name }}" - {{ isMyBoat(boat.name) ? 'MATCH!' : 'no match' }}
          </div>
        </div>
        
        <div v-if="myOverall">
          <strong>My boat found:</strong> {{ myOverall.name }} (Position: {{ myOverall.position }})
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { supabase } from '../lib/supabase'

// Constants
const API_BASE = ''
const HARDCODED_CLASS = 'M2'

// Reactive data
const regattas = ref([])
const selectedRegattaId = ref('')
const overallRows = ref([])
const error = ref('')
const lastUpdateTime = ref('')
const myBoatName = ref('')
const backgroundImageUrl = ref('')

// UI state
const overallFlipped = ref(false)
const loading = ref({
  regattas: false,
  overall: false,
  get any() {
    return this.regattas || this.overall
  }
})

// Computed properties
const currentEvent = computed(() => 
  regattas.value.find(r => r.id === selectedRegattaId.value) || null
)

const evId = () => currentEvent.value?.event_id || ''

const myOverall = computed(() => {
  const found = overallRows.value.find(r => isMyBoat(r.name))
  console.log('Looking for my boat:', myBoatName.value, 'Found:', found?.name || 'NONE')
  return found
})

const backgroundStyle = computed(() => {
  if (backgroundImageUrl.value) {
    return {
      backgroundImage: `url(${backgroundImageUrl.value})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center'
    }
  }
  return {}
})

// Helper functions
function isMyBoat(boatName) {
  if (!myBoatName.value || !boatName) return false
  
  const myName = myBoatName.value.toLowerCase()
  const testName = boatName.toLowerCase()
  
  // Simple matching - contains "northstar" anywhere
  return testName.includes('northstar') || myName.includes('northstar')
}

async function api(path) {
  try {
    console.log('API call:', path)
    const response = await fetch(path)
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }
    
    const data = await response.json()
    console.log('API response:', data)
    return data
  } catch (e) {
    console.error('API error:', e)
    throw e
  }
}

function updateLastUpdateTime() {
  lastUpdateTime.value = new Date().toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit' 
  })
}

// Data loading functions
async function loadUserData() {
  try {
    const { data } = await supabase.auth.getUser()
    const meta = data?.user?.user_metadata || {}
    myBoatName.value = meta.boat_name || 'Northstar of London'
    console.log('Loaded boat name:', myBoatName.value)
  } catch (e) {
    console.error('Error loading user data:', e)
    myBoatName.value = 'Northstar of London'  // Fallback
  }
}

async function loadRegattas() {
  loading.value.regattas = true
  try {
    const { data, error: err } = await supabase
      .from('regattas')
      .select('id,name,event_id,class_id,location,event_url,starts_on,ends_on')
      .not('event_id', 'is', null)
      .order('starts_on', { ascending: false })
    
    if (!err) {
      regattas.value = data || []
      // Default to Maxi Worlds 2024
      const maxi = regattas.value.find(r => (r.event_id || '').toLowerCase() === 'xolfq')
      selectedRegattaId.value = maxi?.id || regattas.value[0]?.id || ''
      console.log('Loaded regattas, selected:', selectedRegattaId.value)
    }
  } catch (e) {
    error.value = `Error loading regattas: ${e.message}`
  } finally {
    loading.value.regattas = false
  }
}

async function reloadOverall() {
  loading.value.overall = true
  overallRows.value = []
  error.value = ''
  
  try {
    if (!evId()) {
      console.log('No event ID')
      return
    }
    
    console.log('Loading overall for event:', evId(), 'class:', HARDCODED_CLASS)
    
    // Use the existing working API format
    const json = await api(`/api/results-orc?type=overall&eventId=${encodeURIComponent(evId())}&classId=${encodeURIComponent(HARDCODED_CLASS)}`)
    
    console.log('Overall API response:', json)
    
    const rawResults = json.results || []
    overallRows.value = rawResults.map((r, i) => ({ ...r, _key: 'ov' + i }))
    
    console.log('Processed overall results:', overallRows.value.length, 'boats')
    
    // Log boat names for debugging
    overallRows.value.forEach((boat, i) => {
      console.log(`Boat ${i + 1}: "${boat.name}" (pos: ${boat.position})`)
    })
    
  } catch (e) {
    console.error('Error loading overall results:', e)
    error.value = `Error loading overall results: ${e.message}`
  } finally {
    loading.value.overall = false
  }
}

async function refreshData() {
  await reloadOverall()
  updateLastUpdateTime()
}

function selectRegatta(regattaId) {
  selectedRegattaId.value = regattaId
  refreshData()
}

// Lifecycle
onMounted(async () => {
  console.log('Component mounted')
  await Promise.all([loadUserData(), loadRegattas()])
  
  if (selectedRegattaId.value) {
    await refreshData()
  }
  
  updateLastUpdateTime()
})

// Watch for changes
watch(selectedRegattaId, () => {
  console.log('Regatta changed to:', selectedRegattaId.value)
  refreshData()
})
</script>

<style scoped>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

.results-page {
  min-height: 100vh;
  color: white;
  position: relative;
}

.background-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: #2a2a2a;
  z-index: 1;
}

.container {
  position: relative;
  z-index: 2;
  max-width: 430px;
  margin: 0 auto;
  padding: 20px;
  min-height: 100vh;
}

/* Header */
.header {
  position: sticky;
  top: 0;
  z-index: 100;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 20px;
  padding: 15px 20px;
  margin-bottom: 20px;
}

.header-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.regatta-name {
  font-size: 1.2rem;
  font-weight: 700;
  color: #60a5fa;
  margin: 0;
}

.last-update {
  font-size: 0.9rem;
  opacity: 0.8;
  display: flex;
  align-items: center;
  gap: 5px;
}

.live-indicator {
  width: 8px;
  height: 8px;
  background: #10b981;
  border-radius: 50%;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.regatta-selector {
  margin-bottom: 15px;
}

.regatta-scroll {
  display: flex;
  gap: 10px;
  overflow-x: auto;
  scroll-behavior: smooth;
  padding: 5px 0;
  scrollbar-width: none;
}

.regatta-scroll::-webkit-scrollbar {
  display: none;
}

.regatta-pill {
  flex-shrink: 0;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 20px;
  padding: 8px 16px;
  color: white;
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 14px;
  white-space: nowrap;
}

.regatta-pill.active {
  background: linear-gradient(135deg, #3b82f6, #1d4ed8);
  border-color: #3b82f6;
}

.controls {
  display: flex;
  justify-content: center;
  margin-bottom: 10px;
}

.refresh-btn {
  background: linear-gradient(135deg, #3b82f6, #1d4ed8);
  border: none;
  border-radius: 12px;
  padding: 8px 16px;
  color: white;
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 14px;
}

.refresh-btn:hover {
  transform: scale(1.05);
}

.refresh-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

.boat-info {
  text-align: center;
}

.boat-pill {
  display: inline-block;
  background: rgba(96, 165, 250, 0.2);
  border: 1px solid rgba(96, 165, 250, 0.4);
  border-radius: 20px;
  padding: 5px 12px;
  font-size: 0.9rem;
  font-weight: 600;
}

.section {
  margin-bottom: 25px;
}

.section-title {
  font-size: 1.1rem;
  font-weight: 600;
  margin: 0 0 15px 0;
  padding-left: 10px;
  border-left: 3px solid #60a5fa;
  opacity: 0.9;
}

/* Flip Cards */
.flip-card-container {
  perspective: 1000px;
  margin-bottom: 20px;
}

.flip-card {
  position: relative;
  width: 100%;
  height: 180px;
  transition: transform 0.6s;
  transform-style: preserve-3d;
  cursor: pointer;
}

.flip-card.flipped {
  transform: rotateY(180deg);
}

.flip-card-front,
.flip-card-back {
  position: absolute;
  width: 100%;
  height: 100%;
  backface-visibility: hidden;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  padding: 20px;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.flip-card-back {
  transform: rotateY(180deg);
  overflow-y: auto;
  padding: 15px;
  justify-content: flex-start;
}

.race-header {
  text-align: center;
  margin-bottom: 15px;
}

.race-title {
  font-size: 1.1rem;
  font-weight: 700;
  color: #34d399;
  margin-bottom: 5px;
}

.race-subtitle {
  font-size: 0.9rem;
  opacity: 0.7;
}

.northstar-summary {
  text-align: center;
  padding: 10px 0;
}

.boat-name-display {
  font-size: 1.5rem;
  font-weight: 800;
  color: #60a5fa;
  margin-bottom: 15px;
  letter-spacing: 1px;
}

.position-points-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  margin-bottom: 10px;
}

.stat-item {
  text-align: center;
}

.stat-value {
  font-size: 1.4rem;
  font-weight: 800;
  background: linear-gradient(135deg, #60a5fa, #34d399);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  margin-bottom: 3px;
}

.stat-label {
  font-size: 0.8rem;
  opacity: 0.8;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.table-container {
  flex: 1;
  overflow-y: auto;
  border-radius: 12px;
}

.results-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.85rem;
}

.results-table th,
.results-table td {
  padding: 8px 6px;
  text-align: left;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.results-table th {
  background: rgba(255, 255, 255, 0.1);
  font-weight: 600;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  position: sticky;
  top: 0;
}

.results-table tr:hover {
  background: rgba(255, 255, 255, 0.05);
}

.boat-highlight {
  background: rgba(96, 165, 250, 0.2) !important;
  border-left: 3px solid #60a5fa;
}

.loading {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100px;
  opacity: 0.7;
}

.spinner {
  width: 30px;
  height: 30px;
  border: 3px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  border-top-color: #60a5fa;
  animation: spin 1s linear infinite;
  margin-right: 10px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.error {
  background: rgba(239, 68, 68, 0.2);
  border: 1px solid rgba(239, 68, 68, 0.4);
  border-radius: 12px;
  padding: 15px;
  margin: 10px 0;
  color: #fca5a5;
  font-size: 0.9rem;
}

.empty-state {
  text-align: center;
  padding: 40px 20px;
  opacity: 0.7;
}

.tap-hint {
  position: absolute;
  bottom: 10px;
  right: 15px;
  font-size: 0.7rem;
  opacity: 0.5;
}
</style>
