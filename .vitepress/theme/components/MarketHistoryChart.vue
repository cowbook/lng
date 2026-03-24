<script setup lang="ts">
import { computed, ref } from 'vue'

type Point = {
  date: string
  value: number
}

type Series = {
  symbol: string
  displayName: string
  unit: string
  sourceSeriesId: string
  note?: string
  points: Point[]
}

type HistoryData = {
  updatedAt?: string
  window?: {
    start?: string
    end?: string
  }
  series?: Series[]
}

const props = defineProps<{
  history: HistoryData
}>()

const selectedSymbol = ref('TTF')

const allSeries = computed(() => {
  const rows = Array.isArray(props.history?.series) ? props.history.series : []
  return rows.filter((x) => x && x.symbol && Array.isArray(x.points))
})

if (!allSeries.value.find((x) => x.symbol === selectedSymbol.value) && allSeries.value.length) {
  selectedSymbol.value = allSeries.value[0].symbol
}

const activeSeries = computed(() => {
  return allSeries.value.find((x) => x.symbol === selectedSymbol.value) || allSeries.value[0]
})

const dimensions = {
  width: 920,
  height: 320,
  paddingLeft: 56,
  paddingRight: 18,
  paddingTop: 14,
  paddingBottom: 34
}

const plotArea = computed(() => ({
  w: dimensions.width - dimensions.paddingLeft - dimensions.paddingRight,
  h: dimensions.height - dimensions.paddingTop - dimensions.paddingBottom
}))

const stats = computed(() => {
  const points = activeSeries.value?.points || []
  const values = points.map((x) => x.value).filter((x) => Number.isFinite(x))

  const min = values.length ? Math.min(...values) : 0
  const max = values.length ? Math.max(...values) : 1
  const spread = max - min
  const pad = spread > 0 ? spread * 0.08 : Math.max(max * 0.1, 1)

  return {
    min: min - pad,
    max: max + pad
  }
})

const polylinePoints = computed(() => {
  const points = activeSeries.value?.points || []
  if (!points.length) return ''

  const min = stats.value.min
  const max = stats.value.max
  const range = max - min || 1
  const denom = Math.max(1, points.length - 1)

  return points
    .map((p, idx) => {
      const x = dimensions.paddingLeft + (idx / denom) * plotArea.value.w
      const y = dimensions.paddingTop + (1 - (p.value - min) / range) * plotArea.value.h
      return `${x.toFixed(2)},${y.toFixed(2)}`
    })
    .join(' ')
})

const yTicks = computed(() => {
  const rows: Array<{ y: number; value: string }> = []
  const tickCount = 5
  const min = stats.value.min
  const max = stats.value.max

  for (let i = 0; i < tickCount; i += 1) {
    const t = i / (tickCount - 1)
    const v = max - t * (max - min)
    const y = dimensions.paddingTop + t * plotArea.value.h
    rows.push({
      y,
      value: v.toFixed(2)
    })
  }

  return rows
})

const xLabels = computed(() => {
  const points = activeSeries.value?.points || []
  if (!points.length) return []
  const idxList = [0, Math.floor(points.length / 2), points.length - 1]
  return idxList.map((idx) => {
    const x = dimensions.paddingLeft + (idx / Math.max(1, points.length - 1)) * plotArea.value.w
    return {
      x,
      date: points[idx]?.date || ''
    }
  })
})

const latestPoint = computed(() => {
  const points = activeSeries.value?.points || []
  return points.length ? points[points.length - 1] : null
})
</script>

<template>
  <section class="history-card">
    <div class="toolbar">
      <label>
        品种
        <select v-model="selectedSymbol">
          <option v-for="s in allSeries" :key="s.symbol" :value="s.symbol">{{ s.displayName }}</option>
        </select>
      </label>
      <div class="meta">
        <span>区间: {{ history?.window?.start || '-' }} ~ {{ history?.window?.end || '-' }}</span>
        <span>样本数: {{ activeSeries?.points?.length || 0 }}</span>
        <span v-if="latestPoint">最新: {{ latestPoint.value.toFixed(3) }} {{ activeSeries?.unit }} ({{ latestPoint.date }})</span>
      </div>
    </div>

    <svg :viewBox="`0 0 ${dimensions.width} ${dimensions.height}`" class="chart" role="img" aria-label="历史折线图">
      <g>
        <line
          v-for="(tick, idx) in yTicks"
          :key="`grid-${idx}`"
          :x1="dimensions.paddingLeft"
          :x2="dimensions.width - dimensions.paddingRight"
          :y1="tick.y"
          :y2="tick.y"
          class="grid"
        />
      </g>

      <polyline :points="polylinePoints" class="line" fill="none" />

      <g>
        <text
          v-for="(tick, idx) in yTicks"
          :key="`yl-${idx}`"
          :x="dimensions.paddingLeft - 8"
          :y="tick.y + 4"
          text-anchor="end"
          class="axis-label"
        >{{ tick.value }}</text>
      </g>

      <g>
        <text
          v-for="(lbl, idx) in xLabels"
          :key="`xl-${idx}`"
          :x="lbl.x"
          :y="dimensions.height - 8"
          text-anchor="middle"
          class="axis-label"
        >{{ lbl.date }}</text>
      </g>
    </svg>

    <p class="footnote">单位: {{ activeSeries?.unit || '-' }}。历史数据源: FRED（用于一年期连续曲线展示）。</p>
  </section>
</template>

<style scoped>
.history-card {
  border: 1px solid var(--vp-c-divider);
  border-radius: 14px;
  padding: 14px;
  margin: 12px 0 18px;
  background: linear-gradient(180deg, var(--vp-c-bg-soft), var(--vp-c-bg));
}

.toolbar {
  display: grid;
  gap: 10px;
  margin-bottom: 10px;
}

.toolbar label {
  display: inline-grid;
  gap: 6px;
  width: 240px;
  font-size: 14px;
}

.toolbar select {
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  padding: 6px 10px;
}

.meta {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  color: var(--vp-c-text-2);
  font-size: 13px;
}

.chart {
  width: 100%;
  height: auto;
  display: block;
}

.grid {
  stroke: color-mix(in srgb, var(--vp-c-text-3) 40%, transparent);
  stroke-width: 1;
}

.line {
  stroke: #18794e;
  stroke-width: 2.6;
  stroke-linejoin: round;
  stroke-linecap: round;
}

.axis-label {
  fill: var(--vp-c-text-2);
  font-size: 11px;
}

.footnote {
  margin: 6px 0 0;
  color: var(--vp-c-text-2);
  font-size: 12px;
}
</style>
