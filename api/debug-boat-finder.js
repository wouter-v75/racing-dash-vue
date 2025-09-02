// api/debug-boat-finder.js
export const runtime = 'nodejs'

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()

  try {
    const q = req.query || {}
    const eventId = String(q.eventId || 'xolfq')
    const boatName = String(q.boatName || 'PROTEUS')

    console.log(`🔍 Starting systematic boat analysis for: "${boatName}" in event: ${eventId}`)

    const analysis = {
      step1: null, // Main website structure & classes
      step2: null, // Entry lists for each class
      step3: null, // Race and overall structures  
      step4: null, // Which class contains the boat
      step5: null, // Parsed data for the boat
      summary: null
    }

    // STEP 1: Identify main website structure and classes
    console.log('📋 STEP 1: Analyzing main website structure...')
    const mainHtml = await fetchText(`https://data.orc.org/public/WEV.dll?action=index&eventid=${eventId}`)
    const classes = extractClasses(mainHtml)
    
    analysis.step1 = {
      title: 'Main Website Structure & Classes',
      classes: classes,
      classCount: classes.length,
      mainPageSize: mainHtml.length,
      sampleContent: mainHtml.slice(0, 500) + '...'
    }

    // STEP 2: Check entry lists for each class to find boat
    console.log('🏁 STEP 2: Examining entry lists for each class...')
    const entryAnalysis = {}
    let foundInClass = null
    
    for (const cls of classes) {
      try {
        const entryUrl = `https://data.orc.org/public/WEV.dll?action=entries&eventid=${eventId}&classid=${cls.id}`
        const entryHtml = await fetchText(entryUrl)
        const boats = extractBoatsFromEntryList(entryHtml)
        const boatMatch = boats.find(b => 
          b.name.toUpperCase().includes(boatName.toUpperCase()) || 
          boatName.toUpperCase().includes(b.name.toUpperCase())
        )
        
        entryAnalysis[cls.id] = {
          boats: boats,
          boatCount: boats.length,
          containsTargetBoat: !!boatMatch,
          matchedBoat: boatMatch,
          sampleBoats: boats.slice(0, 3)
        }
        
        if (boatMatch && !foundInClass) {
          foundInClass = cls.id
          console.log(`✅ Found boat "${boatName}" in class "${cls.id}" as "${boatMatch.name}"`)
        }
      } catch (e) {
        entryAnalysis[cls.id] = { error: e.message }
      }
    }
    
    analysis.step2 = {
      title: 'Entry List Analysis',
      classes: entryAnalysis,
      boatFoundInClass: foundInClass
    }

    // STEP 3: Analyze race and overall structures
    console.log('🏆 STEP 3: Examining race and overall standing structures...')
    const structureAnalysis = {}
    
    if (foundInClass) {
      try {
        // Overall standings structure
        const overallUrl = `https://data.orc.org/public/WEV.dll?action=series&eventid=${eventId}&classid=${foundInClass}`
        const overallHtml = await fetchText(overallUrl)
        const overallStructure = analyzeTableStructure(overallHtml, 'overall')
        
        // Race structure (using race 13)
        const raceUrl = `https://data.orc.org/public/WEV.dll?action=race&eventid=${eventId}&raceid=13`
        const raceHtml = await fetchText(raceUrl)
        const raceStructure = analyzeTableStructure(raceHtml, 'race')
        
        structureAnalysis = {
          overall: overallStructure,
          race: raceStructure
        }
      } catch (e) {
        structureAnalysis = { error: e.message }
      }
    }
    
    analysis.step3 = {
      title: 'Race & Overall Standing Structures',
      structures: structureAnalysis
    }

    // STEP 4: Confirm which class the boat is in
    console.log('🎯 STEP 4: Confirming boat class location...')
    analysis.step4 = {
      title: 'Boat Class Confirmation',
      targetBoat: boatName,
      foundInClass: foundInClass,
      confidence: foundInClass ? 'HIGH' : 'NONE',
      recommendation: foundInClass ? 
        `Use class "${foundInClass}" for all queries` : 
        `Boat "${boatName}" not found in any class entry lists`
    }

    // STEP 5: Parse actual data for the boat (if found)
    console.log('📊 STEP 5: Parsing boat data...')
    let boatData = null
    
    if (foundInClass) {
      try {
        boatData = await parseBoatData(eventId, foundInClass, boatName)
      } catch (e) {
        boatData = { error: e.message }
      }
    }
    
    analysis.step5 = {
      title: 'Boat Data Parsing',
      data: boatData
    }

    // SUMMARY
    analysis.summary = {
      success: !!foundInClass,
      boatName: boatName,
      eventId: eventId,
      correctClass: foundInClass,
      nextSteps: foundInClass ? [
        `Update default class to "${foundInClass}"`,
        'Verify column mappings match actual table structure',
        'Test boat highlighting in results'
      ] : [
        'Check if boat name in user metadata matches actual ORC boat name',
        'Verify event ID is correct',
        'Check if boat is registered for this event'
      ]
    }

    return res.status(200).json({
      success: true,
      analysis: analysis,
      timestamp: new Date().toISOString()
    })

  } catch (e) {
    console.error('Debug analysis failed:', e)
    return res.status(500).json({
      success: false,
      message: e.message,
      stack: e.stack
    })
  }
}

