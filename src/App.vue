<script setup>
import { ref, reactive, onMounted } from 'vue'

/** ---------- Auth state ---------- */
const isLoggedIn = ref(false)
const currentUser = ref('demo')

/** ---------- UI state ---------- */
const modals = reactive({ login:false, config:false, api:false })
const uploading = ref(false)
const uploadError = ref('')

/** ---------- Config ---------- */
const config = reactive({
  boatName: 'BURRASCA',
  boatClass: 'ORC International',
  ownerName: '',
  sailNumber: '',
  backgroundDataUrl: ''
})

/** ---------- Latest / Series (samples; wire to your API) ---------- */
const latestRace = reactive({
  name: 'Latest Race',
  date: '',
  position: '—',
  finishTime: '—',
  toFirst: '—',
  deltaAhead: '—',
  deltaBehind: '—'
})
const latestRaceRows = ref([])
const seriesSummary = reactive({ overallClass:'', races:'', position:'—', points:'—', net:'—' })
const seriesRows = ref([])

/** ---------- Helpers ---------- */
function setBodyBackground(url) {
  const b = document.body
  if (url) {
    b.classList.add('custom-background')
    b.style.backgroundImage = `url('${url}')`
  } else {
    b.classList.remove('custom-background')
    b.style.backgroundImage = ''
  }
}

onMounted(() => {
  const saved = localStorage.getItem('bg-image')
  if (saved) {
    config.backgroundDataUrl = saved
    setBodyBackground(saved)
  }
})

/** ---------- Auth ---------- */
async function login(username, password) {
  const res = await fetch('/api/auth', {
    method: 'POST', headers: { 'Content-Type':'application/json' },
    body: JSON.stringify({ username, password })
  })
  const data = await res.json()
  if (!data.success) throw new Error(data.message || 'Login failed')
  isLoggedIn.value = true
  currentUser.value = data.username || username
  modals.login = false
}
function logout(){ isLoggedIn.value = false; currentUser.value = 'demo' }

/** ---------- Background image ---------- */
function onBgFilePicked(e){
  const file = e.target.files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = () => {
    config.backgroundDataUrl = reader.result
    localStorage.setItem('bg-image', config.backgroundDataUrl)
    setBodyBackground(config.backgroundDataUrl)
  }
  reader.readAsDataURL(file)
}
function resetBackground(){
  config.backgroundDataUrl = ''
  localStorage.removeItem('bg-image')
  setBodyBackground('')
}

/** ---------- Upload (stub) ---------- */
async function onFileChosen(e){
  const file = e.target.files?.[0]
  if (!file) return
  uploading.value = true
  uploadError.value = ''
  try {
    // do parsing here if needed
    await new Promise(r=>setTimeout(r,600))
  } catch(err){
    uploadError.value = String(err?.message||err)
  } finally {
    uploading.value = false
  }
}

/** ---------- Data fetchers (wire to your API routes) ---------- */
async function fetchOverall(){
  const res = await fetch('/api/fetch-results', {
    method:'POST',
    headers:{ 'Content-Type':'application/json' },
    body: JSON.stringify({ eventId: 'andros2025', classId: '1' })
  })
  const data = await res.json()
  if (!data.success) throw new Error(data.message || 'Overall failed')
  seriesRows.value = data.results || []
  if (seriesRows.value.length){
    const mine = seriesRows.value.find(r => (r.name||'').includes(config.boatName)) || seriesRows.value[0]
    seriesSummary.overallClass = 'ORC Class'
    seriesSummary.races = `Entries: ${seriesRows.value.length}`
    seriesSummary.position = mine.position || '—'
    seriesSummary.points = mine.points || '—'
    seriesSummary.net = mine.total || mine.points || '—'
  }
}
async function fetchLatestRace(){
  // If your API supports single-race details, call it here
  // and populate `latestRace` + `latestRaceRows`.
}

/** ---------- Local form fields for login modal ---------- */
const form = reactive({ user:'', pass:'' })
async function onLoginSubmit(){
  try { await login(form.user, form.pass) }
  catch(e){ alert(e.message) }
}
</script>

