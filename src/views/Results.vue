<template>
  <div class="results-page">
    <!-- Toolbar -->
    <div class="toolbar">
      <div class="left">
        <label>Event</label>
        <select v-model="selectedRegattaId" @change="reloadAll" :disabled="regattas.length===0">
          <option disabled value="">— select event —</option>
          <option v-for="r in regattas" :key="r.id" :value="r.id">
            {{ r.name }} <span v-if="r.location">• {{ r.location }}</span>
          </option>
        </select>

        <label v-if="classes.length">Class</label>
        <select v-if="classes.length" v-model="selectedClassId">
          <option v-for="c in classes" :key="c.id" :value="c.id">{{ c.id }}</option>
        </select>
      </div>

      <div class="right">
        <a v-if="currentEvent?.event_url"
           :href="currentEvent.event_url" target="_blank" rel="noopener"
           class="btn link">Open event site</a>
        <span class="pill" v-if="boatName">Boat: {{ boatName }}</span>
        <button class="btn ghost" @click="reloadAll" :disabled="loading.any">Refresh</button>
        <button class="btn debug" @click="toggleDebug" :class="{active: showDebug}">🔍 Debug</button>
      </div>
    </div>

    <p v-if="!selectedRegattaId" class="empty big">Choose an event to load results.</p>
    <p v-if="err" class="error">{{ err }}</p>

    <!-- Debug Panel -->
    <div v-if="showDebug" class="card debug-panel">
      <h3>🛠 Debug Information</h3>
      <div class="debug-grid">
        <div>
          <strong>Configuration:</strong>
          <ul>
            <li>Event ID: {{ evId() }}</li>
            <li>Class: {{ selectedClassId }}</li>
            <li>Target Boat: "{{ boatName }}"</li>
            <li>Last Race ID: {{ lastRaceId }}</li>
          </ul>
        </div>
        <div>
          <strong>Data Status:</strong>
          <ul>
            <li>Overall rows: {{ overallRows.length }}</li>
            <li>Last race rows: {{ lastRaceRows.length }}</li>
            <li>Boat found in overall: {{ !!myOverall }}</li>
            <li>Classes loaded: {{ classes.length }}</li>
            <li>Races loaded: {{ races.length }}</li>
          </ul>
        </div>
        <div v-if="allBoatNames.length">
          <strong>All Boat Names Found:</strong>
          <div class="boat-list">
            <div v-for="name in allBoatNames" :key="name" 
                 :class="{highlight: isMe(name)}" class="boat-name">
              "{{ name }}" <span v-if="isMe(name)">← YOU</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="selectedRegattaId">
      <!-- OVERALL STANDINGS (top) -->
      <div class="card">
        <h3 class="card-title">Overall standings — {{ selectedClassId }}</h3>
        <div v-if="loading.overall" class="empty">Loading overall standings...</div>
        <div v-else-if="!overallRows.length" class="empty">
          No overall standings data found.
          <div v-if="showDebug" class="debug-help">
            <p><strong>Debug help:</strong></p>
            <p>Check server logs for parsing details</p>
            <p>Test URL: <a :href="getOverallUrl()" target="_blank">{{ getOverallUrl() }}</a></p>
          </div>
        </div>
        <div v-else>
          <div v-if="myOverall" class="stats">
            <div class="stat"><div class="k">My Position</div><div class="v">{{ myOverall.position }}</div></div>
            <div class="stat"><div class="k">Points</div><div class="v">{{ myOverall.points }}</div></div>
            <div class="stat"><div class="k">Total</div><div class="v">{{ myOverall.total }}</div></div>
          </div>
          <div class="table-wrap">
            <table>
              <thead>
                <tr><th>#</th><th>Boat</th><th>Sail</th><th>Skipper</th><th>Points</th><th>Total</th></tr>
              </thead>
              <tbody>
                <tr v-for="row in overallRows" :key="row._key" :class="{me: isMe(row.name)}">
                  <td>{{ row.position }}</td>
                  <td><strong>{{ row.name }}</strong></td>
                  <td>{{ row.sailNo }}</td>
                  <td>{{ row.skipper }}</td>
                  <td>{{ row.points }}</td>
                  <td>{{ row.total }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- LAST RACE -->
      <div class="card">
        <h3 class="card-title">Last race — {{ lastRaceTitle }}</h3>
        <div v-if="loading.last" class="empty">Loading last race...</div>
        <div v-else-if="!lastRaceRows.length" class="empty">
          No last race data found.
          <div v-if="showDebug" class="debug-help">
            <p>Test URL: <a :href="getLastRaceUrl()" target="_blank">{{ getLastRaceUrl() }}</a></p>
          </div>
        </div>
        <div v-else>
          <div v-if="myLastRace" class="stats">
            <div class="stat"><div class="k">Position</div><div class="v">{{ myLastRace.position }}</div></div>
            <div class="stat"><div class="k">Finish</div><div class="v">{{ myLastRace.finishTime }}</div></div>
          </div>
          <div class="table-wrap">
            <table>
              <thead>
                <tr><th>#</th><th>Boat</th><th>Finish</th><th>Elapsed</th><th>Corrected</th></tr>
              </thead>
              <tbody>
                <tr v-for="row in lastRaceRows" :key="row._key" :class="{me: isMe(row.name)}">
                  <td>{{ row.position }}</td>
                  <td><strong>{{ row.name }}</strong></td>
                  <td>{{ row.finishTime }}</td>
                  <td>{{ row.elapsed }}</td>
                  <td>{{ row.correctedTime }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- PREVIOUS RACES -->
      <div v-if="races.length > 1" class="card">
        <h3 class="card-title">All races ({{ races.length }} total)</h3>
        <div class="race-list">
          <div v-for="race in races" :key="race.id" class="race-item">
            <strong>{{ race.label }}</strong>
            <button @click="loadRaceData(race.id)" :disabled="loading.race" class="btn small">
              {{ loading.race === race.id ? 'Loading...' : 'Load' }}
            </button>
          </div>
        </div>
        
        <div v-if="selectedRaceData.length > 0" class="race-results">
          <h4>Race {{ selectedRaceId }} Results</h4>
          <div class="table-wrap">
            <table>
              <thead>
                <tr><th>#</th><th>Boat</th><th>Finish</th><th>Corrected</th></tr>
              </thead>
              <tbody>
                <tr v-for="row in selectedRaceData" :key="row._key" :class="{me: isMe(row.name)}">
                  <td>{{ row.position }}</td>
                  <td><strong>{{ row.name }}</strong></td>
                  <td>{{ row.finishTime }}</td>
                  <td>{{ row.correctedTime }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { supabase } from '../lib/supabase'

const API_BASE = import.meta.env.VITE_API_BASE || ''

/* Debug state */
const showDebug = ref(false)

function toggleDebug() {
  showDebug.value = !showDebug.value
}

/* Enhanced boat name matching */
const boatName = ref('')

function cleanNameForMatching(name) {
  return String(name || '')
    .replace(/[^a-zA-Z0-9]/g, '')  // Remove all non-alphanumeric chars
    .toUpperCase()
}

function isMe(name = '') {
  if (!boatName.value) return false
  
  const cleanInput = cleanNameForMatching(name)
  const cleanTarget = cleanNameForMatching(boatName.value)
  
  if (!cleanInput || !cleanTarget) return false
  
  // Exact match first
  if (cleanInput === cleanTarget) return true
  
  // Partial match (handles abbreviations)
  return cleanTarget.includes(cleanInput) || cleanInput.includes(cleanTarget)
}

async function loadBoatFromUser(){
  const { data } = await supabase.auth.getUser()
  boatName.value = data?.user?.user_metadata?.boat_name || ''
  console.log('[USER] Boat name:', boatName.value)
}

/* Track all boat names found for debugging */
const allBoatNames = computed(() => {
  const names = new Set()
  overallRows.value.forEach(r => r.name && names.add(r.name))
  lastRaceRows.value.forEach(r => r.name && names.add(r.name))
  return Array.from(names).sort()
})

/* load events from DB */
const regattas = ref([])
const selectedRegattaId = ref('')
const currentEvent = computed(() => regattas.value.find(r => r.id === selectedRegattaId.value) || null)
const evId = () => currentEvent.value?.event_id || ''

async function loadRegattas() {
  const { data, error } = await supabase
    .from('regattas')
    .select('id,name,event_id,class_id,location,event_url,starts_on,ends_on')
    .not('event_id','is', null)
    .order('starts_on', { ascending: false })
  if (!error) {
    regattas.value = data || []
    // Default to your Maxi Worlds 2024 event if present
    const maxi = regattas.value.find(r => (r.event_id || '').toLowerCase() === 'xolfq')
    selectedRegattaId.value = maxi?.id || regattas.value[0]?.id || ''
    console.log('[REGATTAS] Loaded:', regattas.value.length, 'Selected:', selectedRegattaId.value)
  }
}

/* classes */
const classes = ref([])
const selectedClassId = ref('')

async function loadClasses(){
  classes.value = []
  if (!evId()) return
  
  try {
    console.log('[CLASSES] Loading for event:', evId())
    const json = await api(`/api/results-orc?type=classes&eventId=${encodeURIComponent(evId())}`)
    classes.value = (json.results || []).map(x => ({ id: x.id, label: x.id }))
    // Default to M2 if present, else first
    selectedClassId.value = classes.value.find(c => c.id === 'M2')?.id || classes.value[0]?.id || ''
    console.log('[CLASSES] Loaded:', classes.value.length, 'Selected:', selectedClassId.value)
  } catch (e) {
    console.error('[CLASSES] Error:', e.message)
    throw e
  }
}

/* races */
const races = ref([])

async function loadRaces(){
  races.value = []
  if (!evId() || !selectedClassId.value) return
  
  try {
    console.log('[RACES] Loading for class:', selectedClassId.value)
    const json = await api(`/api/results-orc?type=racesForClass&eventId=${encodeURIComponent(evId())}&classId=${encodeURIComponent(selectedClassId.value)}`)
    races.value = (json.results || []).map(r => ({ id: r.id, label: r.label }))
    console.log('[RACES] Loaded:', races.value.length)
  } catch (e) {
    console.error('[RACES] Error:', e.message)
    throw e
  }
}

/* last race */
const forcedLastRaceByEvent = { xolfq: '13' }
const lastRaceId = computed(() => forcedLastRaceByEvent[evId()] || (races.value.at(-1)?.id || ''))
const lastRaceTitle = computed(() => lastRaceId.value ? `RACE ${lastRaceId.value}` : 'RACE —')

/* datasets */
const overallRows = ref([])
const lastRaceRows = ref([])
const selectedRaceData = ref([])
const selectedRaceId = ref('')

const myOverall = computed(() => overallRows.value.find(r => isMe(r.name)))
const myLastRace = computed(() => lastRaceRows.value.find(r => isMe(r.name)))

/* loading state */
const loading = ref({
  classes:false, races:false, overall:false, last:false, race:false,
  get any(){ return this.classes||this.races||this.overall||this.last||this.race }
})

/* error state */
const err = ref('')

/* API helper */
async function api(path){
  const fullUrl = `${API_BASE}${path}`
  console.log('[API]', fullUrl)
  
  const r = await fetch(fullUrl)
  if (!r.ok) {
    const errorMsg = `HTTP ${r.status} - ${r.statusText}`
    console.error('[API] Error:', errorMsg)
    throw new Error(errorMsg)
  }
  
  const json = await r.json()
  console.log('[API] Response:', json.results?.length || 0, 'results')
  return json
}

/* URL helpers for debug */
function getOverallUrl() {
  return `https://data.orc.org/public/WEV.dll?action=series&eventid=${evId()}&classid=${selectedClassId.value}`
}

function getLastRaceUrl() {
  return `https://data.orc.org/public/WEV.dll?action=race&eventid=${evId()}&raceid=${lastRaceId.value}`
}

/* loaders */
async function loadOverall(){
  overallRows.value = []
  loading.value.overall = true
  
  try {
    if (!selectedClassId.value) return
    console.log('[OVERALL] Loading for class:', selectedClassId.value)
    const json = await api(`/api/results-orc?type=overall&eventId=${encodeURIComponent(evId())}&classId=${encodeURIComponent(selectedClassId.value)}`)
    overallRows.value = (json.results || []).map((r,i)=>({ ...r, _key:'ov'+i }))
    console.log('[OVERALL] Loaded:', overallRows.value.length, 'boats')
    
    // Check for our boat
    const myBoat = overallRows.value.find(r => isMe(r.name))
    if (myBoat) {
      console.log('[OVERALL] ✅ Found boat:', myBoat.name, 'at position', myBoat.position)
    } else {
      console.log('[OVERALL] ❌ Boat not found. Available:', overallRows.value.map(r => r.name).join(', '))
    }
  } catch(e){ 
    err.value = `Overall: ${e.message}`
    console.error('[OVERALL] Error:', e.message)
  } finally { 
    loading.value.overall = false 
  }
}

async function loadLastRace(){
  lastRaceRows.value = []
  loading.value.last = true
  
  try {
    if (!lastRaceId.value) return
    console.log('[LAST RACE] Loading race:', lastRaceId.value)
    const json = await api(`/api/results-orc?type=raceRaw&eventId=${encodeURIComponent(evId())}&raceId=${encodeURIComponent(lastRaceId.value)}&classId=${encodeURIComponent(selectedClassId.value)}`)
    lastRaceRows.value = (json.results || []).map((r,i)=>({ ...r, _key:'last-'+i }))
    console.log('[LAST RACE] Loaded:', lastRaceRows.value.length, 'boats')
    
    const myBoat = lastRaceRows.value.find(r => isMe(r.name))
    if (myBoat) {
      console.log('[LAST RACE] ✅ Found boat:', myBoat.name, 'at position', myBoat.position)
    } else {
      console.log('[LAST RACE] ❌ Boat not found')
    }
  } catch(e){ 
    err.value = `Last race: ${e.message}`
    console.error('[LAST RACE] Error:', e.message)
  } finally { 
    loading.value.last = false 
  }
}

async function loadRaceData(raceId) {
  selectedRaceData.value = []
  selectedRaceId.value = raceId
  loading.value.race = raceId
  
  try {
    console.log('[RACE] Loading race:', raceId)
    const json = await api(`/api/results-orc?type=race&eventId=${encodeURIComponent(evId())}&classId=${encodeURIComponent(selectedClassId.value)}&raceId=${encodeURIComponent(raceId)}`)
    selectedRaceData.value = (json.results || []).map((r,i)=>({ ...r, _key:`race-${raceId}-${i}` }))
    console.log('[RACE] Loaded:', selectedRaceData.value.length, 'boats')
  } catch(e){ 
    console.error('[RACE] Error:', e.message)
  } finally { 
    loading.value.race = false 
  }
}

/* main reload */
async function reloadAll(){
  err.value = ''
  console.log('[RELOAD] Starting...')
  
  try {
    await loadClasses()
    if (!selectedClassId.value) return
    
    await loadRaces()
    await loadOverall()
    
    if (lastRaceId.value) {
      await loadLastRace()
    }
    
    console.log('[RELOAD] Complete')
  } catch (e) {
    err.value = e.message
    console.error('[RELOAD] Failed:', e.message)
  }
}

/* watchers */
watch(selectedClassId, () => selectedClassId.value && reloadAll())

/* lifecycle */
onMounted(async () => {
  console.log('[MOUNT] Starting...')
  await loadBoatFromUser()
  await loadRegattas()
  if (selectedRegattaId.value) {
    await reloadAll()
  }
})
</script>

<style scoped>
.results-page {
  padding: 1rem;
  background: linear-gradient(135deg, #0b2239 0%, #1a365d 100%);
  min-height: 100vh;
  color: white;
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
  gap: 1rem;
}

.left, .right {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.card {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(16px);
  border-radius: 16px;
  padding: 24px;
  margin-bottom: 1.5rem;
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.18);
}

.debug-panel {
  background: rgba(255, 196, 0, 0.1);
  border: 1px solid rgba(255, 196, 0, 0.3);
}

.debug-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1rem;
  font-size: 0.9rem;
}

.debug-help {
  margin-top: 1rem;
  padding: 1rem;
  background: rgba(255, 196, 0, 0.1);
  border-radius: 8px;
  font-size: 0.9rem;
}

.debug-help a {
  color: #ffc400;
  word-break: break-all;
}

.boat-list {
  max-height: 150px;
  overflow-y: auto;
  background: rgba(0, 0, 0, 0.2);
  padding: 8px;
  border-radius: 4px;
}

.boat-name {
  padding: 2px 4px;
  font-family: monospace;
  font-size: 0.8rem;
}

.boat-name.highlight {
  background: rgba(17, 232, 163, 0.3);
  border-radius: 4px;
  font-weight: bold;
}

.btn {
  padding: 8px 16px;
  border-radius: 8px;
  border: none;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.2s;
}

.btn.small {
  padding: 4px 8px;
  font-size: 0.8rem;
}

.btn.ghost {
  background: rgba(255, 255, 255, 0.1);
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.3);
}

.btn.debug {
  background: rgba(255, 196, 0, 0.2);
  color: #ffc400;
  border: 1px solid rgba(255, 196, 0, 0.3);
}

.btn.debug.active {
  background: rgba(255, 196, 0, 0.3);
}

.btn:hover:not(:disabled) {
  transform: translateY(-1px);
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

.pill {
  background: rgba(17, 232, 163, 0.2);
  color: #11e8a3;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 0.9rem;
  border: 1px solid rgba(17, 232, 163, 0.3);
}

select, input {
  padding: 8px 12px;
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  background: rgba(255, 255, 255, 0.1);
  color: white;
}

.stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 1rem;
  margin-bottom: 1rem;
}

.stat {
  text-align: center;
}

.stat .k {
  font-size: 0.8rem;
  opacity: 0.8;
  margin-bottom: 4px;
}

.stat .v {
  font-size: 1.2rem;
  font-weight: bold;
  color: #11e8a3;
}

.table-wrap {
  overflow-x: auto;
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.2);
}

table {
  width: 100%;
  border-collapse: collapse;
}

th, td {
  padding: 8px 12px;
  text-align: left;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

th {
  background: rgba(255, 255, 255, 0.1);
  font-weight: 600;
}

tr.me {
  background: rgba(17, 232, 163, 0.2);
}

tr.me strong {
  color: #11e8a3;
}

.race-list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 1rem;
}

.race-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: rgba(255, 255, 255, 0.05);
  padding: 8px 12px;
  border-radius: 8px;
}

.error {
  background: rgba(255, 0, 0, 0.1);
  border: 1px solid rgba(255, 0, 0, 0.3);
  color: #ffaaaa;
  padding: 12px;
  border-radius: 8px;
  margin: 10px 0;
}

.empty {
  text-align: center;
  opacity: 0.7;
  padding: 2rem;
}

.empty.big {
  font-size: 1.2rem;
  padding: 3rem;
}

.card-title {
  margin: 0 0 1rem 0;
  color: #11e8a3;
}
</style>
