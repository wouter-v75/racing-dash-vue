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
        <select v-if="classes.length" v-model="selectedClassId" @change="reloadClassData">
          <option v-for="c in classes" :key="c.id" :value="c.id">{{ classLabel(c) }}</option>
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
      <!-- LAST RACE (on top) -->
      <div class="card">
        <FlipCard>
          <template #front>
            <h3 class="card-title">Last race — {{ lastRaceTitle }}</h3>
            <div v-if="!lastRaceRows.length" class="empty">Loading…</div>
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
            <h3 class="card-title">Last race — full table</h3>
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
            <div v-if="!overallRows.length" class="empty">Loading…</div>
            <div v-else class="stats">
              <div class="stat"><div class="k">Position</div><div class="v">{{ myOverall?.position || '–' }}</div></div>
              <div class="stat"><div class="k">Total</div><div class="v">{{ myOverall?.total || myOverall?.points || '–' }}</div></div>
              <div class="stat"><div class="k">Net</div><div class="v">{{ myOverall?.points || '–' }}</div></div>
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
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { supabase } from '../lib/supabase'
import FlipCard from '../components/FlipCard.vue'

const API_BASE = import.meta.env.VITE_API_BASE || ''

/* boat name highlight from auth metadata (if any) */
const boatName = ref('')
async function loadBoatFromUser(){
  const { data } = await supabase.auth.getUser()
  boatName.value = data?.user?.user_metadata?.boat_name || ''
}
function isMe(name=''){ return boatName.value && name?.toUpperCase() === boatName.value.toUpperCase() }

/* events */
const regattas = ref([])
const selectedRegattaId = ref('')
const currentEvent = computed(() => regattas.value.find(r => r.id === selectedRegattaId.value) || null)

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
  }
}
const evId = () => currentEvent.value?.event_id || ''

/* classes & selection */
const classes = ref([])           // [{id,label}]
const selectedClassId = ref('')

function classLabel(c){ return c?.id || '—' }

async function loadClasses(){
  classes.value = []
  const json = await api(`/api/results-orc?type=classes&eventId=${encodeURIComponent(evId())}`)
  // Use id (M1, M2, …) as label; incoming labels are just "Overall"
  classes.value = (json.results || []).map(x => ({ id: x.id, label: x.id }))
  // If DB has a default class, you can pre-select it; else default M2 if present
  selectedClassId.value = classes.value.find(c => c.id === 'M2')?.id || classes.value[0]?.id || ''
}

/* races for the event (IDs only) */
const races = ref([]) // [{id,label}]
async function loadRaces(){
  races.value = []
  const json = await api(`/api/results-orc?type=races&eventId=${encodeURIComponent(evId())}`)
  // title them as "RACE <id>"
  races.value = (json.results || []).map(r => ({ id: r.id, label: `RACE ${r.id}` }))
}

/* LAST race specifics for xolfq: raceId=13 with NO class in URL */
const forcedLastRaceByEvent = { xolfq: '13' }
const lastRaceId = computed(() => forcedLastRaceByEvent[evId()] || (races.value.at(-1)?.id || ''))
const lastRaceTitle = computed(() => lastRaceId.value ? `RACE ${lastRaceId.value}` : 'RACE —')

const lastRaceRows = ref([])
const lastRaceSummary = ref({ position:'–', finishTime:'–', deltaToFirst:'–', deltaAhead:'–', deltaBehind:'–' })

/* overall & race tables */
const overallRows = ref([])
const raceTables = ref({})      // {raceId: []}
const raceSummaries = ref({})   // {raceId: {...}}

const myOverall = computed(() => overallRows.value.find(r => isMe(r.name)))

/* filtered races: exclude last race in the bottom grid */
const otherRaces = computed(() => races.value.filter(r => r.id !== lastRaceId.value))

/* loading & error */
const err = ref('')
const loading = ref({
  classes:false, races:false, overall:false, last:false, sets:false,
  get any(){ return this.classes||this.races||this.overall||this.last||this.sets }
})

