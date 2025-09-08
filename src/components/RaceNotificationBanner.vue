<!-- src/components/RaceNotificationBanner.vue -->
<template>
  <transition name="slide-down" appear>
    <div class="race-notification-banner" :class="notificationClass">
      <div class="notification-content">
        <div class="notification-icon"
          <span class="icon">{{ notificationIcon }}</span>
        </div>
        
        <div class="notification-message">
          <h4 class="message-title">{{ notification.message }}</h4>
          
          <div v-if="notification.races && notification.races.length > 0" class="races-list">
            <div 
              v-for="race in notification.races" 
              :key="race.id"
              class="race-item"
            >
              <span class="race-title">{{ race.title || `Race ${race.id}` }}</span>
              <span v-if="race.status" class="race-status" :class="race.status">
                {{ formatStatus(race.status) }}
              </span>
              <span v-if="race.timestamp" class="race-time">
                {{ formatTime(race.timestamp) }}
              </span>
            </div>
          </div>
          
          <div class="notification-timestamp">
            {{ formatTimeAgo(notification.timestamp) }}
          </div>
        </div>
        
        <div class="notification-actions">
          <button @click="$emit('dismiss')" class="dismiss-btn" title="Dismiss">
            ✕
          </button>
        </div>
      </div>
      
      <!-- Progress bar for auto-dismiss -->
      <div class="auto-dismiss-progress">
        <div class="progress-bar" :style="{ animationDuration: `${autoDismissTime}ms` }"></div>
      </div>
    </div>
  </transition>
</template>

<script setup>
import { computed, onMounted, onUnmounted } from 'vue'

// Props
const props = defineProps({
  notification: {
    type: Object,
    required: true,
    validator: (value) => {
      return value && typeof value.message === 'string'
    }
  },
  autoDismissTime: {
    type: Number,
    default: 10000 // 10 seconds
  },
  type: {
    type: String,
    default: 'success',
    validator: (value) => ['success', 'info', 'warning', 'error'].includes(value)
  }
})

// Emits
const emit = defineEmits(['dismiss'])

// Auto-dismiss timer
let autoDismissTimer = null

// Computed
const notificationClass = computed(() => {
  return `notification-${props.type}`
})

const notificationIcon = computed(() => {
  const icons = {
    success: '🎉',
    info: 'ℹ️',
    warning: '⚠️',
    error: '❌'
  }
  
  // For new races, always use the celebration icon
  if (props.notification.races?.length > 0) {
    return '🆕'
  }
  
  return icons[props.type] || 'ℹ️'
})

// Methods
function formatStatus(status) {
  const statusMap = {
    completed: 'Completed',
    provisional: 'Provisional',
    in_progress: 'In Progress',
    scheduled: 'Scheduled',
    postponed: 'Postponed'
  }
  return statusMap[status] || status
}

function formatTime(isoString) {
  if (!isoString) return ''
  return new Date(isoString).toLocaleTimeString([], { 
    hour: '2-digit', 
    minute: '2-digit' 
  })
}

function formatTimeAgo(isoString) {
  if (!isoString) return ''
  
  const now = new Date()
  const timestamp = new Date(isoString)
  const diffMs = now - timestamp
  const diffSeconds = Math.floor(diffMs / 1000)
  const diffMinutes = Math.floor(diffSeconds / 60)
  
  if (diffSeconds < 60) {
    return 'Just now'
  } else if (diffMinutes === 1) {
    return '1 minute ago'
  } else if (diffMinutes < 60) {
    return `${diffMinutes} minutes ago`
  } else {
    return timestamp.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  }
}

function handleAutoDismiss() {
  if (props.autoDismissTime > 0) {
    autoDismissTimer = setTimeout(() => {
      emit('dismiss')
    }, props.autoDismissTime)
  }
}

function clearAutoDismiss() {
  if (autoDismissTimer) {
    clearTimeout(autoDismissTimer)
    autoDismissTimer = null
  }
}

// Lifecycle
onMounted(() => {
  handleAutoDismiss()
})

onUnmounted(() => {
  clearAutoDismiss()
})
</script>

