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
    const type    = String(q.type || 'overall')
    const eventId = String(q.eventId || '')
    const classId = q.classId != null ? String(q.classId) : ''
    const raceId  = q.raceId  != null ? String(q.raceId)  : ''

    if (type === 'ping') {
      return res.status(200).json({ ok: true, runtime, node: process.versions?.node, time: new Date().toISOString() })
    }
    if (!eventId && type !== 'ping') {
      return res.status(400).json({ success:false, message:'Missing eventId' })
    }

    if (type === 'debug') {
      const html = await fetchText(indexUrl(eventId))
      const tables = allTables(html)
      const classes = safeParse(parseClasses, html)
      return res.status(200).json({ 
        success:true, 
        resultType:'debug', 
        meta:{ eventId, runtime, htmlLength: html.length, tablesFound: tables.length }, 
        preview: html.slice(0, 1400),
        classes: classes
      })
    }

    if (type === 'classes') {
      const html = await fetchText(indexUrl(eventId))
      const classes = safeParse(parseClasses, html)
      return ok(res, 'classes', classes, { eventId })
    }

    if (type === 'racesForClass') {
      if (!classId) return res.status(400).json({ success:false, message:'Missing classId' })
      const html = await fetchText(indexUrl(eventId))
      const races = safeParse(h => parseRacesForClass(h, classId), html)
      return ok(res, 'races', races, { eventId, classId })
    }

    if (type === 'races') {
      const html = await fetchText(indexUrl(eventId))
      const races = safeParse(parseRacesAnyClass, html)
      return ok(res, 'races', races, { eventId })
    }

    if (type === 'overall') {
      const cls = classId || (await autoFirstClass(eventId))
      if (!cls) return ok(res, 'overall', [], { eventId, classId: null })
      const html = await fetchText(seriesUrl(eventId, cls))
      const rows = safeParse(parseOverallByHeaders, html)
      return ok(res, 'overall', rows, { eventId, classId: cls })
    }

    if (type === 'race') {
      if (!raceId) return res.status(400).json({ success:false, message:'Missing raceId' })
      const cls = classId || (await autoFirstClass(eventId))
      if (!cls) return ok(res, 'race', [], { eventId, classId: null, raceId })
      const html = await fetchText(raceUrl(eventId, cls, raceId))
      const rows = safeParse(parseRaceForClass, html)
      return ok(res, 'race', rows, { eventId, classId: cls, raceId })
    }

    if (type === 'raceRaw') {
      if (!raceId) return res.status(400).json({ success:false, message:'Missing raceId' })
      const html = await fetchText(raceUrlRaw(eventId, raceId))
      const rows = safeParse(h => parseRaceChooseClass(h, classId || ''), html)
      return ok(res, 'race', rows, { eventId, classId: classId || null, raceId })
    }

    return res.status(400).json({ success:false, message:'Unknown type' })
  } catch (e) {
    console.error('ORC handler error:', e)
    return res.status(500).json({ success:false, message: String(e?.message || e) })
  }
}

/* ---------- URLs ---------- */
const indexUrl     = (eventId)           => `https://data.orc.org/public/WEV.dll?action=index&eventid=${encodeURIComponent(eventId)}`
const seriesUrl    = (eventId, cls)      => `https://data.orc.org/public/WEV.dll?action=series&eventid=${encodeURIComponent(eventId)}&classid=${encodeURIComponent(cls)}`
const raceUrl      = (eventId, cls, rId) => `https://data.orc.org/public/WEV.dll?action=race&eventid=${encodeURIComponent(eventId)}&classid=${encodeURIComponent(cls)}&raceid=${encodeURIComponent(rId)}`
const raceUrlRaw   = (eventId, rId)      => `https://data.orc.org/public/WEV.dll?action=race&eventid=${encodeURIComponent(eventId)}&raceid=${encodeURIComponent(rId)}`

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
  return res.status(200).json({ success:true, resultType, results, meta, lastUpdated:new Date().toISOString() })
}

function safeParse(fn, html) {
  try { 
    return fn(html)
  } catch (e) {
    console.error(`Parse error in ${fn.name}:`, e)
    return []
  }
}

