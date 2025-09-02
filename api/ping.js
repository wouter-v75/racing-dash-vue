// api/ping.js
export const runtime = 'nodejs'

export default function handler(req, res) {
  res.status(200).json({
    ok: true,
    env: 'node',
    node: process.versions?.node,
    timestamp: new Date().toISOString(),
  })
}
