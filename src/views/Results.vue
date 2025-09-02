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
            <li>Cleaned Target: "{{ cleanBoatName }}"</li>
            <li>Last Race ID: {{ lastRaceId }}</li>
          </ul>
        </div>
        <div>
          <strong>Data Status:</strong>
          <ul>
            <li>Overall rows: {{ overallRows.length }}</li>
            <li>Last race rows: {{ lastRaceRows.length }}</li>
            <li>Boat found in overall: {{ !!myOverall }}</li>
            <li>Boat found in last race: {{ lastRaceRows.some(r => isMe(r.name)) }}</li>
          </ul>
        </div>
        <div v-if="debugInfo.length">
          <strong>Parser Logs:</strong>
          <div class="debug-logs">
            <div v-for="log in debugInfo" :key="log.timestamp" class="debug-log">
              {{ log.message }}
            </div>
          </div>
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
      <!-- LAST RACE (top) -->
      <div class="card">
        <FlipCard>
          <template #front>
            <h3 class="card-title">Last race — {{ lastRaceTitle }}</h3>
            <div v-if="loading.last" class="empty">Loading…</div>
            <div v-else-if="!lastRaceRows.length" class="empty">No data.</div>
            <div v-else class="stats">
              <div class="stat"><div class="k">Position</div><div class="v">{{ lastRaceSummary.position }}</div></div>
              <div class="stat"><div class="k">Finish</div><div class="v">{{ lastRaceSummary.finishTime }}</div></div>
              <div class="stat"><div class="k">Δ to first</div><div class="v">{{ lastRaceSummary.deltaToFirst }}</div></div>
              <div class="stat"><div class="k">Δ in front</div><div class="v">{{ lastRaceSummary.deltaAhead }}</div></div>
              <div class="stat"><div class="k">Δ behind</div><div class="v">{{ lastRaceSummary.deltaBehind }}</div></div>
            </div>
            <p class="hint">Click card to flip</p>
          </template>
          <template #back>
            <h3 class="card-title">{{ lastRaceTitle }} — full table</h3>
            <div class="table-wrap">
              <table>
                <thead>
                  <tr><th>#</th><th>Boat</th><th>Finish</th><th>Corrected</th><th>Δ to first</th></tr>
                </thead>
                <tbody>
                  <tr v-for="row in lastRaceRows" :key="row._key" :class="{me: isMe(row.name)}">
                    <td>{{ row.position }}</td>
                    <td>{{ row.name }}</td>
                    <td>{{ row.finishTime }}</td>
                    <td>{{ row.correctedTime }}</td>
                    <td>{{ row.deltaToFirst }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </template>
        </FlipCard>
      </div>

      <!-- OVERALL STANDINGS -->
      <div class="card">
        <FlipCard>
          <template #front>
            <h3 class="card-title">Overall standings — {{ selectedClassId }}</h3>
            <div v-if="loading.overall" class="empty">Loading…</div>
            <div v-else-if="!overallRows.length" class="empty">No data.</div>
            <div v-else class="stats">
              <div class="stat"><div class="k">Position</div><div class="v">{{ myOverall?.position || '–' }}</div></div>
              <div class="stat"><div class="k">Points</div><div class="v">{{ myOverall?.points || '–' }}</div></div>
              <div class="stat"><div class="k">Total</div><div class="v">{{ myOverall?.total || '–' }}</div></div>
            </div>
            <p class="hint">Click card to flip</p>
          </template>
          <template #back>
            <h3 class="card-title">Overall standings — full table</h3>
            <div class="table-wrap">
              <table>
                <thead>
                  <tr><th>#</th><th>Boat</th><th>Sail</th><th>Skipper</th><th>Points</th><th>Total</th></tr>
                </thead>
                <tbody>
                  <tr v-for="row in overallRows" :key="row._key" :class="{me: isMe(row.name)}">
                    <td>{{ row.position }}</td>
                    <td>{{ row.name }}</td>
                    <td>{{ row.sailNo }}</td>
                    <td>{{ row.skipper }}</td>
                    <td>{{ row.points }}</td>
                    <td>{{ row.total }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </template>
        </FlipCard>
      </div>

      <!-- PREVIOUS RACES -->
      <div v-if="otherRaces.length" class="card">
        <h3 class="card-title">Previous races</h3>
        <div v-if="loading.sets" class="empty">Loading…</div>
        <div v-else class="race-grid">
          <div v-for="r in otherRaces" :key="r.id" class="race-card">
            <FlipCard>
              <template #front>
                <h4>RACE {{ r.id }}</h4>
                <div class="stats">
                  <div class="stat"><div class="k">Position</div><div class="v">{{ raceSummaries[r.id]?.position || '–' }}</div></div>
                  <div class="stat"><div class="k">Finish</div><div class="v">{{ raceSummaries[r.id]?.finishTime || '–' }}</div></div>
                  <div class="stat"><div class="k">Δ in front</div><div class="v">{{ raceSummaries[r.id]?.deltaAhead || '–' }}</div></div>
                  <div class="stat"><div class="k">Δ behind</div><div class="v">{{ raceSummaries[r.id]?.deltaBehind || '–' }}</div></div>
                </div>
                <p class="hint">Click card to flip</p>
              </template>
              <template #back>
                <h3 class="card-title">RACE {{ r.id }} — full table</h3>
                <div class="table-wrap">
                  <table>
                    <thead>
                      <tr><th>#</th><th>Boat</th><th>Finish</th><th>Corrected</th><th>Δ to first</th></tr>
                    </thead>
                    <tbody>
                      <tr v-for="row in raceTables[r.id]" :key="row._key" :class="{me: isMe(row.name)}">
                        <td>{{ row.position }}</td>
                        <td>{{ row.name }}</td>
                        <td>{{ row.finishTime }}</td>
                        <td>{{ row.correctedTime }}</td>
                        <td>{{ row.deltaToFirst }}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </template>
            </FlipCard>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { supabase } from '../lib/supabase'
import FlipCard from '../components/FlipCard.vue'

const API_BASE = import.meta.env.VITE_API_BASE || ''

/* Debug state */
const showDebug = ref(false)
const debugInfo = ref([])

function addDebugLog(message) {
  debugInfo.value.push({
    timestamp: new Date().toISOString(),
    message: message
  })
  console.log(`[DEBUG] ${message}`)
}

function toggleDebug() {
  showDebug.value = !showDebug.value
  if (showDebug.value) {
    addDebugLog('Debug mode enabled')
  }
}

/* Enhanced boat name matching */
const boatName = ref('')
const cleanBoatName = computed(() => {
  return boatName.value ? cleanNameForMatching(boatName.value) : ''
})

function cleanNameForMatching(name) {
  return String(name || '')
    .replace(/[^a-zA-Z0-9]/g, '')  // Remove all non-alphanumeric chars
    .toUpperCase()
}

function isMe(name = '') {
  if (!boatName.value) return false
  
  const cleanInput = cleanNameForMatching(name)
  const cleanTarget = cleanBoatName.value
  
  if (!cleanInput || !cleanTarget) return false
  
  // Exact match first
  if (cleanInput === cleanTarget) return true
  
  // Partial match (handles abbreviations)
  return cleanTarget.includes(cleanInput) || cleanInput.includes(cleanTarget)
}

async function loadBoatFromUser(){
  const { data } = await supabase.auth.getUser()
  const oldBoatName = boatName.value
  boatName.value = data?.user?.user_metadata?.boat_name || ''
  
  if (oldBoatName !== boatName.value) {
    addDebugLog(`Boat name updated: "${oldBoatName}" → "${boatName.value}"`)
  }
}

/* Track all boat names found for debugging */
const allBoatNames = computed(() => {
  const names = new Set()
  overallRows.value.forEach(r => r.name && names.add(r.name))
  lastRaceRows.value.forEach(r => r.name && names.add(r.name))
  Object.values(raceTables.value).forEach(races => {
    races.forEach(r => r.name && names.add(r.name))
  })
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
    addDebugLog(`Loaded ${regattas.value.length} regattas, selected: ${selectedRegattaId.value}`)
  }
}

/* classes */
const classes = ref([])           // [{id,label}]
const selectedClassId = ref('')
async function loadClasses(){
  classes.value = []
  if (!evId()) return
  
  try {
    addDebugLog(`Loading classes for event: ${evId()}`)
    const json = await api(`/api/results-orc?type=classes&eventId=${encodeURIComponent(evId())}`)
    classes.value = (json.results || []).map(x => ({ id: x.id, label: x.id }))
    // Default to M2 if present (as you requested), else first
    selectedClassId.value = classes.value.find(c => c.id === 'M2')?.id || classes.value[0]?.id || ''
    addDebugLog(`Loaded ${classes.value.length} classes, selected: ${selectedClassId.value}`)
  } catch (e) {
    addDebugLog(`Error loading classes: ${e.message}`)
    throw e
  }
}

/* races (scoped to class) */
const races = ref([]) // [{id,label}]
async function loadRacesForClass(){
  races.value = []
  if (!evId() || !selectedClassId.value) return
  
  try {
    addDebugLog(`Loading races for class: ${selectedClassId.value}`)
    const json = await api(`/api/results-orc?type=racesForClass&eventId=${encodeURIComponent(evId())}&classId=${encodeURIComponent(selectedClassId.value)}`)
    races.value = (json.results || []).map(r => ({ id: r.id, label: `RACE ${r.id}` }))
    addDebugLog(`Loaded ${races.value.length} races`)
  } catch (e) {
    addDebugLog(`Error loading races: ${e.message}`)
    throw e
  }
}

/* "forced" last race for xolfq (13), otherwise fall back to last available id */
const forcedLastRaceByEvent = { xolfq: '13' }
const lastRaceId = computed(() => forcedLastRaceByEvent[evId()] || (races.value.at(-1)?.id || ''))
const lastRaceTitle = computed(() => lastRaceId.value ? `RACE ${lastRaceId.value}` : 'RACE —')

/* datasets */
const overallRows = ref([])
const lastRaceRows = ref([])
const raceTables = ref({})      // { [raceId]: rows[] }
const raceSummaries = ref({})   // { [raceId]: summary }

const myOverall = computed(() => {
  const result = overallRows.value.find(r => isMe(r.name))
  if (result && showDebug.value) {
    addDebugLog(`Found boat in overall: ${result.name} at position ${result.position}`)
  }
  return result
})
const otherRaces = computed(() => races.value.filter(r => r.id !== lastRaceId.value))

/* ui state */
const err = ref('')
const loading = ref({
  classes:false, races:false, overall:false, last:false, sets:false,
  get any(){ return this.classes||this.races||this.overall||this.last||this.sets }
})

/* helpers */
async function api(path){
  const fullUrl = `${API_BASE}${path}`
  addDebugLog(`API call: ${fullUrl}`)
  
  const r = await fetch(fullUrl)
  if (!r.ok) {
    const errorMsg = `HTTP ${r.status} - ${r.statusText}`
    addDebugLog(`API error: ${errorMsg}`)
    throw new Error(errorMsg)
  }
  
  const json = await r.json()
  addDebugLog(`API response: ${json.results?.length || 0} results`)
  return json
}

function toSec(str){
  if (!str) return null
  if (/^(DNF|DNS|DSQ|DNC|RET)$/i.test(str)) return null
  const p = str.split(':').map(Number)
  return p.length === 3 ? p[0]*3600 + p[1]*60 + p[2] : p[0]*60 + p[1]
}

function mmssDelta(a,b){
  const s1 = toSec(a), s2 = toSec(b)
  if (s1 == null || s2 == null) return '–'
  const d = Math.max(0, s2 - s1)
  const mm = String(Math.floor(d/60)).padStart(2,'0')
  const ss = String(d%60).padStart(2,'0')
  return `${mm}:${ss}`
}

/* loaders */
async function reloadOverall(){
  overallRows.value = []; loading.value.overall = true
  try {
    if (!selectedClassId.value) return
    addDebugLog(`Loading overall standings for class: ${selectedClassId.value}`)
    const json = await api(`/api/results-orc?type=overall&eventId=${encodeURIComponent(evId())}&classId=${encodeURIComponent(selectedClassId.value)}`)
    overallRows.value = (json.results || []).map((r,i)=>({ ...r, _key:'ov'+i }))
    addDebugLog(`Overall standings loaded: ${overallRows.value.length} boats`)
    
    // Check if our boat was found
    const myBoat = overallRows.value.find(r => isMe(r.name))
    if (myBoat) {
      addDebugLog(`✅ Found "${boatName.value}" in overall standings as "${myBoat.name}" at position ${myBoat.position}`)
    } else {
      addDebugLog(`❌ "${boatName.value}" not found in overall standings`)
      addDebugLog(`Available boats: ${overallRows.value.map(r => r.name).join(', ')}`)
    }
  } catch(e){ 
    err.value = `Overall: ${e.message}`
    addDebugLog(`Overall error: ${e.message}`)
  }
  finally { loading.value.overall = false }
}

async function reloadLastRace(){
  lastRaceRows.value = []
  loading.value.last = true
  try {
    if (!lastRaceId.value) return
    addDebugLog(`Loading last race: ${lastRaceId.value}`)
    // raw race page, but tell API which class table to pick
    const json = await api(`/api/results-orc?type=raceRaw&eventId=${encodeURIComponent(evId())}&raceId=${encodeURIComponent(lastRaceId.value)}&classId=${encodeURIComponent(selectedClassId.value)}`)
    const rows = (json.results || []).map((r,i)=>({ ...r, _key:'last-'+i }))
    lastRaceRows.value = rows
    addDebugLog(`Last race loaded: ${rows.length} boats`)

    // summary for user's boat, with ahead/behind deltas
    const idx = rows.findIndex(r => isMe(r.name))
    const me = rows[idx]
    const ahead  = idx>0 ? rows[idx-1] : null
    const behind = idx>=0 && idx<rows.length-1 ? rows[idx+1] : null

    if (me) {
      addDebugLog(`✅ Found "${boatName.value}" in last race as "${me.name}" at position ${me.position}`)
    } else {
      addDebugLog(`❌ "${boatName.value}" not found in last race`)
    }

    lastRaceSummary.value = {
      position: me?.position || '–',
      finishTime: me?.finishTime || '–',
      deltaToFirst: me?.deltaToFirst || '–',
      deltaAhead: (ahead && ahead.correctedTime && me?.correctedTime) ? mmssDelta(ahead.correctedTime, me.correctedTime) : '–',
      deltaBehind: (behind && behind.correctedTime && me?.correctedTime) ? mmssDelta(me.correctedTime, behind.correctedTime) : '–'
    }
  } catch(e){ 
    err.value = `Last race: ${e.message}`
    addDebugLog(`Last race error: ${e.message}`)
  }
  finally { loading.value.last = false }
}

const lastRaceSummary = ref({ position:'–', finishTime:'–', deltaToFirst:'–', deltaAhead:'–', deltaBehind:'–' })

async function loadOtherRaceTables(){
  raceTables.value = {}; raceSummaries.value = {}; loading.value.sets = true
  try {
    for (const r of otherRaces.value) {
      addDebugLog(`Loading race ${r.id}`)
      const json = await api(`/api/results-orc?type=race&eventId=${encodeURIComponent(evId())}&classId=${encodeURIComponent(selectedClassId.value)}&raceId=${encodeURIComponent(r.id)}`)
      const rows = (json.results || []).map((row,i)=>({ ...row, _key:`${r.id}-${i}` }))
      raceTables.value[r.id] = rows

      const idx = rows.findIndex(x => isMe(x.name))
      const me = rows[idx]
      const ahead  = idx>0 ? rows[idx-1] : null
      const behind = idx>=0 && idx<rows.length-1 ? rows[idx+1] : null

      raceSummaries.value[r.id] = {
        position: me?.position || '–',
        finishTime: me?.finishTime || '–',
        deltaToFirst: me?.deltaToFirst || '–',
        deltaAhead: (ahead && ahead.correctedTime && me?.correctedTime) ? mmssDelta(ahead.correctedTime, me.correctedTime) : '–',
        deltaBehind: (behind && behind.correctedTime && me?.correctedTime) ? mmssDelta(me.correctedTime, behind.correctedTime) : '–'
      }
      
      if (me) {
        addDebugLog(`✅ Found boat in race ${r.id}: ${me.name} at position ${me.position}`)
      }
    }
  } catch(e){ 
    err.value = `Previous races: ${e.message}`
    addDebugLog(`Previous races error: ${e.message}`)
  }
  finally { loading.value.sets = false }
}

/* main reload logic */
async function reloadAll(){
  err.value = ''
  debugInfo.value = []
  addDebugLog('Starting data reload...')
  
  try {
    await loadClasses()
    if (!selectedClassId.value) return
    
    await Promise.all([
      loadRacesForClass(),
      reloadOverall()
    ])
    
    if (lastRaceId.value) {
      await reloadLastRace()
    }
    
    if (otherRaces.value.length) {
      await loadOtherRaceTables()
    }
    
    addDebugLog('Data reload completed successfully')
  } catch (e) {
    err.value = e.message
    addDebugLog(`Reload failed: ${e.message}`)
  }
}

/* watchers */
watch(selectedClassId, () => selectedClassId.value && reloadAll())

/* lifecycle */
onMounted(async () => {
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

.debug-logs {
  max-height: 200px;
  overflow-y: auto;
  background: rgba(0, 0, 0, 0.2);
  padding: 8px;
  border-radius: 4px;
  font-family: monospace;
  font-size: 0.8rem;
}

.debug-log {
  margin-bottom: 4px;
  opacity: 0.9;
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

.btn:hover {
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
  font-weight: bold;
}

.race-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1rem;
}

.race-card {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  padding: 16px;
  border: 1px solid rgba(255, 255, 255, 0.1);
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

.hint {
  text-align: center;
  opacity: 0.6;
  font-size: 0.8rem;
  margin-top: 1rem;
}

.card-title {
  margin: 0 0 1rem 0;
  color: #11e8a3;
}
</style>
