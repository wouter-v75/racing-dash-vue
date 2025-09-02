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

    console.log(`[ORC API] ${type} request - Event: ${eventId}, Class: ${classId}, Race: ${raceId}`)

    if (type === 'ping') {
      return res.status(200).json({ ok: true, runtime, node: process.versions?.node, time: new Date().toISOString() })
    }
    if (!eventId && type !== 'ping') {
      return res.status(400).json({ success:false, message:'Missing eventId' })
    }

    // Enhanced debug with full structure analysis
    if (type === 'debug') {
      const html = await fetchText(indexUrl(eventId))
      const tables = allTables(html)
      const classes = safeParse(parseClasses, html)
      
      console.log(`[DEBUG] HTML length: ${html.length}, Tables found: ${tables.length}, Classes: ${classes.length}`)
      
      return res.status(200).json({ 
        success:true, 
        resultType:'debug', 
        meta:{ eventId, runtime, htmlLength: html.length, tablesFound: tables.length }, 
        preview: html.slice(0, 1400),
        tables: tables.map((t, i) => ({
          index: i,
          size: t.html.length,
          preview: t.html.substring(0, 200)
        })),
        classes: classes
      })
    }

    if (type === 'classes') {
      const html = await fetchText(indexUrl(eventId))
      console.log(`[CLASSES] Fetched HTML length: ${html.length}`)
      const classes = safeParse(parseClasses, html)             // [{id,label}]
      console.log(`[CLASSES] Parsed ${classes.length} classes: ${classes.map(c => c.id).join(', ')}`)
      return ok(res, 'classes', classes, { eventId })
    }

    // NEW: races filtered by class section
    if (type === 'racesForClass') {
      if (!classId) return res.status(400).json({ success:false, message:'Missing classId' })
      const html = await fetchText(indexUrl(eventId))
      console.log(`[RACES FOR CLASS] Fetched HTML for class ${classId}`)
      const races = safeParse(h => parseRacesForClass(h, classId), html)  // [{id,label}]
      console.log(`[RACES FOR CLASS] Found ${races.length} races for class ${classId}: ${races.map(r => r.id).join(', ')}`)
      return ok(res, 'races', races, { eventId, classId })
    }

    // Legacy (all race links on page, any class) – still available
    if (type === 'races') {
      const html = await fetchText(indexUrl(eventId))
      const races = safeParse(parseRacesAnyClass, html)
      console.log(`[RACES] Found ${races.length} total races: ${races.map(r => r.id).join(', ')}`)
      return ok(res, 'races', races, { eventId })
    }

    // OVERALL for a class (header-aware points/total extraction)
    if (type === 'overall') {
      const cls = classId || (await autoFirstClass(eventId))
      if (!cls) return ok(res, 'overall', [], { eventId, classId: null })
      
      const url = seriesUrl(eventId, cls)
      console.log(`[OVERALL] Fetching: ${url}`)
      const html = await fetchText(url)
      console.log(`[OVERALL] HTML length: ${html.length}`)
      
      const rows = safeParse(parseOverallByHeaders, html)  // header-aware mapping
      console.log(`[OVERALL] Parsed ${rows.length} boats`)
      
      // Log boat names for debugging
      if (rows.length > 0) {
        console.log(`[OVERALL] Boat names found: ${rows.slice(0, 5).map(r => `"${r.name}"`).join(', ')}${rows.length > 5 ? '...' : ''}`)
      }
      
      return ok(res, 'overall', rows, { eventId, classId: cls })
    }

    // RACE for a class (URL contains classId)
    if (type === 'race') {
      if (!raceId) return res.status(400).json({ success:false, message:'Missing raceId' })
      const cls = classId || (await autoFirstClass(eventId))
      if (!cls) return ok(res, 'race', [], { eventId, classId: null, raceId })
      
      const url = raceUrl(eventId, cls, raceId)
      console.log(`[RACE] Fetching: ${url}`)
      const html = await fetchText(url)
      console.log(`[RACE] HTML length: ${html.length}`)
      
      const rows = safeParse(parseRaceForClass, html)       // selects table that has Corrected/Finish columns
      console.log(`[RACE] Parsed ${rows.length} boats for race ${raceId}`)
      
      return ok(res, 'race', rows, { eventId, classId: cls, raceId })
    }

    // RACE page without class in URL – we still pick the desired class section inside the page
    if (type === 'raceRaw') {
      if (!raceId) return res.status(400).json({ success:false, message:'Missing raceId' })
      
      const url = raceUrlRaw(eventId, raceId)
      console.log(`[RACE RAW] Fetching: ${url}`)
      const html = await fetchText(url)
      console.log(`[RACE RAW] HTML length: ${html.length}, looking for class: ${classId}`)
      
      const rows = safeParse(h => parseRaceChooseClass(h, classId || ''), html) // classId USED to pick the class table
      console.log(`[RACE RAW] Parsed ${rows.length} boats for race ${raceId} class ${classId}`)
      
      if (rows.length > 0) {
        console.log(`[RACE RAW] Sample boat names: ${rows.slice(0, 3).map(r => `"${r.name}"`).join(', ')}`)
      }
      
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
  console.log(`[FETCH] Requesting: ${url}`)
  const r = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; racingdash/1.0)',
      'Accept': 'text/html,application/xhtml+xml'
    }
  })
  if (!r.ok) {
    console.error(`[FETCH] Failed ${r.status} for ${url}`)
    throw new Error(`Fetch failed ${r.status} for ${url}`)
  }
  const text = await r.text()
  console.log(`[FETCH] Success: ${text.length} chars`)
  return text
}