/* ---------- Utils ---------- */
function decodeEntities(s) {
  return String(s || '')
    .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
}

function cleanup(s) {
  return decodeEntities(String(s || ''))
    .replace(new RegExp("<[^>]+>", "g"), " ")
    .replace(/\u00A0/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function toSec(str) {
  if (!str) return null
  if (/^(DNF|DNS|DSQ|DNC|RET)$/i.test(str)) return null
  const p = str.split(':').map(Number)
  return p.length === 3 ? p[0]*3600 + p[1]*60 + p[2] : p[0]*60 + p[1]
}

function mmssDelta(a, b) {
  const s1 = toSec(a), s2 = toSec(b)
  if (s1 == null || s2 == null) return '–'
  const d = Math.max(0, s2 - s1)
  const mm = String(Math.floor(d/60)).padStart(2,'0')
  const ss = String(d % 60).padStart(2,'0')
  return `${mm}:${ss}`
}

/* ---------- Table extraction ---------- */
function allTables(html) {
  const tableRe = new RegExp("<table[\\s\\S]*?<\\/table>", "gi")
  const out = []
  let m
  while ((m = tableRe.exec(html)) !== null) out.push({ html: m[0], index: m.index })
  return out
}

function tableRows(tableHtml) {
  const trsRe  = new RegExp("<tr[\\s\\S]*?<\\/tr>", "gi")
  const cellRe = new RegExp("<t[dh][^>]*>([\\s\\S]*?)<\\/t[dh]>", "gi")
  const rows = []
  let rm
  while ((rm = trsRe.exec(tableHtml)) !== null) {
    const rowHtml = rm[0]
    const cells = []
    let cm
    while ((cm = cellRe.exec(rowHtml)) !== null) cells.push(cleanup(cm[1]))
    if (cells.length) rows.push(cells)
  }
  return rows
}

function findColumnByName(headers, patterns) {
  for (let i = 0; i < headers.length; i++) {
    const header = headers[i].toLowerCase().trim()
    for (const pattern of patterns) {
      if (header.includes(pattern.toLowerCase())) {
        return i
      }
    }
  }
  return -1
}

function findBoatNameColumn(headers, rows) {
  // First try header-based detection
  const headerPatterns = ['yacht', 'boat', 'name', 'sail name', 'yacht name']
  let boatCol = findColumnByName(headers, headerPatterns)
  
  if (boatCol !== -1) {
    return boatCol
  }
  
  // Fallback: analyze content to find boat name column
  if (rows.length > 1) {
    for (let col = 1; col < Math.min(headers.length, 6); col++) {
      const sampleValue = rows[1][col] || ''
      
      // Check if this looks like a boat name:
      // - Not a number
      // - Reasonable length (3+ chars)
      // - Contains letters
      const isBoatName = sampleValue &&
                        isNaN(parseFloat(sampleValue)) &&
                        sampleValue.length >= 3 &&
                        /[a-zA-Z]/.test(sampleValue) &&
                        !sampleValue.match(/^\d+$/)
      
      if (isBoatName) {
        return col
      }
    }
  }
  
  // Last resort: assume column 1 if it exists
  return headers.length > 1 ? 1 : -1
}

function safeGet(arr, idx, fallback = '') {
  return (idx >= 0 && idx < arr.length && arr[idx] != null) ? String(arr[idx]).trim() : fallback
}

/* ---------- FIXED Parsing ---------- */
function parseOverallByHeaders(htmlRaw) {
  const tables = allTables(htmlRaw)
  
  // Find the standings table (has position and points/total columns)
  const standingsTable = tables.find(t => {
    const rows = tableRows(t.html)
    if (!rows.length) return false
    const headers = rows[0].map(x => x.toLowerCase())
    const hasPos = headers.some(h => /^(pos|#|position)$/.test(h))
    const hasPoints = headers.some(h => /(points|pts|total|score)/.test(h))
    return hasPos && hasPoints
  }) || tables[0]

  if (!standingsTable) return []
  
  const rows = tableRows(standingsTable.html)
  if (rows.length < 2) return []

  const headers = rows[0].map(x => x.trim())
  
  // Smart column detection
  const posCol = findColumnByName(headers, ['pos', 'position', '#']) || 0
  const boatCol = findBoatNameColumn(headers, rows)
  const sailCol = findColumnByName(headers, ['sail', 'nr', 'no', 'number'])
  const skipperCol = findColumnByName(headers, ['skipper', 'owner', 'helm'])
  const pointsCol = findColumnByName(headers, ['points', 'pts', 'score'])
  const totalCol = findColumnByName(headers, ['total', 'net', 'overall'])

  if (boatCol === -1) {
    console.error('Could not identify boat name column')
    return []
  }

  const results = []
  for (let r = 1; r < rows.length; r++) {
    const cells = rows[r]
    
    // Skip non-data rows
    if (!cells[posCol] || isNaN(parseInt(cells[posCol], 10))) continue
    
    const entry = {
      position: safeGet(cells, posCol),
      name: safeGet(cells, boatCol),
      sailNo: safeGet(cells, sailCol >= 0 ? sailCol : boatCol + 1),
      skipper: safeGet(cells, skipperCol >= 0 ? skipperCol : boatCol + 2),
      points: safeGet(cells, pointsCol >= 0 ? pointsCol : cells.length - 2),
      total: safeGet(cells, totalCol >= 0 ? totalCol : cells.length - 1)
    }
    
    // Only include entries with valid name
    if (entry.name && entry.name.length > 1) {
      results.push(entry)
    }
  }
  
  return results
}

function parseRaceForClass(htmlRaw) {
  const tables = allTables(htmlRaw)
  if (!tables.length) return []
  
  // Find race results table (has finish/corrected time columns)
  const raceTable = tables.find(t => {
    const rows = tableRows(t.html)
    if (!rows.length) return false
    const headers = rows[0].map(x => x.toLowerCase())
    const hasPos = headers.some(h => /^(pos|#|position)$/.test(h))
    const hasTime = headers.some(h => /(finish|corrected|elapsed|time)/.test(h))
    return hasPos && hasTime
  }) || tables[0]
  
  return parseRaceRows(raceTable.html)
}

function parseRaceChooseClass(htmlRaw, wantClass) {
  const html = decodeEntities(htmlRaw)
  
  if (!wantClass) {
    const tables = allTables(html)
    const raceTable = tables.find(t => {
      const rows = tableRows(t.html)
      if (!rows.length) return false
      const headers = rows[0].map(x => x.toLowerCase())
      const hasPos = headers.some(h => /^(pos|#|position)$/.test(h))
      const hasTime = headers.some(h => /(finish|corrected|elapsed)/.test(h))
      return hasPos && hasTime
    }) || tables[0]
    return raceTable ? parseRaceRows(raceTable.html) : []
  }
  
  // Find class-specific section
  const anchorRe = new RegExp(`action=series[^"'>]*classid=${escapeRegex(wantClass)}`, 'i')
  const pos = html.search(anchorRe)
  if (pos < 0) return []
  
  const tableRe = new RegExp("<table[\\s\\S]*?<\\/table>", "gi")
  tableRe.lastIndex = pos
  const m = tableRe.exec(html)
  if (!m) return []
  
  return parseRaceRows(m[0])
}

function parseRaceRows(tableHtml) {
  const rows = tableRows(tableHtml)
  if (rows.length < 2) return []
  
  const headers = rows[0].map(x => x.trim())
  
  const posCol = findColumnByName(headers, ['pos', 'position', '#']) || 0
  const boatCol = findBoatNameColumn(headers, rows)
  const finishCol = findColumnByName(headers, ['finish', 'finish time'])
  const elapsedCol = findColumnByName(headers, ['elapsed', 'elapsed time'])
  const correctedCol = findColumnByName(headers, ['corrected', 'corrected time'])
  
  if (boatCol === -1) return []
  
  const results = []
  for (let r = 1; r < rows.length; r++) {
    const cells = rows[r]
    
    if (!cells[posCol] || isNaN(parseInt(cells[posCol], 10))) continue
    
    const entry = {
      position: safeGet(cells, posCol),
      name: safeGet(cells, boatCol),
      finishTime: safeGet(cells, finishCol >= 0 ? finishCol : Math.max(3, boatCol + 1)),
      elapsed: safeGet(cells, elapsedCol >= 0 ? elapsedCol : Math.max(4, boatCol + 2)),
      correctedTime: safeGet(cells, correctedCol >= 0 ? correctedCol : Math.max(5, boatCol + 3))
    }
    
    if (entry.name && entry.name.length > 1) {
      results.push(entry)
    }
  }
  
  // Calculate deltas
  if (results.length && results[0].correctedTime) {
    const firstTime = results[0].correctedTime
    for (const r of results) {
      r.deltaToFirst = (firstTime && r.correctedTime) ? 
        mmssDelta(firstTime, r.correctedTime) : '–'
    }
  }
  
  return results
}

/* ---------- Classes & Races ---------- */
function parseClasses(htmlRaw) {
  const html = decodeEntities(htmlRaw)
  const out = []
  
  // Find class links
  const reA = new RegExp(
    "href=([\"'])[^\"']*action=series[^\"']*?(?:eventid=[^\"'&>]+&[^\"'>]*classid=([^\"'&>]+)|classid=([^\"'&>]+)[^\"'>]*&[^\"'>]*eventid=[^\"'&>]+)[^\"']*\\1[^>]*>([\\s\\S]*?)<\\/a>",
    "gi"
  )
  let m
  while ((m = reA.exec(html)) !== null) {
    const id = (m[2] || m[3] || '').trim()
    if (id && !out.some(x => x.id === id)) out.push({ id, label: id })
  }
  
  // Fallback: URL-only detection
  if (!out.length) {
    const reU = new RegExp("action=series[^\\s\"'>]*?(?:\\?|&|&amp;)[^\"'>]*classid=([^\\s\"'>&]+)", "gi")
    while ((m = reU.exec(html)) !== null) {
      const id = (m[1] || '').trim()
      if (id && !out.some(x => x.id === id)) out.push({ id, label: id })
    }
  }
  
  return out
}

function parseRacesAnyClass(htmlRaw) {
  const html = decodeEntities(htmlRaw)
  const out = []
  const re = new RegExp("action=race[^\\s\"'>]*?(?:\\?|&|&amp;)[^\"'>]*raceid=([^\\s\"'>&]+)", "gi")
  let m
  while ((m = re.exec(html)) !== null) {
    const id = (m[1] || '').trim()
    if (id && !out.some(x => x.id === id)) out.push({ id, label: `RACE ${id}` })
  }
  return out.sort((a,b) => String(a.id).localeCompare(String(b.id), undefined, { numeric:true, sensitivity:'base' }))
}

function parseRacesForClass(htmlRaw, wantClass) {
  const html = decodeEntities(htmlRaw)
  
  const anchorRe = new RegExp(`action=series[^"'>]*classid=${escapeRegex(wantClass)}`, 'i')
  const start = html.search(anchorRe)
  if (start < 0) return []
  
  const nextRe = new RegExp("action=series[^\"'>]*classid=([A-Za-z0-9]+)", "gi")
  nextRe.lastIndex = start + 1
  let end = html.length
  const next = nextRe.exec(html)
  if (next) end = next.index
  
  const slice = html.slice(start, end)
  const raceRe = new RegExp("action=race[^\\s\"'>]*?(?:\\?|&|&amp;)[^\"'>]*raceid=([^\\s\"'>&]+)", "gi")
  const out = []
  let m
  while ((m = raceRe.exec(slice)) !== null) {
    const id = (m[1] || '').trim()
    if (id && !out.some(x => x.id === id)) out.push({ id, label: `RACE ${id}` })
  }
  return out.sort((a,b) => String(a.id).localeCompare(String(b.id), undefined, { numeric:true, sensitivity:'base' }))
}

function escapeRegex(s) { 
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&') 
}

async function autoFirstClass(eventId) {
  const html = await fetchText(indexUrl(eventId))
  const cls = parseClasses(html)
  return cls[0]?.id || null
}
