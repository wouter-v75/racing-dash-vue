<template>
  <div class="page">
    <div class="glass">
      <h2 class="title">Account</h2>
      <p class="muted">Manage your profile, team, and boat selection.</p>

      <form class="form" @submit.prevent="save">
        <!-- Names -->
        <div class="grid">
          <div>
            <label>First name</label>
            <input v-model.trim="firstName" type="text" required />
          </div>
          <div>
            <label>Last name</label>
            <input v-model.trim="lastName" type="text" required />
          </div>
        </div>

        <!-- Team + Boat -->
        <div class="grid">
          <div>
            <label>Sailing team</label>
            <select v-model="teamId" :disabled="loadingTeams">
              <option value="">— Select team —</option>
              <option v-for="t in teams" :key="t.id" :value="t.id">{{ t.name }}</option>
            </select>
            <small class="muted" v-if="loadingTeams">Loading teams…</small>
          </div>

          <div>
            <label>Boat</label>
            <select v-model="boatId" :disabled="!teamId || loadingBoats">
              <option value="">— Select boat —</option>
              <option v-for="b in boats" :key="b.id" :value="b.id">{{ b.name }}</option>
            </select>
            <small class="muted" v-if="loadingBoats">Loading boats…</small>
          </div>
        </div>

        <!-- Role -->
        <div class="grid">
          <div>
            <label>User type</label>
            <select v-model="role">
              <option value="guest">Guest</option>
              <option value="sailing team">Sailing team</option>
              <option value="owner">Owner</option>
              <option value="consultant">Consultant</option>
              <option value="admin">Admin</option>
            </select>
            <small class="muted">
              Non-admins requesting a higher role will be saved as <b>guest</b> until an admin approves.
            </small>
          </div>
          <div class="readonly">
            <label>Current access</label>
            <div class="pill" :data-role="currentRole || 'guest'">{{ currentRole || 'guest' }}</div>
            <small v-if="requestedRole" class="muted">
              Requested: <b>{{ requestedRole }}</b> (pending admin approval)
            </small>
          </div>
        </div>

        <div class="row">
          <button class="btn primary" :disabled="saving">
            {{ saving ? 'Saving…' : 'Save changes' }}
          </button>
          <span v-if="notice" class="notice">{{ notice }}</span>
          <span v-if="error" class="error">{{ error }}</span>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import { supabase } from '../lib/supabase'

/**
 * Assumptions (DB):
 * - tables: teams(id,name), boats(id,name,team_id), team_members(team_id,user_id,role,requested_role)
 * - RLS policies let a signed-in user read teams/boats for their team and upsert their own team_members row.
 */

const firstName = ref('')
const lastName  = ref('')

const teams  = ref([])
const teamId = ref('')

const boats  = ref([])
const boatId = ref('')

const role           = ref('guest')     // chosen in UI
const currentRole    = ref('guest')     // from membership row
const requestedRole  = ref(null)

const loadingTeams = ref(false)
const loadingBoats = ref(false)
const saving = ref(false)
const notice = ref('')
const error  = ref('')

const user = ref(null)
const isAdmin = ref(false)

// Load auth user & metadata
async function loadUser() {
  const { data, error: e } = await supabase.auth.getUser()
  if (e) throw e
  user.value = data.user
  const meta = data.user?.user_metadata || {}
  firstName.value = meta.first_name || ''
  lastName.value  = meta.last_name  || ''
  // Prefer team/boat from membership; metadata for boat is saved on save()
}

// Load teams
async function loadTeams() {
  loadingTeams.value = true
  try {
    const { data, error: e } = await supabase
      .from('teams')
      .select('id,name')
      .order('name')
    if (e) throw e
    teams.value = data || []
  } finally {
    loadingTeams.value = false
  }
}

// Load membership (prefill team + role)
async function loadMembership() {
  if (!user.value) return
  const { data, error: e } = await supabase
    .from('team_members')
    .select('team_id, role, requested_role')
    .eq('user_id', user.value.id)
    .limit(1)
    .maybeSingle()
  if (e && e.code !== 'PGRST116') throw e // ignore "no rows"
  if (data) {
    teamId.value      = data.team_id || ''
    currentRole.value = data.role || 'guest'
    requestedRole.value = data.requested_role || null
    role.value = currentRole.value
    isAdmin.value = data.role === 'admin'
  } else {
    teamId.value = ''
    currentRole.value = 'guest'
    requestedRole.value = null
    role.value = 'guest'
    isAdmin.value = false
  }
}

