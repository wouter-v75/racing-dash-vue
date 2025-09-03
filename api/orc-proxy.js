// api/orc-proxy.js - Vercel serverless function to fetch ORC data (no CORS issues)

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

  if (!eventId) {
    return res.status(400).json({ success: false, message: 'Missing eventId' })
  }

  try {
    let orcUrl
    
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
      parsedData = parseSeriesResults(html)
    } else if (type === 'index') {
      parsedData = {
        classes: parseClasses(html),
        races: parseRaces(html)
      }
    } else if (type === 'race') {
      parsedData = parseRaceResults(html, classId)
    }

    console.log('Parsed data:', parsedData)

    return res.status(200).json({
      success: true,
      type,
      data: parsedData,
      meta: {
        eventId,
        classId: classId || null,
        raceId: raceId || null,
        url: orcUrl,
        lastUpdated: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('ORC proxy error:', error)
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch from ORC',
      error: error.message
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

function parseClasses(html) {
  const classes = []
  const regex = /action=series[^"'>]*classid=([^"'&>\s]+)/gi
  let match
  
  while ((match = regex.exec(html)) !== null) {
    const classId = match[1].trim()
    if (classId && !classes.includes(classId)) {
      classes.push(classId)
    }
  }
  
  return classes.sort()
}

function parseRaces(html) {
  const races = []
  const regex = /action=race[^"'>]*raceid=([^"'&>\s]+)/gi
  let match
  
  while ((match = regex.exec(html)) !== null) {
    const raceId = match[1].trim()
    if (raceId && !races.includes(raceId)) {
      races.push(raceId)
    }
  }
  
  // Sort races numerically if possible
  return races.sort((a, b) => {
    const numA = parseInt(a, 10)
    const numB = parseInt(b, 10)
    if (!isNaN(numA) && !isNaN(numB)) return numA - numB
    return a.localeCompare(b)
  })
}

function parseRaceResults(html, classId) {
  // Parse individual race results (if needed)
  // Implementation depends on ORC race page format
  return []
}
