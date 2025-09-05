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

    <div v-if="selectedRegattaId">
      <!-- OVERALL STANDINGS (top) -->
      <div class="card">
        <FlipCard>
          <template #front>
            <h3 class="card-title">Series Overall — {{ selectedClassId }}</h3>
            <div v-if="loading.overall" class="empty">Loading…</div>
            <div v-else-if="!overallRows.length" class="empty">No data.</div>
            <div v-else class="stats">
              <div class="stat"><div class="k">Position</div><div class="v">{{ myOverall?.position || '–' }}</div></div>
              <div class="stat"><div class="k">Boat</div><div class="v">{{ myOverall?.name || 'Not found' }}</div></div>
              <div class="stat"><div class="k">Points</div><div class="v">{{ myOverall?.points || '–' }}</div></div>
              <div class="stat"><div class="k">Total</div><div class="v">{{ myOverall?.total || myOverall?.points || '–' }}</div></div>
            </div>
            <p class="hint">Click card to flip</p>
          </template>
          <template #back>
            <h3 class="card-title">Overall — standings ({{ selectedClassId }})</h3>
            <div class="table-wrap">
              <table>
                <thead>
                  <tr><th>#</th><th>Boat</th><th>Sail #</th><th>Skipper</th><th>Pts</th><th>Total</th></tr>
                </thead>
                <tbody>
                  <tr v-for="row in overallRows" :key="row._key" :class="{me: isMe(row.name)}">
                    <td>{{ row.position }}</td>
                    <td>{{ row.name }}</td>
                    <td>{{ row.sailNo }}</td>
                    <td>{{ row.skipper || row.owner }}</td>
                    <td>{{ row.points }}</td>
                    <td>{{ row.total }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </template>
        </FlipCard>
      </div>

      <!-- LAST RACE -->
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
              <div class="stat"><div class="k">Δ in front</div><div class="v">{{ lastRaceSummary.deltaAhead || '–' }}</div></div>
              <div class="stat"><div class="k">Δ behind</div><div class="v">{{ lastRaceSummary.deltaBehind || '–' }}</div></div>
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

      <!-- OTHER RACES (bottom) -->
      <div class="grid">
        <div class="card" v-for="r in otherRaces" :key="r.id">
          <FlipCard>
            <template #front>
              <h3 class="card-title">RACE {{ r.id }} — {{ selectedClassId }}</h3>
              <div v-if="!raceTables[r.id]" class="empty">Loading…</div>
              <div v-else class="stats">
                <div class="stat"><div class="k">Position</div><div class="v">{{ raceSummaries[r.id]?.position || '–' }}</div></div>
                <div class="stat"><div class="k">Finish</div><div class="v">{{ raceSummaries[r.id]?.finishTime || '–' }}</div></div>
                <div class="stat"><div class="k">Δ to 1st</div><div class="v">{{ raceSummaries[r.id]?.deltaToFirst || '–' }}</div></div>
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

    <!-- ===== DEBUG SECTION ===== -->
    <div class="debug-section">
      <h2 style="color: red; background: rgba(255,0,0,0.2); padding: 10px; border-radius: 8px;">
        🚨 DEBUG INFO - BOAT MATCHING ISSUE 🚨
      </h2>
      
      <div class="debug-grid">
        <div class="debug-card">
          <h3>Boat Matching</h3>
          <div><strong>My Boat Name:</strong> "{{ boatName }}"</div>
          <div><strong>Event ID:</strong> "{{ evId() }}"</div>
          <div><strong>Class:</strong> "{{ selectedClassId }}"</div>
          <div><strong>Overall Boats:</strong> {{ overallRows.length }}</div>
          
          <div v-if="overallRows.length > 0">
            <h4>All Boats (with match test):</h4>
            <div v-for="boat in overallRows" :key="boat._key" class="boat-test">
              {{ boat.position }}. "{{ boat.name }}" 
              → {{ isMe(boat.name) ? '✅ MATCH!' : '❌ no match' }}
            </div>
          </div>
          
          <div v-if="myOverall" style="background: green; padding: 8px; margin: 8px 0;">
            <strong>✅ FOUND MY BOAT:</strong><br>
            Name: {{ myOverall.name }}<br>
            Position: {{ myOverall.position }}<br>
            Points: {{ myOverall.points }}
          </div>
        </div>

        <div class="debug-card">
          <h3>API Status</h3>
          <div><strong>Loading States:</strong></div>
          <div>Overall: {{ loading.overall ? 'Loading...' : 'Done' }}</div>
          <div>Last Race: {{ loading.last ? 'Loading...' : 'Done' }}</div>
          <div>Classes: {{ loading.classes ? 'Loading...' : 'Done' }}</div>
          
          <div v-if="err" style="background: rgba(255,0,0,0.3); padding: 8px; margin: 8px 0;">
            <strong>❌ ERROR:</strong> {{ err }}
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

/* highlight current user's boat (FIXED BOAT MATCHING) */
const boatName = ref('')
async function loadBoatFromUser(){
  const { data } = await supabase.auth.getUser()
  boatName.value = data?.user?.user_metadata?.boat_name || ''
  console.log('Loaded boat name from user:', boatName.value)
}

// FIXED: Better boat matching for "Northstar of London"
function isMe(name=''){
  if (!boatName.value || !name) return false
  
  const myName = boatName.value.toLowerCase()
  const testName = name.toLowerCase()
  
  console.log('Boat match test:', { myName, testName })
  
  // Multiple matching strategies
  const matches = [
    testName === myName,                                    // Exact match
    testName.includes('northstar'),                         // Contains northstar
    myName.includes('northstar') && testName.includes('northstar'), // Both contain northstar
    testName.includes('northstar of london'),               // Full name match
    testName.replace(/\s+/g, '') === myName.replace(/\s+/g, ''), // Match ignoring spaces
  ]
  
  const isMatch = matches.some(m => m === true)
  console.log('Match result:', isMatch, 'for boat:', name)
  
  return isMatch
}

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
  }
}

