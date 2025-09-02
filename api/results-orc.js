// api/results-orc.js - COMPREHENSIVE BOAT FINDER
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
    const boatName = q.boatName != null ? String(q.boatName) : ''

    console.log(`[ORC API] ${type} request - Event: ${eventId}, Class: ${classId}, Race: ${raceId}, Boat: ${boatName}`)

    if (type === 'ping') {
      return res.status(200).json({ ok: true, runtime, node: process.versions?.node, time: new Date().toISOString() })
    }
    if (!eventId && type !== 'ping') {
      return res.status(400).json({ success:false, message:'Missing eventId' })
    }

    // NEW: Find which class a boat is in
    if (type === 'findBoat') {
      if (!boatName) return res.status(400).json({ success:false, message:'Missing boatName' })
      
      const html = await fetchText(indexUrl(eventId))
      const classes = parseClasses(html)
      console.log(`[FIND BOAT] Searching ${classes.length} classes for "${boatName}"`)
      
      for (const cls of classes) {
        try {
          const classHtml = await fetchText(seriesUrl(eventId, cls.id))
          const boats = parseOverallStandingsFixed(classHtml)
          const foundBoat = boats.find(b => boatMatches(b.name, boatName))
          
          if (foundBoat) {
            console.log(`[FIND BOAT] Found "${boatName}" in class ${cls.id} as "${foundBoat.name}"`)
            return ok(res, 'findBoat', [{ 
              classId: cls.id, 
              className: cls.label,
              boatData: foundBoat,
              totalBoats: boats.length 
            }], { eventId, searchedBoat: boatName })
          }
        } catch (e) {
          console.log(`[FIND BOAT] Error checking class ${cls.id}: ${e.message}`)
        }
      }
      
      console.log(`[FIND BOAT] Boat "${boatName}" not found in any class`)
      return ok(res, 'findBoat', [], { eventId, searchedBoat: boatName, classesSearched: classes.map(c => c.id) })
    }

    // NEW: Get complete race summary for a boat
    if (type === 'boatSummary') {
      if (!boatName || !classId) return res.status(400).json({ success:false, message:'Missing boatName or classId' })
      
      // Get overall standings
      const overallHtml = await fetchText(seriesUrl(eventId, classId))
      const overallResults = parseOverallStandingsFixed(overallHtml)
      const boatOverall = overallResults.find(b => boatMatches(b.name, boatName))
      
      // Get race list
      const indexHtml = await fetchText(indexUrl(eventId))
      const races = parseRacesForClass(indexHtml, classId)
      
      // Get individual race results
      const raceResults = []
      for (const race of races) {
        try {
          const raceHtml = await fetchText(raceUrl(eventId, classId, race.id))
          const raceData = parseRaceResultsFixed(raceHtml)
          const boatRace = raceData.find(b => boatMatches(b.name, boatName))
          
          if (boatRace) {
            raceResults.push({
              raceId: race.id,
              ...boatRace
            })
          }
        } catch (e) {
          console.log(`[BOAT SUMMARY] Error getting race ${race.id}: ${e.message}`)
        }
      }
      
      return ok(res, 'boatSummary', [{
        overall: boatOverall,
        races: raceResults,
        classId: classId,
        totalRaces: races.length
      }], { eventId, boatName, classId })
    }

    if (type === 'diagnose') {
      const cls = classId || 'M2'
      const url = `https://data.orc.org/public/WEV.dll?action=series&eventid=${eventId}&classid=${cls}`
      console.log(`[DIAGNOSE] Fetching: ${url}`)
      
      const html = await fetchText(url)
      const allTables = extractAllTables(html)
      const raceTables = extractRaceTables(html)
      
      const allTableAnalysis = allTables.map((table, i) => {
        const rows = extractTableData(table)
        return {
          index: i,
          rowCount: rows.length,
          headers: rows[0] || [],
          sampleRow: rows[1] || [],
          hasNorthstar: rows.some(row => 
            row.some(cell => cell.toLowerCase().includes('northstar'))
          )
        }
      })
      
      const raceTableAnalysis = raceTables.map((table, i) => {
        const rows = extractTableData(table)
        return {
          index: i,
          rowCount: rows.length,
          headers: rows[0] || [],
          sampleRows: rows.slice(1, 4),
          hasNorthstar: rows.some(row => 
            row.some(cell => cell.toLowerCase().includes('northstar'))
          )
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
      
      const rows = parseOverallStandingsFixed(html)
      console.log(`[OVERALL] Parsed ${rows.length} boats`)
      
      if (rows.length > 0) {
        console.log(`[OVERALL] Sample boats: ${rows.slice(0, 3).map(r => `"${r.name}"`).join(', ')}`)
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
      
      const rows = parseRaceResultsFixed(html)
      console.log(`[RACE] Parsed ${rows.length} boats for race ${raceId}`)
      
      return ok(res, 'race', rows, { eventId, classId: cls, raceId })
    }

    if (type === 'raceRaw') {
      if (!raceId) return res.status(400).json({ success:false, message:'Missing raceId' })
      
      const url = raceUrlRaw(eventId, raceId)
      console.log(`[RACE RAW] Fetching: ${url}`)
      const html = await fetchText(url)
      
      const rows = parseRaceResultsForClassFixed(html, classId)
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

function extractRaceTables(html) {
  const tables = []
  
  // First try: tables with class="race"
  const raceTableRegex = /<table[^>]*class="race"[^>]*>([\s\S]*?)<\/table>/gi
  let match
  while ((match = raceTableRegex.exec(html)) !== null) {
    tables.push(match[1])
  }
  
  // If no race tables found, look for data tables (multiple rows/cols with position numbers)
  if (tables.length === 0) {
    const allTables = extractAllTables(html)
    for (const table of allTables) {
      const rows = extractTableData(table)
      const looksLikeData = rows.length > 2 && 
                           rows[0].length > 3 && 
                           rows.some(row => row[0] && row[0].match(/^[0-9]+$/))
      
      if (looksLikeData) {
        tables.push(table)
      }
    }
  }
  
  console.log(`[EXTRACT RACE TABLES] Found ${tables.length} race tables`)
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

/* ---------- Boat Matching ---------- */
function cleanBoatName(name) {
  return String(name || '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toUpperCase()
}

function boatMatches(foundName, targetName) {
  if (!foundName || !targetName) return false
  
  const cleanFound = cleanBoatName(foundName)
  const cleanTarget = cleanBoatName(targetName)
  
  // Exact match
  if (cleanFound === cleanTarget) return true
  
  // Partial match (handles abbreviations)
  return cleanTarget.includes(cleanFound) || cleanFound.includes(cleanTarget)
}

/* ---------- FIXED PARSERS - Correct ORC Column Mapping ---------- */

function parseOverallStandingsFixed(html) {
  console.log(`[PARSE OVERALL FIXED] Starting parse...`)
  
  const raceTables = extractRaceTables(html)
  console.log(`[PARSE OVERALL FIXED] Found ${raceTables.length} race tables`)
  
  if (raceTables.length === 0) {
    console.log(`[PARSE OVERALL FIXED] No race tables found`)
    return []
  }
  
  const rows = extractTableData(raceTables[0])
  console.log(`[PARSE OVERALL FIXED] Table has ${rows.length} rows`)
  
  if (rows.length < 2) return []
  
  const headers = rows[0]
  console.log(`[PARSE OVERALL FIXED] Headers: [${headers.join(' | ')}]`)
  
  const results = []
  
  for (let r = 1; r < rows.length; r++) {
    const cells = rows[r]
    
    // Skip if not enough cells or first cell isn't a position number
    if (cells.length < 4 || !cells[0].match(/^[0-9]+$/)) {
      continue
    }
    
    // FIXED: Based on your screenshot, the ORC columns are:
    // [0] = Position (#)
    // [1] = Country (Boat) - "GBR", "USA"  
    // [2] = Boat Name (Sail) - "NORTHSTAR OF LONDON" ← This is what we want!
    // [3] = Sail Number (Skipper) - "GBR72X"
    // [4] = Points
    // [5] = Total
    
    const entry = {
      position: cells[0] || '',
      name: cells[2] || '',        // FIXED: Boat name is in column 2 (labeled "Sail")
      country: cells[1] || '',     // Country code
      sailNo: cells[3] || '',      // FIXED: Sail number is in column 3 (labeled "Skipper")  
      skipper: cells[4] || '',     // Actual skipper might be in later column
      points: cells[4] || '',      // Points
      total: cells[5] || ''        // Total
    }
    
    // Only include if we have a valid boat name
    if (entry.name && entry.name.length > 2 && !entry.name.match(/^[A-Z]{2,3}$/)) {
      console.log(`[PARSE OVERALL FIXED] Row ${r}: "${entry.name}" (${entry.position}) - ${entry.country}`)
      results.push(entry)
    }
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
  console.log(`[PARSE RACE FIXED] Table has ${rows.length} rows`)
  
  if (rows.length < 2) return []
  
  const headers = rows[0]
  console.log(`[PARSE RACE FIXED] Headers: [${headers.join(' | ')}]`)
  
  const results = []
  
  for (let r = 1; r < rows.length; r++) {
    const cells = rows[r]
    
    if (cells.length < 4 || !cells[0].match(/^[0-9]+$/)) continue
    
    // For race results, boat name is likely in same position (column 2)
    const entry = {
      position: cells[0] || '',
      name: cells[2] || cells[1] || '',  // Try column 2 first, fallback to 1
      country: cells[1] || '',
      finishTime: cells[4] || '',
      elapsed: cells[5] || '',
      correctedTime: cells[6] || '',
      deltaToFirst: '–'
    }
    
    if (entry.name && entry.name.length > 2) {
      results.push(entry)
    }
  }
  
  // Calculate deltas
  if (results.length && results[0].correctedTime) {
    const firstTime = results[0].correctedTime
    for (const r of results) {
      r.deltaToFirst = (firstTime && r.correctedTime) ? 
        mmssDelta(firstTime, r.correctedTime) : '–'
    }
  }
  
  console.log(`[PARSE RACE FIXED] Parsed ${results.length} race results`)
  return results
}

function parseRaceResultsForClassFixed(html, wantClass) {
  console.log(`[PARSE RACE CLASS FIXED] Looking for class ${wantClass}...`)
  
  if (!wantClass) {
    return parseRaceResultsFixed(html)
  }
  
  // Find class section
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
  console.log(`[PARSE RACE CLASS FIXED] Using table with ${rows.length} rows`)
  
  // Same parsing logic as race results
  const results = []
  for (let r = 1; r < rows.length; r++) {
    const cells = rows[r]
    
    if (cells.length < 4 || !cells[0].match(/^[0-9]+$/)) continue
    
    const entry = {
      position: cells[0] || '',
      name: cells[2] || cells[1] || '',  // Boat name in column 2
      country: cells[1] || '',
      finishTime: cells[4] || '',
      elapsed: cells[5] || '',
      correctedTime: cells[6] || ''
    }
    
    if (entry.name && entry.name.length > 2) {
      results.push(entry)
    }
  }
  
  return results
}

function mmssDelta(a, b) {
  const toSec = (str) => {
    if (!str) return null
    if (/^(DNF|DNS|DSQ|DNC|RET)$/i.test(str)) return null
    const p = str.split(':').map(Number)
    return p.length === 3 ? p[0]*3600 + p[1]*60 + p[2] : p[0]*60 + p[1]
  }
  
  const s1 = toSec(a), s2 = toSec(b)
  if (s1 == null || s2 == null) return '–'
  const d = Math.max(0, s2 - s1)
  const mm = String(Math.floor(d/60)).padStart(2,'0')
  const ss = String(d % 60).padStart(2,'0')
  return `${mm}:${ss}`
}

/* ---------- Classes & Races ---------- */
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
