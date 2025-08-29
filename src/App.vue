<script setup>
import { reactive, onMounted } from 'vue'

const flip = reactive({ latest: false, series: false })

onMounted(() => {
  // no-op: just verifying build works
})
</script>

<template>
  <div class="container">
    <header class="header">
      <h1>Sailing Dashboard</h1>
      <p>Vue 3 • Glassmorphism • Flip Cards</p>
    </header>

    <!-- Latest Race (flip) -->
    <section class="glass-card">
      <h3 class="title">Latest Race</h3>
      <div class="flip-card"
           @mouseenter="flip.latest = true"
           @mouseleave="flip.latest = false">
        <div class="flip-inner" :class="{ flipped: flip.latest }">
          <div class="flip-front">
            <div class="front-content">
              <div class="kpi">
                <div class="kpi-label">Position</div>
                <div class="kpi-value">—</div>
              </div>
              <div class="kpi">
                <div class="kpi-label">Finish Time</div>
                <div class="kpi-value mono">—</div>
              </div>
              <div class="kpi">
                <div class="kpi-label">To 1st</div>
                <div class="kpi-delta">—</div>
              </div>
            </div>
          </div>
          <div class="flip-back">
            <div class="back-header">Full Latest Race Results</div>
            <div class="row muted tiny">Pending…</div>
          </div>
        </div>
      </div>
    </section>

    <!-- Series Overall (flip) -->
    <section class="glass-card">
      <h3 class="title">Series Overall</h3>
      <div class="flip-card"
           @mouseenter="flip.series = true"
           @mouseleave="flip.series = false">
        <div class="flip-inner" :class="{ flipped: flip.series }">
          <div class="flip-front">
            <div class="front-content">
              <div class="kpi">
                <div class="kpi-label">Position</div>
                <div class="kpi-value">—</div>
              </div>
              <div class="kpi">
                <div class="kpi-label">Total Points</div>
                <div class="kpi-value">—</div>
              </div>
              <div class="kpi">
                <div class="kpi-label">Net Points</div>
                <div class="kpi-value">—</div>
              </div>
            </div>
          </div>
          <div class="flip-back">
            <div class="back-header">Overall Standings</div>
            <div class="row muted tiny">Pending…</div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<style>
/* Base */
*{box-sizing:border-box} body{margin:0;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial}
.container{max-width:1100px;margin:0 auto;padding:20px}
.header{text-align:center;margin-bottom:20px}
.header h1{margin:0 0 6px;font-size:28px}
.header p{margin:0;color:#4b5563}

/* Glass */
.glass-card{background:rgba(255,255,255,.12);backdrop-filter:blur(18px);border:1px solid rgba(255,255,255,.2);
            border-radius:16px;padding:16px;margin-bottom:16px;box-shadow:0 8px 30px rgba(0,0,0,.08)}
.title{margin:0 0 10px;font-size:18px}

/* Flip */
.flip-card{perspective:1000px}
.flip-inner{position:relative;transform-style:preserve-3d;transition:transform .6s;min-height:140px}
.flip-inner.flipped{transform:rotateY(180deg)}
.flip-front,.flip-back{position:absolute;inset:0;border-radius:12px;backface-visibility:hidden;overflow:hidden}
.flip-front{background:rgba(255,255,255,.06);display:flex;align-items:center;justify-content:center}
.flip-back{background:rgba(255,255,255,.14);transform:rotateY(180deg);padding:12px}
.back-header{font-weight:600;margin-bottom:8px}

/* Front content */
.front-content{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;padding:14px}
.kpi-label{font-size:12px;color:#6b7280}
.kpi-value{font-weight:700;font-size:22px}
.kpi-delta{font-weight:600;color:#ef4444}
.mono{font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace}

/* Util */
.row{display:flex;gap:10px;align-items:center}
.tiny{font-size:12px}.muted{color:#6b7280}
</style>
