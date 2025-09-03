// Test the new ORC parser with actual data
function testORCParser() {
  const sampleORCData = `|
|||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||
---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
Provisional Overall |
|||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||
Rank | Nation | Yacht Name | Sail No | Type | Owner | Club | Class | R1 | R2 | R3 | R4 | Total | |||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||
1 | USA | PROTEUS | USA60722 | IRC 72 | George & Christina Sakellaris | New York YC | M2 | 2.00█ | 1.00█ | 4.00█ | 1.00█ | 8.00 | |||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||
2 | GBR | JOLT | GBR7237 | IRC 72 | Peter Harrison | YC Costa Smeralda | M2 | 1.00█ | 3.00█ | 2.00█ | 2.00█ | 8.00 | |||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||
3 | GBR | NORTHSTAR OF LONDON | GBR72X | IRC 72 | Peter Dubens | YC Costa Smeralda / Royal Thames YC | M2 | 4.00█ | 2.00█ | 1.00█ | 5.00█ RET |
12.00 | |||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||
4 | GBR | JETHOU | GBR74R | IRC 77 | Sir Peter Ogden | Royal Yacht Squadron | M2 | 3.00█ | 4.00█ | 3.00█ | 3.00█ | 13.00 |
[14/09/2024 17:04:13]`;

  // Helper functions (same as in the parser)
  function decodeEntities(s) {
    return String(s || '')
      .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
      .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  }

  function cleanup(s) {
    return decodeEntities(String(s || ''))
      .replace(/<[^>]+>/g, " ")
      .replace(/[\u00A0\u2007\u202F]/g, " ")
      .replace(/█/g, '') // Remove ORC formatting character
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

  // Parse the data
  const text = decodeEntities(sampleORCData)
  const lines = text.split('\n').map(line => line.trim()).filter(line => line)
  
  let headerLine = null
  let dataLines = []
  let inTable = false
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    
    if (/^[\|\-\s]+$/.test(line)) continue
    
    if (line.includes('Rank') && line.includes('Yacht Name') && line.includes('Total')) {
      headerLine = line
      inTable = true
      continue
    }
    
    if (inTable && line.includes('|')) {
      if (line.includes('[') && line.includes(']') && line.match(/\d{2}\/\d{2}\/\d{4}/)) break
      
      const cells = line.split('|').map(cell => cleanup(cell))
      if (cells.length > 8 && /^\d+$/.test(cells[0])) {
        dataLines.push(cells)
      }
    }
  }
  
  console.log('Header:', headerLine?.split('|').map(cell => cleanup(cell)))
  console.log('Found', dataLines.length, 'data rows')
  
  // Test parsing NORTHSTAR specifically
  const results = dataLines.map(cells => {
    const result = {
      position: cells[0] || '',
      nation: cells[1] || '',
      name: cells[2] || '',
      sailNo: cells[3] || '',
      type: cells[4] || '',
      owner: cells[5] || '',
      club: cells[6] || '',
      class: cells[7] || '',
      total: extractPoints(cells[cells.length - 1]) || '',
      races: {}
    }
    
    // Extract race results (R1, R2, R3, R4)
    for (let i = 8; i < cells.length - 1; i++) {
      const raceNum = i - 7
      const racePoints = extractPoints(cells[i])
      if (racePoints !== null) {
        result.races[`R${raceNum}`] = racePoints
      }
    }
    
    return result
  })
  
  // Find NORTHSTAR
  const northstar = results.find(r => r.name.toUpperCase().includes('NORTHSTAR'))
  console.log('\nNORTHSTAR result:', northstar)
  
  return results
}

// Run the test
console.log('Testing ORC Parser...')
const testResults = testORCParser()
console.log('\nAll parsed results:')
testResults.forEach(result => {
  console.log(`${result.position}. ${result.name} (${result.sailNo}) - Total: ${result.total}`)
  console.log(`   Races: ${Object.entries(result.races).map(([race, points]) => `${race}:${points}`).join(', ')}`)
})