<style scoped>
.race-notification-banner {
  position: relative;
  margin: 0 20px 20px 20px;
  border-radius: 12px;
  border: 2px solid;
  backdrop-filter: blur(10px);
  overflow: hidden;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  z-index: 1000;
}

/* Notification Types */
.notification-success {
  background: rgba(40, 167, 69, 0.15);
  border-color: rgba(40, 167, 69, 0.4);
  color: #28a745;
}

.notification-info {
  background: rgba(78, 205, 196, 0.15);
  border-color: rgba(78, 205, 196, 0.4);
  color: #4ecdc4;
}

.notification-warning {
  background: rgba(255, 193, 7, 0.15);
  border-color: rgba(255, 193, 7, 0.4);
  color: #ffc107;
}

.notification-error {
  background: rgba(220, 53, 69, 0.15);
  border-color: rgba(220, 53, 69, 0.4);
  color: #dc3545;
}

/* Content */
.notification-content {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  padding: 20px;
}

.notification-icon {
  flex-shrink: 0;
}

.notification-icon .icon {
  font-size: 1.5rem;
  display: block;
  animation: bounce 2s ease-in-out infinite;
}

.notification-message {
  flex: 1;
  min-width: 0;
}

.message-title {
  margin: 0 0 12px 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: white;
}

.races-list {
  margin-bottom: 12px;
}

.race-item {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  font-size: 0.9rem;
}

.race-title {
  font-weight: 500;
  color: white;
}

.race-status {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 500;
  text-transform: uppercase;
}

.race-status.completed {
  background: rgba(40, 167, 69, 0.3);
  color: #28a745;
}

.race-status.provisional {
  background: rgba(255, 193, 7, 0.3);
  color: #ffc107;
}

.race-status.in_progress {
  background: rgba(23, 162, 184, 0.3);
  color: #17a2b8;
}

.race-time {
  margin-left: auto;
  font-size: 0.8rem;
  opacity: 0.8;
  color: white;
}

.notification-timestamp {
  font-size: 0.8rem;
  opacity: 0.7;
  color: white;
}

.notification-actions {
  flex-shrink: 0;
}

.dismiss-btn {
  width: 32px;
  height: 32px;
  border: none;
  background: rgba(255, 255, 255, 0.2);
  color: white;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
  transition: all 0.3s ease;
}

.dismiss-btn:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: scale(1.1);
}

/* Auto-dismiss Progress */
.auto-dismiss-progress {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: rgba(255, 255, 255, 0.2);
  overflow: hidden;
}

.progress-bar {
  height: 100%;
  background: currentColor;
  width: 100%;
  transform: translateX(-100%);
  animation: progress-fill linear forwards;
}

/* Animations */
@keyframes bounce {
  0%, 20%, 53%, 80%, 100% {
    transform: translate3d(0,0,0);
  }
  40%, 43% {
    transform: translate3d(0, -8px, 0);
  }
  70% {
    transform: translate3d(0, -4px, 0);
  }
  90% {
    transform: translate3d(0, -2px, 0);
  }
}

@keyframes progress-fill {
  from {
    transform: translateX(-100%);
  }
  to {
    transform: translateX(0);
  }
}

/* Transition */
.slide-down-enter-active,
.slide-down-leave-active {
  transition: all 0.5s ease;
}

.slide-down-enter-from {
  transform: translateY(-100%);
  opacity: 0;
}

.slide-down-leave-to {
  transform: translateY(-100%);
  opacity: 0;
}

/* Responsive */
@media (max-width: 768px) {
  .race-notification-banner {
    margin: 0 10px 15px 10px;
  }
  
  .notification-content {
    padding: 16px;
    gap: 12px;
  }
  
  .notification-icon .icon {
    font-size: 1.25rem;
  }
  
  .message-title {
    font-size: 1rem;
  }
  
  .race-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
  
  .race-time {
    margin-left: 0;
    align-self: flex-end;
  }
  
  .dismiss-btn {
    width: 28px;
    height: 28px;
    font-size: 0.9rem;
  }
}
</style>
