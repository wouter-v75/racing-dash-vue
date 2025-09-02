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

    console.log(`API called: type=${type}, eventId=${eventId}, classId=${classId}, raceId=${raceId}`)

    if (type === 'ping') {
      return res.status(200).json({ ok: true, runtime, node: process.versions?.node, time: new Date().toISOString() })
    }
    
    if (!eventId && type !== 'ping') {
      return res.status(400).json({ success: false, message: 'Missing eventId' })
    }

    // Debug endpoint
    if (type === 'debug') {
      const html = await fetchText(indexUrl(eventId))
      return res.status(200).json({ 
        success: true, 
        resultType: 'debug', 
        meta: { eventId, runtime }, 
        preview: html.slice(0, 1400) 
      })
    }

    // Classes
    if (type === 'classes') {
      const html = await fetchText(indexUrl(eventId))
      const classes = safeParse(parseClasses, html)
      console.log(`Found ${classes.length} classes:`, classes.map(c => c.id))
      return ok(res, 'classes', classes, { eventId })
    }

    // Races for a specific class
    if (type === 'racesForClass') {
      if (!classId) return res.status(400).json({ success: false, message: 'Missing classId' })
      const html = await fetchText(indexUrl(eventId))
      const races = safeParse(h => parseRacesForClass(h, classId), html)
      console.log(`Found ${races.length} races for class ${classId}:`, races.map(r => r.id))
      return ok(res, 'races', races, { eventId, classId })
    }

    // All races (legacy)
    if (type === 'races') {
      const html = await fetchText(indexUrl(eventId))
      const races = safeParse(parseRacesAnyClass, html)
      return ok(res, 'races', races, { eventId })
    }

    // Overall series standings
    if (type === 'overall') {
      const cls = classId || (await autoFirstClass(eventId))
      if (!cls) return ok(res, 'overall', [], { eventId, classId: null })
      
      console.log(`Loading overall for class: ${cls}`)
      const html = await fetchText(seriesUrl(eventId, cls))
      const rows = safeParse(parseOverallByHeaders, html)
      console.log(`Parsed ${rows.length} overall results`)
      return ok(res, 'overall', rows, { eventId, classId: cls })
    }

    // Individual race results (class-specific URL)
    if (type === 'race') {
      if (!raceId) return res.status(400).json({ success: false, message: 'Missing raceId' })
      const cls = classId || (await autoFirstClass(eventId))
      if (!cls) return ok(res, 'race', [], { eventId, classId: null, raceId })
      
      console.log(`Loading race ${raceId} for class: ${cls}`)
      const html = await fetchText(raceUrl(eventId, cls, raceId))
      const rows = safeParse(parseRaceForClass, html)
      console.log(`Parsed ${rows.length} race results for race ${raceId}`)
      return ok(res, 'race', rows, { eventId, classId: cls, raceId })
    }

    // Race page without class in URL (multi-class page)
    if (type === 'raceRaw') {
      if (!raceId) return res.status(400).json({ success: false, message: 'Missing raceId' })
      
      console.log(`Loading raw race ${raceId}, selecting class: ${classId}`)
      const html = await fetchText(raceUrlRaw(eventId, raceId))
      const rows = safeParse(h => parseRaceChooseClass(h, classId || ''), html)
      console.log(`Parsed ${rows.length} results from raw race page`)
      return ok(res, 'race', rows, { eventId, classId: classId || null, raceId })
    }

    return res.status(400).json({ success: false, message: `Unknown type: ${type}` })
    
  } catch (e) {
    console.error('ORC API Error:', e)
    return res.status(500).json({ 
      success: false, 
      message: String(e?.message || e), 
      stack: e?.stack,
      params: { type: req.query?.type, eventId: req.query?.eventId }
    })
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
  const text = await r.text()
  console.log(`Response length: ${text.length} chars`)
  return text
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

/* ---------- Safety wrapper ---------- */
function safeParse(fn, html) {
  try { 
    const result = fn(html)
    console.log(`${fn.name} returned ${result.length} items`)
    return result
  } catch (e) {
    console.error(`Parse error in ${fn.name}:`, e)
    return []
  }
}

/* ---------- Auto-detect first class ---------- */
async function autoFirstClass(eventId) {
  try {
    const html = await fetchText(indexUrl(eventId))
    const classes = parseClasses(html)
    return classes[0]?.id || ''
  } catch (e) {
    console.error('Failed to auto-detect first class:', e)
    return ''
  }
}

/* ---------- Utils ---------- */
function decodeEntities(s) {
  return String(s || '')
    .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ')
}

function cleanup(s) {
  return decodeEntities(String(s || ''))
    .replace(/<[^>]+>/g, " ")
    .replace(/\u00A0/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function toSec(str) {
  if (!str) return null
  if (/^(DNF|DNS|DSQ|DNC|RET)$/i.test(str)) return null
  const p = str.split(':').map(Number)
  return p.length === 3 ? p[0] * 3600 + p[1] * 60 + p[2] : p[0] * 60 + p[1]
}

function mmssDelta(a, b) {
  const s1 = toSec(a), s2 = toSec(b)
  if (s1 == null || s2 == null) return '–'
  const d = Math.max(0, s2 - s1)
  const mm = String(Math.floor(d / 60)).padStart(2, '0')
  const ss = String(d % 60).padStart(2, '0')
  return `${mm}:${ss}`
}

function escapeRegex(s) { 
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&') 
}

/* ---------- Generic table extraction ---------- */
function allTables(html) {
  const tableRe = /<table[\s\S]*?<\/table>/gi
  const out = []
  let m
  while ((m = tableRe.exec(html)) !== null) {
    out.push({ html: m[0], index: m.index })
  }
  console.log(`Found ${out.length} tables in HTML`)
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
  return (idx >= 0 ? arr[idx] : (arr[fallbackIdx] || '')) || ''
}

/* ---------- Parsing: classes & races ---------- */
function parseClasses(htmlRaw) {
  const html = decodeEntities(htmlRaw)
  const out = []
  
  // Look for links with action=series and classid parameter
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
  console.log(`Looking for races for class: ${wantClass}`)
  
  // Find the segment for this class
  const anchorRe = new RegExp(`action=series[^"'>]*classid=${escapeRegex(wantClass)}`, 'i')
  const start = html.search(anchorRe)
  if (start < 0) {
    console.log(`No class section found for ${wantClass}`)
    return []
  }
  
  // Find end boundary: next class section
  const nextRe = /action=series[^"'>]*classid=([A-Za-z0-9]+)/gi
  nextRe.lastIndex = start + 1
  let end = html.length
  let m
  while ((m = nextRe.exec(html)) !== null) {
    const idx = m.index
    if (idx > start) { 
      end = idx
      break 
    }
  }
  
  const slice = html.slice(start, end)
  console.log(`Class section length: ${slice.length} chars`)
  
  // Collect race links in this slice
  const raceRe = /action=race[^\s"'>]*?(?:\?|&|&amp;)[^"'>]*raceid=([^\s"'>&]+)/gi
  const out = []
  while ((m = raceRe.exec(slice)) !== null) {
    const id = (m[1] || '').trim()
    if (id && !out.some(x => x.id === id)) {
      out.push({ id, label: `RACE ${id}` })
    }
  }
  
  console.log(`Found ${out.length} races for class ${wantClass}:`, out.map(r => r.id))
  return out.sort((a, b) => String(a.id).localeCompare(String(b.id), undefined, { numeric: true, sensitivity: 'base' }))
}

/* ---------- Parsing: overall (header-aware) ---------- */
function parseOverallByHeaders(htmlRaw) {
  const tables = allTables(htmlRaw)
  console.log(`Parsing overall from ${tables.length} tables`)
  
  // Choose the table whose header includes 'Pos' and ('Points' or 'Pts' or 'Total')
  const headerTable = tables.find(t => {
    const rows = tableRows(t.html)
    if (!rows.length) return false
    const headers = rows[0].map(x => x.toLowerCase())
    const hasPos = headers.some(h => /^(pos|#|position)$/.test(h))
    const hasPointsOrTotal = headers.some(h => /(points|pts|total)/.test(h))
    return hasPos && hasPointsOrTotal
  }) || tables[0]

  if (!headerTable) {
    console.log('No suitable table found for overall results')
    return []
  }
  
  const rows = tableRows(headerTable.html)
  if (!rows.length) return []

  // Compute header indices with fallbacks
  const headers = rows[0].map(x => x.trim())
  console.log('Overall headers:', headers)
  
  const iPos = headerIndex(headers, '^(pos|#|position)$')
  const iBoat = headerIndex(headers, '(boat|yacht|name)')
  const iSail = headerIndex(headers, '(sail|sail\\s*no|nr|no)')
  const iSkipper = headerIndex(headers, '(skipper|owner|helm|helmsman)')
  const iClub = headerIndex(headers, '(club|team)')
  const iPoints = headerIndex(headers, '(points|pts)')
  const iTotal = headerIndex(headers, '(total|net)')

  console.log('Header indices:', { iPos, iBoat, iSail, iSkipper, iClub, iPoints, iTotal })

  const out = []
  for (let r = 1; r < rows.length; r++) {
    const cells = rows[r]
    // Numeric first cell guard
    const first = parseInt(cells[0], 10)
    if (isNaN(first)) continue

    const result = {
      position: grab(cells, iPos, 0),
      name: grab(cells, iBoat, 1),
      sailNo: grab(cells, iSail, 2),
      club: grab(cells, iClub, 3),
      skipper: grab(cells, iSkipper, 4),
      points: grab(cells, iPoints, 5),
      total: grab(cells, iTotal, 6) || grab(cells, iPoints, 5)
    }
    
    if (result.name) {
      out.push(result)
    }
  }
  
  console.log(`Parsed ${out.length} overall results`)
  return out
}

/* ---------- Parsing: race (choose class table inside race page) ---------- */
function parseRaceForClass(htmlRaw) {
  console.log('Parsing race for specific class')
  const tables = allTables(htmlRaw)
  if (!tables.length) return []
  
  // Find the first table with "Corrected"/"Finish" columns
  const want = tables.find(t => hasResultColumns(t.html)) || tables[0]
  return toRaceRows(want.html)
}

function parseRaceChooseClass(htmlRaw, wantClass) {
  console.log(`Parsing race page, choosing class: ${wantClass}`)
  
  const html = decodeEntities(htmlRaw)
  if (!wantClass) {
    // No class preference → first table that looks like a race table
    const tables = allTables(html)
    const want = tables.find(t => hasResultColumns(t.html)) || tables[0]
    return want ? toRaceRows(want.html) : []
  }
  
  // Find anchor for the desired class
  const anchorRe = new RegExp(`action=series[^"'>]*classid=${escapeRegex(wantClass)}`, 'i')
  const pos = html.search(anchorRe)
  if (pos < 0) {
    console.log(`No anchor found for class ${wantClass}`)
    return []
  }
  
  // From this position, find the next table
  const tableRe = /<table[\s\S]*?<\/table>/gi
  tableRe.lastIndex = pos
  const m = tableRe.exec(html)
  if (!m) {
    console.log(`No table found after class ${wantClass} anchor`)
    return []
  }
  
  const tableHtml = m[0]
  return hasResultColumns(tableHtml) ? toRaceRows(tableHtml) : []
}

function hasResultColumns(tableHtml) {
  const rows = tableRows(tableHtml)
  if (!rows.length) return false
  const headers = rows[0].map(x => x.toLowerCase())
  const hasFinish = headers.some(h => /finish/.test(h))
  const hasCorrected = headers.some(h => /corrected/.test(h))
  const hasElapsed = headers.some(h => /elapsed/.test(h))
  const hasPos = headers.some(h => /^(pos|#|position)$/.test(h))
  return hasPos && (hasCorrected || hasFinish || hasElapsed)
}

function toRaceRows(tableHtml) {
  const rows = tableRows(tableHtml)
  if (!rows.length) return []
  
  // Map headers
  const headers = rows[0].map(x => x.trim())
  console.log('Race headers:', headers)
  
  const iPos = headerIndex(headers, '^(pos|#|position)$')
  const iBoat = headerIndex(headers, '(boat|yacht|name)')
  const iSail = headerIndex(headers, '(sail|sail\\s*no|nr|no)')
  const iSkipper = headerIndex(headers, '(skipper|owner|helm|helmsman)')
  const iFinish = headerIndex(headers, 'finish')
  const iElaps = headerIndex(headers, 'elapsed')
  const iCorr = headerIndex(headers, 'corrected')
  const iPenalty = headerIndex(headers, 'penalty')
  const iPoints = headerIndex(headers, '(points|pts)')

  console.log('Race header indices:', { iPos, iBoat, iSail, iSkipper, iFinish, iElaps, iCorr, iPenalty, iPoints })

  const out = []
  for (let r = 1; r < rows.length; r++) {
    const cells = rows[r]
    const first = parseInt(cells[0], 10)
    if (isNaN(first)) {
      // Check for DNF entries
      if (cells.some(cell => /^(DNF|DNS|DSQ|DNC|RET)$/i.test(cell))) {
        const dnfType = cells.find(cell => /^(DNF|DNS|DSQ|DNC|RET)$/i.test(cell)) || 'DNF'
        out.push({
          position: grab(cells, iPos, 0),
          name: grab(cells, iBoat, 1),
          sailNo: grab(cells, iSail, 2),
          skipper: grab(cells, iSkipper, 3),
          finishTime: dnfType,
          elapsed: dnfType,
          correctedTime: dnfType,
          penalty: grab(cells, iPenalty, 7) || '0',
          points: grab(cells, iPoints, 8) || '6.00'
        })
      }
      continue
    }
    
    const result = {
      position: grab(cells, iPos, 0),
      name: grab(cells, iBoat, 1),
      sailNo: grab(cells, iSail, 2),
      skipper: grab(cells, iSkipper, 3),
      finishTime: grab(cells, iFinish, 4),
      elapsed: grab(cells, iElaps, 5),
      correctedTime: grab(cells, iCorr, 6),
      penalty: grab(cells, iPenalty, 7) || '0',
      points: grab(cells, iPoints, 8) || '0'
    }
    
    if (result.name) {
      out.push(result)
    }
  }
  
  // Calculate deltaToFirst for all results
  if (out.length) {
    const firstCorrected = out[0].correctedTime
    if (firstCorrected && firstCorrected !== 'DNF') {
      for (const r of out) {
        if (r.correctedTime && r.correctedTime !== 'DNF') {
          r.deltaToFirst = mmssDelta(firstCorrected, r.correctedTime)
        } else {
          r.deltaToFirst = '–'
        }
      }
    }
  }
  
  console.log(`Parsed ${out.length} race results`)
  return out
}
