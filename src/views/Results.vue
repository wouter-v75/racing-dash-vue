<template>
  <div class="results-page">
    <div class="toolbar">
      <div class="left">
        <label>Event</label>
        <select v-model="selectedRegattaId" @change="loadAll" :disabled="loading.regList">
          <option value="">— select —</option>
          <option v-for="r in regattas" :key="r.id" :value="r.id">
            {{ r.name }} • {{ r.location || '—' }}
            <span v-if="r.starts_on && r.ends_on"> ({{ r.starts_on }} → {{ r.ends_on }})</span>
          </option>
        </select>
      </div>
      <div class="right">
        <span class="pill">Boat: {{ boatName || 'Northstar' }}</span>
        <button class="btn ghost" @click="loadAll" :disabled="!selectedRegattaId || loading.any">Refresh</button>
      </div>
    </div>

    <div class="grid">
      <!-- Last Race -->
      <div class="card">
        <FlipCard>
          <template #front>
            <h3 class="card-title">Last race</h3>
            <div v-if="!lastRace.frontReady" class="empty">Select an event to load results.</div>
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
            <div v-if="overall.note" class="empty">{{ overall.note }}</div>
            <div v-else-if="!overall.frontReady" class="empty">Select an event to load standings.</div>
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

      <!-- Races detail -->
      <div class="card">
        <FlipCard>
          <template #front>
            <h3 class="card-title">Races detail</h3>
            <div v-if="racesFront.length === 0" class="empty">No races loaded yet.</div>
            <div v-else class="races">
              <div class="race-row" v-for="r in racesFront" :key="r.key">
                <div class="race-title">Race {{ r.raceNo }}</div>
                <div class="race-stats">
                  <div><span class="k">Pos</span><span class="v">{{ r.position }}</span></div>
                  <div><span class="k">Finish</span><span class="v">{{ r.finishTime }}</span></div>
                  <div><span class="k">Δ corr to 1st</span><span class="v">{{ r.deltaToFirst }}</span></div>
                  <div><span class="k">Δ in front</span><span class="v">{{ r.deltaAhead }}</span></div>
                  <div><span class="k">Δ behind</span><span class="v">{{ r.deltaBehind }}</span></div>
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
                  <tr v-for="row in racesBack" :key="row._key" :class="{me: isMe(row.name)}">
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
import { ref, onMounted } from 'vue'
import { supabase } from '../lib/supabase'
import FlipCard from '../components/FlipCard.vue'

/** ----- Defaults for Northstar / Sorrento Maxi Europeans ----- */
const FORCED_EVENT = {
  // used if regattas table doesn’t have this event yet
  id: 'forced-mmxzh',                 // local placeholder id
  name: 'Sorrento Maxi Europeans',
  event_id: 'mmxzh',
  class_id: '',                       // leave blank if unknown; backend may discover
  location: 'Sorrento',
  starts_on: '',
  ends_on: ''
}
const DEFAULT_BOAT = 'Northstar'

/** ----- State ----- */
const boatName = ref(DEFAULT_BOAT)
const regattas = ref([])
const selectedRegattaId = ref('')

const loading = ref({
  regList: false,
  lastRace: false,
  overall: false,
  races: false,
  get any(){ return this.regList || this.lastRace || this.overall || this.races }
})
const err = ref('')

const lastRace = ref({
  frontReady: false,
  front: { position: '–', finishTime: '–', deltaToFirst: '–', deltaAhead: '–', deltaBehind: '–' },
  table: []
})
const overall = ref({
  frontReady: false,
  note: '', // show note if classId is missing/required
  front: { position: '–', total: '–', net: '–' },
  table: []
})
const racesFront = ref([])
const racesBack  = ref([])

/** ----- Helpers ----- */
function isMe(name=''){ return (boatName.value||DEFAULT_BOAT).toUpperCase() === (name||'').toUpperCase() }
function pad2(n){ return String(n).padStart(2,'0') }
function timeDelta(t1, t2){
  if (!t1 || !t2) return '–'
  const toSec = (t)=>{ const p=t.split(':').map(Number); return p.length===3? p[0]*3600+p[1]*60+p[2] : p[0]*60+p[1] }
  const d = Math.max(0, toSec(t2)-toSec(t1))
  const mm = Math.floor(d/60), ss = d%60
  return `${pad2(mm)}:${pad2(ss)}`
}

async function loadBoatFromUser(){
  const { data } = await supabase.auth.getUser()
  const meta = data?.user?.user_metadata || {}
  boatName.value = meta.boat_name || DEFAULT_BOAT
}

async function loadRegattas(){
  loading.value.regList = true; err.value=''
  try {
    const { data, error } = await supabase
      .from('regattas')
      .select('id,name,event_id,class_id,location,starts_on,ends_on')
      .order('starts_on', { ascending:false })
    if (error) throw error
    const list = data || []
    regattas.value = list

    // If our forced event isn’t in Supabase, add it virtually so the dropdown works now.
    const exists = list.some(r => (r.event_id||'').toLowerCase() === FORCED_EVENT.event_id)
    if (!exists) {
      regattas.value = [FORCED_EVENT, ...list]
    }
  } catch(e){
    // If Supabase failed completely, still allow forced event
    regattas.value = [FORCED_EVENT]
    err.value = `Events load issue (using default): ${e.message || e}`
  } finally {
    loading.value.regList = false
  }
}

