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

    console.log(`API Call: type=${type}, eventId=${eventId}, classId=${classId}, raceId=${raceId}`)

    if (type === 'ping') {
      return res.status(200).json({ ok: true, runtime, node: process.versions?.node, time: new Date().toISOString() })
    }
    
    if (!eventId && type !== 'ping') {
      return res.status(400).json({ success: false, message: 'Missing eventId' })
    }

    // Debug endpoint
    if (type === 'debug') {
      const html = await fetchText(indexUrl(eventId))
      return res.status(200).json({ success: true, resultType: 'debug', meta: { eventId, runtime }, preview: html.slice(0, 1400) })
    }

    // Classes endpoint
    if (type === 'classes') {
      const html = await fetchText(indexUrl(eventId))
      const classes = safeParse(parseClasses, html)
      return ok(res, 'classes', classes, { eventId })
    }

    // Races for class endpoint
    if (type === 'racesForClass') {
      if (!classId) return res.status(400).json({ success: false, message: 'Missing classId' })
      const html = await fetchText(indexUrl(eventId))
      const races = safeParse(h => parseRacesForClass(h, classId), html)
      return ok(res, 'races', races, { eventId, classId })
    }

    // Legacy races endpoint
    if (type === 'races') {
      const html = await fetchText(indexUrl(eventId))
      const races = safeParse(parseRacesAnyClass, html)
      return ok(res, 'races', races, { eventId })
    }

    // Overall standings
    if (type === 'overall') {
      const cls = classId || (await autoFirstClass(eventId))
      if (!cls) return ok(res, 'overall', [], { eventId, classId: null })
      const html = await fetchText(seriesUrl(eventId, cls))
      const rows = safeParse(parseOverallByHeaders, html)
      return ok(res, 'overall', rows, { eventId, classId: cls })
    }

    // Race results for a specific class
    if (type === 'race') {
      if (!raceId) return res.status(400).json({ success: false, message: 'Missing raceId' })
      const cls = classId || (await autoFirstClass(eventId))
      if (!cls) return ok(res, 'race', [], { eventId, classId: null, raceId })
      
      console.log(`Fetching race ${raceId} for class ${cls}`)
      const html = await fetchText(raceUrl(eventId, cls, raceId))
      const rows = safeParse(parseRaceForClass, html)
      console.log(`Race ${raceId}: Found ${rows.length} results`)
      return ok(res, 'race', rows, { eventId, classId: cls, raceId })
    }

    // Race page without class in URL (raw race page)
    if (type === 'raceRaw') {
      if (!raceId) return res.status(400).json({ success: false, message: 'Missing raceId' })
      
      console.log(`Fetching raw race ${raceId}, looking for class ${classId}`)
      const html = await fetchText(raceUrlRaw(eventId, raceId))
      const rows = safeParse(h => parseRaceChooseClass(h, classId || ''), html)
      console.log(`Raw race ${raceId}: Found ${rows.length} results`)
      return ok(res, 'race', rows, { eventId, classId: classId || null, raceId })
    }

    return res.status(400).json({ success: false, message: 'Unknown type' })
    
  } catch (e) {
    console.error('ORC handler fatal:', e)
    return res.status(500).json({ success: false, message: String(e?.message || e), stack: e?.stack })
  }
}

/* ---------- URLs ---------- */
const indexUrl = (eventId) => `https://data.orc.org/public/WEV.dll?action=index&eventid=${encodeURIComponent(eventId)}`
const seriesUrl = (eventId, cls) => `https://data.orc.org/public/WEV.dll?action=series&eventid=${encodeURIComponent(eventId)}&classid=${encodeURIComponent(cls)}`
const raceUrl = (eventId, cls, rId) => `https://data.orc.org/public/WEV.dll?action=race&eventid=${encodeURIComponent(eventId)}&classid=${encodeURIComponent(cls)}&raceid=${encodeURIComponent(rId)}`
const raceUrlRaw = (eventId, rId) => `https://data.orc.org/public/WEV.dll?action=race&eventid=${encodeURIComponent(eventId)}&raceid=${encodeURIComponent(rId)}`

