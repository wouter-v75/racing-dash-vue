import { Client, Databases, ID, Permission, Role } from 'node-appwrite'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const client = new Client()
      .setEndpoint(process.env.APPWRITE_ENDPOINT)
      .setProject(process.env.APPWRITE_PROJECT_ID)
      .setKey(process.env.APPWRITE_API_KEY)

    const db = new Databases(client)
    const data = req.body

    // Example write to live_entries
    const doc = await db.createDocument(
      process.env.APPWRITE_DB_ID,
      process.env.APPWRITE_LIVE_COL_ID,
      ID.unique(),
      data,
      [Permission.read(Role.team(data.teamId)), Permission.write(Role.team(data.teamId, 'admin'))]
    )

    res.json({ success: true, doc })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
}
