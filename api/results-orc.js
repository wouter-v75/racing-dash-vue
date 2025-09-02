// api/results-orc.js - SIMPLE & ROBUST VERSION
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

    console.log(`[ORC API] ${type} request - Event: ${eventId}, Class: ${classId}, Race: ${raceId}`)

    if (type === 'ping') {
      return res.status(200).json({ ok: true, runtime, node: process.versions?.node, time: new Date().toISOString() })
    }
    if (!eventId && type !== 'ping') {
      return res.status(400).json({ success:false, message:'Missing eventId' })
    }

    if (type === 'debug') {
      const html = await fetchText(indexUrl(eventId))
      const tables = extractAllTables(html)
      const classes = parseClasses(html)
      return res.status(200).json({ 
        success:true, 
        resultType:'debug', 
        meta:{ eventId, runtime, htmlLength: html.length, tablesFound: tables.length }, 
        preview: html.slice(0, 1400),
        classes: classes,
        sampleTable: tables.length > 0 ? extractTableData(tables[0]).slice(0, 3) : []
      })
    }

    if (type === 'classes') {
      const html = await fetchText(indexUrl(eventId))
      const classes = parseClasses(html)
      console.log(`[CLASSES] Found ${classes.length} classes: ${classes.map(c => c.id).join(', ')}`)
      return ok(res, 'classes', classes, { eventId })
    }

    if (type === 'racesForClass') {
      if (!classId) return res.status(400).json({ success:false, message:'Missing classId' })
      const html = await fetchText(indexUrl(eventId))
      const races = parseRacesForClass(html, classId)
      console.log(`[RACES] Found ${races.length} races for class ${classId}`)
      return ok(res, 'races', races, { eventId, classId })
    }

    if (type === 'races') {
      const html = await fetchText(indexUrl(eventId))
      const races = parseRacesAnyClass(html)
      console.log(`[RACES] Found ${races.length} total races`)
      return ok(res, 'races', races, { eventId })
    }

    if (type === 'overall') {
      const cls = classId || (await autoFirstClass(eventId))
      if (!cls) return ok(res, 'overall', [], { eventId, classId: null })
      
      const url = seriesUrl(eventId, cls)
      console.log(`[OVERALL] Fetching: ${url}`)
      const html = await fetchText(url)
      console.log(`[OVERALL] HTML length: ${html.length}`)
      
      const rows = parseOverallStandings(html)
      console.log(`[OVERALL] Parsed ${rows.length} boats`)
      
      if (rows.length > 0) {
        console.log(`[OVERALL] Sample boats: ${rows.slice(0, 3).map(r => `"${r.name}"`).join(', ')}`)
      } else {
        console.log(`[OVERALL] No boats found - debugging table structure...`)
        const tables = extractAllTables(html)
        console.log(`[OVERALL] Found ${tables.length} tables in HTML`)
        tables.forEach((table, i) => {
          const data = extractTableData(table)
          console.log(`[OVERALL] Table ${i}: ${data.length} rows, sample: ${data.slice(0, 2).map(row => row.slice(0, 3).join('|')).join(' // ')}`)
        })
      }
      
      return ok(res, 'overall', rows, { eventId, classId: cls })
    }

    if (type === 'race') {
      if (!raceId) return res.status(400).json({ success:false, message:'Missing raceId' })
      const cls = classId || (await autoFirstClass(eventId))
      if (!cls) return ok(res, 'race', [], { eventId, classId: null, raceId })
      
      const url = raceUrl(eventId, cls, raceId)
      console.log(`[RACE] Fetching: ${url}`)
      const html = await fetchText(url)
      
      const rows = parseRaceResults(html)
      console.log(`[RACE] Parsed ${rows.length} boats for race ${raceId}`)
      
      return ok(res, 'race', rows, { eventId, classId: cls, raceId })
    }

    if (type === 'raceRaw') {
      if (!raceId) return res.status(400).json({ success:false, message:'Missing raceId' })
      
      const url = raceUrlRaw(eventId, raceId)
      console.log(`[RACE RAW] Fetching: ${url}`)
      const html = await fetchText(url)
      
      const rows = parseRaceResultsForClass(html, classId)
      console.log(`[RACE RAW] Parsed ${rows.length} boats for race ${raceId} class ${classId}`)
      
      return ok(res, 'race', rows, { eventId, classId: classId || null, raceId })
    }

    return res.status(400).json({ success:false, message:'Unknown type' })
  } catch (e) {
    console.error('ORC handler error:', e)
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
  console.log(`[FETCH] ${url}`)
  const r = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; racingdash/1.0)',
      'Accept': 'text/html,application/xhtml+xml'
    }
  })
  if (!r.ok) throw new Error(`Fetch failed ${r.status} for ${url}`)
  const text = await r.text()
  console.log(`[FETCH] Success: ${text.length} chars`)
  return text
}

