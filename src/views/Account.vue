<template>
  <div class="account-wrap">
    <div class="card">
      <h1>Account</h1>
      <p class="subtitle">Manage your profile, team, and boat selection.</p>

      <div class="grid">
        <!-- First / Last name -->
        <div class="field">
          <label>First name</label>
          <input v-model="firstName" type="text" placeholder="First name" />
        </div>
        <div class="field">
          <label>Last name</label>
          <input v-model="lastName" type="text" placeholder="Last name" />
        </div>

        <!-- Team / Boat -->
        <div class="field">
          <label>Sailing team</label>
          <select v-model="teamId">
            <option value="">— select team —</option>
            <option v-for="t in teams" :key="t.id" :value="t.id">{{ t.name }}</option>
          </select>
        </div>
        <div class="field">
          <label>Boat</label>
          <select v-model="boatName">
            <option value="">— select boat —</option>
            <option v-for="b in boats" :key="b.id" :value="b.name">{{ b.name }}</option>
          </select>
        </div>

        <!-- Role / Current access -->
        <div class="field">
          <label>User type</label>
          <select v-model="roleWanted">
            <option v-for="r in roles" :key="r" :value="r">{{ prettyRole(r) }}</option>
          </select>
          <p class="muted" v-if="!isAdmin">
            Non-admins requesting a higher role will be saved as <b>guest</b> until an admin approves.
          </p>
        </div>

        <div class="field">
          <label>Current access</label>
          <div class="badge" :data-role="currentRole || 'guest'">
            {{ prettyRole(currentRole || 'guest') }}
          </div>
        </div>
      </div>

      <div class="actions">
        <button class="btn" :disabled="saving" @click="saveAccount">
          {{ saving ? 'Saving…' : 'Save' }}
        </button>
        <span class="ok" v-if="saveMsg">{{ saveMsg }}</span>
        <span class="error" v-if="saveErr">{{ saveErr }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import { supabase } from '../lib/supabase'

/** form state */
const firstName   = ref('')
const lastName    = ref('')
const teamId      = ref('')
const boatName    = ref('')

/** lists */
const teams = ref([])
const boats = ref([])

/** roles */
const roles = ['admin', 'sailing team', 'owner', 'consultant', 'guest']
const roleWanted  = ref('guest')   // what the user selects to request/have
const currentRole = ref('guest')   // what DB currently says

/** flags / feedback */
const isAdmin = ref(false)
const saving  = ref(false)
const saveErr = ref('')
const saveMsg = ref('')

function prettyRole(r){ return r ? r.charAt(0).toUpperCase() + r.slice(1) : '' }

/** load boats when team changes */
watch(teamId, async (newTeam) => {
  boats.value = []
  boatName.value = ''
  if (!newTeam) return
  const { data, error } = await supabase
    .from('boats')
    .select('id,name')
    .eq('team_id', newTeam)
    .order('name')
  if (!error) boats.value = data || []
})

/** initial load */
async function loadInitial() {
  saveErr.value = ''
  saveMsg.value = ''
  // 1) user + metadata
  const { data: udata, error: uerr } = await supabase.auth.getUser()
  if (uerr) { saveErr.value = uerr.message; return }
  const user = udata?.user
  const meta = user?.user_metadata || {}
  firstName.value = meta.first_name || ''
  lastName.value  = meta.last_name  || ''
  boatName.value  = meta.boat_name  || ''
  teamId.value    = meta.team_id    || ''

  // 2) teams
  const { data: trows } = await supabase.from('teams').select('id,name').order('name')
  teams.value = trows || []

  // 3) boats (if team set)
  if (teamId.value) {
    const { data: brows } = await supabase.from('boats').select('id,name').eq('team_id', teamId.value).order('name')
    boats.value = brows || []
  }

  // 4) membership: detect current role + admin
  if (user?.id && teamId.value) {
    const { data: mem } = await supabase
      .from('team_members')
      .select('role')
      .eq('team_id', teamId.value)
      .eq('user_id', user.id)
      .maybeSingle()
    currentRole.value = mem?.role || 'guest'
  } else {
    currentRole.value = 'guest'
  }

  // 5) is admin on ANY team
  if (user?.id) {
    const { data: allmem } = await supabase
      .from('team_members')
      .select('role')
      .eq('user_id', user.id)
    isAdmin.value = Array.isArray(allmem) && allmem.some(r => r.role === 'admin')
  } else {
    isAdmin.value = false
  }

  // Default the dropdown to your current role (or guest)
  roleWanted.value = currentRole.value || 'guest'
}

/** save */
async function saveAccount() {
  saving.value = true
  saveErr.value = ''
  saveMsg.value = ''
  try {
    const { data: udata, error: uerr } = await supabase.auth.getUser()
    if (uerr) throw uerr
    const uid = udata?.user?.id
    if (!uid) throw new Error('Not authenticated')

    // 1) update auth metadata
    const { error: upMetaErr } = await supabase.auth.updateUser({
      data: {
        first_name: firstName.value?.trim(),
        last_name : lastName.value?.trim(),
        boat_name : boatName.value?.trim(),
        team_id   : teamId.value || null
      }
    })
    if (upMetaErr) throw upMetaErr

    // 2) ensure membership row exists (as guest)
    let membershipId = null
    let existingRole = 'guest'
    if (teamId.value) {
      const q = await supabase
        .from('team_members')
        .select('id, role')
        .eq('team_id', teamId.value)
        .eq('user_id', uid)
        .maybeSingle()
      if (q.error && q.error.code && q.error.code !== 'PGRST116') throw q.error

      if (!q.data) {
        const ins = await supabase
          .from('team_members')
          .insert({ team_id: teamId.value, user_id: uid, role: 'guest' })
          .select('id, role')
          .single()
        if (ins.error) throw ins.error
        membershipId = ins.data.id
        existingRole = ins.data.role
      } else {
        membershipId = q.data.id
        existingRole = q.data.role || 'guest'
      }
    }

    // 3) role changes
    const want = (roleWanted.value || 'guest').toLowerCase()
    if (isAdmin.value && membershipId) {
      // Admins can set role directly
      const { error: updAdminErr } = await supabase
        .from('team_members')
        .update({ role: want, requested_role: null })
        .eq('id', membershipId)
      if (updAdminErr) throw updAdminErr
      currentRole.value = want
      saveMsg.value = `Saved. Role set to ${prettyRole(want)}.`
    } else if (membershipId) {
      // Non-admin: keep role guest, write requested_role (column must exist)
      const update = {}
      if (want !== 'guest') update.requested_role = want
      const { error: updGuestErr } = await supabase
        .from('team_members')
        .update(update)
        .eq('id', membershipId)
      if (updGuestErr) throw updGuestErr
      currentRole.value = existingRole
      saveMsg.value = want !== 'guest'
        ? `Saved. Request for "${prettyRole(want)}" sent to admins.`
        : 'Saved.'
    } else {
      saveMsg.value = 'Saved profile.'
    }
  } catch (e) {
    console.error('saveAccount error', e)
    saveErr.value = e?.message || 'Save failed'
  } finally {
    saving.value = false
  }
}

onMounted(loadInitial)
</script>

<style scoped>
.account-wrap {
  min-height: calc(100vh - 80px);
  display: grid;
  place-items: start center;
  padding: 16px;
  color: #fff;
}

.card {
  width: min(1100px, 96vw);
  background: rgba(255,255,255,.08);
  border: 1px solid rgba(255,255,255,.2);
  border-radius: 18px;
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  padding: 18px;
  box-shadow: 0 10px 30px rgba(0,0,0,.25);
}

h1 {
  margin: 0 0 .25rem 0;
  font-size: 2rem;
}
.subtitle {
  margin: 0 0 1rem 0;
  opacity: .9;
}

.grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px 24px;
}
@media (max-width: 900px){
  .grid { grid-template-columns: 1fr; }
}

