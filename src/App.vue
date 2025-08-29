<script setup>
import { reactive, ref, onMounted } from 'vue'

/* ---------------- State ---------------- */
const login = reactive({ isLoggedIn: false, user: 'demo' })

const ui = reactive({
  showLogin: false,
  showConfig: false,
  showApi: false,
  lastUpdate: 'Just now',
  notificationOpen: false
})

const config = reactive({
  sailboatName: 'BURRASCA',
  displayName: 'BURRASCA Performance Dashboard',
  ownerName: '',
  sailNumber: '',
  boatClass: 'ORC International',
  backgroundImage: null
})

const latestRace = reactive({
  name: 'Chios to Andros',
  date: 'Pending',
  position: 'TBD',
  finishTime: '-',
  toFirst: '-',
  deltaAhead: '-',
  deltaBehind: '-',
  rows: []
})

const series = reactive({
  className: 'ORC International',
  racesLabel: '0 entries',
  position: 'TBD',
  points: '0.0',
  net: '0.0',
  rows: []
})

const raceHistory = ref([])
const metrics = reactive({ overallEfficiency: 0, vmgUp: 0, vmgDown: 0, polarBsp: 0 })
const flip = reactive({ latest: false, series: false })

/* ---------------- Helpers ---------------- */
function setBodyBackground (url) {
  const b = document.body
  if (url) {
    b.classList.add('custom-background')
    b.style.backgroundImage = `url('${url}')`
  } else {
    b.classList.remove('custom-background')
    b.style.backgroundImage = ''
  }
}
function applyStoredBackground () {
  const saved = localStorage.getItem('bg-image')
  if (saved) { config.backgroundImage = saved; setBodyBackground(saved) }
}
function pickBackground (e) {
  const file = e.target.files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = () => {
    config.backgroundImage = reader.result
    localStorage.setItem('bg-image', config.backgroundImage)
    setBodyBackground(config.backgroundImage)
  }
  reader.readAsDataURL(file)
}
function resetBackground () {
  config.backgroundImage = null
  localStorage.removeItem('bg-image')
  setBodyBackground('')
}
function manualRefresh () {
  ui.lastUpdate = new Date().toLocaleString()
}

/* ---------------- Liquid bubbles ---------------- */
function setLiquid (id, pct) {
  const el = document.getElementById(id)
  if (!el) return
  const fill = el.querySelector('.liquid-fill')
  fill.style.height = `${Math.max(0, Math.min(100, pct))}%`
  fill.classList.add('animate')
}

/* ---------------- ORC fetch (your API) ---------------- */
const EVENT_ID = 'andros2025' // ORC event id
const CLASS_ID = '1'          // ORC class id
const RACE_ID  = ''           // set when known, e.g. "1"

async function fetchOverall () {
  try {
    const res = await fetch('/api/fetch-results', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventId: EVENT_ID, classId: CLASS_ID })
    })
    const data = await res.json()
    if (!data.success || data.resultType !== 'overall') throw new Error(data.message || 'Failed to get overall')

    // Back of flip card
    series.rows = data.results.map(r => ({
      pos: r.position,
      boat: r.name,
      r1: r.points,          // extend parser if you capture per-race cols
      r2: '',
      r3: '',
      tot: r.total ?? r.points,
      net: r.total ?? r.points
    }))

    // Front KPIs
    const mine = series.rows.find(x => (x.boat || '').toUpperCase().includes((config.sailboatName || '').toUpperCase()))
               || series.rows[0]
    series.className  = 'ORC International'
    series.racesLabel = `Entries: ${series.rows.length}`
    series.position   = mine?.pos ?? '—'
    series.points     = mine?.tot ?? '—'
    series.net        = mine?.net ?? '—'
    ui.lastUpdate     = new Date().toLocaleString()
  } catch (err) {
    console.error('fetchOverall:', err)
  }
}

