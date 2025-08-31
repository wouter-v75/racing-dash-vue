<template>
  <div class="page">
    <div class="glass">
      <h2 class="title">Account</h2>
      <p class="muted">Manage your profile and team membership.</p>

      <form class="form" @submit.prevent="save">
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
            <label>User type</label>
            <select v-model="role">
              <option value="guest">Guest</option>
              <option value="sailing team">Sailing team</option>
              <option value="owner">Owner</option>
              <option value="consultant">Consultant</option>
              <option value="admin">Admin</option>
            </select>
            <small class="muted">
              Non-admins asking for higher access will be set to <b>guest</b> until approved.
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
import { ref, onMounted } from 'vue'
import { supabase } from '../lib/supabase'

// form state
const firstName = ref('')
const lastName  = ref('')
const teamId    = ref('')
const role      = ref('guest')

// lists & flags
const teams = ref([])
const loadingTeams = ref(false)
const saving = ref(false)
const notice = ref('')
const error  = ref('')

const currentUser = ref(null)
const isAdmin = ref(false) // computed from current membership role === 'admin'

// Load current user + metadata
async function loadUser() {
  const { data, error: e } = await supabase.auth.getUser()
  if (e) throw e
  currentUser.value = data.user
  const meta = data.user?.user_metadata || {}
  firstName.value = meta.first_name || ''
  lastName.value  = meta.last_name  || ''
}

// Load teams for dropdown
async function loadTeams() {
  loadingTeams.value = true
  try {
    const { data, error: e } = await supabase.from('teams').select('id,name').order('name')
    if (e) throw e
    teams.value = data || []
  } finally {
    loadingTeams.value = false
  }
}

// Load current membership (prefill team + role)
async function loadMembership() {
  if (!currentUser.value) return
  const { data, error: e } = await supabase
    .from('team_members')
    .select('team_id, role')
    .eq('user_id', currentUser.value.id)
    .limit(1)
    .maybeSingle()
  if (e && e.code !== 'PGRST116') throw e // ignore no-rows
  if (data) {
    teamId.value = data.team_id || ''
    role.value   = data.role || 'guest'
    isAdmin.value = data.role === 'admin'
  } else {
    // no membership yet
    teamId.value = ''
    role.value   = 'guest'
    isAdmin.value = false
  }
}

// Save both auth metadata and membership
async function save() {
  error.value = ''; notice.value = ''; saving.value = true
  try {
    // 1) Update user metadata (first/last name)
    const { error: e1 } = await supabase.auth.updateUser({
      data: { first_name: firstName.value, last_name: lastName.value }
    })
    if (e1) throw e1

    // 2) Upsert membership in team_members
    if (teamId.value) {
      // If user is not admin but selected a higher role, store request and set role to guest
      let finalRole = role.value
      let requestedRole = null
      if (!isAdmin.value && role.value !== 'guest') {
        requestedRole = role.value
        finalRole = 'guest'
      }

      // upsert (by user_id + team_id) — create a deterministic key
      const { error: e2 } = await supabase
        .from('team_members')
        .upsert({
          team_id: teamId.value,
          user_id: currentUser.value.id,
          role: finalRole,
          requested_role: requestedRole // make sure column exists, see note below
        }, { onConflict: 'team_id,user_id' })
      if (e2) throw e2

      if (requestedRole) {
        notice.value = `Request for "${requestedRole}" sent. You remain "guest" until an admin approves.`
      } else {
        notice.value = 'Profile updated.'
      }
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
})
</script>

<style scoped>
.page { padding: 1rem; color:#fff; }
.glass {
  background: rgba(255,255,255,.12);
  border: 1px solid rgba(255,255,255,.25);
  backdrop-filter: blur(16px);
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
  width:100%; padding:.65rem .8rem; border-radius:10px; border:1px solid rgba(255,255,255,.35);
  background: rgba(255,255,255,.08); color:#fff; outline:none;
}
.row { display:flex; align-items:center; gap:.6rem; flex-wrap:wrap; }
.btn { border:0; border-radius:12px; padding:.7rem 1rem; cursor:pointer; color:#0b2239; }
.btn.primary { background:linear-gradient(135deg,#4facfe,#00f2fe); font-weight:800; }
.notice { color:#fff7d6; background:rgba(255,198,0,.12); border:1px solid rgba(255,198,0,.25); padding:.5rem .6rem; border-radius:10px; }
.error { color:#ffd4d4; background:rgba(255,0,0,.12); border:1px solid rgba(255,0,0,.25); padding:.5rem .6rem; border-radius:10px; }
</style>
