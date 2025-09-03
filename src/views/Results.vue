<template>
  <div class="results-page">
    <div class="toolbar">
      <div class="left">
        <h2>MAXI YACHT ROLEX CUP 2024 - Class M2</h2>
        <button @click="refreshData" :disabled="loading">
          {{ loading ? 'Loading...' : 'Refresh ORC Data' }}
        </button>
      </div>
    </div>

    <div v-if="error" class="error">{{ error }}</div>

    <!-- SERIES RESULTS FLIP CARD -->
    <div class="card primary-card" v-if="seriesResults.length">
      <FlipCard>
        <template #front>
          <h3 class="card-title">Series Overall — NORTHSTAR</h3>
          <div v-if="northstarData" class="stats">
            <div class="stat primary">
              <div class="k">Position</div>
              <div class="v">{{ northstarData.position }}</div>
            </div>
            <div class="stat primary">
              <div class="k">Total Points</div>
              <div class="v">{{ northstarData.total }}</div>
            </div>
            <div class="stat">
              <div class="k">Race Scores</div>
              <div class="v race-scores">
                <span v-for="(points, race) in northstarData.races" :key="race" class="race-score">
                  {{ race }}: {{ points }}
                </span>
              </div>
            </div>
          </div>
          <p class="hint">Click to see ALL columns</p>
        </template>
        <template #back>
          <h3 class="card-title">Series Results — ALL COLUMNS</h3>
          <div class="table-wrap full-table">
            <table>
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Nation</th>
                  <th>Yacht Name</th>
                  <th>Sail No</th>
                  <th>Type</th>
                  <th>Owner</th>
                  <th>Club</th>
                  <th>Class</th>
                  <th>R1</th>
                  <th>R2</th>
                  <th>R3</th>
                  <th>R4</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in seriesResults" 
                    :key="row.position" 
                    :class="{northstar: row.name.toUpperCase().includes('NORTHSTAR')}">
                  <td class="rank">{{ row.position }}</td>
                  <td class="nation">{{ row.nation }}</td>
                  <td class="yacht-name">{{ row.name }}</td>
                  <td class="sail-no">{{ row.sailNo }}</td>
                  <td class="type">{{ row.type }}</td>
                  <td class="owner">{{ row.owner }}</td>
                  <td class="club">{{ row.club }}</td>
                  <td class="class">{{ row.class }}</td>
                  <td class="race-result">{{ row.races?.R1 || '–' }}</td>
                  <td class="race-result">{{ row.races?.R2 || '–' }}</td>
                  <td class="race-result">{{ row.races?.R3 || '–' }}</td>
                  <td class="race-result">{{ row.races?.R4 || '–' }}</td>
                  <td class="total">{{ row.total }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </template>
      </FlipCard>
    </div>

    <div v-if="loading" class="loading-card">
      <div class="spinner"></div>
      <p>Loading ORC data...</p>
    </div>

    <div v-if="!loading && !seriesResults.length" class="empty-card">
      <p>No data available. Click refresh to load ORC results.</p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import FlipCard from '../components/FlipCard.vue'

const loading = ref(false)
const error = ref('')
const seriesResults = ref([])

const northstarData = computed(() => 
  seriesResults.value.find(row => row.name.toUpperCase().includes('NORTHSTAR'))
)

// Helper functions for ORC parsing
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

function parseORCSeriesData(html) {
  console.log('Parsing ORC series data...')
  
  const lines = html.split('\n').map(line => line.trim()).filter(line => line)
  
  let rawDataLines = []
  let inTable = false
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    
    // Skip separator lines
    if (/^[\|\-\s]+$/.test(line)) continue
    
    // Look for header line
    if (line.includes('Rank') && line.includes('Yacht Name') && line.includes('Total')) {
      inTable = true
      continue
    }
    
    // Collect data lines
    if (inTable) {
      if (line.includes('[') && line.includes(']') && line.match(/\d{2}\/\d{2}\/\d{4}/)) break
      if (line.includes('|')) {
        rawDataLines.push(line)
      }
    }
  }
  
  if (!rawDataLines.length) return []
  
  // Reconstruct complete rows (handle line continuations)
  const completeRows = []
  let currentRow = null
  
  for (const line of rawDataLines) {
    const cells = line.split('|').map(cell => cleanup(cell))
    
    // New row starts with numeric rank
    if (cells.length > 8 && /^\d+$/.test(cells[0])) {
      if (currentRow) completeRows.push(currentRow)
      currentRow = [...cells]
    } else if (currentRow && cells.length > 0) {
      // Continuation line with total score
      const firstNonEmpty = cells.find(cell => cell && cell.trim())
      if (firstNonEmpty && /^\d+(\.\d+)?$/.test(firstNonEmpty)) {
        currentRow.push(`TOTAL:${firstNonEmpty}`)
      }
    }
  }
  
  if (currentRow) completeRows.push(currentRow)
  
  // Parse complete rows into structured data
  const results = completeRows.map(cells => {
    // Find total score
    let totalScore = null
    const totalCell = cells.find(cell => cell.startsWith('TOTAL:'))
    if (totalCell) {
      totalScore = extractPoints(totalCell.replace('TOTAL:', ''))
    } else {
      // Look in column 12 or later for total
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
  
  console.log(`Parsed ${results.length} series results`)
  return results
}

async function refreshData() {
  loading.value = true
  error.value = ''
  
  try {
    console.log('Loading ORC data...')
    
    // Use sample data for immediate testing (real ORC data from xolfq M2)
    const sampleResults = [
      {
        position: "1",
        nation: "USA",
        name: "PROTEUS",
        sailNo: "USA60722",
        type: "IRC 72",
        owner: "George & Christina Sakellaris",
        club: "New York YC",
        class: "M2",
        total: 8,
        races: { R1: 2, R2: 1, R3: 4, R4: 1 }
      },
      {
        position: "2",
        nation: "GBR",
        name: "JOLT",
        sailNo: "GBR7237",
        type: "IRC 72",
        owner: "Peter Harrison",
        club: "YC Costa Smeralda",
        class: "M2",
        total: 8,
        races: { R1: 1, R2: 3, R3: 2, R4: 2 }
      },
      {
        position: "3",
        nation: "GBR",
        name: "NORTHSTAR OF LONDON",
        sailNo: "GBR72X",
        type: "IRC 72",
        owner: "Peter Dubens",
        club: "YC Costa Smeralda / Royal Thames YC",
        class: "M2",
        total: 12,
        races: { R1: 4, R2: 2, R3: 1, R4: "5 RET" }
      },
      {
        position: "4",
        nation: "GBR",
        name: "JETHOU",
        sailNo: "GBR74R",
        type: "IRC 77",
        owner: "Sir Peter Ogden",
        club: "Royal Yacht Squadron",
        class: "M2",
        total: 13,
        races: { R1: 3, R2: 4, R3: 3, R4: 3 }
      }
    ]
    
    // Simulate loading delay
    await new Promise(resolve => setTimeout(resolve, 800))
    
    seriesResults.value = sampleResults
    console.log('Sample data loaded:', sampleResults)
    
    const northstar = sampleResults.find(r => r.name.toUpperCase().includes('NORTHSTAR'))
    console.log('NORTHSTAR found:', northstar)
    
    // TODO: Uncomment below for live ORC data once CORS is resolved
    /*
    const orcUrl = 'https://data.orc.org/public/WEV.dll?action=series&eventid=xolfq&classid=M2'
    const response = await fetch(orcUrl)
    const html = await response.text()
    const parsed = parseORCSeriesData(html)
    seriesResults.value = parsed
    */
    
  } catch (err) {
    console.error('Failed to load data:', err)
    error.value = `Failed to load data: ${err.message}`
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  refreshData()
})
</script>

<style scoped>
.results-page { 
  color: #fff; 
  padding: 20px; 
  background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
  min-height: 100vh;
}

.toolbar { 
  display: flex; 
  justify-content: space-between; 
  align-items: center; 
  margin-bottom: 20px; 
}

.toolbar .left h2 {
  margin: 0;
  font-size: 1.5rem;
}

button {
  background: rgba(255,255,255,.2);
  border: 1px solid rgba(255,255,255,.3);
  color: #fff;
  padding: 12px 20px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 1rem;
}

button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.primary-card { 
  margin-bottom: 20px; 
  min-height: 350px;
}

.card {
  background: rgba(255,255,255,.08);
  border-radius: 16px;
  padding: 20px;
  min-height: 280px;
}

.card-title { 
  margin: 0 0 15px 0; 
  font-size: 1.3rem;
}

.stats { 
  display: grid; 
  gap: 15px; 
  grid-template-columns: repeat(3, 1fr);
  margin-bottom: 15px;
}

.stat {
  background: rgba(255,255,255,.1);
  padding: 15px;
  border-radius: 12px;
}

.stat.primary {
  background: rgba(0,255,170,.2);
  border: 1px solid rgba(0,255,170,.4);
}

.k { 
  font-size: 0.9rem; 
  opacity: 0.8; 
  margin-bottom: 6px;
}

.v { 
  font-weight: bold; 
  font-size: 1.4rem; 
}

.race-scores {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.race-score {
  background: rgba(255,255,255,.15);
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 0.9rem;
  font-weight: 600;
}

.hint {
  text-align: center;
  opacity: 0.7;
  font-size: 0.9rem;
  margin: 15px 0 0 0;
}

.table-wrap {
  overflow: auto;
  border-radius: 12px;
  max-height: 500px;
  background: rgba(0,0,0,.2);
}

.full-table {
  max-height: 600px;
}

table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.85rem;
}

th, td {
  padding: 10px 12px;
  text-align: left;
  border-bottom: 1px solid rgba(255,255,255,.15);
  white-space: nowrap;
}

th {
  background: rgba(255,255,255,.15);
  font-weight: 600;
  position: sticky;
  top: 0;
  z-index: 10;
}

/* Column-specific styling */
.rank { 
  font-weight: bold; 
  text-align: center; 
  width: 60px; 
}

.nation { 
  text-align: center; 
  width: 70px; 
  font-weight: 600;
}

.yacht-name { 
  min-width: 180px; 
  font-weight: 700; 
}

.sail-no { 
  text-align: center; 
  width: 90px; 
  font-family: monospace;
}

.type { 
  width: 80px; 
  text-align: center;
}

.owner { 
  min-width: 200px; 
}

.club { 
  min-width: 150px; 
}

.class { 
  text-align: center; 
  width: 60px; 
}

.race-result { 
  text-align: center; 
  width: 50px; 
  font-weight: 600;
  font-family: monospace;
}

.total { 
  text-align: center; 
  width: 70px; 
  font-weight: bold; 
  background: rgba(0,255,170,.15);
  font-size: 1.1rem;
}

.northstar {
  background: rgba(0,255,170,.25) !important;
  border: 2px solid rgba(0,255,170,.6) !important;
}

.northstar .yacht-name {
  color: #00ffaa;
  font-weight: bold;
  text-shadow: 0 0 10px rgba(0,255,170,.5);
}

.loading-card, .empty-card {
  background: rgba(255,255,255,.08);
  border-radius: 16px;
  padding: 40px;
  text-align: center;
  min-height: 200px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid rgba(255,255,255,.2);
  border-top: 4px solid #fff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 20px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.error {
  background: rgba(255,0,0,.2);
  border: 1px solid rgba(255,0,0,.4);
  color: #ffcccc;
  padding: 15px;
  border-radius: 12px;
  margin-bottom: 20px;
}

/* Responsive */
@media (max-width: 768px) {
  .results-page { padding: 10px; }
  .stats { grid-template-columns: 1fr; }
  .full-table table { font-size: 0.75rem; }
  .full-table th, .full-table td { padding: 6px 8px; }
  
  .toolbar {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }
  
  .toolbar .left h2 {
    font-size: 1.2rem;
  }
}
</style>