async function fetchRace () {
  if (!RACE_ID) return
  try {
    const res = await fetch('/api/fetch-results', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventId: EVENT_ID, raceId: RACE_ID })
    })
    const data = await res.json()
    if (!data.success || data.resultType !== 'race') throw new Error(data.message || 'Failed to get race')

    // Back of flip card
    latestRace.rows = data.results.map(r => ({
      pos: r.position,
      name: r.name,
      time: r.correctedTime || r.finishTime || '',
      toFirst: '',  // populate if you compute deltas
      delta: r.elapsed || ''
    }))

    // Front KPIs (winner or our boat)
    const winner = latestRace.rows[0]
    const mine = latestRace.rows.find(x => (x.name || '').toUpperCase().includes((config.sailboatName || '').toUpperCase())) || winner
    latestRace.position   = mine?.pos ?? '—'
    latestRace.finishTime = mine?.time ?? '—'
    latestRace.toFirst    = winner ? (mine === winner ? '—' : '') : '—'
    ui.lastUpdate         = new Date().toLocaleString()
  } catch (err) {
    console.error('fetchRace:', err)
  }
}

/* ---------------- Lifecycle ---------------- */
onMounted(() => {
  applyStoredBackground()
  // seed a history card
  raceHistory.value = [{ id: 1, name: 'Chios to Andros', status: 'Upcoming', when: 'Aug 2025' }]

  // demo metric animation after mount
  requestAnimationFrame(() => {
    metrics.overallEfficiency = 72; setLiquid('efficiencyBubble', 72)
    metrics.vmgUp = 65;            setLiquid('vmgUpBubble', 65)
    metrics.vmgDown = 81;          setLiquid('vmgDownBubble', 81)
    metrics.polarBsp = 58;         setLiquid('polarBspBubble', 58)
  })

  // auto-fetch
  fetchOverall()
  fetchRace()
})
</script>

