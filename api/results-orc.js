// ADD these sections to your existing working api/results-orc.js

/* ---------- Add this URL function after your existing URLs ---------- */
const raceUrl = (eventId, raceId) => `https://data.orc.org/public/WEV.dll?action=race&eventid=${encodeURIComponent(eventId)}&raceid=${encodeURIComponent(raceId)}`

/* ---------- Add this race parser after your parseSimpleOverall function ---------- */
function parseSimpleRace(html, debug = false) {
  const results = []
  
  try {
    // Find all data rows - same pattern as series
    const tableRowRegex = /<tr\s+class="data"[^>]*>.*?<\/tr>/gis
    const matches = html.match(tableRowRegex)
    
    if (!matches) {
      console.log('No data rows found in race results')
      return results
    }

    for (let i = 0; i < matches.length; i++) {
      const row = matches[i]
      const cellRegex = /<td[^>]*>(.*?)<\/td>/gis
      const cells = []
      let cellMatch
      
      while ((cellMatch = cellRegex.exec(row)) !== null) {
        // Clean the cell content - same as series
        const cellText = cellMatch[1]
          .replace(/<[^>]*>/g, '')  // Remove HTML tags
          .replace(/&amp;/g, '&')  // Decode HTML entities
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'")
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/\s+/g, ' ')    // Normalize whitespace
          .trim()
        cells.push(cellText)
      }
      
      // Parse race results based on your example:
      // Overall Pos | Nation | Yacht Name | Sail No | Type | Owner | Finish Time | Elapsed | Corrected | Delta | TCC
      if (cells.length >= 6) {
        const position = cells[0] || ''
        
        // Only process if position is numeric
        if (position && !isNaN(parseInt(position, 10))) {
          const result = {
            position: position,
            nation: cells[1] || '',        // Column 1: Nation flag
            name: cells[2] || '',          // Column 2: Yacht Name
            sailNo: cells[3] || '',        // Column 3: Sail No
            type: cells[4] || '',          // Column 4: Type (IRC 72, etc.)
            owner: cells[5] || '',         // Column 5: Owner
            finishTime: cells[6] || '',    // Column 6: Finish Time
            elapsed: cells[7] || '',       // Column 7: Elapsed
            correctedTime: cells[8] || '', // Column 8: Corrected
            delta: cells[9] || '',         // Column 9: Delta
            tcc: cells[10] || ''           // Column 10: TCC
          }
          
          // Add debug info if requested
          if (debug) {
            result.debug_allCells = cells
            result.debug_cellCount = cells.length
          }
          
          results.push(result)
        }
      }
    }
    
  } catch (error) {
    console.error('Error in parseSimpleRace:', error)
  }
  
  return results
}

/* ---------- Add this handler section to your existing handler (before the final return) ---------- */

// Add this BEFORE the line: return res.status(400).json({ success: false, message: 'Unknown type' })

if (type === 'race') {
  if (!raceId) return res.status(400).json({ success: false, message: 'Missing raceId' })
  
  const html = await fetchText(raceUrl(eventId, raceId))
  const rows = safeParse(parseSimpleRace, html)
  return ok(res, 'race', rows, { eventId, raceId })
}

// Debug version for race parsing
if (type === 'debug-race') {
  if (!raceId) return res.status(400).json({ success: false, message: 'Missing raceId for debug-race' })
  
  try {
    const html = await fetchText(raceUrl(eventId, raceId))
    
    // Simple debug info
    const debug = {
      htmlLength: html.length,
      containsNorthstar: html.includes('NORTHSTAR'),
      hasDataClass: html.includes('class="data"'),
      dataClassCount: (html.match(/class="data"/gi) || []).length
    }

    // Parse with debug enabled
    const results = parseSimpleRace(html, true)
    debug.parsedCount = results.length
    debug.results = results
    
    // Find NORTHSTAR safely
    const northstar = results.find(r => 
      (r.name || '').toUpperCase().includes('NORTHSTAR')
    )
    debug.northstarFound = !!northstar
    if (northstar) debug.northstarData = northstar

    return res.status(200).json({
      success: true,
      resultType: 'debug-race', 
      debug,
      meta: { eventId, raceId }
    })
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message
    })
  }
}
