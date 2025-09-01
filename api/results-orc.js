// api/results-orc.js
export const runtime = 'nodejs' // <-- ensure Node runtime on Vercel

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()

  try {
    const q = req.query || {}
    const type    = (q.type || 'overall').toString()
    const eventId = (q.eventId || '').toString()
    const classId = (q.classId || '').toString()
    const raceId  = (q.raceId || '').toString()

    if (!eventId) return res.status(400).json({ success:false, message:'Missing eventId' })

    if (type === 'classes') {
      const html = await fetchText(indexUrl(eventId))
      const results = safeParse(parseClasses, html)
      return ok(res, 'classes', results, { eventId })
    }

    if (type === 'races') {
      const html = await fetchText(indexUrl(eventId))
      const results = safeParse(parseRaces, html)
      return ok(res, 'races', results, { eventId })
    }

    if (type === 'overall') {
      const cls = classId || (await autoFirstClass(eventId))
      if (!cls) return ok(res, 'overall', [], { eventId, classId:null })
      const html = await fetchText(seriesUrl(eventId, cls))
      const results = safeParse(parseOverall, html)
      return ok(res, 'overall', results, { eventId, classId: cls })
    }

    if (type === 'lastRace') {
      const htmlIdx = await fetchText(indexUrl(eventId))
      const races = safeParse(parseRaces, htmlIdx)
      const last = races[races.length - 1]
      if (!last) return ok(res, 'race', [], { eventId, raceId:null })
      const htmlRace = await fetchText(raceUrl(eventId, last.id))
      const rows = safeParse(parseRace, htmlRace)
      return ok(res, 'race', rows, { eventId, raceId:last.id, raceLabel:last.label })
    }

    if (type === 'race') {
      if (!raceId) return res.status(400).json({ success:false, message:'Missing raceId' })
      const html = await fetchText(raceUrl(eventId, raceId))
      const rows = safeParse(parseRace, html)
      return ok(res, 'race', rows, { eventId, raceId })
    }

    return res.status(400).json({ success:false, message:'Unknown type' })
  } catch (e) {
    console.error('ORC handler fatal:', e)
    return res.status(500).json({ success:false, message: String(e?.message || e) })
  }
}

/* ---------- URLs ---------- */
const indexUrl  = (eventId)      => `https://data.orc.org/public/WEV.dll?action=index&eventid=${encodeURIComponent(eventId)}`
const seriesUrl = (eventId, cls) => `https://data.orc.org/public/WEV.dll?action=series&eventid=${encodeURIComponent(eventId)}&classid=${encodeURIComponent(cls)}`
const raceUrl   = (eventId, r)   => `https://data.orc.org/public/WEV.dll?action=race&eventid=${encodeURIComponent(eventId)}&raceid=${encodeURIComponent(r)}`

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
function cleanup(s) {
  return String(s || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\u00A0/g, ' ')
    .replace(/\s+/g, ' ')
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

/* ---------- Table extraction (no dynamic flags) ---------- */
function extractLargestTableRows(html) {
  // find the largest table block
  const tables = []
  const tableRe = /<table[\s\S]*?<\/table>/gi
  let m
  while ((m = tableRe.exec(html)) !== null) tables.push(m[0])
  if (!tables.length) return []

  let best = tables[0]
  for (const t of tables) {
    if ((t.match(/<tr/gi) || []).length > (best.match(/<tr/gi) || []).length) best = t
  }

  const trsRe  = /<tr[\s\S]*?<\/tr>/gi
  const cellRe = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi
  const rows = []
  let rm
  while ((rm = trsRe.exec(best)) !== null) {
    const rowHtml = rm[0]
    const cells = []
    let cm
    while ((cm = cellRe.exec(rowHtml)) !== null) cells.push(cleanup(cm[1]))
    if (cells.length) rows.push(cells)
  }
  return rows
}

/* ---------- Parsers ---------- */
function parseClasses(html) {
  // links like: action=series&eventid=...&classid=SY
  const out = []
  const re = /href="[^"]*action=series&eventid=[^"&]+&classid=([^"&]+)[^"]*">([\s\S]*?)<\/a>/gi
  let m
  while ((m = re.exec(html)) !== null) {
    const id = decodeURIComponent(m[1]).trim()
    const label = cleanup(m[2])
    if (id && !out.some(x => x.id === id)) out.push({ id, label })
  }
  return out
}

function parseRaces(html) {
  // links like: action=race&eventid=...&raceid=7
  const out = []
  const re = /href="[^"]*action=race&eventid=[^"&]+&raceid=([^"&]+)[^"]*">([\s\S]*?)<\/a>/gi
  let m
  while ((m = re.exec(html)) !== null) {
    const id = decodeURIComponent(m[1]).trim()
    const label = cleanup(m[2])
    if (id && !out.some(x => x.id === id)) out.push({ id, label })
  }
  // numeric-ish sort
  return out.sort((a, b) => String(a.id).localeCompare(String(b.id), undefined, { numeric:true, sensitivity:'base' }))
}

function parseOverall(html) {
  const rows = extractLargestTableRows(html)
  const out = []
  for (const cells of rows) {
    if (!cells.length || isNaN(parseInt(cells[0], 10))) continue
    out.push({
      position: cells[0],
      name:     cells[1] || '',
      sailNo:   cells[2] || '',
      club:     cells[3] || '',
      skipper:  cells[4] || '',
      points:   cells[5] || '',
      total:    cells[6] || cells[5] || ''
    })
  }
  return out
}

function parseRace(html) {
  const rows = extractLargestTableRows(html)
  const out = []
  for (const cells of rows) {
    if (!cells.length || isNaN(parseInt(cells[0], 10))) continue
    out.push({
      position:      cells[0],
      name:          cells[1] || '',
      sailNo:        cells[2] || '',
      skipper:       cells[3] || '',
      finishTime:    normalizeTime(cells[4]),
      elapsed:       normalizeTime(cells[5]),
      correctedTime: normalizeTime(cells[6]),
      penalty:       cells[7] || '',
      points:        cells[8] || ''
    })
  }
  if (out.length) {
    const first = out[0].correctedTime
    for (const r of out) r.deltaToFirst = (first && r.correctedTime) ? mmssDelta(first, r.correctedTime) : '–'
  }
  return out
}

/* ---------- time ---------- */
function normalizeTime(t) {
  const s = cleanup(t)
  if (!s) return ''
  if (/^(DNF|DNS|DSQ|DNC|RET)$/i.test(s)) return s.toUpperCase()
  // Allow H:MM:SS or MM:SS; keep string as-is if it looks time-ish
  const m = s.match(/^(\d{1,2}:)?\d{1,2}:\d{2}$/)
  return m ? s : s
}

async function autoFirstClass(eventId) {
  const html = await fetchText(indexUrl(eventId))
  const cls = parseClasses(html)
  return cls[0]?.id || null
}
