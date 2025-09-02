/* races (scoped to class) */
const races = ref([]) // [{id,label,classRaceNumber}]

// Mapping from ORC race ID to class race number for specific events
const raceNumberMappings = {
  'xolfq': {
    'M2': { '13': 4 }, // Race 13 on ORC = Race 4 for class M2
    // Add more class mappings as needed
  }
}

function getClassRaceNumber(orcRaceId, eventId, classId) {
  const eventMapping = raceNumberMappings[eventId]
  if (!eventMapping) return null
  const classMapping = eventMapping[classId]
  if (!classMapping) return null
  return classMapping[orcRaceId] || null
}

async function loadRacesForClass(){
  races.value = []
  if (!evId() || !selectedClassId.value) return
  const json = await api(`/api/results-orc?type=racesForClass&eventId=${encodeURIComponent(evId())}&classId=${encodeURIComponent(selectedClassId.value)}`)
  races.value = (json.results || []).map((r, index) => {
    const classRaceNumber = getClassRaceNumber(r.id, evId(), selectedClassId.value)
    const displayNumber = classRaceNumber || (index + 1) // fallback to sequential numbering
    return { 
      id: r.id, 
      label: `RACE ${displayNumber}`,
      classRaceNumber: displayNumber,
      orcRaceId: r.id
    }
  })
}

/* "forced" last race for xolfq (13), otherwise fall back to last available id */
const forcedLastRaceByEvent = { xolfq: '13' }
const lastRaceId = computed(() => forcedLastRaceByEvent[evId()] || (races.value.at(-1)?.id || ''))
const lastRaceTitle = computed(() => {
  if (!lastRaceId.value) return 'RACE —'
  const race = races.value.find(r => r.id === lastRaceId.value)
  return race ? race.label : `RACE ${lastRaceId.value}`
})