function ok(res, resultType, results, meta = {}) {
  return res.status(200).json({ success:true, resultType, results, meta, lastUpdated:new Date().toISOString() })
}

/* ---------- HTML Utils ---------- */
function cleanText(str) {
  return String(str || '')
    .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\u00A0/g, ' ')
    .trim()
}

function extractAllTables(html) {
  const tables = []
  const tableRegex = /<table[^>]*>([\s\S]*?)<\/table>/gi
  let match
  while ((match = tableRegex.exec(html)) !== null) {
    tables.push(match[1])
  }
  return tables
}

function extractTableData(tableHtml) {
  const rows = []
  const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi
  let rowMatch
  
  while ((rowMatch = rowRegex.exec(tableHtml)) !== null) {
    const cells = []
    const cellRegex = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi
    let cellMatch
    
    while ((cellMatch = cellRegex.exec(rowMatch[1])) !== null) {
      cells.push(cleanText(cellMatch[1]))
    }
    
    if (cells.length > 0) {
      rows.push(cells)
    }
  }
  
  return rows
}

/* ---------- SIMPLE PARSERS ---------- */

function parseOverallStandings(html) {
  console.log(`[PARSE OVERALL] Starting parse...`)
  const tables = extractAllTables(html)
  console.log(`[PARSE OVERALL] Found ${tables.length} tables`)
  
  if (tables.length === 0) {
    console.log(`[PARSE OVERALL] No tables found`)
    return []
  }
  
  // Try each table until we find one with standings data
  for (let i = 0; i < tables.length; i++) {
    console.log(`[PARSE OVERALL] Trying table ${i}...`)
    const rows = extractTableData(tables[i])
    
    if (rows.length < 2) {
      console.log(`[PARSE OVERALL] Table ${i} has too few rows (${rows.length})`)
      continue
    }
    
    const headers = rows[0].map(h => h.toLowerCase())
    console.log(`[PARSE OVERALL] Table ${i} headers: [${headers.join(', ')}]`)
    
    // Check if this looks like a standings table
    const hasPosition = headers.some(h => h.includes('pos') || h === '#' || h.includes('position'))
    const hasPoints = headers.some(h => h.includes('point') || h.includes('pts') || h.includes('total') || h.includes('score'))
    
    console.log(`[PARSE OVERALL] Table ${i} - hasPos: ${hasPosition}, hasPoints: ${hasPoints}`)
    
    if (hasPosition || hasPoints || i === 0) { // Use first table as fallback
      console.log(`[PARSE OVERALL] Using table ${i}`)
      const standings = parseStandingsTable(rows)
      if (standings.length > 0) {
        return standings
      }
    }
  }
  
  console.log(`[PARSE OVERALL] No valid standings table found`)
  return []
}

function parseStandingsTable(rows) {
  const results = []
  const headers = rows[0]
  
  console.log(`[PARSE STANDINGS] Headers: [${headers.join(' | ')}]`)
  
  // Try to identify columns by analyzing first few data rows
  let posCol = 0
  let nameCol = 1
  
  // Look for the boat name column (longest non-numeric text)
  if (rows.length > 1) {
    let maxTextLength = 0
    for (let col = 0; col < Math.min(headers.length, 6); col++) {
      const sampleText = rows[1][col] || ''
      if (sampleText.length > maxTextLength && isNaN(parseFloat(sampleText)) && sampleText.length > 2) {
        nameCol = col
        maxTextLength = sampleText.length
      }
    }
    console.log(`[PARSE STANDINGS] Detected name column: ${nameCol} ("${rows[1][nameCol]}")`)
  }
  
  // Parse data rows
  for (let r = 1; r < rows.length; r++) {
    const cells = rows[r]
    
    if (cells.length < 2) continue
    
    // Skip if first cell doesn't look like a position
    const firstCell = cells[0] || ''
    if (!firstCell.match(/^\d+$/)) {
      console.log(`[PARSE STANDINGS] Skipping row ${r}: "${firstCell}" doesn't look like position`)
      continue
    }
    
    const name = cells[nameCol] || ''
    if (name.length < 2) {
      console.log(`[PARSE STANDINGS] Skipping row ${r}: name too short: "${name}"`)
      continue
    }
    
    const entry = {
      position: cells[posCol] || '',
      name: name,
      sailNo: cells[nameCol + 1] || '',
      skipper: cells[nameCol + 2] || '',
      points: cells[cells.length - 2] || '',
      total: cells[cells.length - 1] || ''
    }
    
    console.log(`[PARSE STANDINGS] Row ${r}: "${entry.name}" (pos ${entry.position})`)
    results.push(entry)
  }
  
  console.log(`[PARSE STANDINGS] Parsed ${results.length} standings`)
  return results
}

