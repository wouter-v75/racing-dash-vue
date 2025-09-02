// api/results-orc.js - FIXED TABLE TARGETING
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

    // ENHANCED DIAGNOSTIC: Show all tables and their content
    if (type === 'diagnose') {
      const cls = classId || 'M2'
      const url = `https://data.orc.org/public/WEV.dll?action=series&eventid=${eventId}&classid=${cls}`
      console.log(`[DIAGNOSE] Fetching: ${url}`)
      
      const html = await fetchText(url)
      console.log(`[DIAGNOSE] HTML length: ${html.length}`)
      
      const allTables = extractAllTables(html)
      const raceTables = extractRaceTables(html)  // NEW: Target race tables specifically
      
      console.log(`[DIAGNOSE] All tables: ${allTables.length}, Race tables: ${raceTables.length}`)
      
      const allTableAnalysis = allTables.map((table, i) => {
        const rows = extractTableData(table)
        const isDataTable = rows.length > 2 && rows.some(row => row.length > 3)
        const hasBoatNames = rows.some(row => 
          row.some(cell => cell.length > 5 && /[a-zA-Z]/.test(cell) && !cell.includes('MAXI YACHT'))
        )
        
        console.log(`[DIAGNOSE] Table ${i}: ${rows.length} rows, isData: ${isDataTable}, hasBoats: ${hasBoatNames}`)
        
        return {
          index: i,
          rowCount: rows.length,
          headers: rows[0] || [],
          sampleRow: rows[1] || [],
          isDataTable: isDataTable,
          hasBoatNames: hasBoatNames,
          tablePreview: table.substring(0, 300)
        }
      })
      
      const raceTableAnalysis = raceTables.map((table, i) => {
        const rows = extractTableData(table)
        return {
          index: i,
          rowCount: rows.length,
          headers: rows[0] || [],
          sampleRows: rows.slice(1, 4) // Show multiple sample rows
        }
      })
      
      return res.status(200).json({ 
        success: true,
        resultType: 'diagnose',
        meta: { eventId, classId: cls, htmlLength: html.length, allTablesFound: allTables.length, raceTablesFound: raceTables.length },
        allTables: allTableAnalysis,
        raceTables: raceTableAnalysis,
        htmlPreview: html.substring(0, 3000),
        url: url
      })
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
        classes: classes
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
      
      const rows = parseOverallStandingsFixed(html)  // FIXED PARSER
      console.log(`[OVERALL] Parsed ${rows.length} boats`)
      
      return ok(res, 'overall', rows, { eventId, classId: cls })
    }

    if (type === 'race') {
      if (!raceId) return res.status(400).json({ success:false, message:'Missing raceId' })
      const cls = classId || (await autoFirstClass(eventId))
      if (!cls) return ok(res, 'race', [], { eventId, classId: null, raceId })
      
      const url = raceUrl(eventId, cls, raceId)
      console.log(`[RACE] Fetching: ${url}`)
      const html = await fetchText(url)
      
      const rows = parseRaceResultsFixed(html)  // FIXED PARSER
      console.log(`[RACE] Parsed ${rows.length} boats for race ${raceId}`)
      
      return ok(res, 'race', rows, { eventId, classId: cls, raceId })
    }

    if (type === 'raceRaw') {
      if (!raceId) return res.status(400).json({ success:false, message:'Missing raceId' })
      
      const url = raceUrlRaw(eventId, raceId)
      console.log(`[RACE RAW] Fetching: ${url}`)
      const html = await fetchText(url)
      
      const rows = parseRaceResultsForClassFixed(html, classId)  // FIXED PARSER
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

// FIXED: Extract all tables (original method)
function extractAllTables(html) {
  const tables = []
  const tableRegex = /<table[^>]*>([\s\S]*?)<\/table>/gi
  let match
  while ((match = tableRegex.exec(html)) !== null) {
    tables.push(match[1])
  }
  console.log(`[EXTRACT ALL TABLES] Found ${tables.length} tables`)
  return tables
}

// NEW: Extract tables with class="race" specifically (these contain the data)
function extractRaceTables(html) {
  const tables = []
  const raceTableRegex = /<table[^>]*class="race"[^>]*>([\s\S]*?)<\/table>/gi
  let match
  while ((match = raceTableRegex.exec(html)) !== null) {
    tables.push(match[1])
  }
  console.log(`[EXTRACT RACE TABLES] Found ${tables.length} race tables`)
  
  // Fallback: If no class="race" tables, look for tables with data-like structure
  if (tables.length === 0) {
    const allTables = extractAllTables(html)
    for (const table of allTables) {
      const rows = extractTableData(table)
      // Check if table has data-like structure (multiple rows, multiple columns)
      const hasDataStructure = rows.length > 2 && 
                              rows[0].length > 3 && 
                              rows.some(row => row.some(cell => 
                                cell.length > 3 && 
                                cell.match(/^[0-9]+$/) // Contains position numbers
                              ))
      
      if (hasDataStructure) {
        console.log(`[EXTRACT RACE TABLES] Found data-like table with ${rows.length} rows`)
        tables.push(table)
      }
    }
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

/* ---------- FIXED PARSERS - Target Correct Tables ---------- */

function parseOverallStandingsFixed(html) {
  console.log(`[PARSE OVERALL FIXED] Starting parse...`)
  
  // First try to get race-specific tables
  const raceTables = extractRaceTables(html)
  console.log(`[PARSE OVERALL FIXED] Found ${raceTables.length} race tables`)
  
  let targetTables = raceTables
  
  // If no race tables, fall back to all tables but filter for data tables
  if (targetTables.length === 0) {
    console.log(`[PARSE OVERALL FIXED] No race tables, checking all tables`)
    const allTables = extractAllTables(html)
    targetTables = allTables.filter(table => {
      const rows = extractTableData(table)
      // Filter for tables that look like they contain race data
      const hasMultipleRows = rows.length > 2
      const hasMultipleCols = rows[0]?.length > 3
      const hasPositionNumbers = rows.some(row => 
        row[0] && row[0].match(/^[0-9]+$/) // First column is a number (position)
      )
      const hasLongTextCells = rows.some(row =>
        row.some(cell => cell.length > 8 && /[a-zA-Z]/.test(cell) && !cell.includes('MAXI YACHT ROLEX'))
      )
      
      console.log(`[PARSE OVERALL FIXED] Table filter: rows=${rows.length}, cols=${rows[0]?.length}, hasPos=${hasPositionNumbers}, hasText=${hasLongTextCells}`)
      
      return hasMultipleRows && hasMultipleCols && hasPositionNumbers && hasLongTextCells
    })
    console.log(`[PARSE OVERALL FIXED] Filtered to ${targetTables.length} data tables`)
  }
  
  if (targetTables.length === 0) {
    console.log(`[PARSE OVERALL FIXED] No suitable tables found`)
    return []
  }
  
  // Parse the first suitable table
  const rows = extractTableData(targetTables[0])
  console.log(`[PARSE OVERALL FIXED] Using table with ${rows.length} rows`)
  
  if (rows.length < 2) {
    console.log(`[PARSE OVERALL FIXED] Table has too few rows`)
    return []
  }
  
  const headers = rows[0]
  console.log(`[PARSE OVERALL FIXED] Headers: [${headers.slice(0, 8).join(' | ')}]`)
  
  const results = []
  
  // Find boat name column by looking for longest text column
  let nameCol = 1 // default
  for (let col = 1; col < Math.min(headers.length, 6); col++) {
    const sampleText = rows.length > 1 ? rows[1][col] : ''
    if (sampleText && sampleText.length > 5 && /[a-zA-Z]/.test(sampleText) && !sampleText.match(/^[0-9.]+$/)) {
      nameCol = col
      console.log(`[PARSE OVERALL FIXED] Found boat name column ${col}: "${sampleText}"`)
      break
    }
  }
  
  // Parse data rows
  for (let r = 1; r < rows.length; r++) {
    const cells = rows[r]
    
    // Skip if not enough cells or first cell isn't a position number
    if (cells.length < 3 || !cells[0].match(/^[0-9]+$/)) {
      continue
    }
    
    const name = cells[nameCol] || ''
    if (name.length < 2) {
      continue
    }
    
    const entry = {
      position: cells[0] || '',
      name: name,
      sailNo: cells[nameCol + 1] || '',
      skipper: cells[nameCol + 2] || '',
      points: cells[Math.max(cells.length - 2, nameCol + 3)] || '',
      total: cells[cells.length - 1] || ''
    }
    
    console.log(`[PARSE OVERALL FIXED] Row ${r}: "${entry.name}" (${entry.position})`)
    results.push(entry)
  }
  
  console.log(`[PARSE OVERALL FIXED] Parsed ${results.length} boats`)
  return results
}

function parseRaceResultsFixed(html) {
  console.log(`[PARSE RACE FIXED] Starting race parse...`)
  const raceTables = extractRaceTables(html)
  
  if (raceTables.length === 0) {
    console.log(`[PARSE RACE FIXED] No race tables found`)
    return []
  }
  
  const rows = extractTableData(raceTables[0])
  return parseRaceTable(rows)
}

function parseRaceResultsForClassFixed(html, wantClass) {
  console.log(`[PARSE RACE CLASS FIXED] Looking for class ${wantClass}...`)
  
  if (!wantClass) {
    return parseRaceResultsFixed(html)
  }
  
  // Find class section and get tables after it
  const classIndex = html.toLowerCase().indexOf(wantClass.toLowerCase())
  if (classIndex === -1) {
    console.log(`[PARSE RACE CLASS FIXED] Class ${wantClass} not found`)
    return parseRaceResultsFixed(html)
  }
  
  const relevantHtml = html.substring(classIndex)
  const raceTables = extractRaceTables(relevantHtml)
  
  if (raceTables.length === 0) {
    console.log(`[PARSE RACE CLASS FIXED] No race tables after class ${wantClass}`)
    return []
  }
  
  const rows = extractTableData(raceTables[0])
  return parseRaceTable(rows)
}

function parseRaceTable(rows) {
  console.log(`[PARSE RACE TABLE] Processing ${rows.length} rows`)
  
  if (rows.length < 2) return []
  
  const results = []
  const headers = rows[0]
  
  // Find name column
  let nameCol = 1
  for (let col = 1; col < Math.min(headers.length, 6); col++) {
    const sampleText = rows.length > 1 ? rows[1][col] : ''
    if (sampleText && sampleText.length > 5 && /[a-zA-Z]/.test(sampleText) && !sampleText.match(/^[0-9:]+$/)) {
      nameCol = col
      break
    }
  }
  
  console.log(`[PARSE RACE TABLE] Using name column ${nameCol}`)
  
  for (let r = 1; r < rows.length; r++) {
    const cells = rows[r]
    
    if (cells.length < 3 || !cells[0].match(/^[0-9]+$/)) continue
    
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
  
  console.log(`[PARSE RACE TABLE] Parsed ${results.length} results`)
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
  const classIndex = html.toLowerCase().indexOf(wantClass.toLowerCase())
  if (classIndex === -1) return []
  
  const afterClass = html.substring(classIndex, classIndex + 5000)
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
