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
import { ref, onMounted } from 'vue'
import { supabase } from '../lib/supabase'

const firstName = ref('')
const lastName  = ref('')
const teamId    = ref('')
const boatName  = ref('')
const roleWanted = ref('guest')   // selected in the dropdown (Admin / Sailing team / …)

const teams  = ref([])
const boats  = ref([])
const saving = ref(false)
const saveMsg = ref('')
const saveErr = ref('')

const isAdmin = ref(false)  // computed from membership

async function loadInitial() {
  saveErr.value = ''
  // 1) auth user & metadata
  const { data: udata, error: uerr } = await supabase.auth.getUser()
  if (uerr) { saveErr.value = uerr.message; return }
  const meta = udata?.user?.user_metadata || {}
  firstName.value = meta.first_name || ''
  lastName.value  = meta.last_name  || ''
  boatName.value  = meta.boat_name  || ''
  teamId.value    = meta.team_id    || ''

  // 2) detect admin (any team)
  const uid = udata?.user?.id
  if (uid) {
    const { data: mem } = await supabase
      .from('team_members')
      .select('team_id, role')
      .eq('user_id', uid)
    isAdmin.value = Array.isArray(mem) && mem.some(r => r.role === 'admin')
  }

  // 3) load teams/boats lists (adjust to your schema/policies)
  const { data: trows } = await supabase.from('teams').select('id,name').order('name')
  teams.value = trows || []
  if (teamId.value) {
    const { data: brows } = await supabase.from('boats').select('id,name').eq('team_id', teamId.value).order('name')
    boats.value = brows || []
  }
}

async function saveAccount() {
  saving.value = true
  saveErr.value = ''
  saveMsg.value = ''
  try {
    const { data: udata, error: uerr } = await supabase.auth.getUser()
    if (uerr) throw uerr
    const uid = udata?.user?.id
    if (!uid) throw new Error('Not authenticated')

    // 1) Update auth metadata (first/last/boat/team)
    const { error: upMetaErr } = await supabase.auth.updateUser({
      data: {
        first_name: firstName.value?.trim(),
        last_name : lastName.value?.trim(),
        boat_name : boatName.value?.trim(),
        team_id   : teamId.value || null
      }
    })
    if (upMetaErr) throw upMetaErr

    // 2) Ensure membership row exists
    let membershipId = null
    let currentRole = 'guest'
    if (teamId.value) {
      const { data: mem, error: memErr } = await supabase
        .from('team_members')
        .select('id, role')
        .eq('team_id', teamId.value)
        .eq('user_id', uid)
        .maybeSingle()
      if (memErr) {
        // If 406 or not found, mem will be null — continue to insert
        if (memErr.code && memErr.code !== 'PGRST116') throw memErr
      }
      if (!mem) {
        // Insert as guest (RLS allows this)
        const ins = await supabase
          .from('team_members')
          .insert({ team_id: teamId.value, user_id: uid, role: 'guest' })
          .select('id, role')
          .single()
        if (ins.error) throw ins.error
        membershipId = ins.data.id
        currentRole = ins.data.role
      } else {
        membershipId = mem.id
        currentRole = mem.role
      }
    }

    // 3) Role logic
    const want = (roleWanted.value || 'guest').toLowerCase()

    if (isAdmin.value) {
      // Admins can change role directly (policy: tm: admins manage)
      if (membershipId) {
        const { error: updAdminErr } = await supabase
          .from('team_members')
          .update({ role: want, requested_role: null })
          .eq('id', membershipId)
        if (updAdminErr) throw updAdminErr
        saveMsg.value = `Saved. Role set to ${want}.`
      } else {
        saveMsg.value = 'Saved profile. (No team selected, role unchanged.)'
      }
    } else {
      // Non-admins: keep role=guest; write requested_role for approval
      if (membershipId) {
        const update = { }    // keep role as guest to satisfy with_check policy
        if (want !== 'guest') update.requested_role = want
        const { error: updGuestErr } = await supabase
          .from('team_members')
          .update(update)
          .eq('id', membershipId)
        if (updGuestErr) throw updGuestErr
        saveMsg.value = want !== 'guest'
          ? `Saved. Request for "${want}" sent to admins.`
          : 'Saved.'
      } else {
        saveMsg.value = 'Saved profile.'
      }
    }
  } catch (e) {
    console.error('saveAccount error', e)
    // Typical causes: RLS policy blocks, missing requested_role column, or no team selected
    saveErr.value = e?.message || 'Save failed'
  } finally {
    saving.value = false
  }
}

onMounted(loadInitial)
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