<template>
  <div class="container">
    <header class="header">
      <h1>{{ config.sailboatName }}</h1>
      <p>Vue 3 • Glassmorphism • Flip Cards</p>
    </header>

    <!-- Controls / background (glass) -->
    <section class="glass-card">
      <div class="row-sb">
        <div>
          <div class="muted tiny">Boat</div>
          <div class="current">{{ config.sailboatName }} • {{ config.boatClass }}</div>
        </div>
        <div class="row">
          <label class="pill">
            Upload background
            <input type="file" accept="image/*" class="hidden-file" @change="pickBackground" />
          </label>
          <button class="pill" @click="resetBackground">Reset</button>
          <button class="pill primary" @click="manualRefresh">Refresh</button>
        </div>
      </div>
    </section>

    <!-- Latest Race (flip) -->
    <section class="glass-card">
      <div class="row-sb mb1">
        <h3 class="title">Latest Race — {{ latestRace.name }}</h3>
        <div class="muted tiny">Last update: {{ ui.lastUpdate }}</div>
      </div>

      <div class="flip-card"
           @mouseenter="flip.latest = true"
           @mouseleave="flip.latest = false">
        <div class="flip-inner" :class="{ flipped: flip.latest }">
          <!-- front -->
          <div class="flip-front pad">
            <div class="front-content">
              <div class="kpi">
                <div class="kpi-label">Position</div>
                <div class="kpi-value">{{ latestRace.position }}</div>
              </div>
              <div class="kpi">
                <div class="kpi-label">Finish Time</div>
                <div class="kpi-value mono">{{ latestRace.finishTime }}</div>
              </div>
              <div class="kpi">
                <div class="kpi-label">To 1st</div>
                <div class="kpi-delta">{{ latestRace.toFirst }}</div>
              </div>
            </div>
          </div>
          <!-- back -->
          <div class="flip-back">
            <div class="back-header">Full Latest Race Results</div>
            <div v-if="!latestRace.rows.length" class="muted tiny">Pending…</div>
            <div v-for="(r,i) in latestRace.rows" :key="i" class="race-result-row">
              <div class="position-cell">{{ r.pos }}</div>
              <div class="boat-name-cell">{{ r.name }}</div>
              <div class="time-cell mono">{{ r.time }}</div>
              <div class="delta-cell mono">{{ r.toFirst }}</div>
              <div class="delta-cell mono">{{ r.delta }}</div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Series Overall (flip) -->
    <section class="glass-card">
      <div class="row-sb mb1">
        <h3 class="title">Series Overall — {{ series.className }}</h3>
        <button class="pill" @click="fetchOverall">Reload Overall</button>
      </div>

      <div class="flip-card"
           @mouseenter="flip.series = true"
           @mouseleave="flip.series = false">
        <div class="flip-inner" :class="{ flipped: flip.series }">
          <!-- front -->
          <div class="flip-front pad">
            <div class="front-content">
              <div class="kpi">
                <div class="kpi-label">Position</div>
                <div class="kpi-value">{{ series.position }}</div>
              </div>
              <div class="kpi">
                <div class="kpi-label">Total Points</div>
                <div class="kpi-value">{{ series.points }}</div>
              </div>
              <div class="kpi">
                <div class="kpi-label">Net Points</div>
                <div class="kpi-value">{{ series.net }}</div>
              </div>
            </div>
          </div>
          <!-- back -->
          <div class="flip-back">
            <div class="back-header">Overall Standings</div>
            <div v-if="!series.rows.length" class="muted tiny">Pending…</div>
            <div v-for="(r,i) in series.rows" :key="i" class="standings-row">
              <div class="standings-position">{{ r.pos }}</div>
              <div class="standings-boat">{{ r.boat }}</div>
              <div class="race-points mono">{{ r.r1 }}</div>
              <div class="race-points mono">{{ r.r2 }}</div>
              <div class="race-points mono">{{ r.r3 }}</div>
              <div class="race-points mono">{{ r.tot }}</div>
              <div class="standings-points">{{ r.net }}</div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Metrics bubbles (glass + liquid) -->
    <section class="metrics-grid">
      <div class="glass-card metric-card">
        <div class="metric-title">Overall Efficiency</div>
        <div id="efficiencyBubble" class="liquid-bubble">
          <div class="bubble-container">
            <div class="liquid-fill"><div class="wave"></div><div class="wave"></div><div class="wave"></div></div>
            <div class="bubble-glow"></div>
          </div>
        </div>
        <div class="metric-value">{{ metrics.overallEfficiency }}</div>
        <div class="metric-unit">%</div>
        <div class="metric-description">Average performance vs polar</div>
      </div>

      <div class="glass-card metric-card">
        <div class="metric-title">VMG Upwind</div>
        <div id="vmgUpBubble" class="liquid-bubble">
          <div class="bubble-container">
            <div class="liquid-fill"><div class="wave"></div><div class="wave"></div><div class="wave"></div></div>
            <div class="bubble-glow"></div>
          </div>
        </div>
        <div class="metric-value">{{ metrics.vmgUp }}</div>
        <div class="metric-unit">%</div>
        <div class="metric-description">TWA &lt; 60° performance</div>
      </div>

      <div class="glass-card metric-card">
        <div class="metric-title">VMG Downwind</div>
        <div id="vmgDownBubble" class="liquid-bubble">
          <div class="bubble-container">
            <div class="liquid-fill"><div class="wave"></div><div class="wave"></div><div class="wave"></div></div>
            <div class="bubble-glow"></div>
          </div>
        </div>
        <div class="metric-value">{{ metrics.vmgDown }}</div>
        <div class="metric-unit">%</div>
        <div class="metric-description">TWA &gt; 130° performance</div>
      </div>

      <div class="glass-card metric-card">
        <div class="metric-title">Polar BSP</div>
        <div id="polarBspBubble" class="liquid-bubble">
          <div class="bubble-container">
            <div class="liquid-fill"><div class="wave"></div><div class="wave"></div><div class="wave"></div></div>
            <div class="bubble-glow"></div>
          </div>
        </div>
        <div class="metric-value">{{ metrics.polarBsp }}</div>
        <div class="metric-unit">%</div>
        <div class="metric-description">60° ≤ TWA ≤ 130° performance</div>
      </div>
    </section>
  </div>
</template>

