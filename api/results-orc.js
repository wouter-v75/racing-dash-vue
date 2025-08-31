// api/orc.js
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()

  try {
    const { type='overall', eventId='', classId='', raceId='' } = req.query

    let url
    if (type === 'overall') {
      url = `https://data.orc.org/public/WEV.dll?action=series&eventid=${eventId}&classid=${classId}`
    } else if (type === 'lastRace') {
      // You can fetch index page, detect last raceId, then fetch race.
      // For now assume raceId is unknown and you’ll enhance the parser later.
      url = `https://data.orc.org/public/WEV.dll?action=index&eventid=${eventId}`
      // TODO: parse to discover latest raceId, then fetch the race table
      // Fallback: if raceId given, use it:
      if (raceId) url = `https://data.orc.org/public/WEV.dll?action=race&eventid=${eventId}&raceid=${raceId}`
    } else {
      url = `https://data.orc.org/public/WEV.dll?action=race&eventid=${eventId}&raceid=${raceId}`
    }

    const r = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Accept': 'text/html,application/xhtml+xml'
      }
    })
    if (!r.ok) throw new Error(`Fetch failed ${r.status}`)
    const html = await r.text()

    // TODO: plug in your real parser here:
    const results = parseORC(html, type) // implement similar to your earlier code

    res.status(200).json({ success:true, results, resultType:type, lastUpdated:new Date().toISOString() })
  } catch (e) {
    console.error(e)
    res.status(500).json({ success:false, message:e.message })
  }
}

// ===== Dummy minimal parser (replace with your robust one) =====
function parseORC(html, type){
  // Return empty array until your parser is added.
  return []
}
