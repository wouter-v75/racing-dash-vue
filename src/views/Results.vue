<template>
  <!-- Results.vue -->
  <div class="results-page">
    <!-- Background overlay -->
    <div class="background-overlay" :style="backgroundStyle"></div>
    
    <!-- Admin controls -->
    <div v-if="isAdmin" class="admin-controls">
      <button class="admin-btn" @click="$refs.backgroundUpload.click()" title="Upload background">
        🖼️
      </button>
      <input
        ref="backgroundUpload"
        type="file"
        accept="image/*"
        @change="handleBackgroundUpload"
        class="background-upload"
      />
    </div>

    <div class="container">
      <!-- Header -->
      <div class="header">
        <div class="header-top">
          <h1 class="regatta-name">{{ currentEvent?.name || 'Select Regatta' }}</h1>
          <div class="last-update">
            <div class="live-indicator"></div>
            <span>{{ lastUpdateTime }}</span>
          </div>
        </div>
        
        <!-- Swipable Regatta Selector -->
        <div class="regatta-selector">
          <div class="regatta-scroll" ref="regattaScroll">
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
          <span class="boat-pill">🚤 {{ myBoatName }}</span>
        </div>
      </div>

      <!-- Error display -->
      <div v-if="error" class="error">{{ error }}</div>

      <!-- Latest Race Section -->
      <div v-if="lastRaceId" class="section">
        <h2 class="section-title">Latest Race - {{ lastRaceTitle }}</h2>
        
        <div class="flip-card-container">
          <div class="flip-card" :class="{ flipped: lastRaceFlipped }" @click="lastRaceFlipped = !lastRaceFlipped">
            <!-- Front: Race summary -->
            <div class="flip-card-front">
              <div class="race-header">
                <div class="race-title">{{ lastRaceTitle }}</div>
                <div class="race-subtitle">{{ formatDate(currentEvent?.starts_on) }}</div>
              </div>
              
              <div v-if="loading.last" class="loading">
                <div class="spinner"></div>
                Loading race results...
              </div>
              
              <div v-else-if="lastRaceSummary.position !== '–'" class="stats-grid">
                <div class="stat-item">
                  <div class="stat-value">{{ lastRaceSummary.position }}</div>
                  <div class="stat-label">Position</div>
                </div>
                <div class="stat-item">
                  <div class="stat-value">{{ lastRaceSummary.finishTime }}</div>
                  <div class="stat-label">Finish Time</div>
                </div>
                <div class="stat-item">
                  <div class="stat-value" :class="getDeltaClass(lastRaceSummary.deltaAhead)">
                    {{ lastRaceSummary.deltaAhead }}
                  </div>
                  <div class="stat-label">Delta Ahead</div>
                </div>
                <div class="stat-item">
                  <div class="stat-value" :class="getDeltaClass(lastRaceSummary.deltaBehind)">
                    {{ lastRaceSummary.deltaBehind }}
                  </div>
                  <div class="stat-label">Delta Behind</div>
                </div>
              </div>
              
              <div v-else class="empty-state">
                <div>No results yet</div>
                <div class="race-subtitle">Check back later</div>
              </div>
              
              <div class="tap-hint">
                👆 Tap for full results
              </div>
            </div>
            
            <!-- Back: Full race results -->
            <div class="flip-card-back">
              <div class="race-header">
                <div class="race-title">{{ lastRaceTitle }} - Full Results</div>
              </div>
              
              <div v-if="lastRaceRows.length > 0" class="table-container">
                <table class="results-table">
                  <thead>
                    <tr>
                      <th>Pos</th>
                      <th>Boat</th>
                      <th>Finish</th>
                      <th>Corrected</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr 
                      v-for="row in lastRaceRows" 
                      :key="row._key"
                      :class="{ 'boat-highlight': isMyBoat(row.name) }"
                    >
                      <td>{{ row.position }}</td>
                      <td>{{ row.name }}</td>
                      <td>{{ row.finishTime }}</td>
                      <td>{{ row.correctedTime }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              
              <div v-else class="empty-state">
                No results available
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Series Overall Section -->
      <div class="section">
        <h2 class="section-title">Series Results Overall</h2>
        
        <div class="flip-card-container">
          <div class="flip-card" :class="{ flipped: overallFlipped }" @click="overallFlipped = !overallFlipped">
            <!-- Front: Overall summary -->
            <div class="flip-card-front">
              <div class="race-header">
                <div class="race-title">M2 Class</div>
                <div class="race-subtitle">{{ races.length }} races</div>
              </div>
              
              <div v-if="loading.overall" class="loading">
                <div class="spinner"></div>
                Loading standings...
              </div>
              
              <div v-else-if="myOverall" class="stats-grid">
                <div class="stat-item">
                  <div class="stat-value">{{ myOverall.position }}</div>
                  <div class="stat-label">Position</div>
                </div>
                <div class="stat-item">
                  <div class="stat-value">{{ myOverall.total || myOverall.points }}</div>
                  <div class="stat-label">Total Points</div>
                </div>
                <div class="stat-item" v-if="myOverall.sailNo">
                  <div class="stat-value">{{ myOverall.sailNo }}</div>
                  <div class="stat-label">Sail No</div>
                </div>
                <div class="stat-item" v-if="myOverall.skipper">
                  <div class="stat-value">{{ myOverall.skipper }}</div>
                  <div class="stat-label">Skipper</div>
                </div>
              </div>
              
              <div v-else class="empty-state">
                <div>No standings yet</div>
                <div class="race-subtitle">Check back after first race</div>
              </div>
              
              <div class="tap-hint">
                👆 Tap for full standings
              </div>
            </div>
            
            <!-- Back: Full overall results -->
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
                      <th>Sail</th>
                      <th>Points</th>
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
                      <td>{{ row.sailNo }}</td>
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

      <!-- Previous Races Section -->
      <div v-if="otherRaces.length > 0" class="section">
        <h2 class="section-title">Previous Races</h2>
        
        <div class="previous-races">
          <div 
            v-for="race in otherRaces" 
            :key="race.id" 
            class="flip-card-container"
          >
            <div 
              class="flip-card" 
              :class="{ flipped: flippedRaces.has(race.id) }" 
              @click="toggleRaceFlip(race.id)"
            >
              <!-- Front: Race summary -->
              <div class="flip-card-front">
                <div class="race-header">
                  <div class="race-title">{{ race.label }}</div>
                  <div class="race-subtitle">{{ formatDate(currentEvent?.starts_on) }}</div>
                </div>
                
                <div v-if="loading.sets" class="loading">
                  <div class="spinner"></div>
                  Loading...
                </div>
                
                <div v-else-if="raceSummaries[race.id]?.position !== '–'" class="stats-grid">
                  <div class="stat-item">
                    <div class="stat-value">{{ raceSummaries[race.id]?.position }}</div>
                    <div class="stat-label">Position</div>
                  </div>
                  <div class="stat-item">
                    <div class="stat-value">{{ raceSummaries[race.id]?.finishTime }}</div>
                    <div class="stat-label">Finish Time</div>
                  </div>
                  <div class="stat-item">
                    <div class="stat-value" :class="getDeltaClass(raceSummaries[race.id]?.deltaAhead)">
                      {{ raceSummaries[race.id]?.deltaAhead }}
                    </div>
                    <div class="stat-label">Delta Ahead</div>
                  </div>
                  <div class="stat-item">
                    <div class="stat-value" :class="getDeltaClass(raceSummaries[race.id]?.deltaBehind)">
                      {{ raceSummaries[race.id]?.deltaBehind }}
                    </div>
                    <div class="stat-label">Delta Behind</div>
                  </div>
                </div>
                
                <div v-else class="empty-state">
                  <div>No results yet</div>
                </div>
                
                <div class="tap-hint">
                  👆 Tap for full results
                </div>
              </div>
              
              <!-- Back: Full race results -->
              <div class="flip-card-back">
                <div class="race-header">
                  <div class="race-title">{{ race.label }} - Full Results</div>
                </div>
                
                <div v-if="raceTables[race.id]?.length > 0" class="table-container">
                  <table class="results-table">
                    <thead>
                      <tr>
                        <th>Pos</th>
                        <th>Boat</th>
                        <th>Finish</th>
                        <th>Corrected</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr 
                        v-for="row in raceTables[race.id]" 
                        :key="row._key"
                        :class="{ 'boat-highlight': isMyBoat(row.name) }"
                      >
                        <td>{{ row.position }}</td>
                        <td>{{ row.name }}</td>
                        <td>{{ row.finishTime }}</td>
                        <td>{{ row.correctedTime }}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                
                <div v-else class="empty-state">
                  No results available
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import { supabase } from '../lib/supabase'

// Constants
const UPDATE_INTERVAL = 5 * 60 * 1000 // 5 minutes
const HARDCODED_CLASS = 'M2' // Hardcoded M2 class

// Reactive data
const regattas = ref([])
const selectedRegattaId = ref('')
const races = ref([])
const overallRows = ref([])
const lastRaceRows = ref([])
const raceTables = ref({})
const raceSummaries = ref({})
const error = ref('')
const lastUpdateTime = ref('')
const myBoatName = ref('')
const isAdmin = ref(false)
const backgroundImageUrl = ref('')

// UI state
const lastRaceFlipped = ref(false)
const overallFlipped = ref(false)
const flippedRaces = ref(new Set())
const loading = ref({
  regattas: false,
  races: false,
  overall: false,
  last: false,
  sets: false,
  get any() {
    return this.regattas || this.races || this.overall || this.last || this.sets
  }
})

// Auto-update interval
let updateInterval = null

// Computed properties
const currentEvent = computed(() => 
  regattas.value.find(r => r.id === selectedRegattaId.value) || null
)

const evId = () => currentEvent.value?.event_id || ''

const lastRaceId = computed(() => {
  const forcedLastRaceByEvent = { xolfq: '13' }
  return forcedLastRaceByEvent[evId()] || (races.value.at(-1)?.id || '')
})

const lastRaceTitle = computed(() => 
  lastRaceId.value ? `RACE ${lastRaceId.value}` : 'RACE —'
)

const otherRaces = computed(() => 
  races.value.filter(r => r.id !== lastRaceId.value)
)

const myOverall = computed(() => 
  overallRows.value.find(r => isMyBoat(r.name))
)

const lastRaceSummary = ref({ 
  position: '–', 
  finishTime: '–', 
  deltaToFirst: '–', 
  deltaAhead: '–', 
  deltaBehind: '–' 
})

const backgroundStyle = computed(() => {
  if (backgroundImageUrl.value) {
    return {
      backgroundImage: `url(${backgroundImageUrl.value})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundAttachment: 'fixed'
    }
  }
  return {}
})

// Helper functions
function isMyBoat(boatName) {
  if (!myBoatName.value || !boatName) return false
  // More flexible matching for "Northstar of London"
  const myName = myBoatName.value.toLowerCase()
  const testName = boatName.toLowerCase()
  return testName.includes(myName) || myName.includes(testName) ||
         testName.includes('northstar') || myName.includes('northstar')
}

function getDeltaClass(delta) {
  if (!delta || delta === '–') return 'delta-neutral'
  if (delta.startsWith('+')) return 'delta-positive'
  return 'delta-negative'
}

function formatDate(dateString) {
  if (!dateString) return ''
  return new Date(dateString).toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric' 
  })
}

function toggleRaceFlip(raceId) {
  if (flippedRaces.value.has(raceId)) {
    flippedRaces.value.delete(raceId)
  } else {
    flippedRaces.value.add(raceId)
  }
}

async function api(path) {
  try {
    console.log('Making API call to:', path)
    const response = await fetch(path)
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
    
    const text = await response.text()
    console.log('Raw response:', text.substring(0, 200) + '...')
    
    if (!text.trim()) {
      throw new Error('Empty response from server')
    }
    
    try {
      return JSON.parse(text)
    } catch (parseError) {
      console.error('JSON parse error:', parseError)
      console.error('Response text:', text)
      throw new Error(`Invalid JSON response: ${parseError.message}`)
    }
  } catch (fetchError) {
    console.error('Fetch error:', fetchError)
    throw fetchError
  }
}

function updateLastUpdateTime() {
  lastUpdateTime.value = new Date().toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit' 
  })
}

// Helper functions for time calculations
function toSec(str) {
  if (!str) return null
  if (/^(DNF|DNS|DSQ|DNC|RET)$/i.test(str)) return null
  const p = str.split(':').map(Number)
  return p.length === 3 ? p[0] * 3600 + p[1] * 60 + p[2] : p[0] * 60 + p[1]
}

function mmssDelta(a, b) {
  const s1 = toSec(a), s2 = toSec(b)
  if (s1 == null || s2 == null) return '–'
  const d = Math.max(0, s2 - s1)
  const mm = String(Math.floor(d / 60)).padStart(2, '0')
  const ss = String(d % 60).padStart(2, '0')
  return `${mm}:${ss}`
}

// Data loading functions
async function loadUserData() {
  try {
    const { data } = await supabase.auth.getUser()
    const meta = data?.user?.user_metadata || {}
    myBoatName.value = meta.boat_name || ''
    
    // Check if user is admin
    if (data?.user?.id) {
      const { data: memberData } = await supabase
        .from('team_members')
        .select('role')
        .eq('user_id', data.user.id)
      
      isAdmin.value = Array.isArray(memberData) && 
                     memberData.some(m => m.role === 'admin')
    }
  } catch (e) {
    console.error('Error loading user data:', e)
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
      // Default to Maxi Worlds 2024 if present
      const maxi = regattas.value.find(r => (r.event_id || '').toLowerCase() === 'xolfq')
      selectedRegattaId.value = maxi?.id || regattas.value[0]?.id || ''
    }
  } catch (e) {
    error.value = `Error loading regattas: ${e.message}`
  } finally {
    loading.value.regattas = false
  }
}

async function loadRacesForClass() {
  loading.value.races = true
  races.value = []
  if (!evId()) return
  
  try {
    const json = await api(`/api/results-orc?type=racesForClass&eventId=${encodeURIComponent(evId())}&classId=${encodeURIComponent(HARDCODED_CLASS)}`)
    races.value = (json.results || []).map(r => ({ id: r.id, label: `RACE ${r.id}` }))
    console.log('Loaded races:', races.value)
  } catch (e) {
    console.error('Error loading races:', e)
    error.value = `Error loading races: ${e.message}`
  } finally {
    loading.value.races = false
  }
}

async function reloadOverall() {
  loading.value.overall = true
  overallRows.value = []
  
  try {
    if (!evId()) return
    const json = await api(`/api/results-orc?type=overall&eventId=${encodeURIComponent(evId())}&classId=${encodeURIComponent(HARDCODED_CLASS)}`)
    overallRows.value = (json.results || []).map((r, i) => ({ ...r, _key: 'ov' + i }))
    console.log('Loaded overall results:', overallRows.value)
  } catch (e) {
    console.error('Error loading overall results:', e)
    error.value = `Error loading overall results: ${e.message}`
  } finally {
    loading.value.overall = false
  }
}

async function reloadLastRace() {
  loading.value.last = true
  lastRaceRows.value = []
  
  try {
    if (!lastRaceId.value) return
    
    const json = await api(`/api/results-orc?type=raceRaw&eventId=${encodeURIComponent(evId())}&raceId=${encodeURIComponent(lastRaceId.value)}&classId=${encodeURIComponent(HARDCODED_CLASS)}`)
    const rows = (json.results || []).map((r, i) => ({ ...r, _key: 'last-' + i }))
    lastRaceRows.value = rows
    console.log('Loaded last race results:', rows)

    // Calculate summary for user's boat
    const idx = rows.findIndex(r => isMyBoat(r.name))
    const me = rows[idx]
    const ahead = idx > 0 ? rows[idx - 1] : null
    const behind = idx >= 0 && idx < rows.length - 1 ? rows[idx + 1] : null

    lastRaceSummary.value = {
      position: me?.position || '–',
      finishTime: me?.finishTime || '–',
      deltaToFirst: me?.deltaToFirst || '–',
      deltaAhead: (ahead && ahead.correctedTime && me?.correctedTime) 
        ? mmssDelta(ahead.correctedTime, me.correctedTime) : '–',
      deltaBehind: (behind && behind.correctedTime && me?.correctedTime) 
        ? mmssDelta(me.correctedTime, behind.correctedTime) : '–'
    }
    console.log('Last race summary:', lastRaceSummary.value)
  } catch (e) {
    console.error('Error loading last race:', e)
    error.value = `Error loading last race: ${e.message}`
  } finally {
    loading.value.last = false
  }
}

async function loadOtherRaceTables() {
  loading.value.sets = true
  raceTables.value = {}
  raceSummaries.value = {}
  
  try {
    for (const r of otherRaces.value) {
      const json = await api(`/api/results-orc?type=race&eventId=${encodeURIComponent(evId())}&classId=${encodeURIComponent(HARDCODED_CLASS)}&raceId=${encodeURIComponent(r.id)}`)
      const rows = (json.results || []).map((row, i) => ({ ...row, _key: `${r.id}-${i}` }))
      raceTables.value[r.id] = rows

      const idx = rows.findIndex(x => isMyBoat(x.name))
      const me = rows[idx]
      const ahead = idx > 0 ? rows[idx - 1] : null
      const behind = idx >= 0 && idx < rows.length - 1 ? rows[idx + 1] : null

      raceSummaries.value[r.id] = {
        position: me?.position || '–',
        finishTime: me?.finishTime || '–',
        deltaToFirst: me?.deltaToFirst || '–',
        deltaAhead: (ahead && ahead.correctedTime && me?.correctedTime) 
          ? mmssDelta(ahead.correctedTime, me.correctedTime) : '–',
        deltaBehind: (behind && behind.correctedTime && me?.correctedTime) 
          ? mmssDelta(me.correctedTime, behind.correctedTime) : '–'
      }
    }
    console.log('Loaded other race tables:', raceTables.value)
  } catch (e) {
    console.error('Error loading race tables:', e)
    error.value = `Error loading race tables: ${e.message}`
  } finally {
    loading.value.sets = false
  }
}

// Orchestration functions
async function reloadClassData() {
  // Load races first, then overall results with individual race points
  await loadRacesForClass()
  await reloadOverall()
  await reloadLastRace()
  await loadOtherRaceTables()
}

async function reloadAll() {
  if (!selectedRegattaId.value) return
  error.value = ''
  console.log('Reloading all data for event:', evId())
  await reloadClassData()
  updateLastUpdateTime()
}

async function refreshData() {
  await reloadAll()
}

// Regatta selection
function selectRegatta(regattaId) {
  selectedRegattaId.value = regattaId
  reloadAll()
}

// Background upload handling
async function handleBackgroundUpload(event) {
  const file = event.target.files[0]
  if (!file) return

  try {
    const { data: userData } = await supabase.auth.getUser()
    if (!userData?.user) throw new Error('Not authenticated')

    // Upload to Supabase storage
    const fileName = `bg-${Date.now()}-${file.name}`
    const { data, error: uploadError } = await supabase.storage
      .from('backgrounds')
      .upload(fileName, file)

    if (uploadError) throw uploadError

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('backgrounds')
      .getPublicUrl(data.path)

    backgroundImageUrl.value = publicUrl

    // Save to localStorage
    localStorage.setItem('backgroundImageUrl', publicUrl)
  } catch (e) {
    error.value = `Error uploading background: ${e.message}`
  }
}

// Lifecycle
onMounted(async () => {
  console.log('Component mounted, initializing...')
  await Promise.all([loadUserData(), loadRegattas()])
  
  // Load saved background
  const savedBg = localStorage.getItem('backgroundImageUrl')
  if (savedBg) {
    backgroundImageUrl.value = savedBg
  }
  
  if (selectedRegattaId.value) {
    await reloadAll()
  }
  
  // Set up auto-refresh
  updateInterval = setInterval(reloadAll, UPDATE_INTERVAL)
  updateLastUpdateTime()
})

onBeforeUnmount(() => {
  if (updateInterval) {
    clearInterval(updateInterval)
  }
})

// Watch for changes
watch(selectedRegattaId, () => {
  console.log('Regatta changed to:', selectedRegattaId.value)
  reloadAll()
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

.background-overlay::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(42, 42, 42, 0.7);
  backdrop-filter: blur(3px);
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

/* Swipable Regatta Selector */
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
  -ms-overflow-style: none;
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

.regatta-pill:hover:not(.active) {
  background: rgba(255, 255, 255, 0.15);
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

/* Section Titles - No Icons */
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

.stats-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 15px;
  margin-top: 10px;
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

.delta-positive {
  background: linear-gradient(135deg, #ef4444, #dc2626) !important;
  -webkit-background-clip: text !important;
  -webkit-text-fill-color: transparent !important;
}

.delta-negative {
  background: linear-gradient(135deg, #10b981, #059669) !important;
  -webkit-background-clip: text !important;
  -webkit-text-fill-color: transparent !important;
}

.delta-neutral {
  background: linear-gradient(135deg, #94a3b8, #64748b) !important;
  -webkit-background-clip: text !important;
  -webkit-text-fill-color: transparent !important;
}

/* Tables */
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

/* Previous races */
.previous-races {
  display: grid;
  gap: 15px;
}

/* Loading states */
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

/* Tap hint */
.tap-hint {
  position: absolute;
  bottom: 10px;
  right: 15px;
  font-size: 0.7rem;
  opacity: 0.5;
  display: flex;
  align-items: center;
  gap: 5px;
}

/* Admin controls */
.admin-controls {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 200;
}

.admin-btn {
  background: rgba(0, 0, 0, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  width: 40px;
  height: 40px;
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
}

.background-upload {
  display: none;
}

/* Mobile optimizations */
@media (max-width: 480px) {
  .container {
    padding: 15px;
  }
  
  .flip-card {
    height: 160px;
  }
  
  .stats-grid {
    gap: 10px;
  }
  
  .stat-value {
    font-size: 1.2rem;
  }
}

/* iOS safe area */
@supports (padding: max(0px)) {
  .container {
    padding-top: max(20px, env(safe-area-inset-top));
    padding-bottom: max(20px, env(safe-area-inset-bottom));
  }
}
</style>
