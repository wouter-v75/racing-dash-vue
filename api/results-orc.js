// Brutally simple parser - extract everything and see what happens
function parseSimpleOverallResults(html) {
  const results = []
  
  try {
    // Just find any row with NORTHSTAR and extract its cells
    const northstarIndex = html.indexOf('NORTHSTAR')
    if (northstarIndex === -1) return results
    
    // Find the start of the row containing NORTHSTAR
    const rowStart = html.lastIndexOf('<tr', northstarIndex)
    const rowEnd = html.indexOf('</tr>', northstarIndex) + 5
    
    if (rowStart === -1 || rowEnd === -1) return results
    
    const rowHtml = html.slice(rowStart, rowEnd)
    
    // Extract all td contents using simple regex
    const cellRegex = /<td[^>]*>(.*?)<\/td>/gis
    const cells = []
    let match
    
    while ((match = cellRegex.exec(rowHtml)) !== null) {
      let content = match[1]
        .replace(/<[^>]+// Ultra-simple parser - just find NORTHSTAR directly
function parseSimpleOverallResults(html) {
  console.log('=== ULTRA SIMPLE DEBUG ===')
  console.log('HTML length:', html.length)
  
  const results = []
  
  try {
    // Check if HTML contains NORTHSTAR
    const hasNorthstar = html.includes('NORTHSTAR')
    console.log('Contains NORTHSTAR:', hasNorthstar)
    
    // Check if we can find class="data"
    const hasDataClass = html.includes('class="data"')
    console.log('Contains class="data":', hasDataClass)
    
    // Test different regex patterns
    console.log('Testing regex patterns...')
    
    // Pattern 1: Simple class="data"
    const pattern1 = /<tr[^>]*class="data"[^>]*>/gi
    const matches1 = html.match(pattern1)
    console.log('Pattern 1 matches:', matches1 ? matches1.length : 0)
    
    // Pattern 2: Any tr with data
    const pattern2 = /<tr[^>]*data[^>]*>/gi
    const matches2 = html.match(pattern2)
    console.log('Pattern 2 matches:', matches2 ? matches2.length : 0)
    
    // Pattern 3: Just find any row containing NORTHSTAR
    const northstarRowRegex = /<tr[^>]*>[\s\S]*?NORTHSTAR[\s\S]*?<\/tr>/gis
    const northstarMatch = html.match(northstarRowRegex)
    console.log('NORTHSTAR row matches:', northstarMatch ? northstarMatch.length : 0)
    
    if (northstarMatch) {
      console.log('NORTHSTAR row HTML:', northstarMatch[0].slice(0, 500))
      
      // Extract cells from NORTHSTAR row
      const cellRegex = /<td[^>]*>([\s\S]*?)<\/td>/gis
      const cells = []
      let cellMatch
      
      while ((cellMatch = cellRegex.exec(northstarMatch[0])) !== null) {
        let cellContent = cellMatch[1]
        cellContent = cellContent
          .replace(/<span[^>]*>/g, '')
          .replace(/<\/span>/g, '')
          .replace(/<br\s*\/?>/gi, ' ')
          .replace(/█/g, '')
          .replace(/<[^>]*>/g, '')
          .replace(/\s+/g, ' ')
          .trim()
        cells.push(cellContent)
      }
      
      console.log('NORTHSTAR cells:', cells)
      
      if (cells.length >= 8) {
        const result = {
          position: cells[0],
          nation: cells[1] || '',
          name: cells[2] || 'Unknown',
          sailNo: cells[3] || '',
          type: cells[4] || '',
          skipper: cells[5] || '',
          club: cells[6] || '',
          class: cells[7] || '',
          r1: cells[8] || '',
          r2: cells[9] || '',
          r3: cells[10] || '',
          r4: cells[11] || '',
          total: cells[12] || '',
          points: cells[12] || ''
        }
        
        results.push(result)
        console.log('Added NORTHSTAR result:', result)
      }
    }
    
    // Now try to get ALL data rows using a working pattern
    if (matches1 && matches1.length > 0) {
      console.log('Processing all data rows...')
      
      // Get full rows including content
      const fullRowRegex = /<tr[^>]*class="data"[^>]*>[\s\S]*?<\/tr>/gis
      let fullMatch
      let fullRowCount = 0
      
      while ((fullMatch = fullRowRegex.exec(html)) !== null) {
        fullRowCount++
        const rowHtml = fullMatch[0]
        
        // Extract cells
        const cellRegex = /<td[^>]*>([\s\S]*?)<\/td>/gis
        const cells = []
        let cellMatch
        
        while ((cellMatch = cellRegex.exec(rowHtml)) !== null) {
          let cellContent = cellMatch[1]
          cellContent = cellContent
            .replace(/<span[^>]*>/g, '')
            .replace(/<\/span>/g, '')
            .replace(/<br\s*\/?>/gi, ' ')
            .replace(/█/g, '')
            .replace(/<[^>]*>/g, '')
            .replace(/\s+/g, ' ')
            .trim()
          cells.push(cellContent)
        }
        
        if (cells.length >= 8 && cells[0] && !isNaN(parseInt(cells[0]))) {
          const result = {
            position: cells[0],
            nation: cells[1] || '',
            name: cells[2] || 'Unknown',
            sailNo: cells[3] || '',
            type: cells[4] || '',
            skipper: cells[5] || '',
            club: cells[6] || '',
            class: cells[7] || '',
            r1: cells[8] || '',
            r2: cells[9] || '',
            r3: cells[10] || '',
            r4: cells[11] || '',
            total: cells[12] || '',
            points: cells[12] || ''
          }
          
          // Only add if not already added (avoid duplicates)
          if (!results.find(r => r.position === result.position)) {
            results.push(result)
            console.log(`Added row ${fullRowCount}: ${result.name}`)
          }
        }
      }
    }
    
    console.log(`Processed ${fullRowCount} full data rows`)
    console.log('Final results:', results.length)
    
  } catch (error) {
    console.error('Error parsing overall results:', error)
    console.error('Stack:', error.stack)
  }
  
  console.log('=== END ULTRA SIMPLE DEBUG ===')
  return results
}// api/results-orc.js - Vercel serverless function to fetch ORC data (no CORS issues)

export default async function handler(req, res) {
  // Enable CORS for your frontend
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method not allowed' })
  }

  const { eventId, classId, raceId, type = 'series' } = req.query

  // Ping endpoint for health checks
  if (type === 'ping') {
    return res.status(200).json({ 
      ok: true, 
      time: new Date().toISOString() 
    })
  }

  if (!eventId) {
    return res.status(400).json({ success: false, message: 'Missing eventId' })
  }

  try {
    // Handle debug mode - returns raw HTML preview
    if (type === 'debug') {
      const debugUrl = `https://data.orc.org/public/WEV.dll?action=index&eventid=${eventId}`
      console.log('Fetching debug HTML from:', debugUrl)
      
      const response = await fetch(debugUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; racingdash-proxy/1.0)',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        }
      })
      
      if (!response.ok) {
        throw new Error(`ORC returned ${response.status}: ${response.statusText}`)
      }
      
      const html = await response.text()
      console.log('Debug HTML length:', html.length)
      
      return res.status(200).json({
        success: true,
        resultType: 'debug',
        preview: html.slice(0, 1400), // First 1400 characters for debugging
        meta: {
          eventId,
          url: debugUrl,
          htmlLength: html.length,
          lastUpdated: new Date().toISOString()
        }
      })
    }

    // Handle debug-parse mode - debug the actual parsing and return results
    if (type === 'debug-parse') {
      if (!classId) return res.status(400).json({ success: false, message: 'Missing classId for debug-parse' })
      
      const seriesUrl = `https://data.orc.org/public/WEV.dll?action=series&eventid=${eventId}&classid=${classId}`
      const response = await fetch(seriesUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; racingdash-proxy/1.0)',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        }
      })
      
      if (!response.ok) {
        throw new Error(`ORC returned ${response.status}: ${response.statusText}`)
      }
      
      const html = await response.text()
      
      // Debug parsing step by step
      const debug = {
        htmlLength: html.length,
        hasNorthstar: html.includes('NORTHSTAR'),
        hasDataClass: html.includes('class="data"'),
        patterns: {},
        rows: [],
        results: []
      }
      
      // Test basic data class pattern
      const dataClassRegex = /<tr[^>]*class="data"[^>]*>/gi
      const dataClassMatches = html.match(dataClassRegex)
      debug.patterns.dataClassCount = dataClassMatches ? dataClassMatches.length : 0
      
      // Try to extract full data rows
      const fullRowRegex = /<tr[^>]*class="data"[^>]*>[\s\S]*?<\/tr>/gis
      let rowMatch
      let rowIndex = 0
      
      while ((rowMatch = fullRowRegex.exec(html)) !== null && rowIndex < 10) {
        const rowHtml = rowMatch[0]
        
        // Extract cells from this row
        const cellRegex = /<td[^>]*>([\s\S]*?)<\/td>/gis
        const cells = []
        let cellMatch
        
        while ((cellMatch = cellRegex.exec(rowHtml)) !== null) {
          let cellContent = cellMatch[1]
            .replace(/<span[^>]*>/g, '')
            .replace(/<\/span>/g, '')
            .replace(/<br\s*\/?>/gi, ' ')
            .replace(/█/g, '')
            .replace(/<[^>]*>/g, '')
            .replace(/\s+/g, ' ')
            .trim()
          cells.push(cellContent)
        }
        
        debug.rows.push({
          index: rowIndex,
          cellCount: cells.length,
          cells: cells,
          isValidPosition: cells[0] && !isNaN(parseInt(cells[0])),
          containsNorthstar: (cells[2] || '').toUpperCase().includes('NORTHSTAR')
        })
        
        // Create result if valid
        if (cells.length >= 8 && cells[0] && !isNaN(parseInt(cells[0]))) {
          const result = {
            position: cells[0],
            nation: cells[1] || '',
            name: cells[2] || 'Unknown',
            sailNo: cells[3] || '',
            type: cells[4] || '',
            skipper: cells[5] || '',
            club: cells[6] || '',
            class: cells[7] || '',
            r1: cells[8] || '',
            r2: cells[9] || '',
            r3: cells[10] || '',
            r4: cells[11] || '',
            total: cells[12] || '',
            points: cells[12] || ''
          }
          debug.results.push(result)
        }
        
        rowIndex++
      }
      
      return res.status(200).json({
        success: true,
        resultType: 'debug-parse',
        debug,
        meta: { eventId, classId, url: seriesUrl, lastUpdated: new Date().toISOString() }
      })
    }

    // Handle classes endpoint
    if (type === 'classes') {
      const indexUrl = `https://data.orc.org/public/WEV.dll?action=index&eventid=${eventId}`
      const response = await fetch(indexUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; racingdash-proxy/1.0)',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        }
      })
      
      if (!response.ok) {
        throw new Error(`ORC returned ${response.status}: ${response.statusText}`)
      }
      
      const html = await response.text()
      const classes = safeParse(parseClasses, html)
      
      return res.status(200).json({
        success: true,
        resultType: 'classes',
        results: classes,
        meta: { eventId, lastUpdated: new Date().toISOString() }
      })
    }

    // Handle racesForClass endpoint
    if (type === 'racesForClass') {
      if (!classId) return res.status(400).json({ success: false, message: 'Missing classId' })
      
      const indexUrl = `https://data.orc.org/public/WEV.dll?action=index&eventid=${eventId}`
      const response = await fetch(indexUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; racingdash-proxy/1.0)',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        }
      })
      
      if (!response.ok) {
        throw new Error(`ORC returned ${response.status}: ${response.statusText}`)
      }
      
      const html = await response.text()
      const races = safeParse(parseRacesForClass, html, classId)
      
      return res.status(200).json({
        success: true,
        resultType: 'races',
        results: races,
        meta: { eventId, classId, lastUpdated: new Date().toISOString() }
      })
    }

    // Handle overall endpoint
    if (type === 'overall') {
      const cls = classId || await autoFirstClass(eventId)
      if (!cls) {
        return res.status(200).json({
          success: true,
          resultType: 'overall',
          results: [],
          meta: { eventId, classId: null, lastUpdated: new Date().toISOString() }
        })
      }
      
      const seriesUrl = `https://data.orc.org/public/WEV.dll?action=series&eventid=${eventId}&classid=${cls}`
      const response = await fetch(seriesUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; racingdash-proxy/1.0)',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        }
      })
      
      if (!response.ok) {
        throw new Error(`ORC returned ${response.status}: ${response.statusText}`)
      }
      
      const html = await response.text()
      const rows = safeParse(parseSeriesResults, html)
      
      return res.status(200).json({
        success: true,
        resultType: 'overall',
        results: rows,
        meta: { eventId, classId: cls, lastUpdated: new Date().toISOString() }
      })
    }

    let orcUrl
    
    // Skip URL construction for debug mode
    if (type !== 'debug') {
      switch (type) {
        case 'series':
          if (!classId) return res.status(400).json({ success: false, message: 'Missing classId for series' })
          orcUrl = `https://data.orc.org/public/WEV.dll?action=series&eventid=${eventId}&classid=${classId}`
          break
          
        case 'index':
          orcUrl = `https://data.orc.org/public/WEV.dll?action=index&eventid=${eventId}`
          break
          
        case 'race':
          if (!raceId) return res.status(400).json({ success: false, message: 'Missing raceId for race' })
          orcUrl = classId 
            ? `https://data.orc.org/public/WEV.dll?action=race&eventid=${eventId}&classid=${classId}&raceid=${raceId}`
            : `https://data.orc.org/public/WEV.dll?action=race&eventid=${eventId}&raceid=${raceId}`
          break
          
        default:
          return res.status(400).json({ success: false, message: 'Invalid type' })
      }
      
      console.log('Fetching from ORC:', orcUrl)
      
      // Server-side fetch (no CORS restrictions)
      const response = await fetch(orcUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; racingdash-proxy/1.0)',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        }
      })

      if (!response.ok) {
        throw new Error(`ORC returned ${response.status}: ${response.statusText}`)
      }

      const html = await response.text()
      console.log('Fetched HTML length:', html.length)

      // Parse based on type
      let parsedData = []
      
      if (type === 'series') {
        parsedData = safeParse(parseSeriesResults, html)
      } else if (type === 'index') {
        parsedData = {
          classes: safeParse(parseClasses, html),
          races: safeParse(parseRaces, html)
        }
      } else if (type === 'race') {
        parsedData = safeParse(parseRaceResults, html, classId)
      }

      console.log('Parsed data:', parsedData)

      return res.status(200).json({
        success: true,
        resultType: type,
        results: parsedData,
        meta: {
          eventId,
          classId: classId || null,
          raceId: raceId || null,
          url: orcUrl,
          lastUpdated: new Date().toISOString()
        }
      })
    }

  } catch (error) {
    console.error('ORC proxy error:', error)
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch from ORC',
      error: error.message,
      stack: error.stack
    })
  }
}