function ok(res, resultType, results, meta = {}) {
  return res.status(200).json({ success:true, resultType, results, meta, lastUpdated:new Date().toISOString() })
}

/* ---------- Safety wrapper ---------- */
function safeParse(fn, html) {
  try { 
    const result = fn(html)
    console.log(`[PARSE] ${fn.name} successful: ${result?.length || 0} items`)
    return result
  } catch (e) {
    console.error(`[PARSE] Error in ${fn.name}:`, e)
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
  console.log(`[TABLES] Found ${out.length} tables in HTML`)
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
  console.log(`[TABLE ROWS] Extracted ${rows.length} rows`)
  return rows
}

function headerIndex(headers, pattern) {
  const re = new RegExp(pattern, 'i')
  for (let i=0;i<headers.length;i++) {
    if (re.test(headers[i])) return i
  }
  return -1
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
  console.log(`[RACES FOR CLASS] Looking for class: ${wantClass}`)
  
  // Find the segment for this class: from its series link up to the next class/link block
  const anchorRe = new RegExp(`action=series[^"'>]*classid=${escapeRegex(wantClass)}`, 'i')
  const start = html.search(anchorRe)
  if (start < 0) {
    console.log(`[RACES FOR CLASS] No anchor found for class ${wantClass}`)
    return []
  }
  
  console.log(`[RACES FOR CLASS] Found class anchor at position ${start}`)
  
  // end boundary: next "action=series&...classid=" occurrence
  const nextRe = new RegExp("action=series[^\"'>]*classid=([A-Za-z0-9]+)", "gi")
  nextRe.lastIndex = start + 1
  let end = html.length, m
  while ((m = nextRe.exec(html)) !== null) {
    const idx = m.index
    if (idx > start) { end = idx; break }
  }
  const slice = html.slice(start, end)
  console.log(`[RACES FOR CLASS] Analyzing slice length: ${slice.length}`)
  
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

/* ---------- Parsing: overall (header-aware) ---------- */
function parseOverallByHeaders(htmlRaw) {
  const tables = allTables(htmlRaw)
  console.log(`[OVERALL PARSE] Analyzing ${tables.length} tables`)
  
  // choose the table whose header includes 'Pos' and ('Points' or 'Pts' or 'Total')
  const headerTable = tables.find(t => {
    const rows = tableRows(t.html)
    if (!rows.length) return false
    const headers = rows[0].map(x => x.toLowerCase())
    const hasPos = headers.some(h => /^(pos|#|position)$/.test(h))
    const hasPointsOrTotal = headers.some(h => /(points|pts|total)/.test(h))
    console.log(`[OVERALL PARSE] Table headers: [${headers.join(', ')}] - hasPos: ${hasPos}, hasPoints: ${hasPointsOrTotal}`)
    return hasPos && hasPointsOrTotal
  }) || tables[0]

  if (!headerTable) {
    console.log(`[OVERALL PARSE] No suitable table found`)
    return []
  }
  
  const rows = tableRows(headerTable.html)
  if (!rows.length) {
    console.log(`[OVERALL PARSE] No rows in selected table`)
    return []
  }

  // compute header indices (fallbacks)
  const headers = rows[0].map(x => x.trim())
  console.log(`[OVERALL PARSE] Headers: [${headers.join(', ')}]`)
  
  const iPos     = headerIndex(headers, '^(pos|#|position)$')
  const iBoat    = headerIndex(headers, '(boat|yacht|name)')
  const iSail    = headerIndex(headers, '(sail|sail\\s*no|nr|no)')
  const iSkipper = headerIndex(headers, '(skipper|owner|helm|helmsman)')
  const iPoints  = headerIndex(headers, '(points|pts)')
  const iTotal   = headerIndex(headers, '(total|net)')

  console.log(`[OVERALL PARSE] Header indices - Pos: ${iPos}, Boat: ${iBoat}, Sail: ${iSail}, Skipper: ${iSkipper}, Points: ${iPoints}, Total: ${iTotal}`)

  const out = []
  for (let r = 1; r < rows.length; r++) {
    const cells = rows[r]
    // numeric first cell guard
    const first = parseInt(cells[0], 10)
    if (isNaN(first)) {
      console.log(`[OVERALL PARSE] Skipping non-numeric row: [${cells.slice(0, 3).join(', ')}]`)
      continue
    }

    const entry = {
      position: grab(cells, iPos, 0),
      name:     grab(cells, iBoat, 1),
      sailNo:   grab(cells, iSail, 2),
      skipper:  grab(cells, iSkipper, 4),
      points:   grab(cells, iPoints, 5),   // if header had Pts, you'll get the number here
      total:    grab(cells, iTotal, 6) || grab(cells, iPoints, 5)
    }
    
    out.push(entry)
  }
  
  console.log(`[OVERALL PARSE] Successfully parsed ${out.length} boats`)
  if (out.length > 0) {
    console.log(`[OVERALL PARSE] Sample entries: ${out.slice(0, 2).map(b => `"${b.name}" (${b.position})`).join(', ')}`)
  }
  
  return out
}

function grab(arr, idx, fallbackIdx) {
  return (idx >= 0 ? arr[idx] : (arr[fallbackIdx] || '')) || ''
}

/* ---------- Parsing: race (choose class table inside race page) ---------- */
function parseRaceForClass(htmlRaw) {
  // For class-specific URLs, the first table with "Corrected"/"Finish" is the one we want
  const tables = allTables(htmlRaw)
  if (!tables.length) {
    console.log(`[RACE PARSE] No tables found`)
    return []
  }
  
  const want = tables.find(t => hasResultColumns(t.html)) || tables[0]
  console.log(`[RACE PARSE] Selected table with ${hasResultColumns(want.html) ? 'race' : 'unknown'} columns`)
  
  return toRaceRows(want.html)
}

function parseRaceChooseClass(htmlRaw, wantClass) {
  // Page has multiple class sections; find the table just after the series link for the desired class
  const html = decodeEntities(htmlRaw)
  console.log(`[RACE CHOOSE CLASS] Looking for class: ${wantClass}`)
  
  if (!wantClass) {
    // no class preference → first table that looks like a race table
    const tables = allTables(html)
    const want = tables.find(t => hasResultColumns(t.html)) || tables[0]
    console.log(`[RACE CHOOSE CLASS] No class specified, using first race table`)
    return want ? toRaceRows(want.html) : []
  }
  
  // find anchor for the desired class
  const anchorRe = new RegExp(`action=series[^"'>]*classid=${escapeRegex(wantClass)}`, 'i')
  const pos = html.search(anchorRe)
  if (pos < 0) {
    console.log(`[RACE CHOOSE CLASS] No anchor found for class ${wantClass}`)
    return []
  }
  
  console.log(`[RACE CHOOSE CLASS] Found class anchor at position ${pos}`)
  
  // from this position, find the next table
  const tableRe = new RegExp("<table[\\s\\S]*?<\\/table>", "gi")
  tableRe.lastIndex = pos
  const m = tableRe.exec(html)
  if (!m) {
    console.log(`[RACE CHOOSE CLASS] No table found after class anchor`)
    return []
  }
  
  const tableHtml = m[0]
  const isRaceTable = hasResultColumns(tableHtml)
  console.log(`[RACE CHOOSE CLASS] Found table, is race table: ${isRaceTable}`)
  
  return isRaceTable ? toRaceRows(tableHtml) : []
}

function hasResultColumns(tableHtml) {
  const rows = tableRows(tableHtml)
  if (!rows.length) return false
  const headers = rows[0].map(x => x.toLowerCase())
  const hasFinish   = headers.some(h => /finish/.test(h))
  const hasCorrected= headers.some(h => /corrected/.test(h))
  const hasElapsed  = headers.some(h => /elapsed/.test(h))
  const hasPos      = headers.some(h => /^(pos|#|position)$/.test(h))
  return hasPos && (hasCorrected || hasFinish || hasElapsed)
}

function toRaceRows(tableHtml) {
  const rows = tableRows(tableHtml)
  if (!rows.length) return []
  
  // map headers
  const headers = rows[0].map(x => x.trim())
  console.log(`[RACE ROWS] Headers: [${headers.join(', ')}]`)
  
  const iPos   = headerIndex(headers, '^(pos|#|position)$')
  const iBoat  = headerIndex(headers, '(boat|yacht|name)')
  const iFinish= headerIndex(headers, 'finish')
  const iElaps = headerIndex(headers, 'elapsed')
  const iCorr  = headerIndex(headers, 'corrected')
  
  console.log(`[RACE ROWS] Indices - Pos: ${iPos}, Boat: ${iBoat}, Finish: ${iFinish}, Elapsed: ${iElaps}, Corrected: ${iCorr}`)
  
  const out = []
  for (let r=1;r<rows.length;r++){
    const cells = rows[r]
    const first = parseInt(cells[0], 10)
    if (isNaN(first)) continue
    
    out.push({
      position:      grab(cells, iPos, 0),
      name:          grab(cells, iBoat, 1),
      finishTime:    grab(cells, iFinish, 4),
      elapsed:       grab(cells, iElaps, 5),
      correctedTime: grab(cells, iCorr, 6)
    })
  }
  
  if (out.length) {
    const first = out[0].correctedTime
    for (const r of out) r.deltaToFirst = (first && r.correctedTime) ? mmssDelta(first, r.correctedTime) : '–'
  }
  
  console.log(`[RACE ROWS] Parsed ${out.length} boats`)
  if (out.length > 0) {
    console.log(`[RACE ROWS] Sample: ${out.slice(0, 2).map(b => `"${b.name}" (${b.position})`).join(', ')}`)
  }
  
  return out
}

/* ---------- Helpers ---------- */
async function autoFirstClass(eventId) {
  const html = await fetchText(indexUrl(eventId))
  const cls = parseClasses(html)
  const firstClass = cls[0]?.id || null
  console.log(`[AUTO CLASS] Found first class: ${firstClass}`)
  return firstClass
}
