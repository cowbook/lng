<script setup lang="ts">
import trafficData from '../../data/github-traffic.json'
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    title?: string
    label?: string
  }>(),
  {
    title: 'GitHub 访问量',
    label: '最近14天 Views'
  }
)

function formatNumber(value: number | undefined): string {
  if (typeof value !== 'number') {
    return '--'
  }
  return new Intl.NumberFormat('en-US').format(value)
}

const displayNote = computed(() => {
  const note = String((trafficData as { note?: string }).note || '').trim()
  if (!note) {
    return ''
  }

  const noteLower = note.toLowerCase()
  const isErrorLike =
    noteLower.includes('failed to fetch traffic data') ||
    noteLower.includes('resource not accessible by integration') ||
    noteLower.includes('github traffic api failed')

  if (isErrorLike) {
    return 'GitHub traffic data is temporarily unavailable. Displaying fallback value.'
  }

  return note
})
</script>

<template>
  <section class="gh-counter">
    <div class="gh-counter-header">
      <h3>{{ title }}</h3>
      <span class="gh-updated" v-if="trafficData.updatedAt">{{ new Date(trafficData.updatedAt).toLocaleString() }}</span>
    </div>

    <div class="gh-grid">
      <div class="gh-item">
        <span class="gh-label">{{ label }}</span>
        <strong>{{ formatNumber(trafficData.count) }}</strong>
      </div>
    </div>

    <p class="gh-note" v-if="displayNote">{{ displayNote }}</p>
  </section>
</template>

<style scoped>
.gh-counter {
  margin: 22px 0 8px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  padding: 14px;
  background: linear-gradient(135deg, rgba(80, 120, 80, 0.07), rgba(80, 80, 120, 0.03));
}

.gh-counter-header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 12px;
}

.gh-counter-header h3 {
  margin: 0;
  font-size: 15px;
}

.gh-counter-header a {
  font-size: 12px;
  color: var(--vp-c-text-2);
}

.gh-updated {
  font-size: 12px;
  color: var(--vp-c-text-2);
}

.gh-note {
  margin: 10px 0 0;
  font-size: 13px;
  color: var(--vp-c-text-2);
}

.gh-error {
  color: #b42318;
}

.gh-grid {
  margin-top: 12px;
  display: grid;
  grid-template-columns: 1fr;
  gap: 10px;
}

.gh-item {
  border: 1px solid var(--vp-c-divider);
  border-radius: 10px;
  padding: 10px;
  background: var(--vp-c-bg-soft);
}

.gh-label {
  display: block;
  font-size: 12px;
  color: var(--vp-c-text-2);
  margin-bottom: 2px;
}

.gh-item strong {
  font-size: 24px;
}

@media (max-width: 640px) {
  .gh-grid {
    grid-template-columns: 1fr;
  }
}
</style>