// Helper Functions
function cleanup(s) {
  return String(s || '')
    .replace(/<[^>]+>/g, " ")
    .replace(/[\u00A0\u2007\u202F]/g, " ")
    .replace(/█/g, '')
    .replace(/\s+/g, " ")
    .trim()
}

function decodeEntities(s) {
  return String(s || '')
    .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
}

function safeParse(fn, html, ...args) {
  try { 
    return fn(html, ...args) 
  } catch (e) {
    console.error(`Parse error in ${fn.name}:`, e)
    return []
  }
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

async function autoFirstClass(eventId) {
  const indexUrl = `https://data.orc.org/public/WEV.dll?action=index&eventid=${eventId}`
  const response = await fetch(indexUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; racingdash-proxy/1.0)',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
    }
  })
  
  if (!response.ok) return null
  
  const html = await response.text()
  const classes = safeParse(parseClasses, html)
  return classes[0]?.id || null
}

function extractPoints(str) {
  if (!str) return null
  const cleaned = cleanup(str)
  
  if (/^(DNF|DNS|DSQ|DNC|RET|RAF|BFD|UFD|SCP|ZFP)$/i.test(cleaned)) {
    return cleaned.toUpperCase()
  }
  
  const match = cleaned.match(/(\d+(?:\.\d+)?)/)
  return match ? parseFloat(match[1]) : null
}

