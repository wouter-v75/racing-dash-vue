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
      </div>
    </div>

    <p v-if="!selectedRegattaId" class="empty big">Choose an event to load results.</p>
    <p v-if="err" class="error">{{ err }}</p>

    <div v-if="selectedRegattaId && selectedClassId" class="grid">
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
              <div class="stat"><div class="k">Δ to 1st</div><div class="v">{{ lastRaceSummary.deltaToFirst }}</div></div>
              <div class="stat"><div class="k">Δ in front</div><div class="v">{{ lastRaceSummary.deltaAhead }}</div></div>
              <div class="stat"><div class="k">Δ behind</div><div class="v">{{ lastRaceSummary.deltaBehind }}</div></div>
            </div>
            <p class="hint">Click card to flip</p>
          </template>
          <template #back>
            <h3 class="card-title">Last race — full table ({{ selectedClassId || '—' }})</h3>
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

      <!-- OVERALL (middle) -->
      <div class="card">
        <FlipCard>
          <template #front>
            <h3 class="card-title">Overall — {{ selectedClassId || '—' }}</h3>
            <div v-if="loading.overall" class="empty">Loading…</div>
            <div v-else-if="!overallRows.length" class="empty">No data.</div>
            <div v-else class="stats">
              <div class="stat"><div class="k">Position</div><div class="v">{{ myOverall?.position || '–' }}</div></div>
              <div class="stat"><div class="k">Total</div><div class="v">{{ myOverall?.total || myOverall?.points || '–' }}</div></div>
              <div class="stat"><div class="k">Points</div><div class="v">{{ myOverall?.points || '–' }}</div></div>
              <div class="stat"><div class="k">Sail No</div><div class="v">{{ myOverall?.sailNo || '–' }}</div></div>
              <div class="stat"><div class="k">Skipper</div><div class="v">{{ myOverall?.skipper || '–' }}</div></div>
              <div class="stat"><div class="k">Club</div><div class="v">{{ myOverall?.club || '–' }}</div></div>
            </div>
            <p class="hint">Click card to flip</p>
          </template>
          <template #back>
            <h3 class="card-title">Overall standings — {{ selectedClassId || '—' }}</h3>
            <div class="table-wrap">
              <table>
                <thead>
                  <tr><th>#</th><th>Boat</th><th>Sail No</th><th>Skipper</th><th>Club</th><th>Points</th></tr>
                </thead>
                <tbody>
                  <tr v-for="row in overallRows" :key="row._key" :class="{me: isMe(row.name)}">
                    <td>{{ row.position }}</td>
                    <td>{{ row.name }}</td>
                    <td>{{ row.sailNo }}</td>
                    <td>{{ row.skipper }}</td>
                    <td>{{ row.club }}</td>
                    <td>{{ row.total || row.points }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </template>
        </FlipCard>
      </div>

      <!-- OTHER RACES (right) -->
      <div class="card">
        <h3 class="card-title">Other races</h3>
        <div v-if="loading.sets" class="empty">Loading…</div>
        <div v-else-if="!otherRaces.length" class="empty">No other races.</div>
        <div v-else class="race-list">
          <div v-for="r in otherRaces" :key="r.id" class="race-item">
            <div class="race-header">
              <strong>{{ r.label }}</strong>
              <span class="position">{{ raceSummaries[r.id]?.position || '–' }}</span>
            </div>
            <div class="race-details">
              <span>Finish: {{ raceSummaries[r.id]?.finishTime || '–' }}</span>
              <span>Δ to 1st: {{ raceSummaries[r.id]?.deltaToFirst || '–' }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { supabase } from '../lib/supabase'
import FlipCard from '../components/FlipCard.vue'

// Configuration
const API_BASE = import.meta.env.VITE_API_BASE || ''

// User data
const boatName = ref('')
async function loadBoatFromUser() {
  const { data } = await supabase.auth.getUser()
  boatName.value = data?.user?.user_metadata?.boat_name || ''
}

// Event selection
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
  }
}

// Classes
const classes = ref([])
const selectedClassId = ref('')
async function loadClasses(){
  classes.value = []
  if (!evId()) return
  try {
    const json = await api(`/api/results-orc?type=classes&eventId=${encodeURIComponent(evId())}`)
    classes.value = (json.results || []).map(x => ({ id: x.id, label: x.id }))
    // Default to M2 if present, else first
    selectedClassId.value = classes.value.find(c => c.id === 'M2')?.id || classes.value[0]?.id || ''
  } catch(e) {
    err.value = `Classes: ${e.message}`
  }
}

