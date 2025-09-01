<template>
  <div class="results-page">
    <div class="toolbar">
      <div class="left">
        <label>Event</label>
        <select v-model="selectedRegattaId" @change="reloadAll" :disabled="regattas.length===0">
          <option disabled value="">— select event —</option>
          <option v-for="r in regattas" :key="r.id" :value="r.id">
            {{ r.name }} <span v-if="r.location">• {{ r.location }}</span>
          </option>
        </select>
      </div>
      <div class="right">
        <a v-if="currentEvent?.event_url" :href="currentEvent.event_url" target="_blank" rel="noopener" class="btn link">
          Open event site
        </a>
        <span class="pill" v-if="boatName">Boat: {{ boatName }}</span>
        <button class="btn ghost" @click="reloadAll" :disabled="loading.any">Refresh</button>
      </div>
    </div>

    <p v-if="!selectedRegattaId" class="empty big">Choose an event to load results.</p>
    <p v-if="err" class="error">{{ err }}</p>

    <!-- Overall -->
    <div v-if="selectedRegattaId" class="card">
      <FlipCard>
        <template #front>
          <h3 class="card-title">Overall Standings</h3>
          <div v-if="!overallReady" class="empty">Loading…</div>
          <div v-else class="stats">
            <div class="stat"><div class="k">Position</div><div class="v">{{ myOverall?.position || '–' }}</div></div>
            <div class="stat"><div class="k">Total</div><div class="v">{{ myOverall?.total || myOverall?.points || '–' }}</div></div>
            <div class="stat"><div class="k">Net</div><div class="v">{{ myOverall?.points || '–' }}</div></div>
          </div>
          <p class="hint">Click card to flip</p>
        </template>
        <template #back>
          <h3 class="card-title">Overall — full table</h3>
          <div class="table-wrap">
            <table>
              <thead>
                <tr><th>#</th><th>Boat</th><th>Sail #</th><th>Skipper</th><th>Pts</th><th>Total</th></tr>
              </thead>
              <tbody>
                <tr v-for="row in overallRows" :key="row._key" :class="{ me: isMe(row.name) }">
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

    <!-- Race cards: one per race -->
    <div class="grid">
      <div class="card" v-for="r in races" :key="r.id">
        <FlipCard>
          <template #front>
            <h3 class="card-title">{{ r.label }}</h3>
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
            <h3 class="card-title">{{ r.label }} — full table</h3>
            <div class="table-wrap">
              <table>
                <thead>
                  <tr><th>#</th><th>Boat</th><th>Finish</th><th>Corrected</th><th>Δ to 1st</th></tr>
                </thead>
                <tbody>
                  <tr v-for="row in raceTables[r.id]" :key="row._key" :class="{ me: isMe(row.name) }">
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
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { supabase } from '../lib/supabase'
import FlipCard from '../components/FlipCard.vue'

const API_BASE = import.meta.env.VITE_API_BASE || '' // leave blank on Vercel

/* user boat name for highlighting (pull from auth metadata if available) */
const boatName = ref('')
async function loadBoatFromUser(){
  const { data } = await supabase.auth.getUser()
  boatName.value = data?.user?.user_metadata?.boat_name || ''
}
function isMe(name=''){ return boatName.value && name?.toUpperCase() === boatName.value.toUpperCase() }

/* data from Supabase: regattas list */
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
    // Prefer Maxi Worlds 2024 if present
    const maxi = regattas.value.find(r => (r.event_id || '').toLowerCase() === 'xolfq')
    selectedRegattaId.value = maxi?.id || regattas.value[0]?.id || ''
  }
}
const evId  = () => currentEvent.value?.event_id || ''
const clsDb = () => currentEvent.value?.class_id || ''

/* UI state */
const classes = ref([])   // [{id,label}]
const races = ref([])     // [{id,label}]
const overallRows = ref([])  // table
const overallReady = ref(false)
const raceTables = ref({})      // {raceId: []}
const raceSummaries = ref({})   // {raceId: {...}}

const err = ref('')
const loading = ref({
  classes:false, races:false, overall:false, racesets:false,
  get any(){ return this.classes||this.races||this.overall||this.racesets }
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
async function loadClasses(){
  classes.value = []; loading.value.classes = true; err.value=''
  try {
    const json = await api(`/api/results-orc?type=classes&eventId=${encodeURIComponent(evId())}`)
    classes.value = json.results || []
  } catch(e){ err.value = `Classes: ${e.message}` }
  finally { loading.value.classes = false }
}

async function loadRaces(){
  races.value = []; loading.value.races = true
  try {
    const json = await api(`/api/results-orc?type=races&eventId=${encodeURIComponent(evId())}`)
    races.value = json.results || []
  } catch(e){ err.value = `Races: ${e.message}` }
  finally { loading.value.races = false }
}

async function reloadOverall(){
  overallReady.value = false; loading.value.overall = true
  try {
    const classId = clsDb() || classes.value[0]?.id || ''
    if (!classId) { overallRows.value = []; overallReady.value = true; return }
    const json = await api(`/api/results-orc?type=overall&eventId=${encodeURIComponent(evId())}&classId=${encodeURIComponent(classId)}`)
    overallRows.value = (json.results || []).map((r,i)=>({ ...r, _key:'ov'+i }))
    overallReady.value = true
  } catch(e){ err.value = `Overall: ${e.message}` }
  finally { loading.value.overall = false }
}

async function loadAllRaceTables(){
  raceTables.value = {}; raceSummaries.value = {}; loading.value.racesets = true
  try {
    for (const r of races.value) {
      const json = await api(`/api/results-orc?type=race&eventId=${encodeURIComponent(evId())}&raceId=${encodeURIComponent(r.id)}`)
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
  finally { loading.value.racesets = false }
}

/* orchestrator */
async function reloadAll(){
  if (!selectedRegattaId.value) return
  await loadClasses()
  await loadRaces()
  await reloadOverall()
  await loadAllRaceTables()
}

/* react to regatta change */
watch(selectedRegattaId, reloadAll)

onMounted(async () => {
  await Promise.all([loadBoatFromUser(), loadRegattas()])
  if (selectedRegattaId.value) await reloadAll()
})

const myOverall = computed(() => overallRows.value.find(r => isMe(r.name)))
</script>

<style scoped>
.results-page { color:#fff; padding: 12px; }

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

/* glass face lives inside FlipCard; we still style contents */
.card-title { margin:0 0 .6rem 0; }

/* stats blocks */
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
