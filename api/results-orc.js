// api/results-orc.js
// Force Serverless Node runtime on Vercel (avoid Edge regex quirks)
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

    // ---- debug: fetch raw HTML (no parsing)
    if (type === 'debug') {
      const html = await fetchText(indexUrl(eventId))
      return res.status(200).json({
        success: true,
        resultType: 'debug',
        meta: { eventId, node: process.versions?.node, runtime },
        preview: html.slice(0, 1200)
      })
    }

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
      if (!cls) return ok(res, 'overall', [], { eventId, classId: null })
      const html = await fetchText(seriesUrl(eventId, cls))
      const results = safeParse(parseOverall, html)
      return ok(res, 'overall', results, { eventId, classId: cls })
    }

    if (type === 'race') {
      if (!raceId) return res.status(400).json({ success:false, message:'Missing raceId' })
      const cls = classId || (await autoFirstClass(eventId)) // <-- ensure class context
      if (!cls) return ok(res, 'race', [], { eventId, classId: null, raceId })
      const html = await fetchText(raceUrl(eventId, cls, raceId)) // <-- include classId
      const rows = safeParse(parseRace, html)
      return ok(res, 'race', rows, { eventId, classId: cls, raceId })
    }

    if (type === 'lastRace') {
      const htmlIdx = await fetchText(indexUrl(eventId))
      const races = safeParse(parseRaces, htmlIdx)
      const last = races[races.length - 1]
      const cls = classId || (await autoFirstClass(eventId))
      if (!last || !cls) return ok(res, 'race', [], { eventId, classId: cls || null, raceId: null })
      const htmlRace = await fetchText(raceUrl(eventId, cls, last.id))
      const rows = safeParse(parseRace, htmlRace)
      return ok(res, 'race', rows, { eventId, classId: cls, raceId: last.id, raceLabel: last.label })
    }

    return res.status(400).json({ success:false, message:'Unknown type' })
  } catch (e) {
    console.error('ORC handler fatal:', e)
    return res.status(500).json({ success:false, message: String(e?.message || e), stack: e?.stack })
  }
}

/* ---------- URLs ---------- */
const indexUrl  = (eventId)           => `https://data.orc.org/public/WEV.dll?action=index&eventid=${encodeURIComponent(eventId)}`
const seriesUrl = (eventId, cls)      => `https://data.orc.org/public/WEV.dll?action=series&eventid=${encodeURIComponent(eventId)}&classid=${encodeURIComponent(cls)}`
const raceUrl   = (eventId, cls, rId) => `https://data.orc.org/public/WEV.dll?action=race&eventid=${encodeURIComponent(eventId)}&classid=${encodeURIComponent(cls)}&raceid=${encodeURIComponent(rId)}`

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
  // decode first, then strip tags/spaces
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
function extractLargestTableRows(html) {
  const tableRe = new RegExp("<table[\\s\\S]*?<\\/table>", "gi")
  const trsRe   = new RegExp("<tr[\\s\\S]*?<\\/tr>", "gi")
  const cellRe  = new RegExp("<t[dh][^>]*>([\\s\\S]*?)<\\/t[dh]>", "gi")
  const trTagRe = new RegExp("<tr", "gi")

  const tables = []
  let m
  while ((m = tableRe.exec(html)) !== null) tables.push(m[0])
  if (!tables.length) return []

  let best = tables[0]
  for (const t of tables) {
    const cntT = (t.match(trTagRe) || []).length
    const cntB = (best.match(trTagRe) || []).length
    if (cntT > cntB) best = t
  }

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
function parseClasses(htmlRaw) {
  const html = decodeEntities(htmlRaw)
  const out = []
  // anchor form, supports single/double quotes and any param order
  const reA = new RegExp(
    "href=([\"'])[^\"']*action=series[^\"']*?(?:eventid=[^\"'&>]+&[^\"'>]*classid=([^\"'&>]+)|classid=([^\"'&>]+)[^\"'>]*&[^\"'>]*eventid=[^\"'&>]+)[^\"']*\\1[^>]*>([\\s\\S]*?)<\\/a>",
    "gi"
  )
  let m
  while ((m = reA.exec(html)) !== null) {
    const id = (m[2] || m[3] || '').trim()
    const label = cleanup(m[4]) || id
    if (id && !out.some(x => x.id === id)) out.push({ id, label })
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

function parseRaces(htmlRaw) {
  const html = decodeEntities(htmlRaw)
  const out = []
  const reA = new RegExp(
    "href=([\"'])[^\"']*action=race[^\"']*?(?:eventid=[^\"'&>]+&[^\"'>]*raceid=([^\"'&>]+)|raceid=([^\"'&>]+)[^\"'>]*&[^\"'>]*eventid=[^\"'&>]+)[^\"']*\\1[^>]*>([\\s\\S]*?)<\\/a>",
    "gi"
  )
  let m
  while ((m = reA.exec(html)) !== null) {
    const id = (m[2] || m[3] || '').trim()
    const label = cleanup(m[4]) || `Race ${id}`
    if (id && !out.some(x => x.id === id)) out.push({ id, label })
  }
  if (!out.length) {
    const reU = new RegExp("action=race[^\\s\"'>]*?(?:\\?|&|&amp;)[^\"'>]*raceid=([^\\s\"'>&]+)", "gi")
    while ((m = reU.exec(html)) !== null) {
      const id = (m[1] || '').trim()
      if (id && !out.some(x => x.id === id)) out.push({ id, label: `Race ${id}` })
    }
  }
  return out.sort((a,b) => String(a.id).localeCompare(String(b.id), undefined, { numeric:true, sensitivity:'base' }))
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
  const m = s.match(new RegExp("^(\\d{1,2}:)?\\d{1,2}:\\d{2}$"))
  return m ? s : s
}

async function autoFirstClass(eventId) {
  const html = await fetchText(indexUrl(eventId))
  const cls = parseClasses(html)
  return cls[0]?.id || null
}
