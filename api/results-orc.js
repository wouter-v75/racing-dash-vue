// api/results-orc.js
export const runtime = 'nodejs'

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()

  try {
    const q = req.query || {}
    const type = String(q.type || 'overall')
    const eventId = String(q.eventId || '')
    const classId = q.classId != null ? String(q.classId) : ''
    const raceId = q.raceId != null ? String(q.raceId) : ''

    if (type === 'ping') {
      return res.status(200).json({ ok: true, runtime, node: process.versions?.node, time: new Date().toISOString() })
    }

    if (!eventId && type !== 'ping') {
      return res.status(400).json({ success: false, message: 'Missing eventId' })
    }

    // Debug parsing with safe minimal approach
    if (type === 'debug-parse') {
      if (!classId) return res.status(400).json({ success: false, message: 'Missing classId for debug-parse' })
      
      try {
        const html = await fetchText(seriesUrl(eventId, classId))
        
        // Simple debug info
        const debug = {
          htmlLength: html.length,
          containsNorthstar: html.includes('NORTHSTAR'),
          hasDataClass: html.includes('class="data"'),
          dataClassCount: (html.match(/class="data"/gi) || []).length
        }

        // Parse with minimal approach
        const results = parseSimpleOverall(html)
        debug.parsedCount = results.length
        debug.results = results
        
        // Find NORTHSTAR safely
        const northstar = results.find(r => 
          (r.name || '').toUpperCase().includes('NORTHSTAR')
        )
        debug.northstarFound = !!northstar
        if (northstar) debug.northstarData = northstar

        return res.status(200).json({
          success: true,
          resultType: 'debug-parse', 
          debug,
          meta: { eventId, classId }
        })
      } catch (err) {
        return res.status(500).json({
          success: false,
          error: err.message
        })
      }
    }

    // Other endpoints...
    if (type === 'overall') {
      const cls = classId || (await autoFirstClass(eventId))
      if (!cls) return ok(res, 'overall', [], { eventId, classId: null })
      
      const html = await fetchText(seriesUrl(eventId, cls))
      const rows = safeParse(parseSimpleOverall, html)
      return ok(res, 'overall', rows, { eventId, classId: cls })
    }

    return res.status(400).json({ success: false, message: 'Unknown type' })

  } catch (e) {
    console.error('ORC handler error:', e)
    return res.status(500).json({ 
      success: false, 
      message: e?.message || 'Internal server error'
    })
  }
}

/* ---------- URLs ---------- */
const indexUrl = (eventId) => `https://data.orc.org/public/WEV.dll?action=index&eventid=${encodeURIComponent(eventId)}`
const seriesUrl = (eventId, cls) => `https://data.orc.org/public/WEV.dll?action=series&eventid=${encodeURIComponent(eventId)}&classid=${encodeURIComponent(cls)}`

/* ---------- HTTP ---------- */
async function fetchText(url) {
  const r = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; racingdash/1.0)',
      'Accept': 'text/html,application/xhtml+xml'
    }
  })
  if (!r.ok) throw new Error(`Fetch failed ${r.status} for ${url}`)
  return r.text()
}

function ok(res, resultType, results, meta = {}) {
  return res.status(200).json({ 
    success: true, 
    resultType, 
    results, 
    meta, 
    lastUpdated: new Date().toISOString() 
  })
}

function safeParse(fn, html) {
  try { 
    return fn(html) 
  } catch (e) {
    console.error(`parse error in ${fn.name}:`, e)
    return []
  }
}

/* ---------- Simple parsing based on your debug results ---------- */
function parseSimpleOverall(html) {
  const results = []
  
  try {
    // Find all data rows
    const tableRowRegex = /<tr\s+class="data"[^>]*>.*?<\/tr>/gis
    const matches = html.match(tableRowRegex)
    
    if (!matches) {
      console.log('No data rows found')
      return results
    }

    for (const row of matches) {
      const cellRegex = /<td[^>]*>(.*?)<\/td>/gis
      const cells = []
      let cellMatch
      
      while ((cellMatch = cellRegex.exec(row)) !== null) {
        // Clean the cell content
        const cellText = cellMatch[1]
          .replace(/<[^>]*>/g, '')  // Remove HTML tags
          .replace(/\s+/g, ' ')    // Normalize whitespace
          .trim()
        cells.push(cellText)
      }
      
      // Based on your debug: [Position, Nation, Boat Name, Sail No, Rating, Skipper]
      if (cells.length >= 6) {
        const position = cells[0] || ''
        
        // Only process if position is numeric
        if (position && !isNaN(parseInt(position, 10))) {
          results.push({
            position: position,
            name: cells[2] || '',      // Boat name (NORTHSTAR OF LONDON)
            sailNo: cells[3] || '',    // Sail number (GBR72X) 
            skipper: cells[5] || '',   // Skipper name (Peter Dubens)
            points: cells[4] || '',    // Rating (IRC 72)
            total: cells[4] || ''      // Use rating as total
          })
        }
      }
    }
    
  } catch (error) {
    console.error('Error in parseSimpleOverall:', error)
  }
  
  return results
}

/* ---------- Helpers ---------- */
async function autoFirstClass(eventId) {
  try {
    const html = await fetchText(indexUrl(eventId))
    // Simple class extraction
    const classRegex = /classid=([A-Za-z0-9]+)/gi
    const matches = []
    let match
    while ((match = classRegex.exec(html)) !== null) {
      const id = match[1].trim()
      if (id && !matches.includes(id)) matches.push(id)
    }
    return matches[0] || null
  } catch (e) {
    console.error('autoFirstClass error:', e)
    return null
  }
}