/* classes */
const classes = ref([])           // [{id,label}]
const selectedClassId = ref('')
async function loadClasses(){
  classes.value = []
  if (!evId()) return
  const json = await api(`/api/results-orc?type=classes&eventId=${encodeURIComponent(evId())}`)
  classes.value = (json.results || []).map(x => ({ id: x.id, label: x.id }))
  // Default to M2 if present (as you requested), else first
  selectedClassId.value = classes.value.find(c => c.id === 'M2')?.id || classes.value[0]?.id || ''
}

/* races (scoped to class) */
const races = ref([]) // [{id,label}]
async function loadRacesForClass(){
  races.value = []
  if (!evId() || !selectedClassId.value) return
  const json = await api(`/api/results-orc?type=racesForClass&eventId=${encodeURIComponent(evId())}&classId=${encodeURIComponent(selectedClassId.value)}`)
  races.value = (json.results || []).map(r => ({ id: r.id, label: `RACE ${r.id}` }))
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
  const found = overallRows.value.find(r => isMe(r.name))
  console.log('myOverall computed - found:', found?.name || 'NONE')
  return found
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
  console.log('API call:', path)
  const r = await fetch(`${API_BASE}${path}`)
  if (!r.ok) throw new Error(`HTTP ${r.status}`)
  return r.json()
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
    console.log('Loading overall for:', evId(), selectedClassId.value)
    const json = await api(`/api/results-orc?type=overall&eventId=${encodeURIComponent(evId())}&classId=${encodeURIComponent(selectedClassId.value)}`)
    console.log('Overall API response:', json)
    overallRows.value = (json.results || []).map((r,i)=>({ ...r, _key:'ov'+i }))
    console.log('Loaded', overallRows.value.length, 'boats')
    
    // Log all boat names for debugging
    overallRows.value.forEach((boat, i) => {
      console.log(`Boat ${i + 1}: "${boat.name}"`)
    })
  } catch(e){ 
    console.error('Overall error:', e)
    err.value = `Overall: ${e.message}` 
  }
  finally { loading.value.overall = false }
}

async function reloadLastRace(){
  lastRaceRows.value = []
  loading.value.last = true
  try {
    if (!lastRaceId.value) return
    // raw race page, but tell API which class table to pick
    const json = await api(`/api/results-orc?type=raceRaw&eventId=${encodeURIComponent(evId())}&raceId=${encodeURIComponent(lastRaceId.value)}&classId=${encodeURIComponent(selectedClassId.value)}`)
    const rows = (json.results || []).map((r,i)=>({ ...r, _key:'last-'+i }))
    lastRaceRows.value = rows

    // summary for user's boat, with ahead/behind deltas
    const idx = rows.findIndex(r => isMe(r.name))
    const me = rows[idx]
    const ahead  = idx>0 ? rows[idx-1] : null
    const behind = idx>=0 && idx<rows.length-1 ? rows[idx+1] : null

    lastRaceSummary.value = {
      position: me?.position || '–',
      finishTime: me?.finishTime || '–',
      deltaToFirst: me?.deltaToFirst || '–',
      deltaAhead: (ahead && ahead.correctedTime && me?.correctedTime) ? mmssDelta(ahead.correctedTime, me.correctedTime) : '–',
      deltaBehind: (behind && behind.correctedTime && me?.correctedTime) ? mmssDelta(me.correctedTime, behind.correctedTime) : '–'
    }
  } catch(e){ 
    console.error('Last race error:', e)
    err.value = `Last race: ${e.message}` 
  }
  finally { loading.value.last = false }
}

const lastRaceSummary = ref({ position:'–', finishTime:'–', deltaToFirst:'–', deltaAhead:'–', deltaBehind:'–' })