// Races
const races = ref([])
async function loadRacesForClass(){
  races.value = []
  if (!evId() || !selectedClassId.value) return
  try {
    const json = await api(`/api/results-orc?type=racesForClass&eventId=${encodeURIComponent(evId())}&classId=${encodeURIComponent(selectedClassId.value)}`)
    races.value = (json.results || []).map(r => ({ id: r.id, label: `RACE ${r.id}` }))
  } catch(e) {
    err.value = `Races: ${e.message}`
  }
}

// Last race logic
const forcedLastRaceByEvent = { xolfq: '13' }
const lastRaceId = computed(() => forcedLastRaceByEvent[evId()] || (races.value.at(-1)?.id || ''))
const lastRaceTitle = computed(() => lastRaceId.value ? `RACE ${lastRaceId.value}` : 'RACE —')

// Data storage
const overallRows = ref([])
const lastRaceRows = ref([])
const raceTables = ref({})
const raceSummaries = ref({})

// Computed values
const myOverall = computed(() => overallRows.value.find(r => isMe(r.name)))
const otherRaces = computed(() => races.value.filter(r => r.id !== lastRaceId.value))

// UI state
const err = ref('')
const loading = ref({
  classes: false, 
  races: false, 
  overall: false, 
  last: false, 
  sets: false,
  get any(){ return this.classes || this.races || this.overall || this.last || this.sets }
})

// Last race summary
const lastRaceSummary = ref({ 
  position: '–', 
  finishTime: '–', 
  deltaToFirst: '–', 
  deltaAhead: '–', 
  deltaBehind: '–' 
})

// Helper functions
async function api(path){
  const r = await fetch(`${API_BASE}${path}`)
  if (!r.ok) throw new Error(`HTTP ${r.status}: ${r.statusText}`)
  return r.json()
}

function isMe(name) {
  return boatName.value && name && name.toLowerCase().includes(boatName.value.toLowerCase())
}

function toSec(str){
  if (!str) return null
  if (/^(DNF|DNS|DSQ|DNC|RET)$/i.test(str)) return null
  const p = str.split(':').map(Number)
  return p.length === 3 ? p[0]*3600 + p[1]*60 + p[2] : p[0]*60 + p[1]
}

function mmssDelta(a, b){
  const s1 = toSec(a), s2 = toSec(b)
  if (s1 == null || s2 == null) return '–'
  const d = Math.max(0, s2 - s1)
  const mm = String(Math.floor(d/60)).padStart(2,'0')
  const ss = String(d%60).padStart(2,'0')
  return `${mm}:${ss}`
}

// Data loaders
async function reloadOverall(){
  overallRows.value = []
  loading.value.overall = true
  err.value = ''
  
  try {
    if (!selectedClassId.value) return
    const json = await api(`/api/results-orc?type=overall&eventId=${encodeURIComponent(evId())}&classId=${encodeURIComponent(selectedClassId.value)}`)
    
    if (json.success && json.results) {
      overallRows.value = json.results.map((r, i) => ({ ...r, _key: 'ov' + i }))
    } else {
      console.error('Overall results API error:', json)
      err.value = json.message || 'Failed to load overall results'
    }
  } catch(e) { 
    console.error('Overall loading error:', e)
    err.value = `Overall: ${e.message}` 
  } finally { 
    loading.value.overall = false 
  }
}

async function reloadLastRace(){
  lastRaceRows.value = []
  loading.value.last = true
  
  try {
    if (!lastRaceId.value) return
    
    // Use raceRaw to get the race page and let API pick correct class table
    const json = await api(`/api/results-orc?type=raceRaw&eventId=${encodeURIComponent(evId())}&raceId=${encodeURIComponent(lastRaceId.value)}&classId=${encodeURIComponent(selectedClassId.value)}`)
    
    if (json.success && json.results) {
      const rows = json.results.map((r, i) => ({ ...r, _key: 'last-' + i }))
      lastRaceRows.value = rows

      // Calculate summary for user's boat with ahead/behind deltas
      const idx = rows.findIndex(r => isMe(r.name))
      const me = rows[idx]
      const ahead = idx > 0 ? rows[idx - 1] : null
      const behind = idx >= 0 && idx < rows.length - 1 ? rows[idx + 1] : null

      lastRaceSummary.value = {
        position: me?.position || '–',
        finishTime: me?.finishTime || '–',
        deltaToFirst: me?.deltaToFirst || '–',
        deltaAhead: (ahead && ahead.correctedTime && me?.correctedTime) ? 
          mmssDelta(ahead.correctedTime, me.correctedTime) : '–',
        deltaBehind: (behind && behind.correctedTime && me?.correctedTime) ? 
          mmssDelta(me.correctedTime, behind.correctedTime) : '–'
      }
    } else {
      console.error('Last race API error:', json)
      err.value = json.message || 'Failed to load last race'
    }
  } catch(e) { 
    console.error('Last race loading error:', e)
    err.value = `Last race: ${e.message}` 
  } finally { 
    loading.value.last = false 
  }
}

