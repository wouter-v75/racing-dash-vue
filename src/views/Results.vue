<template>
  <div class="results-page">
    <!-- Top row: Event dropdown -->
    <div class="toolbar">
      <label>Event</label>
      <select v-model="selectedRegattaId" @change="loadData">
        <option value="">— select —</option>
        <option v-for="r in regattas" :key="r.id" :value="r.id">
          {{ r.name }} • {{ r.location }} ({{ r.starts_on }} → {{ r.ends_on }})
        </option>
      </select>
      <span class="muted" v-if="loading">Loading…</span>
    </div>

    <div class="grid">
      <!-- Last race card -->
      <FlipCard>
        <template #front>
          <h3 class="card-title">Last race</h3>
          <div class="stats">
            <div class="stat">
              <div class="k">Position</div>
              <div class="v">{{ lastRace.front.position || '–' }}</div>
            </div>
            <div class="stat">
              <div class="k">Finish time</div>
              <div class="v">{{ lastRace.front.finishTime || '–' }}</div>
            </div>
            <div class="stat">
              <div class="k">Δ corrected to first</div>
              <div class="v">{{ lastRace.front.deltaToFirst || '–' }}</div>
            </div>
            <div class="stat">
              <div class="k">Δ in front</div>
              <div class="v">{{ lastRace.front.deltaAhead || '–' }}</div>
            </div>
            <div class="stat">
              <div class="k">Δ behind</div>
              <div class="v">{{ lastRace.front.deltaBehind || '–' }}</div>
            </div>
          </div>
          <p class="hint">Click to flip</p>
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
                <tr v-for="row in lastRace.table" :key="row._key">
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

      <!-- Overall card -->
      <FlipCard>
        <template #front>
          <h3 class="card-title">Overall</h3>
          <div class="stats">
            <div class="stat"><div class="k">Position</div><div class="v">{{ overall.front.position || '–' }}</div></div>
            <div class="stat"><div class="k">Total points</div><div class="v">{{ overall.front.total || '–' }}</div></div>
            <div class="stat"><div class="k">Net points</div><div class="v">{{ overall.front.net || '–' }}</div></div>
          </div>
          <p class="hint">Click to flip</p>
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
                <tr v-for="row in overall.table" :key="row._key">
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

      <!-- Races detail card -->
      <FlipCard>
        <template #front>
          <h3 class="card-title">Races detail</h3>
          <div v-if="racesFront.length === 0" class="muted">No races yet</div>
          <div class="races">
            <div class="race-row" v-for="r in racesFront" :key="r.raceNo">
              <div class="race-title">Race {{ r.raceNo }}</div>
              <div class="race-stats">
                <div><span class="k">Pos</span><span class="v">{{ r.position || '–' }}</span></div>
                <div><span class="k">Finish</span><span class="v">{{ r.finishTime || '–' }}</span></div>
                <div><span class="k">Δ corr to first</span><span class="v">{{ r.deltaToFirst || '–' }}</span></div>
                <div><span class="k">Δ in front</span><span class="v">{{ r.deltaAhead || '–' }}</span></div>
                <div><span class="k">Δ behind</span><span class="v">{{ r.deltaBehind || '–' }}</span></div>
              </div>
            </div>
          </div>
          <p class="hint">Click to flip</p>
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
                <tr v-for="row in racesBack" :key="row._key">
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
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { supabase } from '../lib/supabase'
import FlipCard from '../components/FlipCard.vue'

/**
 * Assumptions:
 * - Supabase table `regattas` has: id, name, event_id (ORC), class_id (ORC), location, starts_on, ends_on
 * - Your backend function /api/orc returns:
 *   { success, resultType: 'race'|'overall', results: [...], lastUpdated }
 *   race rows: { position, name, sailNo, skipper, finishTime, correctedTime, points, deltaToFirst, deltaAhead, deltaBehind }
 *   overall rows: { position, name, sailNo, skipper, points, total }
 * - Config BOAT name is the signed-in user's preferred boat name, or hardcode for now:
 */
const myBoatName = ref('MOAT')  // TODO: wire to user/team config

const regattas = ref([])
const selectedRegattaId = ref('')

const loading = ref(false)
const lastRace = ref({ front: {}, table: [] })
const overall  = ref({ front: {}, table: [] })
const racesFront = ref([]) // compact per-race rows (your sketch)
const racesBack  = ref([]) // combined table rows (for back side)

async function loadRegattas() {
  const { data, error } = await supabase
    .from('regattas')
    .select('id,name,event_id,class_id,location,starts_on,ends_on')
    .order('starts_on', { ascending: false })
  if (!error) regattas.value = data || []
}