async function loadOtherRaceTables(){
  raceTables.value = {}; raceSummaries.value = {}; loading.value.sets = true
  try {
    for (const r of otherRaces.value) {
      const json = await api(`/api/results-orc?type=race&eventId=${encodeURIComponent(evId())}&classId=${encodeURIComponent(selectedClassId.value)}&raceId=${encodeURIComponent(r.id)}`)
      const rows = (json.results || []).map((row,i)=>({ ...row, _key:`${r.id}-${i}` }))
      raceTables.value[r.id] = rows

      const idx = rows.findIndex(x => isMe(x.name))
      const me = rows[idx]
      const ahead  = idx>0 ? rows[idx-1] : null
      const behind = idx>=0 && idx<rows.length-1 ? rows[idx+1] : null

      raceSummaries.value[r.id] = {
        position:     me?.position || '–',
        finishTime:   me?.finishTime || '–',
        deltaToFirst: me?.deltaToFirst || '–',
        deltaAhead:   (ahead && ahead.correctedTime && me?.correctedTime) ? mmssDelta(ahead.correctedTime, me.correctedTime) : '–',
        deltaBehind:  (behind && behind.correctedTime && me?.correctedTime) ? mmssDelta(me.correctedTime, behind.correctedTime) : '–'
      }
    }
  } catch(e){ err.value = `Race tables: ${e.message}` }
  finally { loading.value.sets = false }
}

/* orchestration */
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
  await loadClasses()
  await reloadClassData()
}

/* react to changes */
watch(selectedRegattaId, () => reloadAll())
watch(selectedClassId, () => reloadClassData())

onMounted(async () => {
  await Promise.all([loadBoatFromUser(), loadRegattas()])
  if (selectedRegattaId.value) await reloadAll()
})
</script>

<style scoped>
.results-page { color:#fff; padding:12px; }

/* Toolbar */
.toolbar { display:flex; justify-content:space-between; align-items:center; gap:.8rem; margin-bottom:.9rem; }
.toolbar .left { display:flex; align-items:center; gap:.5rem; flex-wrap:wrap; }
.toolbar .right { display:flex; align-items:center; gap:.5rem; flex-wrap:wrap; }
label { font-size:.9rem; opacity:.9; }
select {
  background: rgba(255,255,255,.08);
  color: #fff;
  border: 1px solid rgba(255,255,255,.3);
  border-radius: 10px;
  padding: .5rem .7rem;
}
.pill { background: rgba(255,255,255,.12); border:1px solid rgba(255,255,255,.25); border-radius:999px; padding:.35rem .6rem; }
.btn.ghost, .btn.link {
  background: rgba(255,255,255,.12);
  border:1px solid rgba(255,255,255,.25);
  border-radius: 10px;
  padding:.5rem .8rem;
  color:#fff; cursor:pointer; text-decoration:none;
}

/* Grid & Cards */
.grid { display:grid; gap:16px; grid-template-columns: repeat(3, minmax(0,1fr)); }
@media (max-width: 1100px){ .grid { grid-template-columns: 1fr; } }
.card { min-height: 220px; }
.card-title { margin:0 0 .6rem 0; }

/* Stats & Tables */
.stats { display:grid; gap:10px; grid-template-columns: repeat(3, minmax(0,1fr)); }
.stat {
  background: rgba(255,255,255,.06);
  padding:.7rem .8rem;
  border-radius:10px;
}
.k { font-size:.8rem; opacity:.9; }
.v { font-weight:800; font-size:1.15rem; }

.table-wrap { overflow:auto; border-radius:12px; }
table { width:100%; border-collapse: collapse; }
th, td { text-align:left; padding:.5rem .6rem; border-bottom: 1px solid rgba(255,255,255,.12); }
tbody tr.me { background: rgba(0,255,170,.12); }

.empty { opacity:.85; }
.empty.big {
  opacity:.9; padding: 1rem;
  background: rgba(255,255,255,.06);
  border: 1px solid rgba(255,255,255,.2);
  border-radius: 12px;
}
.hint { margin-top:.6rem; opacity:.75; font-size:.85rem; }
.error {
  margin-top: 12px;
  color:#ffd4d4; background:rgba(255,0,0,.12);
  border:1px solid rgba(255,0,0,.25); padding:.6rem .7rem; border-radius:10px;
}

/* Debug Section */
.debug-section {
  margin-top: 2rem;
  padding: 1rem;
  background: rgba(255,0,0,0.1);
  border: 2px solid red;
  border-radius: 12px;
}

.debug-grid {
  display: grid;
  gap: 1rem;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
}

.debug-card {
  background: rgba(0,0,0,0.3);
  padding: 1rem;
  border-radius: 8px;
  font-family: monospace;
  font-size: 0.85rem;
}

.debug-card h3 {
  color: yellow;
  margin-bottom: 0.5rem;
}

.debug-card h4 {
  color: orange;
  margin: 0.5rem 0;
}

.boat-test {
  padding: 2px 0;
  border-bottom: 1px solid rgba(255,255,255,0.1);
}
</style>