<style>
/* Base / backdrop */
*{box-sizing:border-box}
body{margin:0;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);min-height:100vh;padding:16px}
body.custom-background{background-size:cover;background-position:center;background-attachment:fixed}
.container{max-width:1100px;margin:0 auto}
.header{text-align:center;margin-bottom:16px}
.header h1{margin:0 0 6px;color:#fff}
.header p{margin:0;color:rgba(255,255,255,.8)}

/* Glassmorphism */
.glass-card{background:rgba(255,255,255,.12);backdrop-filter:blur(18px);border:1px solid rgba(255,255,255,.2);
            border-radius:16px;padding:16px;margin-bottom:16px;box-shadow:0 8px 30px rgba(0,0,0,.08)}
.title{margin:0;color:#fff}
.current{color:#fff;font-weight:600}
.muted{color:rgba(255,255,255,.75)} .tiny{font-size:12px}

/* Controls */
.row{display:flex;gap:.5rem;align-items:center;flex-wrap:wrap}
.row-sb{display:flex;justify-content:space-between;align-items:center;gap:1rem;flex-wrap:wrap}
.pill{background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.3);padding:.5rem .9rem;border-radius:14px;color:#fff;cursor:pointer}
.pill.primary{background:rgba(79,172,254,.85);border-color:rgba(79,172,254,.4)}
.hidden-file{display:none}

/* Flip cards */
.flip-card{perspective:1000px}
.flip-inner{position:relative;transform-style:preserve-3d;transition:transform .6s;min-height:140px}
.flip-inner.flipped{transform:rotateY(180deg)}
.flip-front,.flip-back{position:absolute;inset:0;border-radius:12px;backface-visibility:hidden;overflow:hidden}
.flip-front{background:rgba(255,255,255,.06)}
.flip-back{background:rgba(255,255,255,.16);transform:rotateY(180deg);padding:12px}
.pad{padding:12px}
.front-content{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
.kpi-label{font-size:12px;color:rgba(255,255,255,.75)}
.kpi-value{font-weight:700;font-size:22px;color:#fff}
.kpi-delta{font-weight:600;color:#ff8c42}
.mono{font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace}
.back-header{font-weight:600;margin-bottom:8px;color:#fff}
.race-result-row{display:grid;grid-template-columns:.8fr 2fr 1.2fr 1.2fr 1fr;gap:.25rem;margin-bottom:.25rem;padding:.25rem;border-radius:4px;font-size:.75rem;color:#fff}
.position-cell,.time-cell,.delta-cell{text-align:center}

/* Standings back */
.standings-row{display:grid;grid-template-columns:.8fr 2.5fr 1fr 1fr 1fr 1fr 1fr;gap:.5rem;margin-bottom:.5rem;padding:.5rem;border-radius:6px;font-size:.75rem;color:#fff;align-items:center}
.standings-position{text-align:center;font-weight:700}
.standings-boat{font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.race-points{text-align:center}
.standings-points{text-align:center;font-weight:700}

/* Metrics bubbles */
.metrics-grid{display:grid;grid-template-columns:repeat(1,1fr);gap:16px}
@media(min-width:900px){.metrics-grid{grid-template-columns:repeat(4,1fr)}}
.metric-card{text-align:center;position:relative;min-height:220px}
.metric-title{color:rgba(255,255,255,.85);font-size:.9rem;text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px}
.metric-value{color:#fff;font-size:32px;font-weight:800;margin-top:140px}
.metric-unit{color:rgba(255,255,255,.75)}
.metric-description{color:rgba(255,255,255,.8);font-size:.85rem}

/* Bubble visuals */
.liquid-bubble{position:absolute;top:40px;left:50%;transform:translateX(-50%);width:120px;height:120px}
.bubble-container{width:100%;height:100%;border-radius:50%;background:rgba(255,255,255,.1);border:2px solid rgba(255,255,255,.3);overflow:hidden;position:relative}
.liquid-fill{position:absolute;bottom:0;left:0;right:0;height:0;background:linear-gradient(180deg,rgba(79,172,254,.9),rgba(79,172,254,.7),rgba(79,172,254,.9));transition:height 1.8s cubic-bezier(.25,.46,.45,.94);opacity:0}
.liquid-fill.animate{opacity:1}
.wave{position:absolute;top:-10px;left:-50%;width:200%;height:20px;background:linear-gradient(90deg,transparent 0%,rgba(255,255,255,.35) 25%,transparent 50%,rgba(255,255,255,.35) 75%,transparent 100%);border-radius:50%;animation:wave 3s ease-in-out infinite}
.wave:nth-child(2){animation-delay:-1s;opacity:.7;height:15px}
.wave:nth-child(3){animation-delay:-2s;opacity:.5;height:12px}
@keyframes wave{0%,100%{transform:translateX(0) rotate(0)}50%{transform:translateX(-25%) rotate(180deg)}}
.bubble-glow{position:absolute;top:15%;left:15%;width:30%;height:30%;background:radial-gradient(circle,rgba(255,255,255,.4) 0%,transparent 70%);border-radius:50%;animation:glow 2s ease-in-out infinite alternate}
@keyframes glow{0%{opacity:.6;transform:scale(1)}100%{opacity:1;transform:scale(1.1)}}
</style>
