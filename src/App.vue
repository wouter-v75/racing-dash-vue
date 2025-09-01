<template>
  <div class="results-page">
    <!-- Toolbar -->
    <div class="toolbar">
      <div class="left">
        <label>Event</label>
        <select v-model="selectedRegattaId" :disabled="regattas.length===0">
          <option value="" disabled>— select event —</option>
          <option v-for="r in regattas" :key="r.id" :value="r.id">
            {{ r.name }} <span v-if="r.location">• {{ r.location }}</span>
          </option>
        </select>

        <label>Class</label>
        <select v-model="classId" @change="reloadOverall" :disabled="loading.classes || classes.length===0">
          <option v-for="c in classes" :key="c.id" :value="c.id">{{ c.label }}</option>
        </select>

        <label>Race</label>
        <select v-model="raceId" @change="reloadRace" :disabled="loading.races || races.length===0">
          <option v-for="r in races" :key="r.id" :value="r.id">{{ r.label }}</option>
        </select>
      </div>

      <div class="right">
        <a v-if="currentEvent?.event_url"
           :href="currentEvent.event_url" target="_blank" rel="noopener"
           class="btn link">
          Open event site
        </a>
        <span class="pill" v-if="boatName">Boat: {{ boatName }}</span>
        <button class="btn ghost" @click="reloadAll" :disabled="loading.any">Refresh</button>
        <span class="spinner" v-if="loading.any">Loading…</span>
      </div>
    </div>

    <!-- If no event is selected -->
    <div v-if="!selectedRegattaId" class="empty big">
      Choose an event to load results.
    </div>

    <!-- Grid of flip cards -->
    <div v-else class="grid">
      <!-- Last Race -->
      <div class="card">
        <FlipCard>
          <template #front>
            <h3 class="card-title">Last race</h3>
            <div v-if="!lastRace.frontReady" class="empty">Loading…</div>
            <div v-else class="stats">
              <div class="stat"><div class="k">Position</div><div class="v">{{ lastRace.front.position }}</div></div>
              <div class="stat"><div class="k">Finish time</div><div class="v">{{ lastRace.front.finishTime }}</div></div>
              <div class="stat"><div class="k">Δ corrected to first</div><div class="v">{{ lastRace.front.deltaToFirst }}</div></div>
              <div class="stat"><div class="k">Δ in front</div><div class="v">{{ lastRace.front.deltaAhead }}</div></div>
              <div class="stat"><div class="k">Δ behind</div><div class="v">{{ lastRace.front.deltaBehind }}</div></div>
            </div>
            <p class="hint">Click card to flip</p>
          </template>
          <template #back>
            <h3 class="card-title">Last race — full table</h3>
            <div class="table-wrap">
              <table>
                <thead>
                  <tr><th>#</th><th>Boat</th><th>Finish</th><th>Corrected</th><th>Δ to first</th></tr>
                </thead>
                <tbody>
                  <tr v-for="row in lastRace.table" :key="row._key" :class="{me: isMe(row.name)}">
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

      <!-- Overall -->
      <div class="card">
        <FlipCard>
          <template #front>
            <h3 class="card-title">Overall</h3>
            <div v-if="!overall.frontReady" class="empty">Loading…</div>
            <div v-else class="stats">
              <div class="stat"><div class="k">Position</div><div class="v">{{ overall.front.position }}</div></div>
              <div class="stat"><div class="k">Total points</div><div class="v">{{ overall.front.total }}</div></div>
              <div class="stat"><div class="k">Net points</div><div class="v">{{ overall.front.net }}</div></div>
            </div>
            <p class="hint">Click card to flip</p>
          </template>
          <template #back>
            <h3 class="card-title">Overall — standings</h3>
            <div class="table-wrap">
              <table>
                <thead>
                  <tr><th>#</th><th>Boat</th><th>Sail #</th><th>Skipper</th><th>Pts</th><th>Total</th></tr>
                </thead>
                <tbody>
                  <tr v-for="row in overall.table" :key="row._key" :class="{me: isMe(row.name)}">
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

      <!-- Selected Race detail -->
      <div class="card">
        <FlipCard>
          <template #front>
            <h3 class="card-title">Race detail</h3>
            <div v-if="raceRows.length === 0" class="empty">Select a race.</div>
            <div v-else class="races">
              <div class="race-row">
                <div class="race-title">Race: {{ currentRaceLabel }}</div>
                <div class="race-stats">
                  <div><span class="k">Pos</span><span class="v">{{ myRace.position }}</span></div>
                  <div><span class="k">Finish</span><span class="v">{{ myRace.finishTime }}</span></div>
                  <div><span class="k">Δ corr to 1st</span><span class="v">{{ myRace.deltaToFirst }}</span></div>
                  <div><span class="k">Δ in front</span><span class="v">{{ myRace.deltaAhead }}</span></div>
                  <div><span class="k">Δ behind</span><span class="v">{{ myRace.deltaBehind }}</span></div>
                </div>
              </div>
            </div>
            <p class="hint">Click card to flip</p>
          </template>
          <template #back>
            <h3 class="card-title">Race detail — table</h3>
            <div class="table-wrap">
              <table>
                <thead>
                  <tr><th>#</th><th>Boat</th><th>Finish</th><th>Corrected</th><th>Δ to first</th></tr>
                </thead>
                <tbody>
                  <tr v-for="row in raceRows" :key="row._key" :class="{me: isMe(row.name)}">
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

    <p v-if="err" class="error">{{ err }}</p>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { supabase } from './lib/supabase'
