// src/config/eventParsers.js
// Central place to tune per-event parsing without touching parser logic.
//
// Keyed by ORC eventId (the value after eventid= in the URL).
// For each event you can:
//  - set defaultClass (e.g., "M2")
//  - set lastRaceId (when site’s “last” race link is not per-class and you still want a specific one)
//  - override header mappings per table type if needed (when site uses unusual column labels)
//  - scope how to find races for a class on the index page (advanced)
//

export default {
  /* Example: Maxi Worlds 2024 */
  xolfq: {
    label: 'MAXI YACHT ROLEX CUP 2024',
    defaultClass: 'M2',
    lastRaceId: '13',

    // Header hints for OVERALL (only needed if auto-detection fails)
    overallHeaders: {
      // Provide REGEX strings (case-insensitive, no slashes needed)
      pos:      '^(pos|position|#)$',
      name:     '(yacht|boat|name)',
      sailNo:   '(sail|sail\\s*no|nr|no)',
      skipper:  '(owner|skipper|helm)',
      points:   '(points|pts|score)',
      total:    '(total|net|overall)'
    },

    // Header hints for RACE tables (optional)
    raceHeaders: {
      pos:      '^(pos|position|#)$',
      name:     '(yacht|boat|name)',
      finish:   'finish',
      elapsed:  'elapsed',
      corrected:'corrected'
    },

    // Optional: how to scope a class section on index/race pages (advanced)
    scopes: {
      // How to detect the beginning of a class section
      classSeriesAnchor: (cls) => `action=series&eventid=xolfq&classid=${cls}`
    }
  },

  // Add other events here:
  // mgouq: { defaultClass: 'SY', lastRaceId: '3', ... }
}