/* ---------- Analysis Functions ---------- */

function extractClasses(html) {
  const classes = []
  const classRegex = /action=series[^"'>]*classid=([^"'&>]+)[^>]*>([^<]*)/gi
  let match
  
  while ((match = classRegex.exec(html)) !== null) {
    const id = match[1].trim()
    const label = match[2].trim() || id
    if (id && !classes.some(c => c.id === id)) {
      classes.push({ id, label })
    }
  }
  
  return classes
}

function extractBoatsFromEntryList(html) {
  const boats = []
  
  // Find all tables in the entry list
  const tableRegex = /<table[^>]*>([\s\S]*?)<\/table>/gi
  const tables = []
  let tableMatch
  
  while ((tableMatch = tableRegex.exec(html)) !== null) {
    tables.push(tableMatch[1])
  }
  
  // Parse each table for boat entries
  for (const tableContent of tables) {
    const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi
    const rows = []
    let rowMatch
    
    while ((rowMatch = rowRegex.exec(tableContent)) !== null) {
      const cellRegex = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi
      const cells = []
      let cellMatch
      
      while ((cellMatch = cellRegex.exec(rowMatch[1])) !== null) {
        const cellText = cellMatch[1]
          .replace(/<[^>]*>/g, '')
          .replace(/&amp;/g, '&')
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'")
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/\s+/g, ' ')
          .trim()
        cells.push(cellText)
      }
      
      if (cells.length > 0) rows.push(cells)
    }
    
    // Analyze rows to extract boat info
    if (rows.length > 1) { // Skip if no data rows
      const headers = rows[0].map(h => h.toLowerCase())
      console.log('Entry list headers:', headers)
      
      for (let i = 1; i < rows.length; i++) {
        const cells = rows[i]
        if (cells.length >= 2 && cells[0] && !isNaN(parseInt(cells[0]))) {
          // Find the most likely boat name column
          let boatName = ''
          const namePatterns = ['name', 'yacht', 'boat']
          const nameIdx = headers.findIndex(h => namePatterns.some(p => h.includes(p)))
          
          if (nameIdx >= 0 && cells[nameIdx]) {
            boatName = cells[nameIdx]
          } else if (cells[1]) {
            boatName = cells[1] // fallback to second column
          }
          
          if (boatName) {
            boats.push({
              position: cells[0],
              name: boatName,
              sailNo: cells[2] || '',
              owner: cells[3] || '',
              allData: cells
            })
          }
        }
      }
    }
  }
  
  return boats
}

function analyzeTableStructure(html, type) {
  const analysis = {
    tables: [],
    headers: [],
    sampleRows: [],
    columnCount: 0
  }
  
  const tableRegex = /<table[^>]*>([\s\S]*?)<\/table>/gi
  let tableMatch
  let tableIndex = 0
  
  while ((tableMatch = tableRegex.exec(html)) !== null) {
    const tableContent = tableMatch[1]
    const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi
    const rows = []
    let rowMatch
    
    while ((rowMatch = rowRegex.exec(tableContent)) !== null) {
      const cellRegex = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi
      const cells = []
      let cellMatch
      
      while ((cellMatch = cellRegex.exec(rowMatch[1])) !== null) {
        const cellText = cellMatch[1]
          .replace(/<[^>]*>/g, '')
          .replace(/&amp;/g, '&')
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'")
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/\s+/g, ' ')
          .trim()
        cells.push(cellText)
      }
      rows.push(cells)
    }
    
    if (rows.length > 0) {
      analysis.tables.push({
        index: tableIndex,
        rowCount: rows.length,
        headers: rows[0] || [],
        sampleRows: rows.slice(1, 4),
        hasResultColumns: type === 'race' ? 
          hasRaceColumns(rows[0] || []) : 
          hasOverallColumns(rows[0] || [])
      })
      
      if (rows[0]) {
        analysis.headers.push(...rows[0])
        analysis.columnCount = Math.max(analysis.columnCount, rows[0].length)
      }
    }
    
    tableIndex++
  }
  
  return analysis
}