async function loadOtherRaceTables(){
  raceTables.value = {}
  raceSummaries.value = {}
  loading.value.sets = true
  
  try {
    for (const r of otherRaces.value) {
      try {
        const json = await api(`/api/results-orc?type=race&eventId=${encodeURIComponent(evId())}&classId=${encodeURIComponent(selectedClassId.value)}&raceId=${encodeURIComponent(r.id)}`)
        
        if (json.success && json.results) {
          const rows = json.results.map((row, i) => ({ ...row, _key: `${r.id}-${i}` }))
          raceTables.value[r.id] = rows

          // Calculate summary for this race
          const idx = rows.findIndex(x => isMe(x.name))
          const me = rows[idx]
          const ahead = idx > 0 ? rows[idx - 1] : null
          const behind = idx >= 0 && idx < rows.length - 1 ? rows[idx + 1] : null

          raceSummaries.value[r.id] = {
            position: me?.position || '–',
            finishTime: me?.finishTime || '–',
            deltaToFirst: me?.deltaToFirst || '–',
            deltaAhead: (ahead && ahead.correctedTime && me?.correctedTime) ? 
              mmssDelta(ahead.correctedTime, me.correctedTime) : '–',
            deltaBehind: (behind && behind.correctedTime && me?.correctedTime) ? 
              mmssDelta(me.correctedTime, behind.correctedTime) : '–'
          }
        }
      } catch(raceError) {
        console.error(`Error loading race ${r.id}:`, raceError)
        // Continue with other races even if one fails
      }
    }
  } catch(e) { 
    err.value = `Race tables: ${e.message}` 
  } finally { 
    loading.value.sets = false 
  }
}

// Orchestration functions
async function reloadClassData() {
  await reloadOverall()
  await reloadRacesAndLast()
}

async function reloadRacesAndLast(){
  await loadRacesForClass()
  await reloadLastRace()
  await loadOtherRaceTables()
}

async function reloadAll(){
  if (!selectedRegattaId.value) return
  err.value = '' // Clear any previous errors
  await loadClasses()
  await reloadClassData()
}

// Reactive updates
watch(selectedRegattaId, () => reloadAll())
watch(selectedClassId, () => reloadClassData())

// Initialize
onMounted(async () => {
  try {
    await Promise.all([loadBoatFromUser(), loadRegattas()])
    if (selectedRegattaId.value) {
      await reloadAll()
    }
  } catch(e) {
    console.error('Initialization error:', e)
    err.value = `Initialization failed: ${e.message}`
  }
})
</script>

<style scoped>
.results-page { 
  color: #fff; 
  padding: 12px; 
  min-height: 100vh;
  background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
}

/* Toolbar */
.toolbar { 
  display: flex; 
  justify-content: space-between; 
  align-items: center; 
  gap: .8rem; 
  margin-bottom: .9rem; 
  flex-wrap: wrap;
}
.toolbar .left { 
  display: flex; 
  align-items: center; 
  gap: .5rem; 
  flex-wrap: wrap; 
}
.toolbar .right { 
  display: flex; 
  align-items: center; 
  gap: .5rem; 
  flex-wrap: wrap; 
}

label { 
  font-size: .9rem; 
  opacity: .9; 
  font-weight: 500;
}

select {
  background: rgba(255,255,255,.08);
  color: #fff;
  border: 1px solid rgba(255,255,255,.3);
  border-radius: 10px;
  padding: .5rem .7rem;
  font-size: .9rem;
  min-width: 150px;
}
select:focus {
  outline: none;
  border-color: rgba(255,255,255,.5);
  background: rgba(255,255,255,.12);
}