import FlipCard from './components/FlipCard.vue'

/** -------- User boat (from auth metadata; fallback allowed) -------- */
const boatName = ref('')

async function loadBoatFromUser(){
  try {
    const { data } = await supabase.auth.getUser()
    boatName.value = data?.user?.user_metadata?.boat_name || ''
  } catch { boatName.value = boatName.value || '' }
}

/** -------- Events from Supabase (must include event_url) -------- */
const regattas = ref([])              // [{id,name,event_id,class_id,location,event_url,...}]
const selectedRegattaId = ref('')

const currentEvent = computed(() =>
  regattas.value.find(r => r.id === selectedRegattaId.value) || null
)
const evId  = () => currentEvent.value?.event_id || ''
const clsId = () => currentEvent.value?.class_id || '' // optional; when empty we try anyway

async function loadRegattas() {
  const { data, error } = await supabase
    .from('regattas')
    .select('id,name,event_id,class_id,location,event_url,starts_on,ends_on')
    .order('starts_on', { ascending: false })
  if (!error) {
    regattas.value = data || []
    // Prefer Maxi Worlds 2024 if present; otherwise first item
    const maxi = regattas.value.find(r => (r.event_id || '').toLowerCase() === 'xolfq')
    selectedRegattaId.value = maxi?.id || regattas.value[0]?.id || ''
  }
}

/** -------- UI state -------- */
const classes = ref([])   // [{id,label}]
const classId = ref('')

const races = ref([])     // [{id,label}]
const raceId = ref('')

const lastRace = ref({
  frontReady: false,
  front: { position: '–', finishTime: '–', deltaToFirst: '–', deltaAhead: '–', deltaBehind: '–' },
  table: []
})

const overall = ref({
  frontReady: false,
  front: { position: '–', total: '–', net: '–' },
  table: []
})

const raceRows = ref([])
const currentRaceLabel = ref('')

const myRace = ref({ position:'–', finishTime:'–', deltaToFirst:'–', deltaAhead:'–', deltaBehind:'–' })

const loading = ref({
  classes: false,
  races: false,
  overall: false,
  last: false,
  race: false,
  get any(){ return this.classes || this.races || this.overall || this.last || this.race }
})
const err = ref('')

/** -------- Helpers -------- */
function isMe(name=''){
  if (!boatName.value) return false
  return (name || '').toUpperCase() === boatName.value.toUpperCase()
}
function pad2(n){ return String(n).padStart(2,'0') }
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
  const mm = Math.floor(d/60), ss = d % 60
  return `${pad2(mm)}:${pad2(ss)}`
}

async function api(path){
  const r = await fetch(path)
  if (!r.ok) throw new Error(`HTTP ${r.status}`)
  return r.json()
}

/** -------- Loaders that depend on event selection -------- */
async function loadClasses(){
  if (!evId()) return (classes.value = [], classId.value = '')
  loading.value.classes = true; err.value=''
  try {
    const json = await api(`/api/orc?type=classes&eventId=${encodeURIComponent(evId())}`)
    classes.value = json.results || []
    // classId preference: use DB class_id if present, else first returned
    classId.value = clsId() || classes.value[0]?.id || ''
  } catch(e){
    classes.value = []; classId.value = ''
    err.value = `Classes load failed: ${e.message}`
  } finally {
    loading.value.classes = false
  }
}

async function loadRaces(){
  if (!evId()) return (races.value = [], raceId.value = '')
  loading.value.races = true
  try {
    const json = await api(`/api/orc?type=races&eventId=${encodeURIComponent(evId())}`)
    races.value = json.results || []
    raceId.value = races.value[races.value.length-1]?.id || '' // default to last race
  } catch(e){
    races.value = []; raceId.value = ''
    err.value = `Races load failed: ${e.message}`
  } finally {
    loading.value.races = false
  }
}

async function reloadOverall(){
  overall.value.frontReady = false
  if (!evId() || !classId.value) return
  loading.value.overall = true
  try {
    const json = await api(`/api/orc?type=overall&eventId=${encodeURIComponent(evId())}&classId=${encodeURIComponent(classId.value)}`)
    overall.value.table = (json.results || []).map((r,i)=>({ ...r, _key:'ov'+i }))
    const mine = overall.value.table.find(r => isMe(r.name))
    overall.value.front = {
      position: mine?.position || '–',
      total: mine?.total || mine?.points || '–',
      net: mine?.points || '–'
    }
    overall.value.frontReady = true
  } catch(e){
    overall.value.frontReady = false
    err.value = `Overall failed: ${e.message}`
  } finally {
    loading.value.overall = false
  }
}

