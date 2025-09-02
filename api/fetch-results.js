// api/fetch-results.js
export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  const { eventId, classId, raceId } = req.body;

  if (!eventId) {
    return res.status(400).json({ success: false, message: 'Missing eventId' });
  }

  try {
    let orcUrl;
    if (raceId) {
      // Individual race results with corrected times
      orcUrl = `https://data.orc.org/public/WEV.dll?action=race&eventid=${eventId}&raceid=${raceId}`;
    } else {
      // Overall series standings
      orcUrl = `https://data.orc.org/public/WEV.dll?action=series&eventid=${eventId}&classid=${classId}`;
    }
    
    console.log('Fetching from:', orcUrl);
    
    const response = await fetch(orcUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'no-cache'
      },
      timeout: 10000 // 10 second timeout
    });

    if (!response.ok) {
      throw new Error(`ORC API returned ${response.status}: ${response.statusText}`);
    }

    const html = await response.text();
    
    if (!html || html.trim().length === 0) {
      throw new Error('Empty response from ORC API');
    }
    
    // Parse the HTML based on result type
    const results = raceId ? parseRaceResults(html) : parseOverallResults(html);
    
    console.log(`Parsed ${results.length} results from ${orcUrl}`);
    
    return res.status(200).json({
      success: true,
      results: results,
      resultType: raceId ? 'race' : 'overall',
      lastUpdated: new Date().toISOString(),
      metadata: {
        eventId,
        classId,
        raceId,
        sourceUrl: orcUrl
      }
    });

  } catch (error) {
    console.error('Error fetching ORC results:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch results from ORC',
      error: error.message,
      eventId,
      classId,
      raceId
    });
  }
}

