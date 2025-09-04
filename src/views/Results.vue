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
          <h2 class="text-lg font-semibold mb-3 text-white/80 uppercase tracking-wide">Latest Race - R3 Results</h2>
          <div class="text-xs text-white/50 mb-3 uppercase tracking-wide">Click for full race results</div>
          
          <div class="glass-card rounded-2xl p-6 border border-white/20 cursor-pointer hover:bg-white/15 transition-all" 
               @click="showLatestRace = !showLatestRace">
            <div class="flex justify-between items-center mb-4">
              <h3 class="text-xl font-bold text-white">Race R3</h3>
              <span class="text-sm text-white/60">Today</span>
            </div>
            
            <!-- Summary View -->
            <div v-if="!showLatestRace" class="grid grid-cols-3 gap-4 text-center">
              <div>
                <div class="text-white/60 text-sm mb-1">Position</div>
                <div class="text-3xl font-bold text-blue-300">3rd</div>
              </div>
              <div>
                <div class="text-white/60 text-sm mb-1">Delta Ahead</div>
                <div class="text-lg font-mono text-orange-300">+0:00:00</div>
              </div>
              <div>
                <div class="text-white/60 text-sm mb-1">Delta Behind</div>
                <div class="text-lg font-mono text-green-300">+0:00:00</div>
              </div>
            </div>

            <!-- Full Results View -->
            <div v-else>
              <h3 class="text-lg font-bold mb-3 text-white">Race R3 - Full Results</h3>
              <div class="overflow-y-auto max-h-80">
                <table class="w-full text-xs">
                  <thead class="sticky top-0 bg-black/20 backdrop-blur-sm">
                    <tr>
                      <th class="text-left p-2 text-white/80">Pos</th>
                      <th class="text-left p-2 text-white/80">Yacht</th>
                      <th class="text-left p-2 text-white/80">Finish</th>
                      <th class="text-left p-2 text-white/80">Delta</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr class="hover:bg-white/5">
                      <td class="p-2 font-bold text-white">1</td>
                      <td class="p-2 text-white">Sample Yacht 1</td>
                      <td class="p-2 font-mono text-white/80">14:45:33</td>
                      <td class="p-2 font-mono text-white/80">00:00:00</td>
                    </tr>
                    <tr class="hover:bg-white/5">
                      <td class="p-2 font-bold text-white">2</td>
                      <td class="p-2 text-white">Sample Yacht 2</td>
                      <td class="p-2 font-mono text-white/80">14:46:15</td>
                      <td class="p-2 font-mono text-white/80">00:00:42</td>
                    </tr>
                    <tr class="bg-blue-400/20 backdrop-blur-sm">
                      <td class="p-2 font-bold text-white">3</td>
                      <td class="p-2 text-white">NORTHSTAR OF LONDON</td>
                      <td class="p-2 font-mono text-white/80">14:47:01</td>
                      <td class="p-2 font-mono text-white/80">00:01:28</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        <!-- Series Overall Results Card -->
        <div class="mb-6">
          <h2 class="text-lg font-semibold mb-3 text-white/80 uppercase tracking-wide">Series Results Overall</h2>
          <div class="text-xs text-white/50 mb-3 uppercase tracking-wide">Click for points breakdown</div>
          
          <div class="glass-card rounded-2xl p-6 border border-white/20 cursor-pointer hover:bg-white/15 transition-all"
               @click="showOverall = !showOverall">
            <div class="flex justify-between items-center mb-4">
              <h3 class="text-xl font-bold text-white">Superyacht Class</h3>
              <span class="text-sm text-white/60">3 races</span>
            </div>
            
            <!-- Summary View -->
            <div v-if="!showOverall" class="grid grid-cols-3 gap-4 text-center">
              <div>
                <div class="text-white/60 text-sm mb-1">Position</div>
                <div class="text-3xl font-bold text-blue-300">2nd</div>
              </div>
              <div>
                <div class="text-white/60 text-sm mb-1">Total Points</div>
                <div class="text-2xl font-bold text-yellow-300">6.0</div>
              </div>
              <div>
                <div class="text-white/60 text-sm mb-1">Net Points</div>
                <div class="text-2xl font-bold text-green-300">6.0</div>
              </div>
            </div>

            <!-- Full Results View -->
            <div v-else>
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
                    <tr class="hover:bg-white/5">
                      <td class="p-2 font-bold text-white">1</td>
                      <td class="p-2 text-white">Sample Yacht 1</td>
                      <td class="p-2 font-mono text-white/80">1</td>
                      <td class="p-2 font-mono text-white/80">1</td>
                      <td class="p-2 font-mono text-white/80">1</td>
                      <td class="p-2 font-mono font-bold text-white">3.0</td>
                    </tr>
                    <tr class="bg-blue-400/20 backdrop-blur-sm">
                      <td class="p-2 font-bold text-white">2</td>
                      <td class="p-2 text-white">NORTHSTAR OF LONDON</td>
                      <td class="p-2 font-mono text-white/80">2</td>
                      <td class="p-2 font-mono text-white/80">1</td>
                      <td class="p-2 font-mono text-white/80">3</td>
                      <td class="p-2 font-mono font-bold text-white">6.0</td>
                    </tr>
                    <tr class="hover:bg-white/5">
                      <td class="p-2 font-bold text-white">3</td>
                      <td class="p-2 text-white">Sample Yacht 3</td>
                      <td class="p-2 font-mono text-white/80">3</td>
                      <td class="p-2 font-mono text-white/80">3</td>
                      <td class="p-2 font-mono text-white/80">2</td>
                      <td class="p-2 font-mono font-bold text-white">8.0</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        <!-- Race Details Cards -->
        <div class="mb-6">
          <h2 class="text-lg font-semibold mb-3 text-white/80 uppercase tracking-wide">Race Result Details</h2>
          <div class="text-xs text-white/50 mb-3 uppercase tracking-wide">Click to view full results</div>
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            
            <!-- Race R1 -->
            <div class="glass-card rounded-xl p-4 border border-white/20 min-h-32 cursor-pointer hover:bg-white/15 transition-all"
                 @click="toggleRaceDetail('race1')">
              <div v-if="!showRaceDetails.race1" class="text-center">
                <div class="text-white/60 text-sm mb-1">Race R1</div>
                <div class="text-2xl font-bold mb-2 text-white">2nd</div>
                <div class="text-xs text-white/80">Finish: 13:58:42</div>
                <div class="text-xs text-white/60">No gap data</div>
              </div>
              
              <div v-else class="overflow-hidden">
                <h4 class="font-bold mb-2 text-sm text-white">Race R1</h4>
                <div class="overflow-y-auto max-h-24">
                  <table class="w-full text-xs">
                    <tbody>
                      <tr><td class="py-1 font-bold w-6 text-white">1</td><td class="py-1 text-xs truncate text-white/80">Sample Yacht 1</td></tr>
                      <tr class="bg-blue-400/20"><td class="py-1 font-bold w-6 text-white">2</td><td class="py-1 text-xs truncate text-white/80">NORTHSTAR OF LONDON</td></tr>
                      <tr><td class="py-1 font-bold w-6 text-white">3</td><td class="py-1 text-xs truncate text-white/80">Sample Yacht 3</td></tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <!-- Race R2 -->
            <div class="glass-card rounded-xl p-4 border border-white/20 min-h-32 cursor-pointer hover:bg-white/15 transition-all"
                 @click="toggleRaceDetail('race2')">
              <div v-if="!showRaceDetails.race2" class="text-center">
                <div class="text-white/60 text-sm mb-1">Race R2</div>
                <div class="text-2xl font-bold mb-2 text-white">1st</div>
                <div class="text-xs text-white/80">Finish: 15:02:18</div>
                <div class="text-xs text-white/60">No gap data</div>
              </div>
              
              <div v-else class="overflow-hidden">
                <h4 class="font-bold mb-2 text-sm text-white">Race R2</h4>
                <div class="overflow-y-auto max-h-24">
                  <table class="w-full text-xs">
                    <tbody>
                      <tr class="bg-blue-400/20"><td class="py-1 font-bold w-6 text-white">1</td><td class="py-1 text-xs truncate text-white/80">NORTHSTAR OF LONDON</td></tr>
                      <tr><td class="py-1 font-bold w-6 text-white">2</td><td class="py-1 text-xs truncate text-white/80">Sample Yacht 2</td></tr>
                      <tr><td class="py-1 font-bold w-6 text-white">3</td><td class="py-1 text-xs truncate text-white/80">Sample Yacht 3</td></tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <!-- Race R3 -->
            <div class="glass-card rounded-xl p-4 border border-white/20 min-h-32 cursor-pointer hover:bg-white/15 transition-all"
                 @click="toggleRaceDetail('race3')">
              <div v-if="!showRaceDetails.race3" class="text-center">
                <div class="text-white/60 text-sm mb-1">Race R3</div>
                <div class="text-2xl font-bold mb-2 text-white">3rd</div>
                <div class="text-xs text-white/80">Finish: 14:45:33</div>
                <div class="text-xs text-white/60">-0:05:45 behind</div>
              </div>
              
              <div v-else class="overflow-hidden">
                <h4 class="font-bold mb-2 text-sm text-white">Race R3</h4>
                <div class="overflow-y-auto max-h-24">
                  <table class="w-full text-xs">
                    <tbody>
                      <tr><td class="py-1 font-bold w-6 text-white">1</td><td class="py-1 text-xs truncate text-white/80">Sample Yacht 1</td></tr>
                      <tr><td class="py-1 font-bold w-6 text-white">2</td><td class="py-1 text-xs truncate text-white/80">Sample Yacht 2</td></tr>
                      <tr class="bg-blue-400/20"><td class="py-1 font-bold w-6 text-white">3</td><td class="py-1 text-xs truncate text-white/80">NORTHSTAR OF LONDON</td></tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

          </div>
        </div>

        <!-- Footer -->
        <div class="text-center text-white/60 text-xs mt-8">
          <p>Last updated: {{ lastUpdate.toLocaleTimeString() }}</p>
          <button 
            @click="refreshData"
            class="mt-2 px-4 py-2 glass-card border border-white/20 rounded-lg text-white hover:bg-white/10 transition-colors"
          >
            Refresh Data
          </button>
          <button 
            @click="loadFromAPI"
            class="mt-2 ml-2 px-4 py-2 glass-card border border-blue-400/50 rounded-lg text-blue-300 hover:bg-blue-400/10 transition-colors"
          >
            Load from ORC API
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'Results',
  data() {
    return {
      loading: false,
      lastUpdate: new Date(),
      showSettings: false,
      isAdmin: true, // Set this based on user role
      currentBackground: '',
      
      // Card visibility states
      showLatestRace: false,
      showOverall: false,
      showRaceDetails: {
        race1: false,
        race2: false,
        race3: false
      },
      
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
        eventName: 'Giorgio Armani Superyacht Regatta',
        eventLocation: 'MOAT • Porto Cervo',
        eventDates: '27/5/2025 - 31/5/2025'
      }
    }
  },
  
  methods: {
    toggleRaceDetail(raceKey) {
      this.$set(this.showRaceDetails, raceKey, !this.showRaceDetails[raceKey]);
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

    refreshData() {
      this.lastUpdate = new Date();
      // Add your data refresh logic here
      console.log('Refreshing data...');
    },

    loadFromAPI() {
      // This is where we'll connect to your ORC API
      console.log('Loading from ORC API...');
      // TODO: Add API integration
    }
  },
  
  mounted() {
    this.loadSavedBackground();
  }
}
</script>