function parseRaceResults(html) {
  console.log(`[PARSE RACE] Starting race parse...`)
  const tables = extractAllTables(html)
  
  if (tables.length === 0) return []
  
  // Try each table
  for (let i = 0; i < tables.length; i++) {
    const rows = extractTableData(tables[i])
    if (rows.length < 2) continue
    
    const headers = rows[0].map(h => h.toLowerCase())
    const hasTime = headers.some(h => h.includes('finish') || h.includes('elapsed') || h.includes('corrected') || h.includes('time'))
    
    if (hasTime || i === 0) {
      const raceData = parseRaceTable(rows)
      if (raceData.length > 0) return raceData
    }
  }
  
  return []
}

function parseRaceResultsForClass(html, wantClass) {
  console.log(`[PARSE RACE CLASS] Looking for class ${wantClass}...`)
  
  if (!wantClass) {
    return parseRaceResults(html)
  }
  
  // Find class section in HTML
  const classIndex = html.toLowerCase().indexOf(wantClass.toLowerCase())
  if (classIndex === -1) {
    console.log(`[PARSE RACE CLASS] Class ${wantClass} not found, using first table`)
    return parseRaceResults(html)
  }
  
  // Get HTML after class mention
  const relevantHtml = html.substring(classIndex)
  const tables = extractAllTables(relevantHtml)
  
  if (tables.length === 0) return []
  
  // Use first table after class mention
  const rows = extractTableData(tables[0])
  return parseRaceTable(rows)
}

function parseRaceTable(rows) {
  if (rows.length < 2) return []
  
  const results = []
  const headers = rows[0]
  
  // Find name column (same logic as standings)
  let nameCol = 1
  if (rows.length > 1) {
    let maxTextLength = 0
    for (let col = 0; col < Math.min(headers.length, 6); col++) {
      const sampleText = rows[1][col] || ''
      if (sampleText.length > maxTextLength && isNaN(parseFloat(sampleText)) && sampleText.length > 2) {
        nameCol = col
        maxTextLength = sampleText.length
      }
    }
  }
  
  for (let r = 1; r < rows.length; r++) {
    const cells = rows[r]
    
    if (cells.length < 2) continue
    if (!cells[0].match(/^\d+$/)) continue
    
    const name = cells[nameCol] || ''
    if (name.length < 2) continue
    
    const entry = {
      position: cells[0] || '',
      name: name,
      finishTime: cells[Math.min(nameCol + 2, cells.length - 3)] || '',
      elapsed: cells[Math.min(nameCol + 3, cells.length - 2)] || '',
      correctedTime: cells[Math.min(nameCol + 4, cells.length - 1)] || '',
      deltaToFirst: '–'
    }
    
    results.push(entry)
  }
  
  console.log(`[PARSE RACE] Parsed ${results.length} race results`)
  return results
}

/* ---------- Classes & Races (Same as before) ---------- */
function parseClasses(html) {
  const out = []
  const classRegex = /action=series[^"'>]*classid=([^"'>&\s]+)/gi
  let match
  
  while ((match = classRegex.exec(html)) !== null) {
    const id = match[1].trim()
    if (id && !out.some(x => x.id === id)) {
      out.push({ id, label: id })
    }
  }
  
  return out
}

function parseRacesAnyClass(html) {
  const out = []
  const raceRegex = /action=race[^"'>]*raceid=([^"'>&\s]+)/gi
  let match
  
  while ((match = raceRegex.exec(html)) !== null) {
    const id = match[1].trim()
    if (id && !out.some(x => x.id === id)) {
      out.push({ id, label: `RACE ${id}` })
    }
  }
  
  return out.sort((a,b) => String(a.id).localeCompare(String(b.id), undefined, { numeric:true, sensitivity:'base' }))
}

function parseRacesForClass(html, wantClass) {
  const classIndex = html.indexOf(wantClass)
  if (classIndex === -1) return []
  
  const afterClass = html.substring(classIndex, classIndex + 5000) // Look in next 5000 chars
  const out = []
  const raceRegex = /action=race[^"'>]*raceid=([^"'>&\s]+)/gi
  let match
  
  while ((match = raceRegex.exec(afterClass)) !== null) {
    const id = match[1].trim()
    if (id && !out.some(x => x.id === id)) {
      out.push({ id, label: `RACE ${id}` })
    }
  }
  
  return out.sort((a,b) => String(a.id).localeCompare(String(b.id), undefined, { numeric:true, sensitivity:'base' }))
}

async function autoFirstClass(eventId) {
  const html = await fetchText(indexUrl(eventId))
  const classes = parseClasses(html)
  return classes[0]?.id || null
}
