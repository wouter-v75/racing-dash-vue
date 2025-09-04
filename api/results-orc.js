/* ---------- Updated Race Parsing for api/results-orc.js ---------- */
/* This approach: 1) finds raceid from class section, 2) fetches individual race page */

// Helper function to extract race links from a class section
function extractRaceLinksFromClassSection(htmlRaw, wantClass) {
  const html = decodeEntities(htmlRaw);
  console.log(`Extracting race links for class: ${wantClass}`);
  
  // Find the class section boundary
  const anchorRe = new RegExp(`action=series[^"'>]*classid=${escapeRegex(wantClass)}`, 'i');
  const classStart = html.search(anchorRe);
  
  if (classStart < 0) {
    console.log(`No section found for class ${wantClass}`);
    return [];
  }
  
  // Find the end of this class section (next class or end of page)
  const nextClassRe = new RegExp("action=series[^\"'>]*classid=([A-Za-z0-9]+)", "gi");
  nextClassRe.lastIndex = classStart + 1;
  const nextMatch = nextClassRe.exec(html);
  const classEnd = nextMatch ? nextMatch.index : html.length;
  
  const classSection = html.slice(classStart, classEnd);
  console.log(`Class section length: ${classSection.length}`);
  
  // Extract race links from this class section
  const raceLinks = [];
  const raceLinkRe = new RegExp("action=race[^\\s\"'>]*?(?:\\?|&|&amp;)[^\"'>]*raceid=([^\\s\"'>&]+)", "gi");
  
  let match;
  while ((match = raceLinkRe.exec(classSection)) !== null) {
    const raceId = match[1].trim();
    if (raceId && !raceLinks.some(r => r.raceId === raceId)) {
      // Try to determine race number from context
      const raceNumber = raceLinks.length + 1; // Simple increment
      raceLinks.push({
        raceId: raceId,
        raceNumber: raceNumber,
        label: `Race ${raceNumber}`
      });
    }
  }
  
  console.log(`Found ${raceLinks.length} race links:`, raceLinks);
  return raceLinks;
}

// Updated function to get raceid for specific class and race number
async function getRaceIdForClassAndRace(eventId, classId, raceNumber) {
  console.log(`Getting raceid for ${eventId}, class ${classId}, race ${raceNumber}`);
  
  try {
    const indexHtml = await fetchText(indexUrl(eventId));
    const raceLinks = extractRaceLinksFromClassSection(indexHtml, classId);
    
    if (raceNumber && raceNumber > 0) {
      // Get specific race by number
      const targetRace = raceLinks.find(r => r.raceNumber === parseInt(raceNumber));
      return targetRace ? targetRace.raceId : null;
    } else {
      // Get latest race (last in list)
      return raceLinks.length > 0 ? raceLinks[raceLinks.length - 1].raceId : null;
    }
  } catch (error) {
    console.error('Error getting race ID:', error);
    return null;
  }
}

// Simplified race results parser (since each race page is single class)
function parseRaceForClass(htmlRaw) {
  const results = [];
  
  try {
    console.log('Parsing single-class race results...');
    
    // Parse individual race results table
    const tableRowRegex = /<tr[^>]*>.*?<\/tr>/gis;
    const matches = htmlRaw.match(tableRowRegex);
    
    if (!matches) {
      console.log('No table rows found in race results');
      return results;
    }

    for (const row of matches) {
      const cellRegex = /<td[^>]*>(.*?)<\/td>/gis;
      const cells = [];
      let cellMatch;
      
      while ((cellMatch = cellRegex.exec(row)) !== null) {
        const cellText = cellMatch[1].replace(/<[^>]*>/g, '').trim();
        cells.push(cellText);
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
        };

        // Add additional fields if they exist
        if (cells[7] && cells[7] !== '') result.penalty = cells[7];
        if (cells[8] && cells[8] !== '') result.points = cells[8];
        
        results.push(result);
      }
      
      // Handle DNF/DNS entries
      else if (cells.length >= 3 && cells[0] && !isNaN(parseInt(cells[0]))) {
        const hasStatus = cells.some(cell => /^(DNF|DNS|DSQ|DNC|RET)$/i.test(cell));
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
          });
        }
      }
    }
    
    // Calculate delta to first place
    if (results.length > 0 && results[0].correctedTime && results[0].correctedTime !== 'DNF') {
      const firstTime = results[0].correctedTime;
      for (const result of results) {
        if (result.correctedTime && result.correctedTime !== 'DNF') {
          result.deltaToFirst = calculateTimeDelta(firstTime, result.correctedTime);
        } else {
          result.deltaToFirst = '–';
        }
      }
    }
    
    console.log(`Parsed ${results.length} race results`);
    
  } catch (error) {
    console.error('Error parsing race results:', error);
  }
  
  return results;
}

// Helper function to calculate time deltas
function calculateTimeDelta(firstTime, currentTime) {
  if (!firstTime || !currentTime || firstTime === 'DNF' || currentTime === 'DNF') {
    return '–';
  }
  
  const timeToSeconds = (timeStr) => {
    if (!timeStr) return null;
    const parts = timeStr.split(':').map(Number);
    if (parts.length === 3) {
      return parts[0] * 3600 + parts[1] * 60 + parts[2]; // HH:MM:SS
    } else if (parts.length === 2) {
      return parts[0] * 60 + parts[1]; // MM:SS
    }
    return null;
  };
  
  const first = timeToSeconds(firstTime);
  const current = timeToSeconds(currentTime);
  
  if (first === null || current === null) return '–';
  
  const deltaSeconds = Math.max(0, current - first);
  const minutes = Math.floor(deltaSeconds / 60);
  const seconds = deltaSeconds % 60;
  
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

/* ---------- Updated Main Handler Sections ---------- */

// Update your main handler to use this new approach:

// For getting available races for a class
if (type === 'racesForClass') {
  if (!classId) return res.status(400).json({ success:false, message:'Missing classId' })
  const html = await fetchText(indexUrl(eventId))
  const races = extractRaceLinksFromClassSection(html, classId)
  return ok(res, 'races', races, { eventId, classId })
}

// For getting specific race results
if (type === 'race') {
  if (!raceId) return res.status(400).json({ success:false, message:'Missing raceId' })
  
  // If raceId is actually a race number, convert it to actual raceId
  let actualRaceId = raceId;
  if (classId && !isNaN(parseInt(raceId))) {
    // raceId is probably a race number, get the actual raceId
    actualRaceId = await getRaceIdForClassAndRace(eventId, classId, parseInt(raceId));
    if (!actualRaceId) {
      return res.status(404).json({ success:false, message:`No race ${raceId} found for class ${classId}` });
    }
  }
  
  const html = await fetchText(raceUrlRaw(eventId, actualRaceId));
  const rows = safeParse(parseRaceForClass, html);
  return ok(res, 'race', rows, { eventId, classId: classId || null, raceId: actualRaceId, raceNumber: raceId });
}

// For getting race by actual raceId (direct)
if (type === 'raceByRaceId') {
  if (!raceId) return res.status(400).json({ success:false, message:'Missing raceId' })
  const html = await fetchText(raceUrlRaw(eventId, raceId));
  const rows = safeParse(parseRaceForClass, html);
  return ok(res, 'race', rows, { eventId, classId: classId || null, raceId });
}
