<template>
  <div class="page">
    <div class="glass">
      <h2 class="title">Membership approvals</h2>
      <p class="muted">Requests for teams you administer.</p>

      <div v-if="loading" class="muted">Loading…</div>
      <div v-else-if="!isAdminAny" class="error">You’re not an admin in any team.</div>
      <div v-else>
        <div v-if="rows.length === 0" class="muted">No pending requests.</div>

        <div class="table-wrap" v-else>
          <table>
            <thead>
              <tr>
                <th>Team</th>
                <th>User ID</th>
                <th>Current role</th>
                <th>Requested</th>
                <th style="width:220px">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="r in rows" :key="r.id">
                <td>{{ teamName(r.team_id) }}</td>
                <td class="mono">{{ r.user_id }}</td>
                <td class="cap">{{ r.role || 'guest' }}</td>
                <td class="cap"><strong>{{ r.requested_role }}</strong></td>
                <td class="actions">
                  <button class="btn approve" @click="approve(r)" :disabled="savingId===r.id">Approve</button>
                  <button class="btn deny" @click="deny(r)" :disabled="savingId===r.id">Deny</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <p v-if="notice" class="notice">{{ notice }}</p>
        <p v-if="error" class="error">{{ error }}</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { supabase } from '../lib/supabase'

const loading   = ref(true)
const savingId  = ref(null)
const notice    = ref('')
const error     = ref('')

const adminTeams = ref([]) // [{id, name}]
const teamMap    = ref({}) // id -> name
const rows       = ref([]) // pending requests
const isAdminAny = ref(false)

function teamName(id){ return teamMap.value[id] || id }

async function loadAdminTeams(){
  // find teams where *current user* role = admin
  const { data: mine, error: e1 } = await supabase
    .from('team_members')
    .select('team_id, role')
  if (e1) throw e1

  const ids = (mine || []).filter(r => r.role === 'admin').map(r => r.team_id)
  isAdminAny.value = ids.length > 0
  if (!ids.length) return

  // get team names
  const { data: ts, error: e2 } = await supabase
    .from('teams')
    .select('id, name')
    .in('id', ids)
  if (e2) throw e2

  adminTeams.value = ts || []
  teamMap.value = Object.fromEntries((ts || []).map(t => [t.id, t.name]))
}

async function loadRequests(){
  if (!isAdminAny.value) { rows.value = []; return }
  // read all pending requests within your admin teams
  const { data, error: e } = await supabase
    .from('team_members')
    .select('id, team_id, user_id, role, requested_role')
    .not('requested_role', 'is', null)
    .in('team_id', adminTeams.value.map(t => t.id))
    .order('team_id', { ascending: true })
  if (e) throw e
  rows.value = data || []
}

async function approve(r){
  error.value=''; notice.value=''; savingId.value = r.id
  try {
    const { error: e } = await supabase
      .from('team_members')
      .update({ role: r.requested_role, requested_role: null })
      .eq('id', r.id)
    if (e) throw e
    notice.value = 'Approved.'
    await loadRequests()
  } catch (e) {
    error.value = e?.message || 'Approval failed.'
  } finally {
    savingId.value = null
  }
}

async function deny(r){
  error.value=''; notice.value=''; savingId.value = r.id
  try {
    const { error: e } = await supabase
      .from('team_members')
      .update({ requested_role: null })
      .eq('id', r.id)
    if (e) throw e
    notice.value = 'Denied.'
    await loadRequests()
  } catch (e) {
    error.value = e?.message || 'Deny failed.'
  } finally {
    savingId.value = null
  }
}

onMounted(async () => {
  try {
    await loadAdminTeams()
    await loadRequests()
  } catch (e) {
    error.value = e?.message || 'Failed to load approvals.'
  } finally {
    loading.value = false
  }
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

.table-wrap { overflow:auto; border-radius: 12px; }
table { width:100%; border-collapse: collapse; }
th, td { text-align:left; padding:.55rem .6rem; border-bottom: 1px solid rgba(255,255,255,.12); }
.mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size:.9em; }
.cap  { text-transform: capitalize; }

.actions { display:flex; gap:.4rem; }
.btn { border:0; border-radius:10px; padding:.45rem .7rem; cursor:pointer; color:#0b2239; }
.btn.approve { background: linear-gradient(135deg,#11e8a3,#42f5c8); font-weight:800; }
.btn.deny    { background: rgba(255,255,255,.12); border:1px solid rgba(255,255,255,.25); color:#fff; }
.notice { margin-top:.6rem; color:#fff7d6; background:rgba(255,198,0,.12); border:1px solid rgba(255,198,0,.25); padding:.5rem .6rem; border-radius:10px; }
.error  { margin-top:.6rem; color:#ffd4d4; background:rgba(255,0,0,.12);   border:1px solid rgba(255,0,0,.25);   padding:.5rem .6rem; border-radius:10px; }
</style>
