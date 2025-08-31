<template>
  <div class="results-page">
    <!-- Toolbar -->
    <div class="toolbar">
      <div class="left">
        <label>Event</label>
        <select v-model="selectedRegattaId" @change="loadAll" :disabled="loading.regList">
          <option value="">— select —</option>
          <option v-for="r in regattas" :key="r.id" :value="r.id">
            {{ r.name }} • {{ r.location }} ({{ r.starts_on }} → {{ r.ends_on }})
          </option>
        </select>
      </div>

      <div class="right">
        <span v-if="boatName" class="pill">Boat: {{ boatName }}</span>
        <span v-if="loading.any" class="spinner">Loading…</span>
        <button class="btn ghost" @click="loadAll" :disabled="!selectedRegattaId || loading.any">Refresh</button>
      </div>
    </div>

    <!-- Grid of flip cards -->
    <div class="grid">
      <!-- Last Race -->
      <div class="card">
        <FlipCard>
          <template #front>
            <h3 class="card-title">Last race</h3>
            <div v-if="!lastRace.frontReady" class="empty">Select an event to load results.</div>
            <div v-else class="stats">
              <div class="stat">
                <div class="k">Position</div>
                <div class="v">{{ lastRace.front.position }}</div>
              </div>
              <div class="stat">
                <div class="k">Finish time</div>
                <div class="v">{{ lastRace.front.finishTime }}</div>
              </div>
              <div class="stat">
                <div class="k">Δ corrected to first</div>
                <div class="v">{{ lastRace.front.deltaToFirst }}</div>
              </div>
              <div class="stat">
                <div class="k">Δ in front</div>
                <div class="v">{{ lastRace.front.deltaAhead }}</div>
              </div>
              <div class="stat">
                <div class="k">Δ behind</div>
                <div class="v">{{ lastRace.front.deltaBehind }}</div>
              </div>
            </div>
            <p class="hint">Click card to flip</p>
          </template>

          <template #back>
            <h3 class="card-title">Last race — full table</h3>
            <div class="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>#</th><th>Boat</th><th>Finish</th><th>Corrected</th><th>Δ to first</th>
                  </tr>
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
            <div v-if="!overall.frontReady" class="empty">Select an event to load standings.</div>
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
                  <tr>
                    <th>#</th><th>Boat</th><th>Sail #</th><th>Skipper</th><th>Pts</th><th>Total</th>
                  </tr>
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
                  <tr>
                    <th>#</th><th>Boat</th><th>Finish</th><th>Corrected</th><th>Δ to first</th>
                  </tr>
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

/** ---------- State ---------- */
const boatName = ref('')
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
  front: { position: '–', total: '–', net: '–' },
  table: []
})
const racesFront = ref([])
const racesBack  = ref([])

/** ---------- Helpers ---------- */
function isMe(name=''){ return boatName.value && name.toUpperCase() === boatName.value.toUpperCase() }
function pad2(n){ return String(n).padStart(2,'0') }
/** mm:ss delta between t2 - t1, inputs "HH:MM:SS" or "MM:SS" */
function timeDelta(t1, t2){
  if (!t1 || !t2) return '–'
  const toSec = (t)=>{
    const p = t.split(':').map(Number)
    return p.length===3 ? p[0]*3600+p[1]*60+p[2] : p[0]*60+p[1]
  }
  const d = Math.max(0, toSec(t2)-toSec(t1))
  const mm = Math.floor(d/60), ss = d%60
  return `${pad2(mm)}:${pad2(ss)}`
}

/** ---------- Loaders ---------- */
async function loadBoatFromUser(){
  const { data } = await supabase.auth.getUser()
  boatName.value = data?.user?.user_metadata?.boat_name || ''
}

async function loadRegattas(){
  loading.value.regList = true; err.value=''
  try {
    const { data, error } = await supabase
      .from('regattas')
      .select('id,name,event_id,class_id,location,starts_on,ends_on')
      .order('starts_on', { ascending:false })
    if (error) throw error
    regattas.value = data || []
  } catch(e){
    err.value = `Failed to load events: ${e.message || e}`
  } finally {
    loading.value.regList = false
  }
}

async function fetchJSON(url){
  const r = await fetch(url)
  if (!r.ok) throw new Error(`HTTP ${r.status}`)
  return r.json()
}

// Overall standings
async function loadOverall(reg){
  loading.value.overall = true
  try {
    const json = await fetchJSON(`/api/orc?type=overall&eventId=${encodeURIComponent(reg.event_id)}&classId=${encodeURIComponent(reg.class_id||'')}`)
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
    err.value = `Overall failed: ${e.message || e}`
  } finally {
    loading.value.overall = false
  }
}

// Last race results (backend should resolve latest raceId)
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

    // seed race detail views
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
    err.value = `Last race failed: ${e.message || e}`
  } finally {
    loading.value.lastRace = false
  }
}

// Load everything for selected event
async function loadAll(){
  err.value=''
  const reg = regattas.value.find(r => r.id === selectedRegattaId.value)
  if (!reg) return
  await Promise.all([loadOverall(reg), loadLastRace(reg)])
}

onMounted(async () => {
  await loadBoatFromUser()
  await loadRegattas()
  if (regattas.value.length){
    selectedRegattaId.value = regattas.value[0].id
    loadAll()
  }
})
</script>

<style scoped>
.results-page { color:#fff; }

/* Toolbar */
.toolbar {
  display:flex; justify-content:space-between; align-items:center;
  gap:.8rem; margin-bottom: .9rem;
}
.toolbar .left { display:flex; align-items:center; gap:.5rem; }
.toolbar .right { display:flex; align-items:center; gap:.5rem; flex-wrap:wrap; }
label { font-size:.9rem; opacity:.9; }
select {
  background: rgba(255,255,255,.08);
  color: #fff;
  border: 1px solid rgba(255,255,255,.3);
  border-radius: 10px;
  padding: .5rem .7rem;
}
.pill {
  background: rgba(255,255,255,.12);
  border: 1px solid rgba(255,255,255,.25);
  border-radius: 999px;
  padding: .35rem .6rem;
}
.btn.ghost {
  background: rgba(255,255,255,.12);
  border: 1px solid rgba(255,255,255,.25);
  border-radius: 10px;
  padding: .5rem .8rem;
  color:#fff;
  cursor:pointer;
}
.spinner { opacity:.85; }

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
tbody tr.me { background: rgba(0, 255, 170, .12); }

.races { display:grid; gap:10px; }
.race-row { background: rgba(255,255,255,.06); padding:.6rem .7rem; border-radius:10px; }
.race-title { font-weight:700; margin-bottom:.25rem; }
.race-stats { display:grid; gap:6px; grid-template-columns: repeat(5, minmax(0,1fr)); }
.race-stats .k { display:block; font-size:.75rem; opacity:.85; }
.race-stats .v { font-weight:700; }

.empty { opacity:.8; }
.hint { margin-top:.6rem; opacity:.75; font-size:.85rem; }
.error {
  margin-top: 12px;
  color:#ffd4d4; background:rgba(255,0,0,.12);
  border:1px solid rgba(255,0,0,.25); padding:.6rem .7rem; border-radius:10px;
}
</style>