/* ---------- HTTP ---------- */
async function fetchText(url) {
  console.log(`Fetching: ${url}`)
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
  return res.status(200).json({ success: true, resultType, results, meta, lastUpdated: new Date().toISOString() })
}

/* ---------- Safety wrapper ---------- */
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
    .replace(/&nbsp;/g, ' ')
}

function cleanup(s) {
  return decodeEntities(String(s || ''))
    .replace(/<[^>]+>/g, ' ')
    .replace(/\u00A0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function toSec(str) {
  if (!str) return null
  if (/^(DNF|DNS|DSQ|DNC|RET)$/i.test(str)) return null
  
  const cleaned = str.replace(/[^\d:]/g, '').trim()
  if (!cleaned) return null
  
  const p = cleaned.split(':').map(Number).filter(n => !isNaN(n))
  return p.length === 3 ? p[0] * 3600 + p[1] * 60 + p[2] : 
         p.length === 2 ? p[0] * 60 + p[1] : 
         p.length === 1 ? p[0] : null
}

function mmssDelta(a, b) {
  const s1 = toSec(a), s2 = toSec(b)
  if (s1 == null || s2 == null) return '–'
  const d = Math.abs(s2 - s1)
  const mm = String(Math.floor(d / 60)).padStart(2, '0')
  const ss = String(d % 60).padStart(2, '0')
  return `${mm}:${ss}`
}

function escapeRegex(s) { 
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&') 
}

/* ---------- Table extraction ---------- */
function allTables(html) {
  const tableRe = /<table[\s\S]*?<\/table>/gi
  const out = []
  let m
  while ((m = tableRe.exec(html)) !== null) {
    out.push({ html: m[0], index: m.index })
  }
  return out
}

function tableRows(tableHtml) {
  const trsRe = /<tr[\s\S]*?<\/tr>/gi
  const cellRe = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi
  const rows = []
  let rm
  
  while ((rm = trsRe.exec(tableHtml)) !== null) {
    const rowHtml = rm[0]
    const cells = []
    let cm
    cellRe.lastIndex = 0 // Reset regex
    while ((cm = cellRe.exec(rowHtml)) !== null) {
      cells.push(cleanup(cm[1]))
    }
    if (cells.length) rows.push(cells)
  }
  return rows
}

function headerIndex(headers, pattern) {
  const re = new RegExp(pattern, 'i')
  for (let i = 0; i < headers.length; i++) {
    if (re.test(headers[i])) return i
  }
  return -1
}

function grab(arr, idx, fallbackIdx) {
  if (idx >= 0 && idx < arr.length && arr[idx]) {
    return arr[idx].trim()
  }
  if (fallbackIdx >= 0 && fallbackIdx < arr.length && arr[fallbackIdx]) {
    return arr[fallbackIdx].trim()
  }
  return ''
}

/* ---------- Auto class detection ---------- */
async function autoFirstClass(eventId) {
  try {
    const html = await fetchText(indexUrl(eventId))
    const classes = parseClasses(html)
    return classes[0]?.id || ''
  } catch (e) {
    console.error('autoFirstClass failed:', e)
    return ''
  }
}

/* ---------- Class & Race Link Parsing ---------- */
function parseClasses(htmlRaw) {
  const html = decodeEntities(htmlRaw)
  const out = []
  
  // Look for series links with classid parameter
  const reA = new RegExp(
    "href=([\"'])[^\"']*action=series[^\"']*?(?:eventid=[^\"'&>]+&[^\"'>]*classid=([^\"'&>]+)|classid=([^\"'&>]+)[^\"'>]*&[^\"'>]*eventid=[^\"'&>]+)[^\"']*\\1[^>]*>([\\s\\S]*?)<\\/a>",
    "gi"
  )
  let m
  while ((m = reA.exec(html)) !== null) {
    const id = (m[2] || m[3] || '').trim()
    if (id && !out.some(x => x.id === id)) {
      out.push({ id, label: id })
    }
  }
  
  // URL-only fallback
  if (!out.length) {
    const reU = /action=series[^\s"'>]*?(?:\?|&|&amp;)[^"'>]*classid=([^\s"'>&]+)/gi
    while ((m = reU.exec(html)) !== null) {
      const id = (m[1] || '').trim()
      if (id && !out.some(x => x.id === id)) {
        out.push({ id, label: id })
      }
    }
  }
  
  return out
}

function parseRacesAnyClass(htmlRaw) {
  const html = decodeEntities(htmlRaw)
  const out = []
  const re = /action=race[^\s"'>]*?(?:\?|&|&amp;)[^"'>]*raceid=([^\s"'>&]+)/gi
  let m
  while ((m = re.exec(html)) !== null) {
    const id = (m[1] || '').trim()
    if (id && !out.some(x => x.id === id)) {
      out.push({ id, label: `RACE ${id}` })
    }
  }
  return out.sort((a, b) => String(a.id).localeCompare(String(b.id), undefined, { numeric: true, sensitivity: 'base' }))
}

