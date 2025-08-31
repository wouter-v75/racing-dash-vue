<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from './lib/supabase'

const router = useRouter()
const firstName = ref('')
const isAdmin   = ref(false)
let unsub = null

async function loadUser() {
  const { data } = await supabase.auth.getUser()
  const meta = data?.user?.user_metadata || {}
  firstName.value = meta.first_name || ''

  // compute admin: do I have any membership with role='admin'?
  const { data: mem } = await supabase.from('team_members').select('role').limit(1).eq('user_id', data?.user?.id)
  isAdmin.value = (mem || []).some(r => r.role === 'admin')
}

onMounted(async () => {
  await loadUser()
  unsub = supabase.auth.onAuthStateChange(() => loadUser()).data?.subscription
})
onBeforeUnmount(() => { unsub?.unsubscribe?.() })

async function logout() {
  await supabase.auth.signOut()
  router.push('/login')
}
</script>