function parseSeriesResults(html) {
  console.log('Parsing series results...')
  
  const lines = html.split('\n').map(line => line.trim()).filter(line => line)
  
  let rawDataLines = []
  let inTable = false
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    
    if (/^[\|\-\s]+$/.test(line)) continue
    
    if (line.includes('Rank') && line.includes('Yacht Name') && line.includes('Total')) {
      inTable = true
      continue
    }
    
    if (inTable) {
      if (line.includes('[') && line.includes(']') && line.match(/\d{2}\/\d{2}\/\d{4}/)) break
      if (line.includes('|')) {
        rawDataLines.push(line)
      }
    }
  }
  
  if (!rawDataLines.length) {
    console.log('No data lines found')
    return []
  }
  
  // Handle line continuations (like NORTHSTAR's total on separate line)
  const completeRows = []
  let currentRow = null
  
  for (const line of rawDataLines) {
    const cells = line.split('|').map(cell => cleanup(cell))
    
    if (cells.length > 8 && /^\d+$/.test(cells[0])) {
      if (currentRow) completeRows.push(currentRow)
      currentRow = [...cells]
    } else if (currentRow && cells.length > 0) {
      const firstNonEmpty = cells.find(cell => cell && cell.trim())
      if (firstNonEmpty && /^\d+(\.\d+)?$/.test(firstNonEmpty)) {
        currentRow.push(`TOTAL:${firstNonEmpty}`)
      }
    }
  }
  
  if (currentRow) completeRows.push(currentRow)
  
  return completeRows.map(cells => {
    let totalScore = null
    const totalCell = cells.find(cell => cell.startsWith('TOTAL:'))
    if (totalCell) {
      totalScore = extractPoints(totalCell.replace('TOTAL:', ''))
    } else {
      // Look in standard total column or scan for total
      for (let i = 12; i < cells.length; i++) {
        const points = extractPoints(cells[i])
        if (points !== null && typeof points === 'number' && points > 0) {
          totalScore = points
          break
        }
      }
    }
    
    const result = {
      position: cells[0] || '',
      nation: cells[1] || '',
      name: cells[2] || '',
      sailNo: cells[3] || '',
      type: cells[4] || '',
      owner: cells[5] || '',
      club: cells[6] || '',
      class: cells[7] || '',
      total: totalScore || '',
      races: {}
    }
    
    // Extract race results (R1-R4 in columns 8-11)
    const raceColumns = [8, 9, 10, 11]
    raceColumns.forEach((colIndex, raceIndex) => {
      const raceNum = raceIndex + 1
      if (cells[colIndex]) {
        const racePoints = extractPoints(cells[colIndex])
        if (racePoints !== null) {
          result.races[`R${raceNum}`] = racePoints
        }
      }
    })
    
    return result
  })
}

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

function parseRaces(htmlRaw) {
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

function parseRaceResults(html, classId) {
  // Parse individual race results (if needed)
  // Implementation depends on ORC race page format
  return []
}