async function reloadLastRace(){
  lastRace.value.frontReady = false
  if (!evId()) return
  loading.value.last = true
  try {
    const json = await api(`/api/orc?type=lastRace&eventId=${encodeURIComponent(evId())}`)
    const rows = (json.results || []).map((r,i)=>({ ...r, _key:'lr'+i }))
    lastRace.value.table = rows

    const idx = rows.findIndex(r => isMe(r.name))
    const me = rows[idx]
    const ahead = idx>0 ? rows[idx-1] : null
    const behind= idx>=0 && idx<rows.length-1 ? rows[idx+1] : null

    lastRace.value.front = {
      position: me?.position || '–',
      finishTime: me?.finishTime || '–',
      deltaToFirst: me?.deltaToFirst || '–',
      deltaAhead: (ahead && ahead.correctedTime && me?.correctedTime) ? mmssDelta(ahead.correctedTime, me.correctedTime) : '–',
      deltaBehind: (behind && behind.correctedTime && me?.correctedTime) ? mmssDelta(me.correctedTime, behind.correctedTime) : '–'
    }
    lastRace.value.frontReady = true
  } catch(e){
    lastRace.value.frontReady = false
    err.value = `Last race failed: ${e.message}`
  } finally {
    loading.value.last = false
  }
}

async function reloadRace(){
  raceRows.value = []; myRace.value = { position:'–', finishTime:'–', deltaToFirst:'–', deltaAhead:'–', deltaBehind:'–' }
  if (!evId() || !raceId.value) return
  loading.value.race = true
  try {
    const json = await api(`/api/orc?type=race&eventId=${encodeURIComponent(evId())}&raceId=${encodeURIComponent(raceId.value)}`)
    const rows = (json.results || []).map((r,i)=>({ ...r, _key:'rc'+i }))
    raceRows.value = rows

    const idx = rows.findIndex(r => isMe(r.name))
    const me = rows[idx]
    const ahead = idx>0 ? rows[idx-1] : null
    const behind= idx>=0 && idx<rows.length-1 ? rows[idx+1] : null

    currentRaceLabel.value = races.value.find(r => r.id === raceId.value)?.label || `Race ${raceId.value}`
    myRace.value = {
      position: me?.position || '–',
      finishTime: me?.finishTime || '–',
      deltaToFirst: me?.deltaToFirst || '–',
      deltaAhead: (ahead && ahead.correctedTime && me?.correctedTime) ? mmssDelta(ahead.correctedTime, me.correctedTime) : '–',
      deltaBehind: (behind && behind.correctedTime && me?.correctedTime) ? mmssDelta(me.correctedTime, behind.correctedTime) : '–'
    }
  } catch(e){
    err.value = `Race load failed: ${e.message}`
  } finally {
    loading.value.race = false
  }
}

/** -------- Orchestrators -------- */
async function reloadAll(){
  if (!selectedRegattaId.value) return
  await Promise.all([loadClasses(), loadRaces()])
  await Promise.all([reloadOverall(), reloadLastRace()])
  await reloadRace()
}

/** Reload everything when event changes */
watch(selectedRegattaId, async () => {
  await reloadAll()
})

onMounted(async () => {
  await Promise.all([loadBoatFromUser(), loadRegattas()])
  if (selectedRegattaId.value) await reloadAll()
})
</script>

<style scoped>
.results-page { color:#fff; }

/* Toolbar */
.toolbar {
  display:flex; justify-content:space-between; align-items:center;
  gap:.8rem; margin-bottom: .9rem;
}
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
.spinner { opacity:.85; }

.empty.big {
  opacity:.9; padding: 1rem;
  background: rgba(255,255,255,.06);
  border: 1px solid rgba(255,255,255,.2);
  border-radius: 12px;
}

/* Grid & Cards */
.grid {
  display:grid; gap:16px;
  grid-template-columns: repeat(3, minmax(0,1fr));
}
@media (max-width: 1100px){ .grid { grid-template-columns: 1fr; } }

.card { min-height: 220px; }
.card-title { margin:0 0 .6rem 0; }

.stats {
  display:grid; gap:10px;
  grid-template-columns: repeat(3, minmax(0,1fr));
}
.stats .stat {
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

.races { display:grid; gap:10px; }
.race-row { background: rgba(255,255,255,.06); padding:.6rem .7rem; border-radius:10px; }
.race-title { font-weight:700; margin-bottom:.25rem; }
.race-stats { display:grid; gap:6px; grid-template-columns: repeat(5, minmax(0,1fr)); }
.race-stats .k { display:block; font-size:.75rem; opacity:.85; }
.race-stats .v { font-weight:700; }

.empty { opacity:.85; }
.hint { margin-top:.6rem; opacity:.75; font-size:.85rem; }
.error {
  margin-top: 12px;
  color:#ffd4d4; background:rgba(255,0,0,.12);
  border:1px solid rgba(255,0,0,.25); padding:.6rem .7rem; border-radius:10px;
}
</style>
