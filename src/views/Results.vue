<template>
  <div class="results-page">
    <h1>Regatta Results</h1>

    <!-- Regatta dropdown -->
    <select v-model="selectedRegattaId" @change="reloadAll">
      <option disabled value="">Select regatta…</option>
      <option v-for="r in regattas" :key="r.id" :value="r.id">
        {{ r.name }}
      </option>
    </select>

    <!-- Overall standings -->
    <div class="card overall-card" v-if="overallRows.length">
      <FlipCard>
        <template #front>
          <h2 class="card-title">Overall Standings</h2>
          <div v-if="!overallRows.length" class="empty">Loading…</div>
          <div v-else class="stats">
            <div class="stat">
              <div class="k">Position</div>
              <div class="v">{{ myOverall?.position || '–' }}</div>
            </div>
            <div class="stat">
              <div class="k">Points</div>
              <div class="v">{{ myOverall?.points || '–' }}</div>
            </div>
            <div class="stat">
              <div class="k">Total</div>
              <div class="v">{{ myOverall?.total || '–' }}</div>
            </div>
          </div>
          <p class="hint">Click card to flip</p>
        </template>
        <template #back>
          <h2 class="card-title">Overall Standings (Full Table)</h2>
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>#</th><th>Boat</th><th>Sail No</th><th>Club</th><th>Skipper</th><th>Points</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in overallRows" :key="row._key" :class="{ me: isMe(row.name) }">
                  <td>{{ row.position }}</td>
                  <td>{{ row.name }}</td>
                  <td>{{ row.sailNo }}</td>
                  <td>{{ row.club }}</td>
                  <td>{{ row.skipper }}</td>
                  <td>{{ row.points }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </template>
      </FlipCard>
    </div>

    <!-- Race details cards -->
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
          <h3 class="card-title">{{ r.label }} — Full Table</h3>
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
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import FlipCard from '@/components/FlipCard.vue'

// API base — blank = same domain (Vercel), or set VITE_API_BASE in .env
const API_BASE = import.meta.env.VITE_API_BASE || ''

// state
const regattas = ref([])
const selectedRegattaId = ref('')
const classes = ref([])
const races = ref([])
const overallRows = ref([])
const raceTables = ref({})
const raceSummaries = ref({})

// helpers
async function api(path) {
  const r = await fetch(`${API_BASE}${path}`)
  if (!r.ok) throw new Error(`HTTP ${r.status}`)
  return r.json()
}

const myBoatName = 'Northstar' // TODO: derive from logged-in user profile
function isMe(name) {
  return name && name.toLowerCase().includes(myBoatName.toLowerCase())
}
const myOverall = computed(() => overallRows.value.find(r => isMe(r.name)))

// loaders
async function loadRegattas() {
  const { createClient } = await import('@supabase/supabase-js')
  const supabase = createClient(
    import.meta.env.VITE_SUPABASE_URL,
    import.meta.env.VITE_SUPABASE_ANON_KEY
  )
  const { data } = await supabase.from('regattas').select('*').order('starts_on', { ascending: false })
  regattas.value = data || []
}

function evId() {
  const r = regattas.value.find(r => r.id === selectedRegattaId.value)
  return r?.event_id || null
}

async function loadClasses() {
  if (!evId()) return
  const json = await api(`/api/results-orc?type=classes&eventId=${evId()}`)
  classes.value = json.results || []
}

async function loadRaces() {
  if (!evId()) return
  const json = await api(`/api/results-orc?type=races&eventId=${evId()}`)
  races.value = json.results || []
}

async function reloadOverall() {
  if (!evId() || !classes.value.length) return
  const classId = classes.value[0].id
  const json = await api(`/api/results-orc?type=overall&eventId=${evId()}&classId=${classId}`)
  overallRows.value = (json.results || []).map((row, i) => ({ ...row, _key: `ov-${i}` }))
}

async function loadAllRaceTables() {
  if (!evId() || races.value.length === 0) return
  for (const r of races.value) {
    const json = await api(`/api/results-orc?type=race&eventId=${evId()}&raceId=${r.id}`)
    const rows = (json.results || []).map((row, i) => ({ ...row, _key: `${r.id}-${i}` }))
    raceTables.value[r.id] = rows

    const idx = rows.findIndex(x => isMe(x.name))
    const me = rows[idx]
    const ahead = idx > 0 ? rows[idx - 1] : null
    const behind = idx >= 0 && idx < rows.length - 1 ? rows[idx + 1] : null

    raceSummaries.value[r.id] = {
      position: me?.position || '–',
      finishTime: me?.finishTime || '–',
      deltaToFirst: me?.deltaToFirst || '–',
      deltaAhead: ahead?.correctedTime && me?.correctedTime ? mmssDelta(ahead.correctedTime, me.correctedTime) : '–',
      deltaBehind: behind?.correctedTime && me?.correctedTime ? mmssDelta(me.correctedTime, behind.correctedTime) : '–'
    }
  }
}

function mmssDelta(a, b) {
  function toSec(str) {
    if (!str) return null
    if (/^(DNF|DNS|DSQ|DNC|RET)$/i.test(str)) return null
    const p = str.split(':').map(Number)
    return p.length === 3 ? p[0]*3600 + p[1]*60 + p[2] : p[0]*60 + p[1]
  }
  const s1 = toSec(a), s2 = toSec(b)
  if (s1 == null || s2 == null) return '–'
  const d = Math.max(0, s2 - s1)
  const mm = String(Math.floor(d/60)).padStart(2,'0')
  const ss = String(d % 60).padStart(2,'0')
  return `${mm}:${ss}`
}

async function reloadAll() {
  if (!selectedRegattaId.value) return
  await Promise.all([loadClasses(), loadRaces()])
  await reloadOverall()
  await loadAllRaceTables()
}

onMounted(loadRegattas)
</script>

<style scoped>
.results-page { padding: 1rem; background: #eee; min-height: 100vh; }
select { margin: 1rem 0; padding: .3rem; }
.card { margin: 1rem 0; }
.card-title { margin-bottom: .5rem; }
.stats { display: flex; flex-wrap: wrap; gap: 1rem; }
.stat { flex: 1 1 100px; background: #444; color: #fff; padding: .5rem; border-radius: .5rem; text-align: center; }
.table-wrap { overflow-x: auto; }
table { width: 100%; border-collapse: collapse; }
th, td { border: 1px solid #ccc; padding: .3rem .5rem; text-align: center; }
.me { background: #ffd; font-weight: bold; }
.hint { font-size: .8rem; opacity: .7; margin-top: .5rem; }

/* FlipCard fix */
.flip-card { perspective: 1000px; }
.flip-inner { position: relative; transform-style: preserve-3d; transition: transform .6s; }
.flip-card.is-flipped .flip-inner { transform: rotateY(180deg); }
.flip-face { position: absolute; inset: 0; backface-visibility: hidden; }
.flip-card-front { z-index: 2; }
.flip-card-back { transform: rotateY(180deg); }
</style>
