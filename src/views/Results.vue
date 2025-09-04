<template>
  <div class="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white p-4">
    <!-- Header -->
    <div class="mb-6">
      <div class="flex justify-between items-start mb-2">
        <div>
          <h1 class="text-2xl font-bold text-white mb-1">{{ config.eventName }}</h1>
          <p class="text-slate-300 text-sm">{{ config.eventLocation }} • {{ config.eventDates }}</p>
        </div>
        <div class="text-right">
          <div class="text-xs text-slate-400">Last Update</div>
          <div class="text-sm font-mono">{{ lastUpdate.toLocaleTimeString() }}</div>
          <div class="inline-flex items-center mt-1">
            <div class="w-2 h-2 bg-green-400 rounded-full mr-1 animate-pulse"></div>
            <span class="text-xs text-green-400">Live</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex items-center justify-center min-h-64">
      <div class="text-white text-xl">Loading regatta data...</div>
    </div>

    <div v-else>
      <!-- Latest Race Results Card -->
      <div class="mb-6">
        <h2 class="text-lg font-semibold mb-3 text-slate-300">LATEST RACE - R{{ availableRaces.length }} RESULTS</h2>
        <div class="perspective-1000">
          <div 
            :class="['flip-card', { 'flipped': flippedCards.latestRace }]"
            @click="toggleCard('latestRace')"
          >
            <div class="flip-card-inner">
              <!-- Front Side -->
              <div class="flip-card-front bg-gradient-to-r from-slate-800 to-slate-700 rounded-xl p-6 border border-slate-600">
                <div class="flex justify-between items-center mb-4">
                  <h3 class="text-xl font-bold">Race R{{ availableRaces.length }}</h3>
                  <span class="text-sm text-slate-400">Today</span>
                </div>
                
                <div v-if="latestRaceResult" class="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div class="text-slate-400 text-sm mb-1">Position</div>
                    <div class="text-3xl font-bold text-blue-400">{{ latestRaceResult.position }}</div>
                  </div>
                  <div>
                    <div class="text-slate-400 text-sm mb-1">Delta Ahead</div>
                    <div class="text-lg font-mono text-orange-400">+{{ latestRaceResult.delta }}</div>
                  </div>
                  <div>
                    <div class="text-slate-400 text-sm mb-1">Corrected</div>
                    <div class="text-lg font-mono text-green-400">{{ latestRaceResult.correctedTime }}</div>
                  </div>
                </div>
                <div v-else class="text-center text-slate-400">No race data available</div>
                
                <div class="text-xs text-slate-500 text-center mt-4">Tap for full race results</div>
              </div>

              <!-- Back Side -->
              <div class="flip-card-back bg-slate-800 rounded-xl p-4 border border-slate-600 overflow-hidden">
                <h3 class="text-lg font-bold mb-3">Race R{{ availableRaces.length }} - Full Results</h3>
                <div class="overflow-y-auto max-h-80">
                  <table class="w-full text-xs">
                    <thead class="sticky top-0 bg-slate-700">
                      <tr>
                        <th class="text-left p-2">Pos</th>
                        <th class="text-left p-2">Yacht</th>
                        <th class="text-left p-2">Corrected</th>
                        <th class="text-left p-2">Delta</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="(boat, idx) in latestRaceResults" 
                          :key="idx" 
                          :class="isMyBoat(boat.name) ? 'bg-blue-900/50' : 'hover:bg-slate-700/50'"
                      >
                        <td class="p-2 font-bold">{{ boat.position }}</td>
                        <td class="p-2">
                          <div class="font-semibold">{{ boat.name }}</div>
                          <div class="text-slate-400 text-xs">{{ boat.sailNo }}</div>
                        </td>
                        <td class="p-2 font-mono">{{ boat.correctedTime }}</td>
                        <td class="p-2 font-mono">{{ boat.delta }}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Series Overall Results Card -->
      <div class="mb-6">
        <h2 class="text-lg font-semibold mb-3 text-slate-300">SERIES RESULTS OVERALL</h2>
        <div class="perspective-1000">
          <div 
            :class="['flip-card', { 'flipped': flippedCards.overall }]"
            @click="toggleCard('overall')"
          >
            <div class="flip-card-inner">
              <!-- Front Side -->
              <div class="flip-card-front bg-gradient-to-r from-slate-800 to-slate-700 rounded-xl p-6 border border-slate-600">
                <div class="flex justify-between items-center mb-4">
                  <h3 class="text-xl font-bold">{{ config.classId }} Class</h3>
                  <span class="text-sm text-slate-400">{{ availableRaces.length }} races</span>
                </div>
                
                <div v-if="myBoat" class="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div class="text-slate-400 text-sm mb-1">Position</div>
                    <div class="text-3xl font-bold text-blue-400">{{ myBoat.position }}</div>
                  </div>
                  <div>
                    <div class="text-slate-400 text-sm mb-1">Total Points</div>
                    <div class="text-2xl font-bold text-yellow-400">{{ myBoat.total }}</div>
                  </div>
                  <div>
                    <div class="text-slate-400 text-sm mb-1">Net Points</div>
                    <div class="text-2xl font-bold text-green-400">{{ myBoat.points }}</div>
                  </div>
                </div>
                <div v-else class="text-center text-slate-400">No overall data available</div>
                
                <div class="text-xs text-slate-500 text-center mt-4">Tap for points breakdown</div>
              </div>

              <!-- Back Side -->
              <div class="flip-card-back bg-slate-800 rounded-xl p-4 border border-slate-600 overflow-hidden">
                <h3 class="text-lg font-bold mb-3">Overall Standings</h3>
                <div class="overflow-y-auto max-h-80">
                  <table class="w-full text-xs">
                    <thead class="sticky top-0 bg-slate-700">
                      <tr>
                        <th class="text-left p-2">Pos</th>
                        <th class="text-left p-2">Yacht</th>
                        <th class="text-left p-2">R1</th>
                        <th class="text-left p-2">R2</th>
                        <th class="text-left p-2">R3</th>
                        <th class="text-left p-2">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="(boat, idx) in overallResults" 
                          :key="idx" 
                          :class="isMyBoat(boat.name) ? 'bg-blue-900/50' : 'hover:bg-slate-700/50'"
                      >
                        <td class="p-2 font-bold">{{ boat.position }}</td>
                        <td class="p-2">
                          <div class="font-semibold">{{ boat.name }}</div>
                          <div class="text-slate-400 text-xs">{{ boat.sailNo }}</div>
                        </td>
                        <td class="p-2 font-mono">{{ boat.r1 }}</td>
                        <td class="p-2 font-mono">{{ boat.r2 }}</td>
                        <td class="p-2 font-mono">{{ boat.r3 }}</td>
                        <td class="p-2 font-mono font-bold">{{ boat.total }}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Race Details Cards -->
      <div class="mb-6">
        <h2 class="text-lg font-semibold mb-3 text-slate-300">RACE RESULT DETAILS</h2>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div v-for="(raceId, index) in availableRaces" :key="raceId" class="perspective-1000">
            <div 
              :class="['flip-card', { 'flipped': flippedCards[`race-${raceId}`] }]"
              @click="toggleCard(`race-${raceId}`)"
            >
              <div class="flip-card-inner">
                <!-- Front Side -->
                <div class="flip-card-front bg-gradient-to-r from-slate-800 to-slate-700 rounded-lg p-4 border border-slate-600 min-h-32">
                  <div class="text-center">
                    <div class="text-slate-400 text-sm mb-1">Race R{{ index + 1 }}</div>
                    <div class="text-2xl font-bold mb-2">{{ getMyRaceResult(raceId)?.position || '-' }}</div>
                    <div v-if="getMyRaceResult(raceId)">
                      <div class="text-xs text-slate-300">Finish: {{ getMyRaceResult(raceId).finishTime }}</div>
                      <div class="text-xs text-slate-400">{{ getMyRaceResult(raceId).delta }} behind</div>
                    </div>
                  </div>
                </div>

                <!-- Back Side -->
                <div class="flip-card-back bg-slate-800 rounded-lg p-3 border border-slate-600 overflow-hidden min-h-32">
                  <h4 class="font-bold mb-2 text-sm">Race R{{ index + 1 }}</h4>
                  <div class="overflow-y-auto max-h-24">
                    <table class="w-full text-xs">
                      <tbody>
                        <tr v-for="(boat, idx) in (raceResults[raceId] || []).slice(0, 3)" 
                            :key="idx" 
                            :class="isMyBoat(boat.name) ? 'bg-blue-900/50' : ''"
                        >
                          <td class="py-1 font-bold w-6">{{ boat.position }}</td>
                          <td class="py-1 text-xs truncate">{{ boat.name }}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="text-center text-slate-500 text-xs mt-8">
        <p>Last updated: {{ lastUpdate.toLocaleTimeString() }}</p>
        <button 
          @click="fetchData"
          class="mt-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white text-sm transition-colors"
        >
          Refresh Data
        </button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'Results',
  data() {
    return {
      overallResults: [],
      raceResults: {},
      availableRaces: [],
      loading: true,
      lastUpdate: new Date(),
      flippedCards: {},
      
      // Configuration - update these for different events
      config: {
        eventId: 'xolfq',
        classId: 'M2',
        eventName: 'Maxi Yacht Rolex Cup 2024',
        eventLocation: 'Porto Cervo',
        eventDates: '9/9/2024 - 14/9/2024'
      }
    }
  },
  
  computed: {
    myBoat() {
      return this.overallResults.find(boat => 
        boat.name.toUpperCase().includes('NORTHSTAR')
      );
    },
    
    latestRaceResult() {
      const latestRaceId = this.availableRaces[this.availableRaces.length - 1];
      if (latestRaceId && this.raceResults[latestRaceId]) {
        return this.raceResults[latestRaceId].find(boat => 
          boat.name.toUpperCase().includes('NORTHSTAR')
        );
      }
      return null;
    },
    
    latestRaceResults() {
      const latestRaceId = this.availableRaces[this.availableRaces.length - 1];
      return this.raceResults[latestRaceId] || [];
    }
  },
  
  methods: {
    toggleCard(cardId) {
      this.$set(this.flippedCards, cardId, !this.flippedCards[cardId]);
    },
    
    isMyBoat(boatName) {
      return boatName.toUpperCase().includes('NORTHSTAR');
    },
    
    getMyRaceResult(raceId) {
      if (this.raceResults[raceId]) {
        return this.raceResults[raceId].find(boat => 
          boat.name.toUpperCase().includes('NORTHSTAR')
        );
      }
      return null;
    },
    
    async fetchData() {
      this.loading = true;
      try {
        // Fetch overall results
        const overallResponse = await fetch(`/api/results-orc?type=overall&eventId=${this.config.eventId}&classId=${this.config.classId}`);
        const overallData = await overallResponse.json();
        if (overallData.success) {
          this.overallResults = overallData.results;
        }

        // Fetch race results for races 6, 12, 13 (adjust as needed)
        const raceIds = ['6', '12', '13']; // Example race IDs - update based on your event
        const racePromises = raceIds.map(async (raceId) => {
          const response = await fetch(`/api/results-orc?type=race&eventId=${this.config.eventId}&raceId=${raceId}`);
          const data = await response.json();
          return { raceId, data: data.success ? data.results : [] };
        });

        const raceData = await Promise.all(racePromises);
        const raceResultsObj = {};
        raceData.forEach(({ raceId, data }) => {
          raceResultsObj[raceId] = data;
        });
        this.raceResults = raceResultsObj;
        this.availableRaces = raceIds;

      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        this.loading = false;
        this.lastUpdate = new Date();
      }
    }
  },
  
  mounted() {
    this.fetchData();
    // Update every 30 seconds
    this.refreshInterval = setInterval(this.fetchData, 30000);
  },
  
  beforeDestroy() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
  }
}
</script>

<style scoped>
.perspective-1000 {
  perspective: 1000px;
}

.flip-card {
  width: 100%;
  height: auto;
  cursor: pointer;
}

.flip-card-inner {
  position: relative;
  width: 100%;
  transition: transform 0.6s;
  transform-style: preserve-3d;
}

.flip-card.flipped .flip-card-inner {
  transform: rotateY(180deg);
}

.flip-card-front, .flip-card-back {
  position: relative;
  width: 100%;
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
}

.flip-card-back {
  transform: rotateY(180deg);
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
}
</style>