/* helpers */
async function api(path){
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
    const json = await api(`/api/results-orc?type=overall&eventId=${encodeURIComponent(evId())}&classId=${encodeURIComponent(selectedClassId.value)}`)
    overallRows.value = (json.results || []).map((r,i)=>({ ...r, _key:'ov'+i }))
  } catch(e){ err.value = `Overall: ${e.message}` }
  finally { loading.value.overall = false }
}

async function reloadLastRace(){
  lastRaceRows.value = []; lastRaceSummary.value = { position:'–', finishTime:'–', deltaToFirst:'–', deltaAhead:'–', deltaBehind:'–' }
  loading.value.last = true
  try {
    if (!lastRaceId.value) return
    // Raw race (no class in URL), per your instruction
    const json = await api(`/api/results-orc?type=raceRaw&eventId=${encodeURIComponent(evId())}&raceId=${encodeURIComponent(lastRaceId.value)}`)
    const rows = (json.results || []).map((r,i)=>({ ...r, _key:'last-'+i }))
    lastRaceRows.value = rows

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
  } catch(e){ err.value = `Last race: ${e.message}` }
  finally { loading.value.last = false }
}

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
  await reloadLastRace()
  await loadOtherRaceTables()
}
async function reloadAll(){
  if (!selectedRegattaId.value) return
  await loadClasses()
  await loadRaces()
  await reloadClassData()
}

/* react to event change */
watch(selectedRegattaId, reloadAll)

onMounted(async () => {
  await Promise.all([loadBoatFromUser(), loadRegattas()])
  if (selectedRegattaId.value) await reloadAll()
})
</script>

<style scoped>
.results-page { color:#fff; padding:12px; }

/* toolbar */
.toolbar { display:flex; justify-content:space-between; align-items:center; gap:.8rem; margin-bottom:.9rem; }
.toolbar .left { display:flex; align-items:center; gap:.5rem; flex-wrap:wrap; }
.toolbar .right { display:flex; align-items:center; gap:.5rem; flex-wrap:wrap; }
label { font-size:.9rem; opacity:.9; }
select {
  background: rgba(255,255,255,.08); color:#fff;
  border:1px solid rgba(255,255,255,.3); border-radius:10px; padding:.5rem .7rem;
}
.pill { background: rgba(255,255,255,.12); border:1px solid rgba(255,255,255,.25); border-radius:999px; padding:.35rem .6rem; }
.btn.ghost, .btn.link {
  background: rgba(255,255,255,.12); border:1px solid rgba(255,255,255,.25);
  border-radius:10px; padding:.5rem .8rem; color:#fff; text-decoration:none; cursor:pointer;
}

/* layout */
.grid { display:grid; gap:16px; grid-template-columns: repeat(3, minmax(0,1fr)); }
@media (max-width:1100px){ .grid { grid-template-columns: 1fr; } }

.card { min-height:220px; }

/* contents */
.card-title { margin:0 0 .6rem 0; }
.stats { display:grid; gap:10px; grid-template-columns: repeat(3, minmax(0,1fr)); }
.stat { background: rgba(255,255,255,.06); padding:.7rem .8rem; border-radius:10px; }
.k { font-size:.8rem; opacity:.9; }
.v { font-weight:800; font-size:1.15rem; }

.table-wrap { overflow:auto; border-radius:12px; }
table { width:100%; border-collapse: collapse; }
th, td { text-align:left; padding:.5rem .6rem; border-bottom: 1px solid rgba(255,255,255,.12); }
tbody tr.me { background: rgba(0,255,170,.12); }

.empty { opacity:.85; }
.empty.big { opacity:.9; padding:1rem; background: rgba(255,255,255,.06); border:1px solid rgba(255,255,255,.2); border-radius:12px; }
.hint { margin-top:.6rem; opacity:.75; font-size:.85rem; }
.error { margin:.6rem 0 0; color:#ffd4d4; background:rgba(255,0,0,.12); border:1px solid rgba(255,0,0,.25); padding:.6rem .7rem; border-radius:10px; }
</style>