function parseOverallResults(html) {
  const results = [];
  
  try {
    // More robust table finding - look for tables with position/points data
    const tableRegex = /<table[^>]*>[\s\S]*?<\/table>/gi;
    const tables = html.match(tableRegex) || [];
    
    let targetTable = null;
    
    // Find the table that looks like results (has position and points/total columns)
    for (const table of tables) {
      const headerRow = table.match(/<tr[^>]*>[\s\S]*?<\/tr>/i);
      if (headerRow) {
        const headerText = headerRow[0].toLowerCase();
        const hasPosition = /pos|position|#/.test(headerText);
        const hasPoints = /points|pts|total|score/.test(headerText);
        const hasBoat = /boat|yacht|name/.test(headerText);
        
        if (hasPosition && hasPoints && hasBoat) {
          targetTable = table;
          break;
        }
      }
    }
    
    if (!targetTable) {
      console.log('No suitable results table found in overall results');
      return results;
    }

    // Parse rows from the target table
    const tableRowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
    const matches = targetTable.match(tableRowRegex) || [];
    
    let isFirstRow = true;
    let headerIndices = {};
    
    for (const row of matches) {
      const cellRegex = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi;
      const cells = [];
      let cellMatch;
      
      while ((cellMatch = cellRegex.exec(row)) !== null) {
        const cellText = cellMatch[1]
          .replace(/<[^>]*>/g, '') // Remove HTML tags
          .replace(/&nbsp;/g, ' ') // Replace &nbsp;
          .replace(/&amp;/g, '&') // Decode entities
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'")
          .replace(/\s+/g, ' ') // Normalize whitespace
          .trim();
        cells.push(cellText);
      }
      
      if (cells.length === 0) continue;
      
      // First row with data - treat as headers
      if (isFirstRow && cells.some(cell => /pos|position|boat|yacht|points|total/i.test(cell))) {
        isFirstRow = false;
        // Map header indices
        cells.forEach((header, index) => {
          const h = header.toLowerCase();
          if (/^(pos|position|#)$/.test(h)) headerIndices.position = index;
          else if (/boat|yacht|name/.test(h)) headerIndices.name = index;
          else if (/sail|sail\s*no|nr|no/.test(h)) headerIndices.sailNo = index;
          else if (/owner|skipper|helm/.test(h)) headerIndices.skipper = index;
          else if (/club|team/.test(h)) headerIndices.club = index;
          else if (/^(points|pts|score)$/.test(h)) headerIndices.points = index;
          else if (/total|net|overall/.test(h)) headerIndices.total = index;
        });
        continue;
      }
      
      // Skip if first cell is not a number (header row or empty)
      if (!cells[0] || isNaN(parseInt(cells[0]))) continue;
      
      // Build result object using header indices with fallbacks
      const result = {
        position: getCell(cells, headerIndices.position, 0),
        name: getCell(cells, headerIndices.name, 1) || 'Unknown',
        sailNo: getCell(cells, headerIndices.sailNo, 2),
        club: getCell(cells, headerIndices.club, 3),
        skipper: getCell(cells, headerIndices.skipper, 4),
        points: getCell(cells, headerIndices.points, 5) || '0',
        total: getCell(cells, headerIndices.total, 6) || getCell(cells, headerIndices.points, 5) || '0'
      };
      
      // Only add if we have essential data
      if (result.position && result.name !== 'Unknown') {
        results.push(result);
      }
    }
    
  } catch (error) {
    console.error('Error parsing overall results:', error);
  }
  
  return results;
}

function parseRaceResults(html) {
  const results = [];
  
  try {
    // Find tables that look like race results
    const tableRegex = /<table[^>]*>[\s\S]*?<\/table>/gi;
    const tables = html.match(tableRegex) || [];
    
    let targetTable = null;
    
    // Find table with race result columns
    for (const table of tables) {
      const headerRow = table.match(/<tr[^>]*>[\s\S]*?<\/tr>/i);
      if (headerRow) {
        const headerText = headerRow[0].toLowerCase();
        const hasPosition = /pos|position|#/.test(headerText);
        const hasTime = /finish|elapsed|corrected/.test(headerText);
        const hasBoat = /boat|yacht|name/.test(headerText);
        
        if (hasPosition && hasTime && hasBoat) {
          targetTable = table;
          break;
        }
      }
    }
    
    if (!targetTable) {
      console.log('No suitable race results table found');
      return results;
    }

    const tableRowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
    const matches = targetTable.match(tableRowRegex) || [];
    
    let isFirstRow = true;
    let headerIndices = {};
    
    for (const row of matches) {
      const cellRegex = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi;
      const cells = [];
      let cellMatch;
      
      while ((cellMatch = cellRegex.exec(row)) !== null) {
        const cellText = cellMatch[1]
          .replace(/<[^>]*>/g, '')
          .replace(/&nbsp;/g, ' ')
          .replace(/&amp;/g, '&')
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'")
          .replace(/\s+/g, ' ')
          .trim();
        cells.push(cellText);
      }
      
      if (cells.length === 0) continue;
      
      // First row with relevant headers
      if (isFirstRow && cells.some(cell => /pos|position|boat|yacht|finish|elapsed|corrected/i.test(cell))) {
        isFirstRow = false;
        // Map header indices
        cells.forEach((header, index) => {
          const h = header.toLowerCase();
          if (/^(pos|position|#)$/.test(h)) headerIndices.position = index;
          else if (/boat|yacht|name/.test(h)) headerIndices.name = index;
          else if (/sail|sail\s*no|nr|no/.test(h)) headerIndices.sailNo = index;
          else if (/owner|skipper|helm/.test(h)) headerIndices.skipper = index;
          else if (/finish/.test(h) && !/elapsed/.test(h)) headerIndices.finishTime = index;
          else if (/elapsed/.test(h)) headerIndices.elapsed = index;
          else if (/corrected/.test(h)) headerIndices.correctedTime = index;
          else if (/penalty/.test(h)) headerIndices.penalty = index;
          else if (/^(points|pts|score)$/.test(h)) headerIndices.points = index;
        });
        continue;
      }
      
      // Skip if first cell is not a number or DNF entry
      const firstCell = cells[0];
      const isDnfEntry = /^(DNF|DNS|DSQ|DNC|RET)$/i.test(firstCell);
      const isNumericPosition = !isNaN(parseInt(firstCell));
      
      if (!isNumericPosition && !isDnfEntry) continue;
      
      // Handle DNF entries specially
      if (isDnfEntry || cells.some(cell => /^(DNF|DNS|DSQ|DNC|RET)$/i.test(cell))) {
        const dnfType = cells.find(cell => /^(DNF|DNS|DSQ|DNC|RET)$/i.test(cell)) || 'DNF';
        results.push({
          position: getCell(cells, headerIndices.position, 0) || cells[0],
          name: getCell(cells, headerIndices.name, 1) || 'Unknown',
          sailNo: getCell(cells, headerIndices.sailNo, 2),
          skipper: getCell(cells, headerIndices.skipper, 3),
          finishTime: dnfType,
          elapsed: dnfType,
          correctedTime: dnfType,
          penalty: '0',
          points: getCell(cells, headerIndices.points, cells.length - 1) || '6.00'
        });
      } else {
        // Normal race result
        const result = {
          position: getCell(cells, headerIndices.position, 0),
          name: getCell(cells, headerIndices.name, 1) || 'Unknown',
          sailNo: getCell(cells, headerIndices.sailNo, 2),
          skipper: getCell(cells, headerIndices.skipper, 3),
          finishTime: getCell(cells, headerIndices.finishTime, 4),
          elapsed: getCell(cells, headerIndices.elapsed, 5),
          correctedTime: getCell(cells, headerIndices.correctedTime, 6),
          penalty: getCell(cells, headerIndices.penalty, 7) || '0',
          points: getCell(cells, headerIndices.points, 8) || '0'
        };
        
        // Add deltaToFirst calculation if we have corrected times
        if (result.correctedTime && !isNaN(toSec(result.correctedTime))) {
          const firstCorrectedTime = results.find(r => r.position === '1')?.correctedTime;
          if (firstCorrectedTime && firstCorrectedTime !== result.correctedTime) {
            result.deltaToFirst = mmssDelta(firstCorrectedTime, result.correctedTime);
          } else if (results.length === 0) {
            result.deltaToFirst = '00:00'; // First boat
          }
        }
        
        results.push(result);
      }
    }
    
    // Post-process to calculate deltaToFirst for all results
    if (results.length > 0) {
      const firstCorrectedTime = results[0]?.correctedTime;
      if (firstCorrectedTime && firstCorrectedTime !== 'DNF') {
        results.forEach(result => {
          if (result.correctedTime && result.correctedTime !== 'DNF' && !result.deltaToFirst) {
            result.deltaToFirst = mmssDelta(firstCorrectedTime, result.correctedTime);
          }
        });
      }
    }
    
  } catch (error) {
    console.error('Error parsing race results:', error);
  }
  
  return results;
}

// Helper function to safely get cell value
function getCell(cells, index, fallbackIndex) {
  if (index >= 0 && index < cells.length && cells[index]) {
    return cells[index];
  }
  if (fallbackIndex >= 0 && fallbackIndex < cells.length) {
    return cells[fallbackIndex];
  }
  return '';
}

// Time conversion utilities
function toSec(str) {
  if (!str) return null;
  if (/^(DNF|DNS|DSQ|DNC|RET)$/i.test(str)) return null;
  
  // Handle different time formats: HH:MM:SS or MM:SS
  const parts = str.split(':').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n));
  
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  } else if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  } else if (parts.length === 1) {
    return parts[0]; // Just seconds
  }
  
  return null;
}

