<template>
  <div class="min-h-screen relative overflow-hidden">
    <!-- Dynamic Background -->
    <div 
      class="absolute inset-0 bg-cover bg-center bg-no-repeat"
      :style="{ backgroundImage: `url(${currentBackground})` }"
    ></div>
    
    <!-- Gradient Overlay -->
    <div class="absolute inset-0 bg-gradient-to-br from-slate-900/80 via-slate-800/60 to-slate-900/90"></div>
    
    <!-- Admin Settings Button -->
    <button 
      v-if="isAdmin"
      @click="showSettings = true"
      class="fixed top-4 right-4 z-50 glass-card p-2 rounded-lg text-white/80 hover:text-white transition-colors"
      title="Admin Settings"
    >
      <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path>
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
      </svg>
    </button>

    <!-- Settings Modal -->
    <div v-if="showSettings" class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" @click="showSettings = false"></div>
      <div class="relative glass-card rounded-2xl p-6 max-w-md w-full max-h-96 overflow-y-auto">
        <h3 class="text-xl font-bold text-white mb-4">Background Settings</h3>
        
        <!-- Background Options -->
        <div class="grid grid-cols-2 gap-3 mb-4">
          <div 
            v-for="bg in backgroundOptions" 
            :key="bg.id"
            @click="setBackground(bg.url)"
            :class="['relative h-20 rounded-lg bg-cover bg-center cursor-pointer border-2 transition-all', 
                     currentBackground === bg.url ? 'border-blue-400' : 'border-white/20 hover:border-white/40']"
            :style="{ backgroundImage: `url(${bg.url})` }"
          >
            <div class="absolute inset-0 bg-black/20 rounded-lg flex items-center justify-center">
              <span class="text-white text-xs font-medium">{{ bg.name }}</span>
            </div>
          </div>
        </div>

        <!-- Custom Upload -->
        <div class="mb-4">
          <label class="block text-white/80 text-sm mb-2">Custom Background</label>
          <input 
            type="file" 
            @change="handleCustomBackground"
            accept="image/*"
            class="w-full text-sm text-white/80 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-white/10 file:text-white hover:file:bg-white/20"
          >
        </div>

        <button 
          @click="showSettings = false"
          class="w-full glass-card py-2 px-4 rounded-lg text-white hover:bg-white/10 transition-colors"
        >
          Done
        </button>
      </div>
    </div>

    <!-- Main Content -->
    <div class="relative z-10 text-white p-4">
      <!-- Header -->
      <div class="mb-6">
        <div class="flex justify-between items-start mb-2">
          <div>
            <h1 class="text-2xl font-bold text-white mb-1">{{ config.eventName }}</h1>
            <p class="text-white/70 text-sm">{{ config.eventLocation }} • {{ config.eventDates }}</p>
          </div>
          <div class="text-right">
            <div class="text-xs text-white/60">Last Update</div>
            <div class="text-sm font-mono text-white/80">{{ lastUpdate.toLocaleTimeString() }}</div>
            <div class="inline-flex items-center mt-1">
              <div class="w-2 h-2 bg-green-400 rounded-full mr-1 animate-pulse"></div>
              <span class="text-xs text-green-400">Live</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="flex items-center justify-center min-h-64">
        <div class="glass-card p-8 rounded-2xl">
          <div class="text-white text-xl">Loading regatta data...</div>
        </div>
      </div>

      <div v-else>
        <!-- Latest Race Results Card -->
        <div class="mb-6">
          <h2 class="text-lg font-semibold mb-3 text-white/80 uppercase tracking-wide">Latest Race - R{{ availableRaces.length }} Results</h2>
          <div class="text-xs text-white/50 mb-3 uppercase tracking-wide">Hover for full race results</div>
          
          <FlipCard>
            <template #front>
              <div class="glass-card rounded-2xl p-6 border border-white/20">
                <div class="flex justify-between items-center mb-4">
                  <h3 class="text-xl font-bold text-white">Race R{{ availableRaces.length }}</h3>
                  <span class="text-sm text-white/60">Today</span>
                </div>
                
                <div v-if="latestRaceResult" class="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div class="text-white/60 text-sm mb-1">Position</div>
                    <div class="text-3xl font-bold text-blue-300">{{ latestRaceResult.position }}</div>
                  </div>
                  <div>
                    <div class="text-white/60 text-sm mb-1">Delta Ahead</div>
                    <div class="text-lg font-mono text-orange-300">+{{ latestRaceResult.delta }}</div>
                  </div>
                  <div>
                    <div class="text-white/60 text-sm mb-1">Corrected</div>
                    <div class="text-lg font-mono text-green-300">{{ latestRaceResult.correctedTime }}</div>
                  </div>
                </div>
                <div v-else class="text-center text-white/60">No race data available</div>
              </div>
            </template>

            <template #back>
              <div class="glass-card rounded-2xl p-4 border border-white/20 overflow-hidden">
                <h3 class="text-lg font-bold mb-3 text-white">Race R{{ availableRaces.length }} - Full Results</h3>
                <div class="overflow-y-auto max-h-80">
                  <table class="w-full text-xs">
                    <thead class="sticky top-0 bg-black/20 backdrop-blur-sm">
                      <tr>
                        <th class="text-left p-2 text-white/80">Pos</th>
                        <th class="text-left p-2 text-white/80">Yacht</th>
                        <th class="text-left p-2 text-white/80">Corrected</th>
                        <th class="text-left p-2 text-white/80">Delta</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="(boat, idx) in latestRaceResults" 
                          :key="idx" 
                          :class="isMyBoat(boat.name) ? 'bg-blue-400/20 backdrop-blur-sm' : 'hover:bg-white/5'"
                      >
                        <td class="p-2 font-bold text-white">{{ boat.position }}</td>
                        <td class="p-2">
                          <div class="font-semibold text-white">{{ boat.name }}</div>
                          <div class="text-white/60 text-xs">{{ boat.sailNo }}</div>
                        </td>
                        <td class="p-2 font-mono text-white/80">{{ boat.correctedTime }}</td>
                        <td class="p-2 font-mono text-white/80">{{ boat.delta }}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </template>
          </FlipCard>
        </div>

        <!-- Series Overall Results Card -->
        <div class="mb-6">
          <h2 class="text-lg font-semibold mb-3 text-white/80 uppercase tracking-wide">Series Results Overall</h2>
          <div class="text-xs text-white/50 mb-3 uppercase tracking-wide">Hover for points breakdown</div>
          
          <FlipCard>
            <template #front>
              <div class="glass-card rounded-2xl p-6 border border-white/20">
                <div class="flex justify-between items-center mb-4">
                  <h3 class="text-xl font-bold text-white">{{ config.classId }} Class</h3>
                  <span class="text-sm text-white/60">{{ availableRaces.length }} races</span>
                </div>
                
                <div v-if="myBoat" class="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div class="text-white/60 text-sm mb-1">Position</div>
                    <div class="text-3xl font-bold text-blue-300">{{ myBoat.position }}</div>
                  </div>
                  <div>
                    <div class="text-white/60 text-sm mb-1">Total Points</div>
                    <div class="text-2xl font-bold text-yellow-300">{{ myBoat.total }}</div>
                  </div>
                  <div>
                    <div class="text-white/60 text-sm mb-1">Net Points</div>
                    <div class="text-2xl font-bold text-green-300">{{ myBoat.points }}</div>
                  </div>
                </div>
                <div v-else class="text-center text-white/60">No overall data available</div>
              </div>
            </template>

            <template #back>
              <div class="glass-card rounded-2xl p-4 border border-white/20 overflow-hidden">
                <h3 class="text-lg font-bold mb-3 text-white">Overall Standings</h3>
                <div class="overflow-y-auto max-h-80">
                  <table class="w-full text-xs">
                    <thead class="sticky top-0 bg-black/20 backdrop-blur-sm">
                      <tr>
                        <th class="text-left p-2 text-white/80">Pos</th>
                        <th class="text-left p-2 text-white/80">Yacht</th>
                        <th class="text-left p-2 text-white/80">R1</th>
                        <th class="text-left p-2 text-white/80">R2</th>
                        <th class="text-left p-2 text-white/80">R3</th>
                        <th class="text-left p-2 text-white/80">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="(boat, idx) in overallResults" 
                          :key="idx" 
                          :class="isMyBoat(boat.name) ? 'bg-blue-400/20 backdrop-blur-sm' : 'hover:bg-white/5'"
                      >
                        <td class="p-2 font-bold text-white">{{ boat.position }}</td>
                        <td class="p-2">
                          <div class="font-semibold text-white">{{ boat.name }}</div>
                          <div class="text-white/60 text-xs">{{ boat.sailNo }}</div>
                        </td>
                        <td class="p-2 font-mono text-white/80">{{ boat.r1 }}</td>
                        <td class="p-2 font-mono text-white/80">{{ boat.r2 }}</td>
                        <td class="p-2 font-mono text-white/80">{{ boat.r3 }}</td>
                        <td class="p-2 font-mono font-bold text-white">{{ boat.total }}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </template>
          </FlipCard>
        </div>

        <!-- Race Details Cards -->
        <div class="mb-6">
          <h2 class="text-lg font-semibold mb-3 text-white/80 uppercase tracking-wide">Race Result Details</h2>
          <div class="text-xs text-white/50 mb-3 uppercase tracking-wide">Hover to view full results</div>
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            
            <FlipCard v-for="(raceId, index) in availableRaces" :key="raceId">
              <template #front>
                <div class="glass-card rounded-xl p-4 border border-white/20 min-h-32">
                  <div class="text-center">
                    <div class="text-white/60 text-sm mb-1">Race R{{ index + 1 }}</div>
                    <div class="text-2xl font-bold mb-2 text-white">{{ getMyRaceResult(raceId)?.position || '-' }}</div>
                    <div v-if="getMyRaceResult(raceId)">
                      <div class="text-xs text-white/80">Finish: {{ getMyRaceResult(raceId).finishTime }}</div>
                      <div class="text-xs text-white/60">{{ getMyRaceResult(raceId).delta }} behind</div>
                    </div>
                  </div>
                </div>
              </template>

              <template #back>
                <div class="glass-card rounded-xl p-3 border border-white/20 overflow-hidden min-h-32">
                  <h4 class="font-bold mb-2 text-sm text-white">Race R{{ index + 1 }}</h4>
                  <div class="overflow-y-auto max-h-24">
                    <table class="w-full text-xs">
                      <tbody>
                        <tr v-for="(boat, idx) in (raceResults[raceId] || []).slice(0, 3)" 
                            :key="idx" 
                            :class="isMyBoat(boat.name) ? 'bg-blue-400/20 backdrop-blur-sm' : ''"
                        >
                          <td class="py-1 font-bold w-6 text-white">{{ boat.position }}</td>
                          <td class="py-1 text-xs truncate text-white/80">{{ boat.name }}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </template>
            </FlipCard>

          </div>
        </div>

        <!-- Footer -->
        <div class="text-center text-white/60 text-xs mt-8">
          <p>Last updated: {{ lastUpdate.toLocaleTimeString() }}</p>
          <button 
            @click="fetchData"
            class="mt-2 px-4 py-2 glass-card border border-white/20 rounded-lg text-white hover:bg-white/10 transition-colors"
          >
            Refresh Data
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import FlipCard from '@/components/FlipCard.vue'

