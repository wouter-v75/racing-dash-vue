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

  if (!headerTable) return []
  const rows = tableRows(headerTable.html)
  if (!rows.length) return []

  // compute header indices (fallbacks)
  const headers = rows[0].map(x => x.trim())
  const iPos     = headerIndex(headers, '^(pos|#|position)$')
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
      name:     grab(cells, iBoat, 1),
      sailNo:   grab(cells, iSail, 2),
      skipper:  grab(cells, iSkipper, 4),
      points:   grab(cells, iPoints, 5),   // if header had Pts, you'll get the number here
      total:    grab(cells, iTotal, 6) || grab(cells, iPoints, 5)
    })
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
  if (!tables.length) return []
  const want = tables.find(t => hasResultColumns(t.html)) || tables[0]
  return toRaceRows(want.html)
}

function parseRaceChooseClass(htmlRaw, wantClass) {
  // Page has multiple class sections; find the table just after the series link for the desired class
  const html = decodeEntities(htmlRaw)
  if (!wantClass) {
    // no class preference → first table that looks like a race table
    const tables = allTables(html)
    const want = tables.find(t => hasResultColumns(t.html)) || tables[0]
    return want ? toRaceRows(want.html) : []
  }
  // find anchor for the desired class
  const anchorRe = new RegExp(`action=series[^"'>]*classid=${escapeRegex(wantClass)}`, 'i')
  const pos = html.search(anchorRe)
  if (pos < 0) return []
  // from this position, find the next table
  const tableRe = new RegExp("<table[\\s\\S]*?<\\/table>", "gi")
  tableRe.lastIndex = pos
  const m = tableRe.exec(html)
  if (!m) return []
  const tableHtml = m[0]
  return hasResultColumns(tableHtml) ? toRaceRows(tableHtml) : []
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
  const iPos   = headerIndex(headers, '^(pos|#|position)$')
  const iBoat  = headerIndex(headers, '(boat|yacht|name)')
  const iFinish= headerIndex(headers, 'finish')
  const iElaps = headerIndex(headers, 'elapsed')
  const iCorr  = headerIndex(headers, 'corrected')
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
  return out
}

/* ---------- Helpers ---------- */
async function autoFirstClass(eventId) {
  const html = await fetchText(indexUrl(eventId))
  const cls = parseClasses(html)
  return cls[0]?.id || null
}
