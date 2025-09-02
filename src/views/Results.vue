<template>
  <div class="results-page">
    <!-- Toolbar -->
    <div class="toolbar">
      <div class="left">
        <label>Event</label>
        <select v-model="selectedRegattaId" @change="findBoatAndLoad" :disabled="regattas.length===0">
          <option disabled value="">— select event —</option>
          <option v-for="r in regattas" :key="r.id" :value="r.id">
            {{ r.name }} <span v-if="r.location">• {{ r.location }}</span>
          </option>
        </select>

        <label v-if="detectedClass">Auto-detected Class</label>
        <select v-if="detectedClass" v-model="selectedClassId" @change="reloadClassData">
          <option v-for="c in classes" :key="c.id" :value="c.id">{{ c.id }}</option>
        </select>
      </div>

      <div class="right">
        <a v-if="currentEvent?.event_url"
           :href="currentEvent.event_url" target="_blank" rel="noopener"
           class="btn link">Open event site</a>
        <span class="pill" v-if="boatName">{{ boatName }}</span>
        <button class="btn" @click="findBoatAndLoad" :disabled="loading.any">🔍 Find My Boat</button>
        <button class="btn ghost" @click="reloadClassData" :disabled="loading.any">Refresh</button>
      </div>
    </div>

    <p v-if="!selectedRegattaId" class="empty big">Choose an event to find your boat.</p>
    <p v-if="err" class="error">{{ err }}</p>

    <!-- Boat Detection Status -->
    <div v-if="selectedRegattaId && !detectedClass && !loading.any" class="card warning">
      <h3>🔍 Searching for "{{ boatName }}"...</h3>
      <p>Automatically scanning all classes to find your boat...</p>
      <button class="btn" @click="findBoatAndLoad">Start Search</button>
    </div>

    <div v-if="boatSearchResults.length > 0" class="card success">
      <h3>✅ Boat Found!</h3>
      <div v-for="result in boatSearchResults" :key="result.classId" class="search-result">
        <strong>"{{ result.boatData.name }}"</strong> found in class <strong>{{ result.classId }}</strong>
        <span class="position">Position {{ result.boatData.position }} of {{ result.totalBoats }}</span>
        <button class="btn small" @click="selectClass(result.classId)">View Results</button>
      </div>
    </div>

    <div v-if="selectedRegattaId && detectedClass">
      <!-- My Boat Summary -->
      <div v-if="myOverall" class="card highlight">
        <h3 class="card-title">🏆 {{ boatName }} - {{ detectedClass }}</h3>
        <div class="stats">
          <div class="stat">
            <div class="k">Overall Position</div>
            <div class="v">#{{ myOverall.position }}</div>
          </div>
          <div class="stat">
            <div class="k">Country</div>
            <div class="v">{{ myOverall.country }}</div>
          </div>
          <div class="stat">
            <div class="k">Sail Number</div>
            <div class="v">{{ myOverall.sailNo }}</div>
          </div>
          <div class="stat">
            <div class="k">Points</div>
            <div class="v">{{ myOverall.points }}</div>
          </div>
          <div class="stat">
            <div class="k">Total</div>
            <div class="v">{{ myOverall.total }}</div>
          </div>
        </div>
      </div>

      <!-- Overall Standings -->
      <div class="card">
        <h3 class="card-title">Overall Standings — {{ detectedClass }}</h3>
        <div v-if="loading.overall" class="empty">Loading overall standings...</div>
        <div v-else-if="!overallRows.length" class="empty">No overall standings data found.</div>
        <div v-else class="table-wrap">
          <table>
            <thead>
              <tr><th>#</th><th>Boat</th><th>Country</th><th>Sail No</th><th>Points</th><th>Total</th></tr>
            </thead>
            <tbody>
              <tr v-for="row in overallRows" :key="row._key" :class="{me: isMe(row.name)}">
                <td>{{ row.position }}</td>
                <td><strong>{{ row.name }}</strong></td>
                <td>{{ row.country }}</td>
                <td>{{ row.sailNo }}</td>
                <td>{{ row.points }}</td>
                <td>{{ row.total }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Last Race -->
      <div v-if="lastRaceRows.length > 0" class="card">
        <h3 class="card-title">Last Race — {{ lastRaceTitle }}</h3>
        <div v-if="myLastRace" class="stats">
          <div class="stat">
            <div class="k">Position</div>
            <div class="v">#{{ myLastRace.position }}</div>
          </div>
          <div class="stat">
            <div class="k">Finish Time</div>
            <div class="v">{{ myLastRace.finishTime }}</div>
          </div>
          <div class="stat">
            <div class="k">Corrected Time</div>
            <div class="v">{{ myLastRace.correctedTime }}</div>
          </div>
        </div>
        <div class="table-wrap">
          <table>
            <thead>
              <tr><th>#</th><th>Boat</th><th>Finish</th><th>Elapsed</th><th>Corrected</th><th>Δ to 1st</th></tr>
            </thead>
            <tbody>
              <tr v-for="row in lastRaceRows" :key="row._key" :class="{me: isMe(row.name)}">
                <td>{{ row.position }}</td>
                <td><strong>{{ row.name }}</strong></td>
                <td>{{ row.finishTime }}</td>
                <td>{{ row.elapsed }}</td>
                <td>{{ row.correctedTime }}</td>
                <td>{{ row.deltaToFirst }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- All Races -->
      <div v-if="races.length > 0" class="card">
        <h3 class="card-title">All Races ({{ races.length }} total)</h3>
        <div class="race-grid">
          <div v-for="race in races" :key="race.id" class="race-card">
            <div class="race-header">
              <strong>{{ race.label }}</strong>
              <button @click="loadRaceData(race.id)" 
                      :disabled="loading.race === race.id" 
                      class="btn small">
                {{ loading.race === race.id ? 'Loading...' : 'Load' }}
              </button>
            </div>
            
            <div v-if="raceData[race.id]" class="race-results">
              <div v-if="getRaceResult(race.id)" class="my-result">
                <strong>Your Result:</strong> 
                Position {{ getRaceResult(race.id).position }}
              </div>
              <div class="table-wrap small">
                <table>
                  <thead>
                    <tr><th>#</th><th>Boat</th><th>Finish</th><th>Corrected</th></tr>
                  </thead>
                  <tbody>
                    <tr v-for="row in raceData[race.id].slice(0, 8)" :key="row._key" :class="{me: isMe(row.name)}">
                      <td>{{ row.position }}</td>
                      <td>{{ row.name }}</td>
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
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { supabase } from '../lib/supabase'

const API_BASE = import.meta.env.VITE_API_BASE || ''

/* Enhanced boat matching */
const boatName = ref('')

function cleanNameForMatching(name) {
  return String(name || '')
    .replace(/[^a-zA-Z0-9]/g, '')
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

/* Events */
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
    const maxi = regattas.value.find(r => (r.event_id || '').toLowerCase() === 'xolfq')
    selectedRegattaId.value = maxi?.id || regattas.value[0]?.id || ''
    console.log('[REGATTAS] Loaded:', regattas.value.length)
  }
}

/* Auto-detection */
const detectedClass = ref('')
const boatSearchResults = ref([])

async function findBoatAndLoad() {
  if (!boatName.value || !evId()) return
  
  boatSearchResults.value = []
  detectedClass.value = ''
  loading.value.search = true
  err.value = ''
  
  try {
    console.log('[FIND BOAT] Searching for:', boatName.value)
    const json = await api(`/api/results-orc?type=findBoat&eventId=${encodeURIComponent(evId())}&boatName=${encodeURIComponent(boatName.value)}`)
    
    if (json.results && json.results.length > 0) {
      boatSearchResults.value = json.results
      // Auto-select the first found class
      const firstResult = json.results[0]
      detectedClass.value = firstResult.classId
      selectedClassId.value = firstResult.classId
      
      console.log('[FIND BOAT] Found in class:', firstResult.classId)
      await loadClassStructure()
      await reloadClassData()
    } else {
      err.value = `Boat "${boatName.value}" not found in any class`
      console.log('[FIND BOAT] Not found in any class')
    }
  } catch (e) {
    err.value = `Search failed: ${e.message}`
    console.error('[FIND BOAT] Error:', e.message)
  } finally {
    loading.value.search = false
  }
}

function selectClass(classId) {
  detectedClass.value = classId
  selectedClassId.value = classId
  reloadClassData()
}

/* Classes & Races */
const classes = ref([])
const selectedClassId = ref('')
const races = ref([])

async function loadClassStructure() {
  if (!evId()) return
  
  try {
    // Load all classes
    const classJson = await api(`/api/results-orc?type=classes&eventId=${encodeURIComponent(evId())}`)
    classes.value = (classJson.results || []).map(x => ({ id: x.id, label: x.id }))
    
    // Load races for detected class
    if (detectedClass.value) {
      const raceJson = await api(`/api/results-orc?type=racesForClass&eventId=${encodeURIComponent(evId())}&classId=${encodeURIComponent(detectedClass.value)}`)
      races.value = (raceJson.results || []).map(r => ({ id: r.id, label: r.label }))
      console.log('[RACES] Loaded for class:', detectedClass.value, 'Count:', races.value.length)
    }
  } catch (e) {
    console.error('[CLASS STRUCTURE] Error:', e.message)
  }
}

/* Data */
const overallRows = ref([])
const lastRaceRows = ref([])
const raceData = ref({}) // { raceId: [results] }

const myOverall = computed(() => overallRows.value.find(r => isMe(r.name)))
const myLastRace = computed(() => lastRaceRows.value.find(r => isMe(r.name)))

const forcedLastRaceByEvent = { xolfq: '13' }
const lastRaceId = computed(() => forcedLastRaceByEvent[evId()] || (races.value.at(-1)?.id || ''))
const lastRaceTitle = computed(() => lastRaceId.value ? `RACE ${lastRaceId.value}` : 'No Race')

/* Loading state */
const loading = ref({
  search: false, overall: false, last: false, race: null,
  get any() { return this.search || this.overall || this.last || this.race }
})

/* Error state */
const err = ref('')

/* API helper */
async function api(path) {
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

/* Data loaders */
async function loadOverall() {
  if (!selectedClassId.value) return
  
  overallRows.value = []
  loading.value.overall = true
  
  try {
    console.log('[OVERALL] Loading for class:', selectedClassId.value)
    const json = await api(`/api/results-orc?type=overall&eventId=${encodeURIComponent(evId())}&classId=${encodeURIComponent(selectedClassId.value)}`)
    overallRows.value = (json.results || []).map((r,i) => ({ ...r, _key:'ov'+i }))
    console.log('[OVERALL] Loaded:', overallRows.value.length, 'boats')
    
    const myBoat = overallRows.value.find(r => isMe(r.name))
    if (myBoat) {
      console.log('[OVERALL] ✅ Found boat:', myBoat.name, 'at position', myBoat.position)
    } else {
      console.log('[OVERALL] ❌ Boat not found in:', overallRows.value.map(r => r.name).join(', '))
    }
  } catch(e) { 
    err.value = `Overall: ${e.message}`
  } finally { 
    loading.value.overall = false 
  }
}

async function loadLastRace() {
  if (!lastRaceId.value || !selectedClassId.value) return
  
  lastRaceRows.value = []
  loading.value.last = true
  
  try {
    console.log('[LAST RACE] Loading race:', lastRaceId.value)
    const json = await api(`/api/results-orc?type=raceRaw&eventId=${encodeURIComponent(evId())}&raceId=${encodeURIComponent(lastRaceId.value)}&classId=${encodeURIComponent(selectedClassId.value)}`)
    lastRaceRows.value = (json.results || []).map((r,i) => ({ ...r, _key:'last-'+i }))
    console.log('[LAST RACE] Loaded:', lastRaceRows.value.length, 'boats')
  } catch(e) { 
    err.value = `Last race: ${e.message}`
  } finally { 
    loading.value.last = false 
  }
}

async function loadRaceData(raceId) {
  if (!selectedClassId.value) return
  
  loading.value.race = raceId
  
  try {
    console.log('[RACE] Loading race:', raceId)
    const json = await api(`/api/results-orc?type=race&eventId=${encodeURIComponent(evId())}&classId=${encodeURIComponent(selectedClassId.value)}&raceId=${encodeURIComponent(raceId)}`)
    const results = (json.results || []).map((r,i) => ({ ...r, _key:`race-${raceId}-${i}` }))
    raceData.value[raceId] = results
    console.log('[RACE] Loaded:', results.length, 'boats for race', raceId)
  } catch(e) { 
    console.error('[RACE] Error:', e.message)
  } finally { 
    loading.value.race = null
  }
}

function getRaceResult(raceId) {
  const results = raceData.value[raceId] || []
  return results.find(r => isMe(r.name))
}

async function reloadClassData() {
  if (!selectedClassId.value) return
  
  console.log('[RELOAD] Loading data for class:', selectedClassId.value)
  await Promise.all([
    loadOverall(),
    loadLastRace()
  ])
}

/* Main workflow */
onMounted(async () => {
  console.log('[MOUNT] Starting...')
  await loadBoatFromUser()
  await loadRegattas()
  
  if (selectedRegattaId.value && boatName.value) {
    await findBoatAndLoad()
  }
})

watch(selectedRegattaId, () => {
  if (selectedRegattaId.value && boatName.value) {
    findBoatAndLoad()
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

.card.warning {
  background: rgba(255, 196, 0, 0.1);
  border: 1px solid rgba(255, 196, 0, 0.3);
}

.card.success {
  background: rgba(0, 255, 0, 0.1);
  border: 1px solid rgba(0, 255, 0, 0.3);
}

.card.highlight {
  background: rgba(17, 232, 163, 0.1);
  border: 1px solid rgba(17, 232, 163, 0.3);
}

.search-result {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.search-result:last-child {
  border-bottom: none;
}

.position {
  color: #11e8a3;
  font-weight: 600;
}

.btn {
  padding: 8px 16px;
  border-radius: 8px;
  border: none;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.2s;
  background: linear-gradient(135deg, #11e8a3, #42f5c8);
  color: #0b2239;
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

.table-wrap.small {
  max-height: 300px;
  overflow-y: auto;
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

.race-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
  gap: 1rem;
}

.race-card {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  padding: 16px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.race-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.my-result {
  background: rgba(17, 232, 163, 0.2);
  padding: 8px 12px;
  border-radius: 6px;
  margin-bottom: 1rem;
  font-weight: 600;
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