function mmssDelta(a, b) {
  const s1 = toSec(a);
  const s2 = toSec(b);
  
  if (s1 == null || s2 == null) return '–';
  
  const delta = Math.abs(s2 - s1);
  const minutes = Math.floor(delta / 60);
  const seconds = delta % 60;
  
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

// Enhanced HTML entity decoding
function decodeHtmlEntities(str) {
  const entities = {
    '&amp;': '&',
    '&quot;': '"',
    '&#39;': "'",
    '&lt;': '<',
    '&gt;': '>',
    '&nbsp;': ' ',
    '&#x27;': "'",
    '&#x2F;': '/',
    '&#x60;': '`',
    '&#x3D;': '='
  };
  
  return str.replace(/&[^;]+;/g, (entity) => entities[entity] || entity);
}

// Improved cell cleaning
function cleanCellText(cellHtml) {
  return decodeHtmlEntities(cellHtml)
    .replace(/<[^>]*>/g, '') // Remove all HTML tags
    .replace(/\u00A0/g, ' ') // Replace non-breaking spaces
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
}

// Alternative parsing approach using more robust table detection
function findResultsTable(html, type = 'overall') {
  const tables = html.match(/<table[^>]*>[\s\S]*?<\/table>/gi) || [];
  
  for (let i = 0; i < tables.length; i++) {
    const table = tables[i];
    const rows = table.match(/<tr[^>]*>[\s\S]*?<\/tr>/gi) || [];
    
    if (rows.length < 2) continue; // Need at least header + one data row
    
    // Check if this looks like a results table
    const firstRow = rows[0].toLowerCase();
    const hasPosition = /pos|position|#/.test(firstRow);
    const hasBoat = /boat|yacht|name/.test(firstRow);
    
    if (type === 'overall') {
      const hasPoints = /points|pts|total|score/.test(firstRow);
      if (hasPosition && hasBoat && hasPoints) {
        return table;
      }
    } else if (type === 'race') {
      const hasTime = /finish|elapsed|corrected/.test(firstRow);
      if (hasPosition && hasBoat && hasTime) {
        return table;
      }
    }
  }
  
  return null;
}

// Validation functions
function validateResultsData(results, type) {
  const validated = results.filter(result => {
    // Must have position and name
    if (!result.position || !result.name || result.name === 'Unknown') {
      return false;
    }
    
    // Position should be numeric or DNF-type
    if (!(/^\d+$/.test(result.position) || /^(DNF|DNS|DSQ|DNC|RET)$/i.test(result.position))) {
      return false;
    }
    
    return true;
  });
  
  console.log(`Validated ${validated.length}/${results.length} ${type} results`);
  return validated;
}
