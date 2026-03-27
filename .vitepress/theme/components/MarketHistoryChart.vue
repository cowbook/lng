<script setup lang="ts">
import { computed, ref } from 'vue'
import { useData } from 'vitepress'

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

const { page } = useData()
const isEn = computed(() => page.value.relativePath.startsWith('en/'))

const i18n = computed(() => {
  if (isEn.value) {
    return {
      symbol: 'Symbol',
      range: 'Range',
      samples: 'Samples',
      latest: 'Latest',
      chartAria: 'Historical line chart',
      date: 'Date',
      price: 'Price',
      tableAria: 'Historical price data table',
      tableTitle: 'Historical Price Data (Newest First)',
      tableDate: 'Date',
      tableNote: 'Table units are consistent with the chart. Units for each metric are shown in the symbol info above.',
      footnote: 'Unit',
      sourceNote: 'Historical data source: FRED (used for one-year continuous curve display).'
    }
  }

  return {
    symbol: '品种',
    range: '区间',
    samples: '样本数',
    latest: '最新',
    chartAria: '历史折线图',
    date: '日期',
    price: '价格',
    tableAria: '历史价格数据表',
    tableTitle: '历史价格数据（日期倒序）',
    tableDate: '日期',
    tableNote: '表格单位与图表一致，各指标单位可在图表上方品种信息中查看。',
    footnote: '单位',
    sourceNote: '历史数据源: FRED（用于一年期连续曲线展示）。'
  }
})

const selectedSymbol = ref('TTF')
const hoveredIndex = ref<number | null>(null)

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

const tableColumns = computed(() => {
  return allSeries.value.map((s) => ({
    symbol: s.symbol,
    displayName: s.displayName,
    unit: s.unit
  }))
})

const tableRows = computed(() => {
  const allDates = new Set<string>()
  const valueBySeries = new Map<string, Map<string, number>>()

  for (const series of allSeries.value) {
    const perDate = new Map<string, number>()
    for (const p of series.points || []) {
      if (!p?.date) continue
      allDates.add(p.date)
      perDate.set(p.date, p.value)
    }
    valueBySeries.set(series.symbol, perDate)
  }

  return Array.from(allDates)
    .sort((a, b) => b.localeCompare(a))
    .map((date) => {
      const values = tableColumns.value.map((col) => valueBySeries.get(col.symbol)?.get(date))
      return { date, values }
    })
})

function formatTableValue(value?: number) {
  return Number.isFinite(value) ? (value as number).toFixed(3) : '-'
}

const hoverPoint = computed(() => {
  const points = activeSeries.value?.points || []
  const idx = hoveredIndex.value
  if (idx === null || !points.length || idx < 0 || idx >= points.length) return null

  const min = stats.value.min
  const max = stats.value.max
  const range = max - min || 1
  const denom = Math.max(1, points.length - 1)
  const point = points[idx]
  const x = dimensions.paddingLeft + (idx / denom) * plotArea.value.w
  const y = dimensions.paddingTop + (1 - (point.value - min) / range) * plotArea.value.h

  return {
    idx,
    x,
    y,
    date: point.date,
    value: point.value
  }
})

function onChartPointerMove(evt: PointerEvent) {
  const points = activeSeries.value?.points || []
  if (!points.length) {
    hoveredIndex.value = null
    return
  }

  const svg = evt.currentTarget as SVGRectElement | null
  const parentSvg = svg?.ownerSVGElement
  if (!parentSvg) return

  const rect = parentSvg.getBoundingClientRect()
  const scaleX = dimensions.width / Math.max(rect.width, 1)
  const localX = (evt.clientX - rect.left) * scaleX
  const clampedX = Math.min(dimensions.width - dimensions.paddingRight, Math.max(dimensions.paddingLeft, localX))

  const t = (clampedX - dimensions.paddingLeft) / Math.max(plotArea.value.w, 1)
  const idx = Math.round(t * Math.max(1, points.length - 1))
  hoveredIndex.value = Math.min(points.length - 1, Math.max(0, idx))
}

function onChartPointerLeave() {
  hoveredIndex.value = null
}
</script>

