import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ ok:false, message:'Method not allowed' })

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false }
  })

  const payload = req.body  // { rows: [...], regattaId, raceId, teamId }
  try {
    const { data, error } = await supabase
      .from('race_results')
      .upsert(payload.rows, { onConflict: 'id' })

    if (error) throw error
    res.status(200).json({ ok: true, count: data?.length || 0 })
  } catch (e) {
    console.error(e)
    res.status(500).json({ ok:false, message:e.message })
  }
}