<template>
  <div class="container">
    <div class="row" style="justify-content: space-between; margin-bottom: 14px;">
      <div>
        <div class="label">Current Boat</div>
        <div class="value" id="currentBoatName">{{ config.boatName }}</div>
        <small id="currentBoatClass">{{ config.boatClass }}</small>
      </div>
      <div class="row">
        <button class="btn secondary" @click="modals.config=true">Quick Config</button>
        <button class="btn secondary" @click="modals.api=true">API Config</button>
        <button v-if="!isLoggedIn" class="btn" @click="modals.login=true">Log in</button>
        <button v-else class="btn" @click="logout()">Log out ({{ currentUser }})</button>
      </div>
    </div>

    <div class="grid grid-3" style="margin-bottom: 16px;">
      <div class="card">
        <div class="label">Background image</div>
        <div class="row">
          <input type="file" accept="image/*" @change="onBgFilePicked" />
          <button class="btn secondary" @click="resetBackground">Reset</button>
        </div>
      </div>
      <div class="card">
        <div class="label">Upload log</div>
        <div class="row">
          <input type="file" accept=".txt,.csv,.json" @change="onFileChosen" />
          <span v-if="uploading">Uploading…</span>
          <span v-if="uploadError" style="color:#b91c1c">{{ uploadError }}</span>
        </div>
      </div>
      <div class="card">
        <div class="label">ORC Results</div>
        <div class="row">
          <button class="btn" @click="fetchOverall">Fetch Overall</button>
          <button class="btn secondary" @click="fetchLatestRace">Fetch Latest Race</button>
        </div>
      </div>
    </div>

    <div class="grid grid-2">
      <div class="card">
        <h3 style="margin:0 0 8px">Latest Race</h3>
        <div class="row"><span class="label">Name</span><span class="value">{{ latestRace.name }}</span></div>
        <div class="row"><span class="label">Position</span><span class="value">{{ latestRace.position }}</span></div>
        <div class="divider"></div>
        <table v-if="latestRaceRows.length">
          <thead><tr><th>Pos</th><th>Boat</th><th>Time</th><th>To First</th></tr></thead>
          <tbody>
            <tr v-for="(r,i) in latestRaceRows" :key="i">
              <td>{{ r.pos }}</td><td>{{ r.name }}</td><td>{{ r.time }}</td><td>{{ r.toFirst }}</td>
            </tr>
          </tbody>
        </table>
        <small v-else>No rows yet.</small>
      </div>
      <div class="card">
        <h3 style="margin:0 0 8px">Series Overall</h3>
        <div class="row"><span class="label">Class</span><span class="value">{{ seriesSummary.overallClass || '—' }}</span></div>
        <div class="row"><span class="label">Races</span><span class="value">{{ seriesSummary.races || '—' }}</span></div>
        <div class="row"><span class="label">Your Pos</span><span class="value">{{ seriesSummary.position }}</span></div>
        <div class="divider"></div>
        <table v-if="seriesRows.length">
          <thead><tr><th>Pos</th><th>Boat</th><th>Points</th><th>Total</th></tr></thead>
          <tbody>
            <tr v-for="(r,i) in seriesRows" :key="i">
              <td>{{ r.position }}</td><td>{{ r.name }}</td><td>{{ r.points }}</td><td>{{ r.total ?? r.points }}</td>
            </tr>
          </tbody>
        </table>
        <small v-else>No series data yet.</small>
      </div>
    </div>

    <!-- Login Modal -->
    <dialog :open="modals.login">
      <div class="dialog-body">
        <h3 style="margin:0 0 8px">Log in</h3>
        <div class="row" style="flex-direction:column; gap:8px; align-items:stretch;">
          <input v-model="form.user" type="text" placeholder="Username" />
          <input v-model="form.pass" type="password" placeholder="Password" />
          <div class="row" style="justify-content:flex-end;">
            <button class="btn secondary" @click="modals.login=false">Cancel</button>
            <button class="btn" @click="onLoginSubmit">Log in</button>
          </div>
        </div>
      </div>
    </dialog>

    <!-- Quick Config Modal -->
    <dialog :open="modals.config">
      <div class="dialog-body">
        <h3 style="margin:0 0 8px">Quick Config</h3>
        <div class="grid" style="grid-template-columns:1fr 1fr;">
          <div><div class="label">Boat name</div><input v-model="config.boatName" type="text" /></div>
          <div><div class="label">Class</div><input v-model="config.boatClass" type="text" /></div>
          <div><div class="label">Owner</div><input v-model="config.ownerName" type="text" /></div>
          <div><div class="label">Sail #</div><input v-model="config.sailNumber" type="text" /></div>
        </div>
        <div class="row" style="justify-content:flex-end; margin-top:12px;">
          <button class="btn secondary" @click="modals.config=false">Close</button>
        </div>
      </div>
    </dialog>

    <!-- API Config Modal (placeholder for tokens/URLs if needed) -->
    <dialog :open="modals.api">
      <div class="dialog-body">
        <h3 style="margin:0 0 8px">API Config</h3>
        <p>Add any tokens or endpoints your serverless functions require (via Vercel Project → Settings → Environment Variables).</p>
        <div class="row" style="justify-content:flex-end;">
          <button class="btn" @click="modals.api=false">Done</button>
        </div>
      </div>
    </dialog>
  </div>
</template>

<style scoped>
/* component-scoped extras if needed */
</style>