// Load boats for selected team
async function loadBoatsForTeam() {
  boats.value = []
  boatId.value = boatId.value // keep if valid
  if (!teamId.value) return
  loadingBoats.value = true
  try {
    const { data, error: e } = await supabase
      .from('boats')
      .select('id,name')
      .eq('team_id', teamId.value)
      .order('name')
    if (e) throw e
    boats.value = data || []
    // If currently selected boat not in list, clear it
    if (boatId.value && !boats.value.some(b => b.id === boatId.value)) {
      boatId.value = ''
    }
  } finally {
    loadingBoats.value = false
  }
}

watch(teamId, () => loadBoatsForTeam())

// Save profile + membership
async function save() {
  error.value = ''; notice.value = ''; saving.value = true
  try {
    // Validate
    if (!firstName.value || !lastName.value) {
      throw new Error('Please provide first and last name.')
    }

    // 1) Update auth metadata (names + selected boat)
    let selectedBoat = boats.value.find(b => b.id === boatId.value)
    const metaUpdate = {
      first_name: firstName.value,
      last_name : lastName.value,
      boat_id   : boatId.value || null,
      boat_name : selectedBoat?.name || null
    }
    const { error: e1 } = await supabase.auth.updateUser({ data: metaUpdate })
    if (e1) throw e1

    // 2) Upsert membership (non-admins cannot escalate role themselves)
    if (teamId.value) {
      let finalRole = role.value
      let reqRole   = null
      if (!isAdmin.value && role.value !== 'guest') {
        reqRole   = role.value
        finalRole = 'guest'
      }

      const { error: e2 } = await supabase
        .from('team_members')
        .upsert(
          {
            team_id: teamId.value,
            user_id: user.value.id,
            role: finalRole,
            requested_role: reqRole
          },
          { onConflict: 'team_id,user_id' }
        )
      if (e2) throw e2

      currentRole.value   = finalRole
      requestedRole.value = reqRole

      notice.value = reqRole
        ? `Request for "${reqRole}" sent. You remain "guest" until an admin approves.`
        : 'Profile updated.'
    } else {
      notice.value = 'Profile updated (no team selected).'
    }
  } catch (e) {
    error.value = e?.message || 'Failed to save changes.'
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  await loadUser()
  await loadTeams()
  await loadMembership()
  await loadBoatsForTeam()
})
</script>

<style scoped>
.page { padding: 1rem; color:#fff; }
.glass {
  background: rgba(255,255,255,.12);
  border: 1px solid rgba(255,255,255,.25);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border-radius: 16px;
  padding: 16px;
  box-shadow: 0 8px 30px rgba(0,0,0,.18);
}

.title { margin:0 0 .3rem 0; }
.muted { opacity:.85; margin-bottom:.8rem; }

.form { display:grid; gap: 14px; }
.grid { display:grid; gap:14px; grid-template-columns: repeat(2, minmax(0,1fr)); }
@media (max-width: 720px) { .grid { grid-template-columns: 1fr; } }

label { display:block; font-size:.9rem; opacity:.92; margin-bottom:.25rem; }
input, select {
  width:100%; padding:.65rem .8rem; border-radius:10px;
  border:1px solid rgba(255,255,255,.35);
  background: rgba(255,255,255,.08);
  color:#fff; outline:none;
}
select:disabled, input:disabled { opacity:.7; cursor:not-allowed; }

.row { display:flex; align-items:center; gap:.6rem; flex-wrap:wrap; }
.btn { border:0; border-radius:12px; padding:.7rem 1rem; cursor:pointer; color:#0b2239; }
.btn.primary { background:linear-gradient(135deg,#4facfe,#00f2fe); font-weight:800; }

.notice { color:#fff7d6; background:rgba(255,198,0,.12); border:1px solid rgba(255,198,0,.25); padding:.5rem .6rem; border-radius:10px; }
.error  { color:#ffd4d4; background:rgba(255,0,0,.12);   border:1px solid rgba(255,0,0,.25);   padding:.5rem .6rem; border-radius:10px; }

.readonly .pill {
  display:inline-block; padding:.4rem .6rem; border-radius:999px;
  background:rgba(255,255,255,.1); border:1px solid rgba(255,255,255,.25);
  text-transform:capitalize; font-weight:700; color:#fff;
}
</style>