async function fetchJSON(url){
  const r = await fetch(url)
  if (!r.ok) throw new Error(`HTTP ${r.status}`)
  return r.json()
}

async function loadOverall(reg){
  overall.value.note = ''
  overall.value.frontReady = false
  loading.value.overall = true
  try {
    const cls = reg.class_id || ''
    if (!cls) {
      // Try without class; if backend requires class_id it should return a helpful error
      overall.value.note = 'Class not set for this event; attempting fetch…'
    }
    const json = await fetchJSON(`/api/orc?type=overall&eventId=${encodeURIComponent(reg.event_id)}&classId=${encodeURIComponent(cls)}`)
    overall.value.table = (json.results || []).map((r,i)=>({ ...r, _key:'ov'+i }))
    const mine = overall.value.table.find(r => isMe(r.name))
    overall.value.front = {
      position: mine?.position || '–',
      total: mine?.total || mine?.points || '–',
      net: mine?.points || '–'
    }
    overall.value.frontReady = true
    overall.value.note = ''
  } catch(e){
    overall.value.frontReady = false
    if (!reg.class_id) {
      overall.value.note = 'Overall needs a class set for this event. Add class_id in Supabase (e.g., SY, MAXI).'
    }
  } finally {
    loading.value.overall = false
  }
}

async function loadLastRace(reg){
  loading.value.lastRace = true
  try {
    const json = await fetchJSON(`/api/orc?type=lastRace&eventId=${encodeURIComponent(reg.event_id)}`)
    const rows = (json.results || []).map((r,i)=>({ ...r, _key:'lr'+i }))
    lastRace.value.table = rows

    const idx = rows.findIndex(r => isMe(r.name))
    const me  = rows[idx]
    const ahead = idx>0 ? rows[idx-1] : null
    const behind= idx>=0 && idx<rows.length-1 ? rows[idx+1] : null

    lastRace.value.front = {
      position: me?.position || '–',
      finishTime: me?.finishTime || '–',
      deltaToFirst: me?.deltaToFirst || '–',
      deltaAhead: (ahead && ahead.correctedTime && me?.correctedTime) ? timeDelta(ahead.correctedTime, me.correctedTime) : '–',
      deltaBehind: (behind && behind.correctedTime && me?.correctedTime) ? timeDelta(me.correctedTime, behind.correctedTime) : '–'
    }
    lastRace.value.frontReady = true

    racesBack.value = rows
    racesFront.value = [{
      key: 'last',
      raceNo: 'Last',
      position: lastRace.value.front.position,
      finishTime: lastRace.value.front.finishTime,
      deltaToFirst: lastRace.value.front.deltaToFirst,
      deltaAhead: lastRace.value.front.deltaAhead,
      deltaBehind: lastRace.value.front.deltaBehind
    }]
  } catch(e){
    lastRace.value.frontReady = false
  } finally {
    loading.value.lastRace = false
  }
}

async function loadAll(){
  const reg = regattas.value.find(r => r.id === selectedRegattaId.value)
  if (!reg) return
  await Promise.all([loadOverall(reg), loadLastRace(reg)])
}

onMounted(async () => {
  await loadBoatFromUser()
  await loadRegattas()
  // Auto-select Sorrento Maxi Europeans by default
  const forced = regattas.value.find(r => (r.event_id||'').toLowerCase() === FORCED_EVENT.event_id)
  selectedRegattaId.value = forced ? forced.id : (regattas.value[0]?.id || '')
  if (selectedRegattaId.value) loadAll()
})
</script>

<style scoped>
.results-page { color:#fff; }
.toolbar { display:flex; justify-content:space-between; align-items:center; gap:.8rem; margin-bottom:.9rem; }
.toolbar .left { display:flex; gap:.5rem; align-items:center; }
.toolbar .right { display:flex; gap:.5rem; align-items:center; flex-wrap:wrap; }
label { font-size:.9rem; opacity:.9; }
select {
  background: rgba(255,255,255,.08);
  color:#fff; border:1px solid rgba(255,255,255,.3); border-radius:10px; padding:.5rem .7rem;
}
.pill { background: rgba(255,255,255,.12); border:1px solid rgba(255,255,255,.25); border-radius:999px; padding:.35rem .6rem; }
.btn.ghost { background: rgba(255,255,255,.12); border:1px solid rgba(255,255,255,.25); border-radius: 10px; padding:.5rem .8rem; color:#fff; cursor:pointer; }
.grid { display:grid; gap:16px; grid-template-columns: repeat(3, minmax(0,1fr)); }
@media (max-width:1100px){ .grid { grid-template-columns: 1fr; } }
.card { min-height: 220px; }
.card-title { margin:0 0 .6rem 0; }
.stats { display:grid; gap:10px; grid-template-columns: repeat(3, minmax(0,1fr)); }
.stats .stat { background: rgba(255,255,255,.06); padding:.7rem .8rem; border-radius:10px; }
.k { font-size:.8rem; opacity:.9; } .v { font-weight:800; font-size:1.15rem; }
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
.error { margin-top:12px; color:#ffd4d4; background:rgba(255,0,0,.12); border:1px solid rgba(255,0,0,.25); padding:.6rem .7rem; border-radius:10px; }
</style>