<template>
  <section class="history-card">
    <div class="toolbar">
      <label>
        {{ i18n.symbol }}
        <select v-model="selectedSymbol">
          <option v-for="s in allSeries" :key="s.symbol" :value="s.symbol">{{ s.displayName }}</option>
        </select>
      </label>
      <div class="meta">
        <span>{{ i18n.range }}: {{ history?.window?.start || '-' }} ~ {{ history?.window?.end || '-' }}</span>
        <span>{{ i18n.samples }}: {{ activeSeries?.points?.length || 0 }}</span>
        <span v-if="latestPoint">{{ i18n.latest }}: {{ latestPoint.value.toFixed(3) }} {{ activeSeries?.unit }} ({{ latestPoint.date }})</span>
      </div>
    </div>

    <svg :viewBox="`0 0 ${dimensions.width} ${dimensions.height}`" class="chart" role="img" :aria-label="i18n.chartAria">
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

      <g v-if="hoverPoint" class="indicator" pointer-events="none">
        <line
          :x1="hoverPoint.x"
          :x2="hoverPoint.x"
          :y1="dimensions.paddingTop"
          :y2="dimensions.height - dimensions.paddingBottom"
          class="indicator-line"
        />
        <circle :cx="hoverPoint.x" :cy="hoverPoint.y" r="4.2" class="indicator-dot" />

        <g :transform="`translate(${Math.min(dimensions.width - 210, Math.max(10, hoverPoint.x - 80))},${dimensions.paddingTop + 8})`">
          <rect width="200" height="48" rx="8" class="indicator-card" />
          <text x="10" y="20" class="indicator-text">{{ i18n.date }}: {{ hoverPoint.date }}</text>
          <text x="10" y="37" class="indicator-text">
            {{ i18n.price }}: {{ hoverPoint.value.toFixed(3) }} {{ activeSeries?.unit }}
          </text>
        </g>
      </g>

      <rect
        :x="dimensions.paddingLeft"
        :y="dimensions.paddingTop"
        :width="plotArea.w"
        :height="plotArea.h"
        class="hover-layer"
        @pointermove="onChartPointerMove"
        @pointerleave="onChartPointerLeave"
      />

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

    <section class="data-table-wrap" :aria-label="i18n.tableAria">
      <h4 class="table-title">{{ i18n.tableTitle }}</h4>
      <div class="table-scroll">
        <table class="data-table">
          <thead>
            <tr>
              <th>{{ i18n.tableDate }}</th>
              <th v-for="col in tableColumns" :key="`th-${col.symbol}`">
                {{ col.displayName }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in tableRows" :key="`row-${row.date}`">
              <td>{{ row.date }}</td>
              <td v-for="(val, idx) in row.values" :key="`cell-${row.date}-${tableColumns[idx]?.symbol || idx}`">
                {{ formatTableValue(val) }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p class="table-note">{{ i18n.tableNote }}</p>
    </section>

    <p class="footnote">{{ i18n.footnote }}: {{ activeSeries?.unit || '-' }}。{{ i18n.sourceNote }}</p>
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

.hover-layer {
  fill: transparent;
  cursor: crosshair;
}

.indicator-line {
  stroke: color-mix(in srgb, #18794e 70%, #ffffff 30%);
  stroke-width: 1.2;
  stroke-dasharray: 3 3;
}

.indicator-dot {
  fill: #18794e;
  stroke: var(--vp-c-bg);
  stroke-width: 2;
}

.indicator-card {
  fill: color-mix(in srgb, var(--vp-c-bg) 90%, #ffffff 10%);
  stroke: var(--vp-c-divider);
}

.indicator-text {
  fill: var(--vp-c-text-1);
  font-size: 11px;
}

.axis-label {
  fill: var(--vp-c-text-2);
  font-size: 11px;
}

.data-table-wrap {
  margin-top: 14px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  background: var(--vp-c-bg);
}

.table-title {
  margin: 0;
  padding: 10px 12px;
  border-bottom: 1px solid var(--vp-c-divider);
  font-size: 14px;
}

.table-scroll {
  max-height: 320px;
  overflow: auto;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
}

.data-table th,
.data-table td {
  padding: 8px 10px;
  border-bottom: 1px solid var(--vp-c-divider);
  text-align: right;
  white-space: nowrap;
}

.data-table th:first-child,
.data-table td:first-child {
  text-align: left;
}

.data-table thead th {
  position: sticky;
  top: 0;
  z-index: 1;
  background: color-mix(in srgb, var(--vp-c-bg-soft) 80%, var(--vp-c-bg) 20%);
}

.table-note {
  margin: 0;
  padding: 8px 12px 10px;
  color: var(--vp-c-text-2);
  font-size: 12px;
}

.footnote {
  margin: 6px 0 0;
  color: var(--vp-c-text-2);
  font-size: 12px;
}
</style>