function hasRaceColumns(headers) {
  const h = headers.map(x => x.toLowerCase())
  const hasPos = h.some(col => /^(pos|position|#)$/.test(col))
  const hasTime = h.some(col => /(finish|corrected|elapsed)/.test(col))
  return hasPos && hasTime
}

function hasOverallColumns(headers) {
  const h = headers.map(x => x.toLowerCase())
  const hasPos = h.some(col => /^(pos|position|#)$/.test(col))
  const hasPoints = h.some(col => /(points|pts|total)/.test(col))
  return hasPos && hasPoints
}

async function parseBoatData(eventId, classId, targetBoat) {
  const data = {
    overall: null,
    lastRace: null,
    otherRaces: []
  }
  
  try {
    // Overall standings
    const overallUrl = `https://data.orc.org/public/WEV.dll?action=series&eventid=${eventId}&classid=${classId}`
    const overallHtml = await fetchText(overallUrl)
    const overallResults = parseTableForBoat(overallHtml, targetBoat, 'overall')
    data.overall = overallResults
    
    // Last race (race 13)
    const raceUrl = `https://data.orc.org/public/WEV.dll?action=race&eventid=${eventId}&raceid=13`
    const raceHtml = await fetchText(raceUrl)
    const raceResults = parseTableForBoat(raceHtml, targetBoat, 'race', classId)
    data.lastRace = raceResults
    
  } catch (e) {
    data.error = e.message
  }
  
  return data
}

function parseTableForBoat(html, targetBoat, tableType, classFilter = null) {
  const result = {
    tableType,
    targetBoat,
    found: false,
    boatData: null,
    allBoats: [],
    tableHeaders: [],
    classFilter
  }
  
  // Find tables
  const tableRegex = /<table[^>]*>([\s\S]*?)<\/table>/gi
  let tableMatch
  
  while ((tableMatch = tableRegex.exec(html)) !== null) {
    const tableContent = tableMatch[1]
    const rows = parseTableRows(tableContent)
    
    if (rows.length < 2) continue
    
    const headers = rows[0]
    result.tableHeaders = headers
    
    // For race pages with multiple classes, filter by class if needed
    if (tableType === 'race' && classFilter) {
      // Check if this table is for the right class by looking for class anchor nearby
      const tableStartPos = tableMatch.index
      const beforeTable = html.slice(Math.max(0, tableStartPos - 1000), tableStartPos)
      const classAnchorPattern = new RegExp(`classid=${classFilter}`, 'i')
      
      if (!classAnchorPattern.test(beforeTable)) {
        continue // Skip this table, it's for a different class
      }
    }
    
    // Parse data rows
    for (let i = 1; i < rows.length; i++) {
      const cells = rows[i]
      if (cells.length < 2 || !cells[0] || isNaN(parseInt(cells[0]))) continue
      
      // Find boat name in various possible columns
      let boatName = ''
      for (let col = 1; col < Math.min(cells.length, 5); col++) {
        if (cells[col] && cells[col].length > 2 && !/^[A-Z]{2,3}$/.test(cells[col])) {
          boatName = cells[col]
          break
        }
      }
      
      const boatEntry = {
        position: cells[0],
        name: boatName,
        sailNo: cells[2] || '',
        type: cells[3] || '',
        owner: cells[4] || '',
        finishTime: cells[5] || '',
        elapsed: cells[6] || '',
        corrected: cells[7] || '',
        points: cells[8] || '',
        allCells: cells
      }
      
      result.allBoats.push(boatEntry)
      
      // Check if this is our target boat
      if (boatName.toUpperCase().includes(targetBoat.toUpperCase()) || 
          targetBoat.toUpperCase().includes(boatName.toUpperCase())) {
        result.found = true
        result.boatData = boatEntry
      }
    }
    
    // If we found the target boat in this table, we're done
    if (result.found) break
  }
  
  return result
}

function parseTableRows(tableContent) {
  const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi
  const rows = []
  let rowMatch
  
  while ((rowMatch = rowRegex.exec(tableContent)) !== null) {
    const cellRegex = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi
    const cells = []
    let cellMatch
    
    while ((cellMatch = cellRegex.exec(rowMatch[1])) !== null) {
      const cellText = cellMatch[1]
        .replace(/<[^>]*>/g, '')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/\s+/g, ' ')
        .trim()
      cells.push(cellText)
    }
    rows.push(cells)
  }
  
  return rows
}

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
