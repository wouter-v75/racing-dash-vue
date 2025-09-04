/* ---------- Updated Race Parsing Functions for api/results-orc.js ---------- */
/* Replace the existing race parsing functions with these updated versions */

function parseRaceForClass(htmlRaw) {
  // Use the same successful parsing method as series results
  const results = [];
  
  try {
    // Parse individual race results table with corrected times
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
        // Standard race results format: Pos, Name, Sail No, Skipper, Finish Time, Elapsed, Corrected, etc.
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
        if (cells[7]) result.penalty = cells[7];
        if (cells[8]) result.points = cells[8];
        
        results.push(result);
      }
      
      // Handle DNF/DNS entries which might have fewer columns
      else if (cells.length >= 3 && cells[0] && !isNaN(parseInt(cells[0]))) {
        // Check if any cell contains DNF, DNS, DSQ, etc.
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
            points: cells[cells.length - 1] || '6.00' // Points usually in last column
          });
        }
      }
    }
    
    // Calculate delta to first if we have corrected times
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
    
  } catch (error) {
    console.error('Error parsing race results:', error);
  }
  
  return results;
}

function parseRaceChooseClass(htmlRaw, wantClass) {
  // Use the same successful parsing method, but handle multiple class sections
  console.log(`Parsing race for class: ${wantClass || 'any'}`);
  
  if (!wantClass) {
    // No class preference → parse the entire page
    return parseRaceForClass(htmlRaw);
  }
  
  const html = decodeEntities(htmlRaw);
  
  // Find the section for the desired class
  const anchorRe = new RegExp(`action=series[^"'>]*classid=${escapeRegex(wantClass)}`, 'i');
  const classPos = html.search(anchorRe);
  
  if (classPos < 0) {
    console.log(`No section found for class ${wantClass}, parsing entire page`);
    return parseRaceForClass(htmlRaw);
  }
  
  // Find the next class section to determine the boundary
  const nextClassRe = new RegExp("action=series[^\"'>]*classid=([A-Za-z0-9]+)", "gi");
  nextClassRe.lastIndex = classPos + 1;
  const nextMatch = nextClassRe.exec(html);
  
  const endPos = nextMatch ? nextMatch.index : html.length;
  const classSection = html.slice(classPos, endPos);
  
  console.log(`Found class section for ${wantClass}, length: ${classSection.length}`);
  
  // Parse the class section using the working method
  return parseRaceForClass(classSection);
}

// Helper function to calculate time deltas (improved version)
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

/* ---------- Update the main handler to use new parsing ---------- */

// In your main handler function, update these sections:

// RACE for a class (URL contains classId)
if (type === 'race') {
  if (!raceId) return res.status(400).json({ success:false, message:'Missing raceId' })
  const cls = classId || (await autoFirstClass(eventId))
  if (!cls) return ok(res, 'race', [], { eventId, classId: null, raceId })
  const html = await fetchText(raceUrl(eventId, cls, raceId))
  const rows = safeParse(parseRaceForClass, html)  // Using updated parsing method
  return ok(res, 'race', rows, { eventId, classId: cls, raceId })
}

// RACE page without class in URL
if (type === 'raceRaw') {
  if (!raceId) return res.status(400).json({ success:false, message:'Missing raceId' })
  const html = await fetchText(raceUrlRaw(eventId, raceId))
  const rows = safeParse(h => parseRaceChooseClass(h, classId || ''), html)  // Using updated parsing method
  return ok(res, 'race', rows, { eventId, classId: classId || null, raceId })
}
