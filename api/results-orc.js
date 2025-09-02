// api/results-orc.js - DIAGNOSTIC VERSION
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

    // DIAGNOSTIC: Show raw HTML structure
    if (type === 'diagnose') {
      const cls = classId || 'M2'
      const url = `https://data.orc.org/public/WEV.dll?action=series&eventid=${eventId}&classid=${cls}`
      console.log(`[DIAGNOSE] Fetching: ${url}`)
      
      const html = await fetchText(url)
      console.log(`[DIAGNOSE] HTML length: ${html.length}`)
      
      // Extract all tables and show their structure
      const tables = extractAllTables(html)
      console.log(`[DIAGNOSE] Found ${tables.length} tables`)
      
      const tableAnalysis = tables.map((table, i) => {
        const rows = extractTableData(table)
        console.log(`[DIAGNOSE] Table ${i}: ${rows.length} rows`)
        
        if (rows.length > 0) {
          console.log(`[DIAGNOSE] Table ${i} headers: [${rows[0].join(' | ')}]`)
          if (rows.length > 1) {
            console.log(`[DIAGNOSE] Table ${i} sample row: [${rows[1].join(' | ')}]`)
          }
        }
        
        return {
          index: i,
          rowCount: rows.length,
          headers: rows[0] || [],
          sampleRow: rows[1] || [],
          rawPreview: table.substring(0, 500)
        }
      })
      
      return res.status(200).json({ 
        success: true,
        resultType: 'diagnose',
        meta: { eventId, classId: cls, htmlLength: html.length, tablesFound: tables.length },
        tables: tableAnalysis,
        htmlPreview: html.substring(0, 2000),
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
      
      // DIAGNOSTIC: Show what we're looking for
      console.log(`[RACES DIAGNOSTIC] Looking for class ${classId} in HTML length ${html.length}`)
      const hasClass = html.toLowerCase().includes(classId.toLowerCase())
      console.log(`[RACES DIAGNOSTIC] HTML contains "${classId}": ${hasClass}`)
      
      const races = parseRacesForClass(html, classId)
      console.log(`[RACES] Found ${races.length} races for class ${classId}`)
      
      if (races.length === 0) {
        // Show some context around where we expect to find races
        const classPos = html.toLowerCase().indexOf(classId.toLowerCase())
        if (classPos >= 0) {
          const context = html.substring(classPos, classPos + 1000)
          console.log(`[RACES DIAGNOSTIC] Context around class ${classId}:`, context.substring(0, 300))
        }
      }
      
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
      
      // DIAGNOSTIC: Show table extraction process
      const tables = extractAllTables(html)
      console.log(`[OVERALL] Found ${tables.length} tables`)
      
      for (let i = 0; i < Math.min(tables.length, 3); i++) {
        const rows = extractTableData(tables[i])
        console.log(`[OVERALL] Table ${i}: ${rows.length} rows`)
        if (rows.length > 0) {
          console.log(`[OVERALL] Table ${i} headers: [${rows[0].slice(0, 6).join(' | ')}]`)
          if (rows.length > 1) {
            console.log(`[OVERALL] Table ${i} row 1: [${rows[1].slice(0, 6).join(' | ')}]`)
          }
        }
      }
      
      const rows = parseOverallStandings(html)
      console.log(`[OVERALL] Parsed ${rows.length} boats`)
      
      if (rows.length === 0) {
        // Show raw HTML snippet for debugging
        console.log(`[OVERALL] No boats found. HTML snippet:`, html.substring(0, 1000))
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
      console.log(`[RACE RAW] HTML length: ${html.length}`)
      
      // DIAGNOSTIC: Show what's in the race HTML
      const tables = extractAllTables(html)
      console.log(`[RACE RAW] Found ${tables.length} tables`)
      
      const rows = parseRaceResultsForClass(html, classId)
      console.log(`[RACE RAW] Parsed ${rows.length} boats for race ${raceId} class ${classId}`)
      
      if (rows.length === 0) {
        console.log(`[RACE RAW] No results. HTML preview:`, html.substring(0, 800))
      }
      
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
  console.log(`[EXTRACT TABLES] Found ${tables.length} tables`)
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
  
  console.log(`[EXTRACT TABLE DATA] Extracted ${rows.length} rows`)
  return rows
}

/* ---------- DIAGNOSTIC PARSERS ---------- */

function parseOverallStandings(html) {
  console.log(`[PARSE OVERALL] Starting parse of ${html.length} chars...`)
  const tables = extractAllTables(html)
  console.log(`[PARSE OVERALL] Found ${tables.length} tables`)
  
  if (tables.length === 0) {
    console.log(`[PARSE OVERALL] ERROR: No tables found in HTML`)
    console.log(`[PARSE OVERALL] HTML preview:`, html.substring(0, 500))
    return []
  }
  
  // Try each table until we find one with standings data
  for (let i = 0; i < tables.length; i++) {
    console.log(`[PARSE OVERALL] Analyzing table ${i}...`)
    const rows = extractTableData(tables[i])
    console.log(`[PARSE OVERALL] Table ${i} has ${rows.length} rows`)
    
    if (rows.length < 2) {
      console.log(`[PARSE OVERALL] Table ${i} skipped - too few rows`)
      continue
    }
    
    const headers = rows[0].map(h => h.toLowerCase())
    console.log(`[PARSE OVERALL] Table ${i} headers: [${headers.join(' | ')}]`)
    console.log(`[PARSE OVERALL] Table ${i} sample row: [${rows[1].join(' | ')}]`)
    
    // Check if this looks like a standings table
    const hasPosition = headers.some(h => h.includes('pos') || h === '#' || h.includes('position'))
    const hasPoints = headers.some(h => h.includes('point') || h.includes('pts') || h.includes('total') || h.includes('score'))
    const hasNames = rows.length > 1 && rows[1].some(cell => cell.length > 3 && isNaN(parseFloat(cell)))
    
    console.log(`[PARSE OVERALL] Table ${i} analysis - hasPos: ${hasPosition}, hasPoints: ${hasPoints}, hasNames: ${hasNames}`)
    
    if (hasPosition || hasPoints || hasNames || i === 0) {
      console.log(`[PARSE OVERALL] Using table ${i}`)
      const standings = parseStandingsTable(rows, i)
      if (standings.length > 0) {
        console.log(`[PARSE OVERALL] Successfully parsed ${standings.length} boats from table ${i}`)
        return standings
      } else {
        console.log(`[PARSE OVERALL] Table ${i} returned no standings`)
      }
    } else {
      console.log(`[PARSE OVERALL] Table ${i} doesn't look like standings`)
    }
  }
  
  console.log(`[PARSE OVERALL] ERROR: No valid standings table found`)
  return []
}

function parseStandingsTable(rows, tableIndex = 0) {
  const results = []
  const headers = rows[0]
  
  console.log(`[PARSE STANDINGS] Table ${tableIndex} - Processing ${rows.length} rows`)
  console.log(`[PARSE STANDINGS] Headers: [${headers.join(' | ')}]`)
  
  // Find the boat name column by looking for the longest non-numeric text in each column
  let nameCol = 1 // default
  let maxAvgLength = 0
  
  for (let col = 0; col < Math.min(headers.length, 8); col++) {
    let totalLength = 0
    let textCount = 0
    
    // Check first few rows to find text columns
    for (let row = 1; row < Math.min(rows.length, 5); row++) {
      const cell = rows[row][col] || ''
      if (cell.length > 2 && isNaN(parseFloat(cell))) {
        totalLength += cell.length
        textCount++
      }
    }
    
    const avgLength = textCount > 0 ? totalLength / textCount : 0
    console.log(`[PARSE STANDINGS] Column ${col} ("${headers[col]}"): avg text length = ${avgLength.toFixed(1)}`)
    
    if (avgLength > maxAvgLength) {
      maxAvgLength = avgLength
      nameCol = col
    }
  }
  
  console.log(`[PARSE STANDINGS] Selected name column: ${nameCol} ("${headers[nameCol]}") with avg length ${maxAvgLength.toFixed(1)}`)
  
  // Parse data rows
  for (let r = 1; r < rows.length; r++) {
    const cells = rows[r]
    
    if (cells.length < 2) {
      console.log(`[PARSE STANDINGS] Row ${r} skipped - too few cells (${cells.length})`)
      continue
    }
    
    // Check if first cell looks like a position number
    const firstCell = cells[0] || ''
    const isValidPosition = firstCell.match(/^\d+$/) || firstCell.match(/^\d+\.$/)
    
    if (!isValidPosition) {
      console.log(`[PARSE STANDINGS] Row ${r} skipped - "${firstCell}" doesn't look like position`)
      continue
    }
    
    const name = cells[nameCol] || ''
    if (name.length < 2) {
      console.log(`[PARSE STANDINGS] Row ${r} skipped - name too short: "${name}"`)
      continue
    }
    
    const entry = {
      position: firstCell,
      name: name,
      sailNo: cells[Math.min(nameCol + 1, cells.length - 1)] || '',
      skipper: cells[Math.min(nameCol + 2, cells.length - 1)] || '',
      points: cells[Math.max(cells.length - 2, nameCol + 3)] || '',
      total: cells[cells.length - 1] || ''
    }
    
    console.log(`[PARSE STANDINGS] Row ${r}: Pos="${entry.position}", Name="${entry.name}", Sail="${entry.sailNo}"`)
    results.push(entry)
  }
  
  console.log(`[PARSE STANDINGS] Final result: ${results.length} boats parsed`)
  return results
}

function parseRaceResults(html) {
  console.log(`[PARSE RACE] Starting race parse of ${html.length} chars...`)
  const tables = extractAllTables(html)
  console.log(`[PARSE RACE] Found ${tables.length} tables`)
  
  if (tables.length === 0) return []
  
  // Try each table
  for (let i = 0; i < tables.length; i++) {
    const rows = extractTableData(tables[i])
    console.log(`[PARSE RACE] Table ${i}: ${rows.length} rows`)
    
    if (rows.length < 2) continue
    
    const headers = rows[0].map(h => h.toLowerCase())
    const hasTime = headers.some(h => h.includes('finish') || h.includes('elapsed') || h.includes('corrected') || h.includes('time'))
    console.log(`[PARSE RACE] Table ${i} hasTime: ${hasTime}`)
    
    if (hasTime || i === 0) {
      const raceData = parseRaceTable(rows, i)
      if (raceData.length > 0) return raceData
    }
  }
  
  return []
}

function parseRaceResultsForClass(html, wantClass) {
  console.log(`[PARSE RACE CLASS] Looking for class ${wantClass} in ${html.length} chars...`)
  
  if (!wantClass) {
    return parseRaceResults(html)
  }
  
  // Find class section in HTML
  const classIndex = html.toLowerCase().indexOf(wantClass.toLowerCase())
  console.log(`[PARSE RACE CLASS] Class "${wantClass}" found at position: ${classIndex}`)
  
  if (classIndex === -1) {
    console.log(`[PARSE RACE CLASS] Class ${wantClass} not found, using all tables`)
    return parseRaceResults(html)
  }
  
  // Get HTML after class mention
  const relevantHtml = html.substring(classIndex)
  const tables = extractAllTables(relevantHtml)
  console.log(`[PARSE RACE CLASS] Found ${tables.length} tables after class mention`)
  
  if (tables.length === 0) return []
  
  // Use first table after class mention
  const rows = extractTableData(tables[0])
  return parseRaceTable(rows, 0)
}

function parseRaceTable(rows, tableIndex = 0) {
  console.log(`[PARSE RACE TABLE] Table ${tableIndex}: Processing ${rows.length} rows`)
  
  if (rows.length < 2) return []
  
  const results = []
  const headers = rows[0]
  console.log(`[PARSE RACE TABLE] Headers: [${headers.join(' | ')}]`)
  
  // Find name column (same logic as standings)
  let nameCol = 1
  let maxAvgLength = 0
  
  for (let col = 0; col < Math.min(headers.length, 6); col++) {
    let totalLength = 0
    let textCount = 0
    
    for (let row = 1; row < Math.min(rows.length, 5); row++) {
      const cell = rows[row][col] || ''
      if (cell.length > 2 && isNaN(parseFloat(cell))) {
        totalLength += cell.length
        textCount++
      }
    }
    
    const avgLength = textCount > 0 ? totalLength / textCount : 0
    if (avgLength > maxAvgLength) {
      maxAvgLength = avgLength
      nameCol = col
    }
  }
  
  console.log(`[PARSE RACE TABLE] Selected name column: ${nameCol} ("${headers[nameCol]}")`)
  
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
    
    console.log(`[PARSE RACE TABLE] Row ${r}: "${entry.name}" (${entry.position})`)
    results.push(entry)
  }
  
  console.log(`[PARSE RACE TABLE] Parsed ${results.length} race results`)
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
  console.log(`[PARSE RACES FOR CLASS] Looking for class ${wantClass}`)
  
  const classIndex = html.toLowerCase().indexOf(wantClass.toLowerCase())
  console.log(`[PARSE RACES FOR CLASS] Class found at position: ${classIndex}`)
  
  if (classIndex === -1) {
    console.log(`[PARSE RACES FOR CLASS] Class ${wantClass} not found`)
    return []
  }
  
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
  
  console.log(`[PARSE RACES FOR CLASS] Found ${out.length} races: ${out.map(r => r.id).join(', ')}`)
  return out.sort((a,b) => String(a.id).localeCompare(String(b.id), undefined, { numeric:true, sensitivity:'base' }))
}

async function autoFirstClass(eventId) {
  const html = await fetchText(indexUrl(eventId))
  const classes = parseClasses(html)
  return classes[0]?.id || null
}
