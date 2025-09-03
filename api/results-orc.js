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
function parseSimpleOverall(html, debug = false) {
  const results = []
  
  try {
    // Find all data rows
    const tableRowRegex = /<tr\s+class="data"[^>]*>.*?<\/tr>/gis
    const matches = html.match(tableRowRegex)
    
    if (!matches) {
      console.log('No data rows found')
      return results
    }

    for (let i = 0; i < matches.length; i++) {
      const row = matches[i]
      const cellRegex = /<td[^>]*>(.*?)<\/td>/gis
      const cells = []
      let cellMatch
      
      while ((cellMatch = cellRegex.exec(row)) !== null) {
        // Clean the cell content
        const cellText = cellMatch[1]
          .replace(/<[^>]*>/g, '')  // Remove HTML tags
          .replace(/&amp;/g, '&')  // Decode HTML entities
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'")
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/\s+/g, ' ')    // Normalize whitespace
          .trim()
        cells.push(cellText)
      }
      
      // Parse based on actual column count (13 columns total based on image)
      if (cells.length >= 6) {
        const position = cells[0] || ''
        
        // Only process if position is numeric
        if (position && !isNaN(parseInt(position, 10))) {
          const result = {
            position: position,
            name: cells[2] || '',      // Column 2: Yacht Name ✓
            sailNo: cells[3] || '',    // Column 3: Sail No ✓  
            skipper: cells[5] || '',   // Column 5: Owner ✓
            
            // Based on table image: Points should be in LAST column (Total)
            points: cells[cells.length - 1] || '', // Last column = Total points
            total: cells[cells.length - 1] || '',  // Last column = Total points
            
            // Add race scores if available (columns 8-11)
            r1: cells.length > 8 ? cells[8] : '',
            r2: cells.length > 9 ? cells[9] : '',
            r3: cells.length > 10 ? cells[10] : '',
            r4: cells.length > 11 ? cells[11] : ''
          }
          
          // Always include debug info when in debug mode
          if (debug) {
            result.debug_allCells = cells
            result.debug_cellCount = cells.length
            result.debug_lastCell = cells[cells.length - 1]
          }
          
          results.push(result)
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