.field { display: flex; flex-direction: column; gap: 6px; }
label { font-weight: 700; opacity: .95; }

input, select {
  width: 100%;
  padding: .75rem .9rem;
  border-radius: 12px;
  border: 1px solid rgba(255,255,255,.25);
  background: rgba(255,255,255,.06);
  color: #fff;
  outline: none;
}
input::placeholder { color: rgba(255,255,255,.5); }

.badge {
  display: inline-block;
  padding: .4rem .7rem;
  border-radius: 999px;
  border: 1px solid rgba(255,255,255,.35);
  background: rgba(255,255,255,.12);
  font-weight: 800;
}

.muted { margin: .4rem 0 0; opacity: .85; }

.actions {
  display: flex; align-items: center; gap: .75rem;
  margin-top: 16px;
}
.btn {
  background: linear-gradient(180deg, #4cc9f0, #4895ef);
  color: #0a0b0f;
  border: none;
  border-radius: 12px;
  padding: .7rem 1rem;
  font-weight: 800;
  cursor: pointer;
}
.btn:disabled { opacity: .6; cursor: not-allowed; }

.ok {
  color:#d7ffd7; background:rgba(0,200,0,.12);
  border:1px solid rgba(0,200,0,.25);
  padding:.5rem .6rem; border-radius:10px;
}
.error {
  color:#ffd4d4; background:rgba(255,0,0,.12);
  border:1px solid rgba(255,0,0,.25);
  padding:.5rem .6rem; border-radius:10px;
}
</style>
