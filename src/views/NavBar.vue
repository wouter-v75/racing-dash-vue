<template>
 <nav>
  <router-link to="/results">Results</router-link>
  <router-link to="/live">Live</router-link>
  <router-link to="/performance">Performance</router-link>
  <router-link v-if="isAdmin" to="/admin/approvals">Admin</router-link>
</nav>

</template>

<script setup>
</script>

<style scoped>
.navbar {
  display: flex;
  gap: 1rem;
  padding: 0.75rem 1rem;
  background: #0b2239;
}
a {
  color: white;
  text-decoration: none;
}
a.router-link-exact-active {
  font-weight: bold;
  text-decoration: underline;
}
</style>
