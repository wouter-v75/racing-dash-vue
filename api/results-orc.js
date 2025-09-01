// api/results-orc.js
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()

  try {
    const { type = 'overall', eventId = '', classId = '', raceId = '' } = req.query || {}
    if (!eventId) return res.status(400).json({ success: false, message: 'Missing eventId' })

    if (type === 'classes') {
      const html = await fetchText(indexUrl(eventId))
      const classes = parseClasses(html)
      return res.status(200).json(ok('classes', classes, { eventId }))
    }

    if (type === 'races') {
      const html = await fetchText(indexUrl(eventId))
      const races = parseRaces(html)
      return res.status(200).json(ok('races', races, { eventId }))
    }

    if (type === 'overall') {
      const cls = classId || (await autoFirstClass(eventId))
      if (!cls) return res.status(200).json(ok('overall', [], { eventId, classId: null }))
      const html = await fetchText(seriesUrl(eventId, cls))
      const rows = parseOverall(html)
      return res.status(200).json(ok('overall', rows, { eventId, classId: cls }))
    }

    if (type === 'lastRace') {
      const htmlIdx = await fetchText(indexUrl(eventId))
      const races = parseRaces(htmlIdx)
      const last = races[races.length - 1]
      if (!last) return res.status(200).json(ok('race', [], { eventId, raceId: null }))
      const htmlRace = await fetchText(raceUrl(eventId, last.id))
      const rows = parseRace(htmlRace)
      return res.status(200).json(ok('race', rows, { eventId, raceId: last.id, raceLabel: last.label }))
    }

    if (type === 'race') {
      if (!raceId) return res.status(400).json({ success: false, message: 'Missing raceId' })
      const html = await fetchText(raceUrl(eventId, raceId))
      const rows = parseRace(html)
      return res.status(200).json(ok('race', rows, { eventId, raceId }))
    }

    return res.status(400).json({ success: false, message: 'Unknown type' })
  } catch (e) {
    console.error('ORC handler error:', e)
    return res.status(500).json({ success: false, message: e.message || 'Server error' })
  }
}

/* -------- URLs -------- */
const indexUrl  = (eventId)      => `https://data.orc.org/public/WEV.dll?action=index&eventid=${encodeURIComponent(eventId)}`
const seriesUrl = (eventId, cls) => `https://data.orc.org/public/WEV.dll?action=series&eventid=${encodeURIComponent(eventId)}&classid=${encodeURIComponent(cls)}`
const raceUrl   = (eventId, r)   => `https://data.orc.org/public/WEV.dll?action=race&eventid=${encodeURIComponent(eventId)}&raceid=${encodeURIComponent(r)}`

/* -------- HTTP helper -------- */
async function fetchText(url) {
  const r = await fetch(url, { headers: {
    'User-Agent': 'Mozilla/5.0 (compatible; racingdash/1.0)',
    'Accept': 'text/html,application/xhtml+xml'
  }})
  if (!r.ok) throw new Error(`Fetch ${url} -> ${r.status}`)
  return r.text()
}
function ok(resultType, results, meta = {}) {
  return { success: true, resultType, results, meta, lastUpdated: new Date().toISOString() }
}
async function autoFirstClass(eventId) {
  const html = await fetchText(indexUrl(eventId))
  const cls = parseClasses(html)
  return cls[0]?.id || null
}

/* -------- Parsers (robust enough for ORC pages) -------- */
function cleanup(s) {
  return String(s || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\u00A0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}
function naturalCmp(a, b) {
  return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' })
}
function extractLargestTableRows(html) {
  const tableRe = /<table[\s\S]*?<\/table>/gi
  const trsRe   = /<tr[\s\S]*?<\/tr>/gi
  const cellRe  = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi

  let best = ''
  let m
  while ((m = tableRe.exec(html)) !== null) {
    const tbl = m[0]
    const count = (tbl.match(/<tr/gi) || []).length
    if (count > (best.match(/<tr/gi) || []).length) best = tbl
  }
  if (!best) return []

  const rows = []
  let rm
  while ((rm = trsRe.exec(best)) !== null) {
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

function parseClasses(html) {
  // look for action=series&classid=XXX
  const re = /href="[^"]*action=series&eventid=[^"&]+&classid=([^"&]+)[^"]*">([^<]+)</gi
  const out = []
  let m
  while ((m = re.exec(html)) !== null) {
    const id = decodeURIComponent(m[1]).trim()
    const label = cleanup(m[2])
    if (id && !out.some(x => x.id === id)) out.push({ id, label })
  }
  return out
}

function parseRaces(html) {
  // look for action=race&raceid=NN
  const re = /href="[^"]*action=race&eventid=[^"&]+&raceid=([^"&]+)[^"]*">([^<]+)</gi
  const out = []
  let m
  while ((m = re.exec(html)) !== null) {
    const id = decodeURIComponent(m[1]).trim()
    const label = cleanup(m[2])
    if (id && !out.some(x => x.id === id)) out.push({ id, label })
  }
  return out.sort((a,b)=>naturalCmp(a.id,b.id))
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
  // add deltas to first
  if (out.length) {
    const first = out[0].correctedTime
    for (const r of out) r.deltaToFirst = (first && r.correctedTime) ? mmssDelta(first, r.correctedTime) : '–'
  }
  return out
}

/* -------- time utils -------- */
function normalizeTime(t) {
  const s = cleanup(t)
  if (!s) return ''
  if (/^(DNF|DNS|DSQ|DNC|RET)$/i.test(s)) return s.toUpperCase()
  const m = s.match(/^(\d{1,2}:)?\d{1,2}:\d{2}$/)
  return m ? s : s
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