export default {
  name: 'Results',
  components: {
    FlipCard
  },
  data() {
    return {
      overallResults: [],
      raceResults: {},
      availableRaces: [],
      loading: true,
      lastUpdate: new Date(),
      showSettings: false,
      isAdmin: true, // Set this based on user role
      currentBackground: '',
      
      // Predefined background options
      backgroundOptions: [
        {
          id: 'sailing1',
          name: 'Ocean Blue',
          url: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80'
        },
        {
          id: 'sailing2', 
          name: 'Sunset Sail',
          url: 'https://images.unsplash.com/photo-1502680390469-be75c86b636f?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80'
        },
        {
          id: 'sailing3',
          name: 'Marina',
          url: 'https://images.unsplash.com/photo-1559827260-dc66d52bef19?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80'
        },
        {
          id: 'sailing4',
          name: 'Regatta',
          url: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80'
        },
        {
          id: 'sailing5',
          name: 'Harbor',
          url: 'https://images.unsplash.com/photo-1473800447596-01729482b8eb?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80'
        },
        {
          id: 'sailing6',
          name: 'Yacht Race',
          url: 'https://images.unsplash.com/photo-1551698618-1dfe5d97d256?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80'
        }
      ],
      
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

    setBackground(url) {
      this.currentBackground = url;
      localStorage.setItem('regatta-background', url);
    },

    handleCustomBackground(event) {
      const file = event.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          this.setBackground(e.target.result);
        };
        reader.readAsDataURL(file);
      }
    },

    loadSavedBackground() {
      const saved = localStorage.getItem('regatta-background');
      this.currentBackground = saved || this.backgroundOptions[0].url;
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
    this.loadSavedBackground();
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
.glass-card {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.37);
}

.glass-card:hover {
  background: rgba(255, 255, 255, 0.15);
  transform: translateY(-2px);
  transition: all 0.3s ease;
}

/* Smooth transitions for all interactive elements */
* {
  transition: all 0.2s ease;
}

/* Enhanced scrollbar styling for glass effect */
::-webkit-scrollbar {
  width: 6px;
}

::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 10px;
}

::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.3);
  border-radius: 10px;
}

::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.5);
}
</style>