function parseRacesForClass(htmlRaw, wantClass) {
  const html = decodeEntities(htmlRaw)
  
  // Find class section
  const anchorRe = new RegExp(`action=series[^"'>]*classid=${escapeRegex(wantClass)}`, 'i')
  const start = html.search(anchorRe)
  if (start < 0) return []
  
  // Find end of class section
  const nextRe = /action=series[^"'>]*classid=([A-Za-z0-9]+)/gi
  nextRe.lastIndex = start + 1
  let end = html.length
  let m
  while ((m = nextRe.exec(html)) !== null) {
    if (m.index > start) {
      end = m.index
      break
    }
  }
  
  const slice = html.slice(start, end)
  
  // Extract race links from this class section
  const raceRe = /action=race[^\s"'>]*?(?:\?|&|&amp;)[^"'>]*raceid=([^\s"'>&]+)/gi
  const out = []
  while ((m = raceRe.exec(slice)) !== null) {
    const id = (m[1] || '').trim()
    if (id && !out.some(x => x.id === id)) {
      out.push({ id, label: `RACE ${id}` })
    }
  }
  return out.sort((a, b) => String(a.id).localeCompare(String(b.id), undefined, { numeric: true, sensitivity: 'base' }))
}

/* ---------- Overall Results Parsing ---------- */
function parseOverallByHeaders(htmlRaw) {
  console.log('parseOverallByHeaders: Starting')
  const tables = allTables(htmlRaw)
  
  // Find table with position and points columns
  const headerTable = tables.find(t => {
    const rows = tableRows(t.html)
    if (!rows.length) return false
    const headers = rows[0].map(x => x.toLowerCase())
    const hasPos = headers.some(h => /^(pos|#|position)$/.test(h))
    const hasPointsOrTotal = headers.some(h => /(points|pts|total)/.test(h))
    return hasPos && hasPointsOrTotal
  }) || tables[0]

  if (!headerTable) return []
  const rows = tableRows(headerTable.html)
  if (!rows.length) return []

  // Map header indices with fallbacks
  const headers = rows[0].map(x => x.trim())
  const iPos = headerIndex(headers, '^(pos|#|position)$')
  const iBoat = headerIndex(headers, '(boat|yacht|name)')
  const iSail = headerIndex(headers, '(sail|sail\\s*no|nr|no)')
  const iSkipper = headerIndex(headers, '(skipper|owner|helm|helmsman)')
  const iPoints = headerIndex(headers, '(points|pts)')
  const iTotal = headerIndex(headers, '(total|net)')

  const out = []
  for (let r = 1; r < rows.length; r++) {
    const cells = rows[r]
    const first = parseInt(cells[0], 10)
    if (isNaN(first)) continue

    out.push({
      position: grab(cells, iPos, 0),
      name: grab(cells, iBoat, 1),
      sailNo: grab(cells, iSail, 2),
      skipper: grab(cells, iSkipper, 4),
      points: grab(cells, iPoints, 5),
      total: grab(cells, iTotal, 6) || grab(cells, iPoints, 5)
    })
  }
  
  console.log(`parseOverallByHeaders: Returning ${out.length} results`)
  return out
}

/* ---------- Race Results Parsing ---------- */
function parseRaceForClass(htmlRaw) {
  console.log('parseRaceForClass: Starting parse')
  const tables = allTables(htmlRaw)
  console.log(`Found ${tables.length} tables`)
  
  if (!tables.length) return []
  
  // Find the best table for race results
  let bestTable = null
  let bestScore = 0
  
  for (const table of tables) {
    const rows = tableRows(table.html)
    if (rows.length < 2) continue
    
    const headerText = rows[0].join(' ').toLowerCase()
    let score = 0
    
    // Score based on expected columns
    if (/pos|position|#/.test(headerText)) score += 3
    if (/boat|yacht|name/.test(headerText)) score += 3
    if (/corrected/.test(headerText)) score += 2
    if (/finish/.test(headerText)) score += 2
    if (/elapsed/.test(headerText)) score += 1
    if (/sail|sail\s*no/.test(headerText)) score += 1
    
    // Check for actual data rows
    const hasDataRows = rows.slice(1).some(row => 
      row.length > 0 && (!isNaN(parseInt(row[0])) || /^(DNF|DNS|DSQ)$/i.test(row[0]))
    )
    if (hasDataRows) score += 2
    
    console.log(`Table score: ${score}, headers: ${rows[0].join(', ')}`)
    
    if (score > bestScore) {
      bestScore = score
      bestTable = table
    }
  }
  
  if (!bestTable) {
    console.log('No suitable table found, using first table')
    bestTable = tables[0]
  }
  
  const result = toRaceRows(bestTable.html)
  console.log(`parseRaceForClass: Returning ${result.length} rows`)
  return result
}

function parseRaceChooseClass(htmlRaw, wantClass) {
  console.log(`parseRaceChooseClass: Looking for class "${wantClass}"`)
  const html = decodeEntities(htmlRaw)
  
  if (!wantClass) {
    console.log('No class specified, finding first suitable table')
    const tables = allTables(html)
    const suitable = tables.find(t => hasResultColumns(t.html))
    if (suitable) {
      const result = toRaceRows(suitable.html)
      console.log(`parseRaceChooseClass (no class): Returning ${result.length} rows`)
      return result
    }
    return []
  }
  
  // Look for class section more broadly
  const patterns = [
    `classid=${escapeRegex(wantClass)}`,
    `class=${escapeRegex(wantClass)}`,
    `>${escapeRegex(wantClass)}<`,
    new RegExp(`\\b${escapeRegex(wantClass)}\\b`, 'i')
  ]
  
  let classPos = -1
  for (const pattern of patterns) {
    const regex = typeof pattern === 'string' ? new RegExp(pattern, 'i') : pattern
    const match = html.search(regex)
    if (match >= 0) {
      classPos = match
      console.log(`Found class "${wantClass}" at position ${classPos}`)
      break
    }
  }
  
  if (classPos < 0) {
    console.log(`Class "${wantClass}" not found, using first suitable table`)
    // Fallback to first table with race results
    const tables = allTables(html)
    const suitable = tables.find(t => hasResultColumns(t.html))
    if (suitable) {
      const result = toRaceRows(suitable.html)
      console.log(`parseRaceChooseClass (fallback): Returning ${result.length} rows`)
      return result
    }
    return []
  }
  
  // Find next table after class position
  const tableRe = /<table[\s\S]*?<\/table>/gi
  tableRe.lastIndex = classPos
  const match = tableRe.exec(html)
  
  if (!match) {
    console.log('No table found after class position')
    return []
  }
  
  const result = toRaceRows(match[0])
  console.log(`parseRaceChooseClass: Returning ${result.length} rows for class "${wantClass}"`)
  return result
}

function hasResultColumns(tableHtml) {
  const rows = tableRows(tableHtml)
  if (!rows.length) return false
  
  const headerText = rows[0].join(' ').toLowerCase()
  const hasPos = /pos|position|#/.test(headerText)
  const hasBoat = /boat|yacht|name/.test(headerText)
  const hasTime = /finish|elapsed|corrected|time/.test(headerText)
  
  // Check for data rows
  const hasDataRows = rows.slice(1).some(row => 
    row.length > 0 && (!isNaN(parseInt(row[0])) || /^(DNF|DNS|DSQ)$/i.test(row[0]))
  )
  
  return hasPos && hasBoat && hasTime && hasDataRows
}

function toRaceRows(tableHtml) {
  const rows = tableRows(tableHtml)
  if (!rows.length) return []
  
  console.log(`toRaceRows: Processing ${rows.length} rows`)
  if (rows[0]) console.log('Headers:', rows[0])
  
  // Map headers flexibly
  const headers = rows[0].map(x => x.trim().toLowerCase())
  const indices = {}
  
  headers.forEach((header, index) => {
    if (/^(pos|position|#)$/.test(header)) indices.position = index
    else if (/boat|yacht|name/.test(header)) indices.name = index
    else if (/sail|sail\s*no|nr|no/.test(header)) indices.sailNo = index
    else if (/owner|skipper|helm/.test(header)) indices.skipper = index
    else if (/finish/i.test(header) && !/elapsed/.test(header)) indices.finishTime = index
    else if (/elapsed/.test(header)) indices.elapsed = index
    else if (/corrected/.test(header)) indices.correctedTime = index
    else if (/penalty/.test(header)) indices.penalty = index
    else if (/points|pts/.test(header)) indices.points = index
  })
  
  console.log('Header mapping:', indices)
  
  const out = []
  for (let r = 1; r < rows.length; r++) {
    const cells = rows[r]
    if (!cells.length) continue
    
    const firstCell = cells[0]
    const isPosition = !isNaN(parseInt(firstCell))
    const isDnf = /^(DNF|DNS|DSQ|DNC|RET)$/i.test(firstCell)
    
    if (!isPosition && !isDnf) {
      console.log(`Skipping row ${r}: "${firstCell}" not a position`)
      continue
    }
    
    // Check if any cell contains DNF-type values
    const dnfCell = cells.find(cell => /^(DNF|DNS|DSQ|DNC|RET)$/i.test(cell))
    
    const result = {
      position: grab(cells, indices.position, 0),
      name: grab(cells, indices.name, 1) || 'Unknown',
      sailNo: grab(cells, indices.sailNo, 2),
      skipper: grab(cells, indices.skipper, 3),
      finishTime: dnfCell || grab(cells, indices.finishTime, 4),
      elapsed: dnfCell || grab(cells, indices.elapsed, 5),
      correctedTime: dnfCell || grab(cells, indices.correctedTime, 6),
      penalty: grab(cells, indices.penalty, 7) || '0',
      points: grab(cells, indices.points, 8) || (dnfCell ? '6.00' : '0')
    }
    
    out.push(result)
  }
  
  // Calculate deltaToFirst for all results
  if (out.length > 0) {
    const firstResult = out[0]
    const firstCorrectedTime = firstResult?.correctedTime
    
    if (firstCorrectedTime && !/^(DNF|DNS|DSQ|DNC|RET)$/i.test(firstCorrectedTime)) {
      out.forEach(result => {
        if (result.correctedTime && !/^(DNF|DNS|DSQ|DNC|RET)$/i.test(result.correctedTime)) {
          result.deltaToFirst = mmssDelta(firstCorrectedTime, result.correctedTime)
        } else {
          result.deltaToFirst = '–'
        }
      })
    } else {
      // If first place is DNF, set all deltas to '–'
      out.forEach(result => {
        result.deltaToFirst = '–'
      })
    }
  }
  
  console.log(`toRaceRows: Returning ${out.length} processed results`)
  return out
}