<style scoped>
.glass-card {
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.glass-card:hover {
  background: rgba(255, 255, 255, 0.08);
  transform: translateY(-2px);
  transition: all 0.3s ease;
  box-shadow: 0 12px 40px 0 rgba(31, 38, 135, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.15);
}

/* More transparent glass for settings modal */
.glass-card.rounded-2xl {
  background: rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(25px);
  -webkit-backdrop-filter: blur(25px);
}

/* Table headers with extra glass effect */
.bg-black\/20 {
  background: rgba(0, 0, 0, 0.1) !important;
  backdrop-filter: blur(15px);
  -webkit-backdrop-filter: blur(15px);
}

/* Enhanced transparency for highlighted rows */
.bg-blue-400\/20 {
  background: rgba(59, 130, 246, 0.15) !important;
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid rgba(59, 130, 246, 0.2);
}

/* Hover effects for table rows */
.hover\:bg-white\/5:hover {
  background: rgba(255, 255, 255, 0.03) !important;
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}

/* Admin settings button */
button.glass-card {
  background: rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(15px);
  -webkit-backdrop-filter: blur(15px);
  border: 1px solid rgba(255, 255, 255, 0.12);
}

button.glass-card:hover {
  background: rgba(255, 255, 255, 0.12);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

/* Background selection borders */
.border-white\/20 {
  border-color: rgba(255, 255, 255, 0.15) !important;
}

.border-white\/40 {
  border-color: rgba(255, 255, 255, 0.25) !important;
}

/* Smooth transitions for all interactive elements */
* {
  transition: all 0.3s ease;
}

/* Enhanced scrollbar styling for glass effect */
::-webkit-scrollbar {
  width: 6px;
}

::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 10px;
  backdrop-filter: blur(5px);
}

::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 10px;
  backdrop-filter: blur(5px);
}

::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.35);
}

/* Loading card extra transparency */
.glass-card.p-8 {
  background: rgba(255, 255, 255, 0.06);
  backdrop-filter: blur(30px);
  -webkit-backdrop-filter: blur(30px);
}

/* Footer buttons with glass effect */
.glass-card.border-white\/20 {
  background: rgba(255, 255, 255, 0.04);
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.glass-card.border-blue-400\/50 {
  background: rgba(59, 130, 246, 0.06);
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
  border: 1px solid rgba(59, 130, 246, 0.25);
}

/* Enhanced glass morphism for modal overlay */
.bg-black\/50 {
  background: rgba(0, 0, 0, 0.3) !important;
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}
</style>
