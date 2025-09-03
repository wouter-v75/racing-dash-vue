// api/results-orc.js
export const runtime = 'nodejs'  // ensure Node runtime on Vercel

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

    // Handle debug-parse mode - debug the actual parsing and return results
    if (type === 'debug-parse') {
      if (!classId) return res.status(400).json({ success: false, message: 'Missing classId for debug-parse' })
      
      const html = await fetchText(seriesUrl(eventId, classId))
      const debugInfo = debugParseSimpleOverall(html)
      
      return res.status(200).json({
        success: true,
        resultType: 'debug-parse',
        debug: debugInfo,
        meta: { eventId, classId }
      })
    }

    // Simple debug (raw HTML preview)
    if (type === 'debug') {
      const html = await fetchText(indexUrl(eventId))
      return res.status(200).json({ success:true, resultType:'debug', meta:{ eventId, runtime }, preview: html.slice(0, 1400) })
    }

    if (type === 'classes') {
      const html = await fetchText(indexUrl(eventId))
      const classes = safeParse(parseClasses, html)             // [{id,label}]
      return ok(res, 'classes', classes, { eventId })
    }

    // NEW: races filtered by class section
    if (type === 'racesForClass') {
      if (!classId) return res.status(400).json({ success:false, message:'Missing classId' })
      const html = await fetchText(indexUrl(eventId))
      const races = safeParse(h => parseRacesForClass(h, classId), html)  // [{id,label}]
      return ok(res, 'races', races, { eventId, classId })
    }

    // Legacy (all race links on page, any class) – still available
    if (type === 'races') {
      const html = await fetchText(indexUrl(eventId))
      const races = safeParse(parseRacesAnyClass, html)
      return ok(res, 'races', races, { eventId })
    }

    // OVERALL for a class (header-aware points/total extraction)
    if (type === 'overall') {
      const cls = classId || (await autoFirstClass(eventId))
      if (!cls) return ok(res, 'overall', [], { eventId, classId: null })
      const html = await fetchText(seriesUrl(eventId, cls))
      const rows = safeParse(parseOverallByHeaders, html)  // header-aware mapping
      return ok(res, 'overall', rows, { eventId, classId: cls })
    }

    // RACE for a class (URL contains classId)
    if (type === 'race') {
      if (!raceId) return res.status(400).json({ success:false, message:'Missing raceId' })
      const cls = classId || (await autoFirstClass(eventId))
      if (!cls) return ok(res, 'race', [], { eventId, classId: null, raceId })
      const html = await fetchText(raceUrl(eventId, cls, raceId))
      const rows = safeParse(parseRaceForClass, html)       // selects table that has Corrected/Finish columns
      return ok(res, 'race', rows, { eventId, classId: cls, raceId })
    }

    // RACE page without class in URL – we still pick the desired class section inside the page
    if (type === 'raceRaw') {
      if (!raceId) return res.status(400).json({ success:false, message:'Missing raceId' })
      const html = await fetchText(raceUrlRaw(eventId, raceId))
      const rows = safeParse(h => parseRaceChooseClass(h, classId || ''), html) // classId USED to pick the class table
      return ok(res, 'race', rows, { eventId, classId: classId || null, raceId })
    }

    return res.status(400).json({ success:false, message:'Unknown type' })
  } catch (e) {
    console.error('ORC handler fatal:', e)
    return res.status(500).json({ success:false, message: String(e?.message || e), stack: e?.stack })
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

/* ---------- Safety wrapper ---------- */
function safeParse(fn, html) {
  try { return fn(html) } catch (e) {
    console.error(`parse error in ${fn.name}:`, e)
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

/* ---------- Generic table extraction ---------- */
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
function headerIndex(headers, pattern) {
  const re = new RegExp(pattern, 'i')
  for (let i=0;i<headers.length;i++) {
    if (re.test(headers[i])) return i
  }
  return -1
}

/* ---------- FIXED: Complete parseSimpleOverallResults function ---------- */
function parseSimpleOverallResults(html) {
  const results = []
  try {
    // Find all data rows using the exact class pattern
    const dataRowRegex = /<tr\s+class="data"[^>]*>([\s\S]*?)<\/tr>/gi
    const matches = []
    let match
    while ((match = dataRowRegex.exec(html)) !== null) {
      matches.push(match[1]) // Get the content between <tr> tags
    }

    console.log(`Found ${matches.length} data rows`)

    for (const rowContent of matches) {
      // Extract cells from this row
      const cellRegex = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi
      const cells = []
      let cellMatch
      while ((cellMatch = cellRegex.exec(rowContent)) !== null) {
        cells.push(cleanup(cellMatch[1]))
      }

      if (cells.length >= 4) {
        // Basic structure: position, boat name, sail number, skipper, points...
        const result = {
          position: cleanup(cells[0]) || '',
          name: cleanup(cells[1]) || '',
          sailNo: cleanup(cells[2]) || '', 
          skipper: cleanup(cells[3]) || '',
          points: cells.length > 4 ? cleanup(cells[4]) : '',
          total: cells.length > 5 ? cleanup(cells[5]) : ''
        }

        // Only add if position looks like a number
        const pos = parseInt(result.position, 10)
        if (!isNaN(pos)) {
          results.push(result)
        }
      }
    }
  } catch (error) {
    console.error('Error in parseSimpleOverallResults:', error)
  }
  return results
}

/* ---------- DEBUG: Debug parsing function ---------- */
function debugParseSimpleOverall(html) {
  const debug = {
    htmlLength: html.length,
    containsNorthstar: html.includes('NORTHSTAR'),
    northstarMatches: (html.match(/NORTHSTAR/gi) || []).length,
    hasDataClass: html.includes('class="data"'),
    dataClassMatches: (html.match(/class="data"/gi) || []).length
  }

  try {
    // Find all data rows
    const dataRowRegex = /<tr\s+class="data"[^>]*>([\s\S]*?)<\/tr>/gi
    const dataRows = []
    let match
    while ((match = dataRowRegex.exec(html)) !== null) {
      dataRows.push(match[0]) // Full row HTML
    }

    debug.dataRowsFound = dataRows.length
    debug.dataRowsPreview = dataRows.slice(0, 2).map(row => row.slice(0, 200) + '...')

    // Try to parse each row
    const results = parseSimpleOverallResults(html)
    debug.successfullyParsed = results.length
    debug.parsedResults = results

    // Look for NORTHSTAR specifically
    const northstarResult = results.find(r => 
      r.name.toUpperCase().includes('NORTHSTAR') || 
      r.skipper.toUpperCase().includes('NORTHSTAR')
    )
    debug.northstarFound = !!northstarResult
    if (northstarResult) {
      debug.northstarData = northstarResult
    }

  } catch (error) {
    debug.parseError = error.message
    debug.errorStack = error.stack
  }

  return debug
}

/* ---------- Parsing: overall (header-aware) ---------- */
function parseOverallByHeaders(htmlRaw) {
  const tables = allTables(htmlRaw)
  // choose the table whose header includes 'Pos' and ('Points' or 'Pts' or 'Total')
  const headerTable = tables.find(t => {
    const rows = tableRows(t.html)
    if (!rows.length) return false
    const headers = rows[0].map(x => x.toLowerCase())
    const hasPos = headers.some(h => /^(pos|#|position)$/.test(h))
    const hasPointsOrTotal = headers.some(h => /(points|pts|total)/.test(h))
    return hasPos && hasPointsOrTotal
  }) || tables[0]

  if (!headerTable) {
    // Fallback to simple parsing if no header table found
    return parseSimpleOverallResults(htmlRaw)
  }
  
  const rows = tableRows(headerTable.html)
  if (!rows.length) return []

  // compute header indices (fallbacks)
  const headers = rows[0].map(x => x.trim())
  const iPos     = headerIndex(headers, '^(pos|#|position)

function grab(arr, idx, fallbackIdx) {
  return (idx >= 0 ? arr[idx] : arr[fallbackIdx]) || ''
}

/* ---------- Parsing: race results ---------- */
function parseRaceForClass(html) {
  const tables = allTables(html)
  // Find a table with "Corrected" and ("Finish" or "Elapsed") headers
  const raceTable = tables.find(t => {
    const rows = tableRows(t.html)
    if (!rows.length) return false
    const hdrs = rows[0].map(x => x.toLowerCase())
    const hasCorrected = hdrs.some(h => h.includes('corrected'))
    const hasFinish = hdrs.some(h => h.includes('finish') || h.includes('elapsed'))
    return hasCorrected && hasFinish
  })
  
  if (!raceTable) return []
  const rows = tableRows(raceTable.html)
  if (rows.length < 2) return []

  const headers = rows[0]
  const iPos       = headerIndex(headers, '^(pos|#|position)$')
  const iBoat      = headerIndex(headers, '(boat|yacht|name)')
  const iSail      = headerIndex(headers, '(sail|sail\\s*no|nr|no)')
  const iSkipper   = headerIndex(headers, '(skipper|owner|helm)')
  const iFinish    = headerIndex(headers, '(finish|elapsed)')
  const iCorrected = headerIndex(headers, 'corrected')

  const out = []
  for (let r = 1; r < rows.length; r++) {
    const cells = rows[r]
    const first = parseInt(cells[0], 10)
    if (isNaN(first)) continue

    const finishTime = grab(cells, iFinish, 4)
    const corrTime   = grab(cells, iCorrected, 5)
    out.push({
      position: grab(cells, iPos, 0),
      name: grab(cells, iBoat, 1),
      sailNo: grab(cells, iSail, 2),
      skipper: grab(cells, iSkipper, 3),
      finishTime: finishTime,
      correctedTime: corrTime,
      delta: out.length ? mmssDelta(out[0].correctedTime, corrTime) : '–'
    })
  }
  return out
}

function parseRaceChooseClass(html, wantClass) {
  // For pages with multiple class tables, find the one for wantClass
  const tables = allTables(html)
  
  let targetTable = null
  if (wantClass) {
    // Look for a table near a heading or text containing the class name
    for (const table of tables) {
      // Check text before the table for class mentions
      const beforeTable = html.slice(Math.max(0, table.index - 500), table.index)
      if (beforeTable.toUpperCase().includes(wantClass.toUpperCase())) {
        targetTable = table
        break
      }
    }
  }
  
  // Fallback to first table with race structure
  if (!targetTable) {
    targetTable = tables.find(t => {
      const rows = tableRows(t.html)
      if (!rows.length) return false
      const hdrs = rows[0].map(x => x.toLowerCase())
      return hdrs.some(h => h.includes('corrected') || h.includes('finish'))
    })
  }

  if (!targetTable) return []
  
  const rows = tableRows(targetTable.html)
  if (rows.length < 2) return []

  // Use same logic as parseRaceForClass
  const headers = rows[0]
  const iPos       = headerIndex(headers, '^(pos|#|position)$')
  const iBoat      = headerIndex(headers, '(boat|yacht|name)')
  const iSail      = headerIndex(headers, '(sail|sail\\s*no|nr|no)')
  const iSkipper   = headerIndex(headers, '(skipper|owner|helm)')
  const iFinish    = headerIndex(headers, '(finish|elapsed)')
  const iCorrected = headerIndex(headers, 'corrected')

  const out = []
  for (let r = 1; r < rows.length; r++) {
    const cells = rows[r]
    const first = parseInt(cells[0], 10)
    if (isNaN(first)) continue

    const finishTime = grab(cells, iFinish, 4)
    const corrTime   = grab(cells, iCorrected, 5)
    out.push({
      position: grab(cells, iPos, 0),
      name: grab(cells, iBoat, 1),
      sailNo: grab(cells, iSail, 2),
      skipper: grab(cells, iSkipper, 3),
      finishTime: finishTime,
      correctedTime: corrTime,
      delta: out.length ? mmssDelta(out[0].correctedTime, corrTime) : '–'
    })
  }
  return out
}

/* ---------- Parsing: classes & races ---------- */
function parseClasses(htmlRaw) {
  const html = decodeEntities(htmlRaw)
  const out = []
  // anchor form (any param order, any quotes)
  const reA = new RegExp(
    "href=([\"'])[^\"']*action=series[^\"']*?(?:eventid=[^\"'&>]+&[^\"'>]*classid=([^\"'&>]+)|classid=([^\"'&>]+)[^\"'>]*&[^\"'>]*eventid=[^\"'&>]+)[^\"']*\\1[^>]*>([\\s\\S]*?)<\\/a>",
    "gi"
  )
  let m
  while ((m = reA.exec(html)) !== null) {
    const id = (m[2] || m[3] || '').trim()
    if (id && !out.some(x => x.id === id)) out.push({ id, label: id })
  }
  // URL-only fallback
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
  // Find the segment for this class: from its series link up to the next class/link block
  const anchorRe = new RegExp(`action=series[^"'>]*classid=${escapeRegex(wantClass)}`, 'i')
  const start = html.search(anchorRe)
  if (start < 0) return []
  // end boundary: next "action=series&...classid=" occurrence
  const nextRe = new RegExp("action=series[^\"'>]*classid=([A-Za-z0-9]+)", "gi")
  nextRe.lastIndex = start + 1
  let end = html.length, m
  while ((m = nextRe.exec(html)) !== null) {
    const idx = m.index
    if (idx > start) { end = idx; break }
  }
  const slice = html.slice(start, end)
  // Collect race links ONLY in this slice
  const raceRe = new RegExp("action=race[^\\s\"'>]*?(?:\\?|&|&amp;)[^\"'>]*raceid=([^\\s\"'>&]+)", "gi")
  const out = []
  while ((m = raceRe.exec(slice)) !== null) {
    const id = (m[1] || '').trim()
    if (id && !out.some(x => x.id === id)) out.push({ id, label: `RACE ${id}` })
  }
  return out.sort((a,b) => String(a.id).localeCompare(String(b.id), undefined, { numeric:true, sensitivity:'base' }))
}
function escapeRegex(s){ return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&') }

/* ---------- Helpers ---------- */
async function autoFirstClass(eventId) {
  const html = await fetchText(indexUrl(eventId))
  const cls = parseClasses(html)
  return cls[0]?.id || null
})
  const iBoat    = headerIndex(headers, '(boat|yacht|name)')
  const iSail    = headerIndex(headers, '(sail|sail\\s*no|nr|no)')
  const iSkipper = headerIndex(headers, '(skipper|owner|helm|helmsman)')
  const iPoints  = headerIndex(headers, '(points|pts)')
  const iTotal   = headerIndex(headers, '(total|net)')

  const out = []
  for (let r = 1; r < rows.length; r++) {
    const cells = rows[r]
    // numeric first cell guard
    const first = parseInt(cells[0], 10)
    if (isNaN(first)) continue

    out.push({
      position: grab(cells, iPos, 0),
      name:     grab(cells, iBoat, 2),      // Fallback to column 2 for boat name
      sailNo:   grab(cells, iSail, 3),     // Fallback to column 3 for sail number
      skipper:  grab(cells, iSkipper, 5),  // Fallback to column 5 for skipper
      points:   grab(cells, iPoints, 4),   // Fallback to column 4 for points
      total:    grab(cells, iTotal, 4) || grab(cells, iPoints, 4)
    })
  }
  return out
}

function grab(arr, idx, fallbackIdx) {
  return (idx >= 0 ? arr[idx] : arr[fallbackIdx]) || ''
}

/* ---------- Parsing: race results ---------- */
function parseRaceForClass(html) {
  const tables = allTables(html)
  // Find a table with "Corrected" and ("Finish" or "Elapsed") headers
  const raceTable = tables.find(t => {
    const rows = tableRows(t.html)
    if (!rows.length) return false
    const hdrs = rows[0].map(x => x.toLowerCase())
    const hasCorrected = hdrs.some(h => h.includes('corrected'))
    const hasFinish = hdrs.some(h => h.includes('finish') || h.includes('elapsed'))
    return hasCorrected && hasFinish
  })
  
  if (!raceTable) return []
  const rows = tableRows(raceTable.html)
  if (rows.length < 2) return []

  const headers = rows[0]
  const iPos       = headerIndex(headers, '^(pos|#|position)$')
  const iBoat      = headerIndex(headers, '(boat|yacht|name)')
  const iSail      = headerIndex(headers, '(sail|sail\\s*no|nr|no)')
  const iSkipper   = headerIndex(headers, '(skipper|owner|helm)')
  const iFinish    = headerIndex(headers, '(finish|elapsed)')
  const iCorrected = headerIndex(headers, 'corrected')

  const out = []
  for (let r = 1; r < rows.length; r++) {
    const cells = rows[r]
    const first = parseInt(cells[0], 10)
    if (isNaN(first)) continue

    const finishTime = grab(cells, iFinish, 4)
    const corrTime   = grab(cells, iCorrected, 5)
    out.push({
      position: grab(cells, iPos, 0),
      name: grab(cells, iBoat, 1),
      sailNo: grab(cells, iSail, 2),
      skipper: grab(cells, iSkipper, 3),
      finishTime: finishTime,
      correctedTime: corrTime,
      delta: out.length ? mmssDelta(out[0].correctedTime, corrTime) : '–'
    })
  }
  return out
}

function parseRaceChooseClass(html, wantClass) {
  // For pages with multiple class tables, find the one for wantClass
  const tables = allTables(html)
  
  let targetTable = null
  if (wantClass) {
    // Look for a table near a heading or text containing the class name
    for (const table of tables) {
      // Check text before the table for class mentions
      const beforeTable = html.slice(Math.max(0, table.index - 500), table.index)
      if (beforeTable.toUpperCase().includes(wantClass.toUpperCase())) {
        targetTable = table
        break
      }
    }
  }
  
  // Fallback to first table with race structure
  if (!targetTable) {
    targetTable = tables.find(t => {
      const rows = tableRows(t.html)
      if (!rows.length) return false
      const hdrs = rows[0].map(x => x.toLowerCase())
      return hdrs.some(h => h.includes('corrected') || h.includes('finish'))
    })
  }

  if (!targetTable) return []
  
  const rows = tableRows(targetTable.html)
  if (rows.length < 2) return []

  // Use same logic as parseRaceForClass
  const headers = rows[0]
  const iPos       = headerIndex(headers, '^(pos|#|position)$')
  const iBoat      = headerIndex(headers, '(boat|yacht|name)')
  const iSail      = headerIndex(headers, '(sail|sail\\s*no|nr|no)')
  const iSkipper   = headerIndex(headers, '(skipper|owner|helm)')
  const iFinish    = headerIndex(headers, '(finish|elapsed)')
  const iCorrected = headerIndex(headers, 'corrected')

  const out = []
  for (let r = 1; r < rows.length; r++) {
    const cells = rows[r]
    const first = parseInt(cells[0], 10)
    if (isNaN(first)) continue

    const finishTime = grab(cells, iFinish, 4)
    const corrTime   = grab(cells, iCorrected, 5)
    out.push({
      position: grab(cells, iPos, 0),
      name: grab(cells, iBoat, 1),
      sailNo: grab(cells, iSail, 2),
      skipper: grab(cells, iSkipper, 3),
      finishTime: finishTime,
      correctedTime: corrTime,
      delta: out.length ? mmssDelta(out[0].correctedTime, corrTime) : '–'
    })
  }
  return out
}

/* ---------- Parsing: classes & races ---------- */
function parseClasses(htmlRaw) {
  const html = decodeEntities(htmlRaw)
  const out = []
  // anchor form (any param order, any quotes)
  const reA = new RegExp(
    "href=([\"'])[^\"']*action=series[^\"']*?(?:eventid=[^\"'&>]+&[^\"'>]*classid=([^\"'&>]+)|classid=([^\"'&>]+)[^\"'>]*&[^\"'>]*eventid=[^\"'&>]+)[^\"']*\\1[^>]*>([\\s\\S]*?)<\\/a>",
    "gi"
  )
  let m
  while ((m = reA.exec(html)) !== null) {
    const id = (m[2] || m[3] || '').trim()
    if (id && !out.some(x => x.id === id)) out.push({ id, label: id })
  }
  // URL-only fallback
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
  // Find the segment for this class: from its series link up to the next class/link block
  const anchorRe = new RegExp(`action=series[^"'>]*classid=${escapeRegex(wantClass)}`, 'i')
  const start = html.search(anchorRe)
  if (start < 0) return []
  // end boundary: next "action=series&...classid=" occurrence
  const nextRe = new RegExp("action=series[^\"'>]*classid=([A-Za-z0-9]+)", "gi")
  nextRe.lastIndex = start + 1
  let end = html.length, m
  while ((m = nextRe.exec(html)) !== null) {
    const idx = m.index
    if (idx > start) { end = idx; break }
  }
  const slice = html.slice(start, end)
  // Collect race links ONLY in this slice
  const raceRe = new RegExp("action=race[^\\s\"'>]*?(?:\\?|&|&amp;)[^\"'>]*raceid=([^\\s\"'>&]+)", "gi")
  const out = []
  while ((m = raceRe.exec(slice)) !== null) {
    const id = (m[1] || '').trim()
    if (id && !out.some(x => x.id === id)) out.push({ id, label: `RACE ${id}` })
  }
  return out.sort((a,b) => String(a.id).localeCompare(String(b.id), undefined, { numeric:true, sensitivity:'base' }))
}
function escapeRegex(s){ return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&') }

/* ---------- Helpers ---------- */
async function autoFirstClass(eventId) {
  const html = await fetchText(indexUrl(eventId))
  const cls = parseClasses(html)
  return cls[0]?.id || null
}
