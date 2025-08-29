<script setup>
import { reactive, ref, onMounted } from 'vue'


// ---------------- State ----------------
const login = reactive({ isLoggedIn: false, user: 'demo' })
const config = reactive({
sailboatName: 'BURRASCA',
displayName: 'BURRASCA Performance Dashboard',
ownerName: '',
sailNumber: '',
boatClass: 'ORC International',
backgroundImage: null
})


const ui = reactive({
showLogin: false,
showConfig: false,
showApi: false,
lastUpdate: 'Just now',
notificationOpen: false
})


const metrics = reactive({
overallEfficiency: 0,
vmgUp: 0,
vmgDown: 0,
polarBsp: 0
})


const latestRace = reactive({
name: 'Chios to Andros',
date: 'Pending',
position: 'TBD',
finishTime: '-',
toFirst: '-',
deltaAhead: '-',
deltaBehind: '-',
rows: []
})


const series = reactive({
className: 'ORC International',
racesLabel: '0 races',
position: 'TBD',
points: '0.0',
net: '0.0',
rows: []
})


const raceHistory = ref([])


// ---------------- Helpers ----------------
function setBodyBackground(url){
const b = document.body
</style>
