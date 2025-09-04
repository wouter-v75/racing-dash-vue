// Enhanced functions to ADD to your existing working api/results-orc.js

/* ---------- Enhanced Race Parsing Functions ---------- */

// Replace the existing parseRacesForClass function with this improved version
function parseRacesForClass(htmlRaw, wantClass) {
  const html = decodeEntities(htmlRaw)
  console.log(`Extracting race links for class: ${wantClass}`)
  
  // Find the segment for this class: from its series link up to the next class/link block
  const anchorRe = new RegExp(`action=series[^"'>]*classid=${escapeRegex(wantClass)}`, 'i')
  const start = html.search(anchorRe)
  if (start < 0) {
    console.log(`No section found for class ${wantClass}`)
    return []
  }
  
  // end boundary: next "action=series&...classid=" occurrence
  const nextRe = new RegExp("action=series[^\"'>]*classid=([A-Za-z0-9]+)", "gi")
  nextRe.lastIndex = start + 1
  let end = html.length, m
  while ((m = nextRe.exec(html)) !== null) {
    const idx = m.index
    if (idx > start) { end = idx; break }
  }
  const slice = html.slice(start, end)
  console.log(`Class section length: ${slice.length}`)
  
  // Collect race links ONLY in this slice - enhanced to capture race numbers
  const raceRe = new RegExp("action=race[^\\s\"'>]*?(?:\\?|&|&amp;)[^\"'>]*raceid=([^\\s\"'>&]+)", "gi")
  const out = []
  let raceMatch
  let raceCounter = 1
  
  while ((raceMatch = raceRe.exec(slice)) !== null) {
    const raceId = raceMatch[1].trim()
    if (raceId && !out.some(x => x.id === raceId)) {
      out.push({ 
        id: raceId, 
        label: `RACE ${raceCounter}`,
        raceNumber: raceCounter
      })
      raceCounter++
    }
  }
  
  console.log(`Found ${out.length} races for class ${wantClass}:`, out)
  return out.sort((a,b) => String(a.id).localeCompare(String(b.id), undefined, { numeric:true, sensitivity:'base' }))
}

// Replace the existing parseRaceForClass function with this working version
function parseRaceForClass(htmlRaw) {
  console.log('Parsing single-class race results using proven method...')
  const results = []
  
  try {
    // Use the same successful parsing method as series results
    const tableRowRegex = /<tr[^>]*>.*?<\/tr>/gis
    const matches = htmlRaw.match(tableRowRegex)
    
    if (!matches) {
      console.log('No table rows found in race results')
      return results
    }

    for (const row of matches) {
      const cellRegex = /<td[^>]*>(.*?)<\/td>/gis
      const cells = []
      let cellMatch
      
      while ((cellMatch = cellRegex.exec(row)) !== null) {
        const cellText = cellMatch[1].replace(/<[^>]*>/g, '').trim()
        cells.push(cellText)
      }
      
      // Skip header rows and empty rows
      if (cells.length >= 4 && cells[0] && !isNaN(parseInt(cells[0]))) {
        // Standard race results: Pos, Name, Sail No, Skipper, Finish Time, Elapsed, Corrected, etc.
        const result = {
          position: cells[0],
          name: cells[1] || 'Unknown',
          sailNo: cells[2] || '',
          skipper: cells[3] || '',
          finishTime: cells[4] || '',
          elapsed: cells[5] || '',
          correctedTime: cells[6] || ''
        }

        // Add additional fields if they exist
        if (cells[7] && cells[7] !== '') result.penalty = cells[7]
        if (cells[8] && cells[8] !== '') result.points = cells[8]
        
        results.push(result)
      }
      
      // Handle DNF/DNS entries
      else if (cells.length >= 3 && cells[0] && !isNaN(parseInt(cells[0]))) {
        const hasStatus = cells.some(cell => /^(DNF|DNS|DSQ|DNC|RET)$/i.test(cell))
        if (hasStatus) {
          results.push({
            position: cells[0],
            name: cells[1] || 'Unknown',
            sailNo: cells[2] || '',
            skipper: cells[3] || '',
            finishTime: 'DNF',
            elapsed: 'DNF', 
            correctedTime: 'DNF',
            penalty: '0',
            points: cells[cells.length - 1] || '6.00'
          })
        }
      }
    }
    
    // Calculate delta to first place
    if (results.length > 0 && results[0].correctedTime && results[0].correctedTime !== 'DNF') {
      const firstTime = results[0].correctedTime
      for (const result of results) {
        if (result.correctedTime && result.correctedTime !== 'DNF') {
          result.deltaToFirst = mmssDelta(firstTime, result.correctedTime)
        } else {
          result.deltaToFirst = '–'
        }
      }
    }
    
    console.log(`Parsed ${results.length} race results`)
    
  } catch (error) {
    console.error('Error parsing race results:', error)
  }
  
  return results
}

// Helper function to find raceId by race number for a class
async function findRaceIdByNumber(eventId, classId, raceNumber) {
  try {
    const html = await fetchText(indexUrl(eventId))
    const races = parseRacesForClass(html, classId)
    const targetRace = races.find(r => r.raceNumber === parseInt(raceNumber))
    return targetRace ? targetRace.id : null
  } catch (error) {
    console.error('Error finding race ID:', error)
    return null
  }
}

/* ---------- Updated Handler Sections ---------- */

// ADD these new handler sections to your existing switch/if statements in the main handler:

// Enhanced racesForClass with race numbers
if (type === 'racesForClass') {
  if (!classId) return res.status(400).json({ success:false, message:'Missing classId' })
  const html = await fetchText(indexUrl(eventId))
  const races = safeParse(h => parseRacesForClass(h, classId), html)  // Enhanced version
  return ok(res, 'races', races, { eventId, classId })
}

// NEW: Get race by race number (finds the actual raceId)
if (type === 'raceByNumber') {
  if (!raceId) return res.status(400).json({ success:false, message:'Missing raceId (race number)' })
  if (!classId) return res.status(400).json({ success:false, message:'Missing classId' })
  
  const actualRaceId = await findRaceIdByNumber(eventId, classId, raceId)
  if (!actualRaceId) {
    return res.status(404).json({ 
      success:false, 
      message:`No race ${raceId} found for class ${classId}` 
    })
  }
  
  const html = await fetchText(raceUrlRaw(eventId, actualRaceId))
  const rows = safeParse(parseRaceForClass, html)
  return ok(res, 'race', rows, { 
    eventId, 
    classId, 
    raceId: actualRaceId, 
    raceNumber: raceId 
  })
}

// UPDATED: Enhanced raceRaw handler
if (type === 'raceRaw') {
  if (!raceId) return res.status(400).json({ success:false, message:'Missing raceId' })
  const html = await fetchText(raceUrlRaw(eventId, raceId))
  const rows = safeParse(parseRaceForClass, html)  // Using enhanced parsing
  return ok(res, 'race', rows, { eventId, classId: classId || null, raceId })
}