.pill { 
  background: rgba(255,255,255,.12); 
  border: 1px solid rgba(255,255,255,.25); 
  border-radius: 999px; 
  padding: .35rem .6rem; 
  font-size: .85rem;
}

.btn.ghost, .btn.link {
  background: rgba(255,255,255,.12);
  border: 1px solid rgba(255,255,255,.25);
  border-radius: 10px;
  padding: .5rem .8rem;
  color: #fff; 
  cursor: pointer; 
  text-decoration: none;
  font-size: .9rem;
  transition: all 0.2s ease;
}
.btn.ghost:hover, .btn.link:hover {
  background: rgba(255,255,255,.18);
  border-color: rgba(255,255,255,.4);
}
.btn:disabled {
  opacity: .5;
  cursor: not-allowed;
}

/* Grid & Cards */
.grid { 
  display: grid; 
  gap: 16px; 
  grid-template-columns: repeat(3, minmax(0, 1fr)); 
}
@media (max-width: 1100px) { 
  .grid { grid-template-columns: 1fr; } 
}

.card { 
  min-height: 220px;
  background: rgba(255,255,255,.08);
  border: 1px solid rgba(255,255,255,.2);
  border-radius: 16px;
  padding: 1rem;
  backdrop-filter: blur(10px);
}

.card-title { 
  margin: 0 0 .6rem 0; 
  font-size: 1.1rem;
  font-weight: 600;
}

/* Stats & Tables */
.stats { 
  display: grid; 
  gap: 10px; 
  grid-template-columns: repeat(3, minmax(0, 1fr)); 
}
@media (max-width: 768px) {
  .stats { grid-template-columns: repeat(2, 1fr); }
}

.stat {
  background: rgba(255,255,255,.06);
  padding: .7rem .8rem;
  border-radius: 10px;
  border: 1px solid rgba(255,255,255,.1);
}
.k { 
  font-size: .8rem; 
  opacity: .9; 
  margin-bottom: .2rem;
}
.v { 
  font-weight: 800; 
  font-size: 1.15rem; 
  color: #fff;
}

.table-wrap { 
  overflow: auto; 
  border-radius: 12px; 
  background: rgba(255,255,255,.04);
  border: 1px solid rgba(255,255,255,.1);
}
table { 
  width: 100%; 
  border-collapse: collapse; 
}
th, td { 
  text-align: left; 
  padding: .5rem .6rem; 
  border-bottom: 1px solid rgba(255,255,255,.12); 
}
th {
  background: rgba(255,255,255,.08);
  font-weight: 600;
  font-size: .85rem;
  opacity: .9;
}
tbody tr.me { 
  background: rgba(0,255,170,.12); 
  border-left: 3px solid #00ffaa;
}
tbody tr:hover {
  background: rgba(255,255,255,.04);
}

/* Race list */
.race-list {
  display: flex;
  flex-direction: column;
  gap: .5rem;
}
.race-item {
  background: rgba(255,255,255,.06);
  padding: .6rem .8rem;
  border-radius: 8px;
  border: 1px solid rgba(255,255,255,.1);
}
.race-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: .3rem;
}
.position {
  background: rgba(255,255,255,.12);
  padding: .2rem .5rem;
  border-radius: 4px;
  font-weight: 600;
  font-size: .85rem;
}
.race-details {
  display: flex;
  gap: .8rem;
  font-size: .8rem;
  opacity: .8;
}

/* States */
.empty { 
  opacity: .85; 
  text-align: center;
  padding: 1rem;
}
.empty.big {
  opacity: .9; 
  padding: 2rem 1rem;
  background: rgba(255,255,255,.06);
  border: 1px solid rgba(255,255,255,.2);
  border-radius: 12px;
  font-size: 1.1rem;
}

.hint { 
  margin-top: .6rem; 
  opacity: .75; 
  font-size: .85rem; 
  text-align: center;
  font-style: italic;
}

.error {
  margin-top: 12px;
  color: #ffd4d4; 
  background: rgba(255,0,0,.12);
  border: 1px solid rgba(255,0,0,.25); 
  padding: .6rem .7rem; 
  border-radius: 10px;
  font-size: .9rem;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .results-page {
    padding: 8px;
  }
  .toolbar {
    flex-direction: column;
    align-items: stretch;
  }
  .toolbar .left,
  .toolbar .right {
    justify-content: center;
  }
}
</style>
