<template>
  <div class="results-container">
    <!-- Header Section -->
    <header class="regatta-header">
      <div class="header-content">
        <h1 class="regatta-title">Giorgio Armani Superyacht Regatta</h1>
        <div class="regatta-meta">
          <span class="location">MOAT • Porto Cervo</span>
          <span class="dates">27/5/2025 - 31/5/2025</span>
          <div class="live-indicator">
            <div class="live-dot"></div>
            <span>Live</span>
          </div>
        </div>
      </div>
    </header>

    <!-- Main Results Section -->
    <main class="results-main">
      <section class="latest-race-section">
        <h2 class="section-title">LATEST RACE - R3 RESULTS</h2>
        <p class="section-subtitle">HOVER FOR FULL RACE RESULTS</p>
        
        <div class="race-card">
          <div class="race-info">
            <h3>Race R3</h3>
            <span class="race-date">Today</span>
          </div>
          <div class="race-stats">
            <div class="stat-group">
              <span class="label">Position</span>
              <span class="value position-value">3rd</span>
            </div>
            <div class="stat-group">
              <span class="label">Delta Ahead</span>
              <span class="value delta-ahead">+0:00:00</span>
            </div>
            <div class="stat-group">
              <span class="label">Delta Behind</span>
              <span class="value delta-behind">+0:00:00</span>
            </div>
          </div>
        </div>
      </section>

      <!-- Series Results Flip Card -->
      <section class="series-section">
        <h2 class="section-title">SERIES RESULTS OVERALL</h2>
        <p class="section-subtitle">HOVER FOR POINTS BREAKDOWN</p>
        
        <div class="flip-card" @click="toggleCard">
          <div class="flip-card-inner" :class="{ 'is-flipped': isFlipped }">
            <!-- Front of Card - NORTHSTAR Summary -->
            <div class="flip-card-front">
              <div class="card-header">
                <h3>Superyacht Class</h3>
                <span class="race-count">3 races</span>
              </div>
              
              <div class="northstar-summary">
                <div class="position-display">
                  <span class="position-label">Position</span>
                  <span class="position-number">2nd</span>
                </div>
                
                <div class="points-summary">
                  <div class="points-item">
                    <span class="points-label">Total Points</span>
                    <span class="points-value">6.0</span>
                  </div>
                  <div class="points-item">
                    <span class="points-label">Net Points</span>
                    <span class="points-value">6.0</span>
                  </div>
                </div>
              </div>