// Core loader hooked to dropdown change
async function loadData() {
  if (!selectedRegattaId.value) return
  const reg = regattas.value.find(r => r.id === selectedRegattaId.value)
  if (!reg) return
  loading.value = true
  try {
    // 1) Overall
    const overallRes = await fetch(`/api/orc?type=overall&eventId=${encodeURIComponent(reg.event_id)}&classId=${encodeURIComponent(reg.class_id || '')}`)
    const overallJson = await overallRes.json()
    overall.value.table = (overallJson.results || []).map((r, i) => ({ ...r, _key: 'ov'+i }))
    // Fill front for my boat
    const mineOv = overall.value.table.find(r => r.name?.toUpperCase() === myBoatName.value.toUpperCase())
    overall.value.front = {
      position: mineOv?.position || '–',
      total: mineOv?.total || mineOv?.points || '–',
      net: mineOv?.points || '–'
    }

    // 2) Last race (assume backend picks latest race if raceId not provided)
    const raceRes = await fetch(`/api/orc?type=lastRace&eventId=${encodeURIComponent(reg.event_id)}`)
    const raceJson = await raceRes.json()
    const rows = (raceJson.results || []).map((r, i) => ({ ...r, _key: 'lr'+i }))
    lastRace.value.table = rows
    const idx = rows.findIndex(r => (r.name||'').toUpperCase() === myBoatName.value.toUpperCase())
    const me = rows[idx]
    lastRace.value.front = {
      position: me?.position || '–',
      finishTime: me?.finishTime || '–',
      deltaToFirst: me?.deltaToFirst || '–',
      deltaAhead: idx > 0 && rows[idx-1]?.correctedTime && me?.correctedTime
        ? timeDelta(rows[idx-1].correctedTime, me.correctedTime)
        : '–',
      deltaBehind: idx >= 0 && rows[idx+1]?.correctedTime && me?.correctedTime
        ? timeDelta(me.correctedTime, rows[idx+1].correctedTime)
        : '–'
    }

    // 3) Races detail (front: compact per race for my boat; back: table for selected race)
    // For v1 we’ll reuse last race rows for the back; later we can loop all raceIds.
    racesBack.value = rows
    racesFront.value = [{
      raceNo: 'Last',
      position: me?.position || '–',
      finishTime: me?.finishTime || '–',
      deltaToFirst: me?.deltaToFirst || '–',
      deltaAhead: lastRace.value.front.deltaAhead,
      deltaBehind: lastRace.value.front.deltaBehind
    }]
  } finally {
    loading.value = false
  }
}

function pad2(n){ return String(n).padStart(2,'0') }
/** mm:ss delta between t2 - t1, where inputs are "HH:MM:SS" or "MM:SS" */
function timeDelta(t1, t2){
  const toSec = (t)=>{
    const parts = t.split(':').map(Number)
    return parts.length===3 ? parts[0]*3600+parts[1]*60+parts[2] : parts[0]*60+parts[1]
  }
  const d = Math.max(0, toSec(t2) - toSec(t1))
  const mm = Math.floor(d/60), ss = d%60
  return `${pad2(mm)}:${pad2(ss)}`
}

onMounted(async () => {
  await loadRegattas()
  // auto-select most recent event
  if (regattas.value.length) {
    selectedRegattaId.value = regattas.value[0].id
    loadData()
  }
})
</script>

<style scoped>
.results-page { color:#fff; }
.toolbar {
  display:flex; gap:.6rem; align-items:center; margin-bottom: .8rem;
}
select {
  background: rgba(255,255,255,.08);
  color:#fff; border:1px solid rgba(255,255,255,.3); border-radius:10px; padding:.5rem .7rem;
}
.muted { opacity:.8; }

.grid {
  display:grid; gap:14px;
  grid-template-columns: repeat(3, minmax(0,1fr));
}
@media (max-width: 1100px){ .grid { grid-template-columns: 1fr; } }

.card-title { margin:0 0 .5rem 0; }
.stats {
  display:grid; gap:8px;
  grid-template-columns: repeat(3, minmax(0,1fr));
}
.stats .stat { background: rgba(255,255,255,.06); padding:.6rem .7rem; border-radius:10px; }
.k { font-size:.8rem; opacity:.9; }
.v { font-weight:800; font-size:1.1rem; }

.table-wrap { overflow:auto; }
table { width:100%; border-collapse: collapse; }
th, td { text-align:left; padding:.5rem .6rem; border-bottom: 1px solid rgba(255,255,255,.12); }
.hint { margin-top:.6rem; opacity:.75; font-size:.85rem; }
.races { display:grid; gap:10px; }
.race-row { background: rgba(255,255,255,.06); padding:.6rem .7rem; border-radius:10px; }
.race-title { font-weight:700; margin-bottom:.25rem; }
.race-stats { display:grid; gap:6px; grid-template-columns: repeat(5, minmax(0,1fr)); }
.race-stats .k { display:block; font-size:.75rem; opacity:.85; }
.race-stats .v { font-weight:700; }
</style>
