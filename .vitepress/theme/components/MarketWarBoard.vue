<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useData, useRoute } from 'vitepress'

type PriceItem = {
  symbol: string
  displayName: string
  value: number | null
  unit: string
  date?: string
  note?: string
}

type PriceData = {
  updatedAt?: string
  items?: PriceItem[]
}

type HistoryPoint = {
  date: string
  value: number
}

type HistorySeries = {
  symbol: string
  displayName: string
  unit: string
  source?: string
  note?: string
  points: HistoryPoint[]
}

type HistoryRow = {
  date: string
  brent: number | null
  jkm: number | null
  ttf: number | null
  henryHub: number | null
  ttfOriginvalue?: number | null
}

type HistoryData = {
  window?: {
    start?: string
    end?: string
  }
  series?: HistorySeries[]
  rows?: HistoryRow[]
}

type HealthData = {
  status?: string
  warnings?: string[]
}

const props = defineProps<{
  prices: PriceData
  history: HistoryData
  health?: HealthData
}>()

const { lang } = useData()
const route = useRoute()
const isEnglish = computed(() => {
  const byPath = (route.path || '').startsWith('/en/')
  const byLang = (lang.value || '').toLowerCase().startsWith('en')
  return byPath || byLang
})

const labelMap: Record<string, { zh: string; en: string }> = {
  Brent: { zh: 'Brent 原油', en: 'Brent Crude' },
  JKM: { zh: 'JKM LNG', en: 'JKM LNG' },
  TTF: { zh: 'TTF 气价', en: 'TTF Gas' },
  'Henry Hub': { zh: 'Henry Hub 天然气', en: 'Henry Hub Gas' }
}

function displayLabel(symbol: string, fallback?: string) {
  const mapped = labelMap[symbol]
  if (!mapped) return fallback || symbol
  return isEnglish.value ? mapped.en : mapped.zh
}

const cardOrder = ['Brent', 'JKM', 'TTF', 'Henry Hub']

const colorMap: Record<string, string> = {
  Brent: '#ff8f00',
  JKM: '#00b8d9',
  TTF: '#00c853',
  'Henry Hub': '#7c4dff'
}

const visibleSymbols = ref<string[]>([...cardOrder])
const rangeMode = ref<'7d' | '30d' | '1y'>('30d')
const compareMode = ref<'absolute' | 'indexed'>('absolute')

const fmt = (value: number | null | undefined) => {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '-'
  return Number(value).toFixed(3)
}

const cards = computed(() => {
  const rows = Array.isArray(props.prices?.items) ? props.prices.items : []
  return cardOrder
    .map((symbol) => rows.find((x) => x.symbol === symbol))
    .filter((x): x is PriceItem => Boolean(x))
    .map((x) => ({
      ...x,
      displayName: displayLabel(x.symbol, x.displayName)
    }))
})

const historyMap = computed(() => {
  const rows = Array.isArray(props.history?.series) ? props.history.series : []
  const m = new Map<string, HistorySeries>()
  for (const row of rows) {
    m.set(row.symbol, row)
  }
  return m
})

const activeSeries = computed(() => {
  return visibleSymbols.value
    .map((symbol) => historyMap.value.get(symbol))
    .filter((x): x is HistorySeries => Boolean(x))
})

const allDates = computed(() => {
  const set = new Set<string>()
  for (const s of activeSeries.value) {
    for (const p of s.points || []) {
      if (p.date) set.add(p.date)
    }
  }
  return [...set].sort((a, b) => a.localeCompare(b))
})

const plotDates = computed(() => {
  const dates = allDates.value
  if (!dates.length) return []
  if (rangeMode.value === '7d') return dates.slice(-7)
  if (rangeMode.value === '30d') return dates.slice(-30)
  return dates
})

const dimensions = {
  width: 1080,
  height: 410,
  left: 62,
  right: 24,
  top: 20,
  bottom: 44
}

const plot = computed(() => ({
  w: dimensions.width - dimensions.left - dimensions.right,
  h: dimensions.height - dimensions.top - dimensions.bottom
}))

const hoverIndex = ref<number | null>(null)

const valueStats = computed(() => {
  const values: number[] = []
  const dates = new Set(plotDates.value)

  for (const s of activeSeries.value) {
    const byDate = new Map<string, number>()
    for (const p of s.points || []) {
      if (dates.has(p.date) && Number.isFinite(p.value)) byDate.set(p.date, p.value)
    }

    const rowValues = plotDates.value
      .map((d) => byDate.get(d))
      .filter((v): v is number => Number.isFinite(v))

    if (compareMode.value === 'indexed') {
      const base = rowValues[0]
      if (!Number.isFinite(base) || !base) continue
      for (const v of rowValues) values.push((v / base) * 100)
    } else {
      for (const v of rowValues) values.push(v)
    }
  }

  if (!values.length) {
    return { min: 0, max: 1 }
  }

  const min = Math.min(...values)
  const max = Math.max(...values)
  const spread = max - min
  const pad = spread > 0 ? spread * 0.07 : Math.max(Math.abs(max) * 0.08, 1)
  return {
    min: min - pad,
    max: max + pad
  }
})

const yTicks = computed(() => {
  const out: Array<{ y: number; value: string }> = []
  const n = 5
  const min = valueStats.value.min
  const max = valueStats.value.max

  for (let i = 0; i < n; i += 1) {
    const t = i / (n - 1)
    const y = dimensions.top + t * plot.value.h
    const v = max - t * (max - min)
    out.push({ y, value: compareMode.value === 'absolute' ? v.toFixed(2) : `${v.toFixed(1)}` })
  }
  return out
})

const xLabels = computed(() => {
  const dates = plotDates.value
  if (!dates.length) return []
  const idxList = [0, Math.floor(dates.length / 2), dates.length - 1]
  return idxList.map((idx) => ({
    x: dimensions.left + (idx / Math.max(1, dates.length - 1)) * plot.value.w,
    text: dates[idx]
  }))
})

const polylines = computed(() => {
  const dates = plotDates.value
  if (!dates.length) return []

  const min = valueStats.value.min
  const max = valueStats.value.max
  const range = max - min || 1

  return activeSeries.value.map((s) => {
    const byDate = new Map<string, number>()
    for (const p of s.points || []) {
      byDate.set(p.date, p.value)
    }

    const pts: string[] = []
    const pointList: Array<{ date: string; x: number; y: number; value: number }> = []
    const values = dates.map((d) => byDate.get(d))
    let base = 0
    if (compareMode.value === 'indexed') {
      const first = values.find((v): v is number => Number.isFinite(v as number))
      base = Number(first || 0)
    }

    dates.forEach((d, idx) => {
      const raw = byDate.get(d)
      if (!Number.isFinite(raw)) return
      let v = raw as number
      if (compareMode.value === 'indexed') {
        v = ((raw as number) / (base || 1)) * 100
      }
      const x = dimensions.left + (idx / Math.max(1, dates.length - 1)) * plot.value.w
      const y = dimensions.top + (1 - (v - min) / range) * plot.value.h
      pts.push(`${x.toFixed(2)},${y.toFixed(2)}`)
      pointList.push({ date: d, x, y, value: v })
    })

    return {
      symbol: s.symbol,
      displayName: displayLabel(s.symbol, s.displayName),
      unit: s.unit,
      color: colorMap[s.symbol] || '#90a4ae',
      points: pts.join(' '),
      pointList
    }
  }).filter((x) => x.points)
})

const hoverDate = computed(() => {
  if (hoverIndex.value === null) return ''
  return plotDates.value[hoverIndex.value] || ''
})

const hoverX = computed(() => {
  if (hoverIndex.value === null) return null
  const n = Math.max(1, plotDates.value.length - 1)
  return dimensions.left + (hoverIndex.value / n) * plot.value.w
})

const hoveredRows = computed(() => {
  const d = hoverDate.value
  if (!d) return []
  return polylines.value
    .map((line) => {
      const p = line.pointList.find((x) => x.date === d)
      if (!p) return null
      return {
        symbol: line.symbol,
        displayName: line.displayName,
        color: line.color,
        unit: line.unit,
        x: p.x,
        y: p.y,
        value: p.value
      }
    })
    .filter((x): x is { symbol: string; displayName: string; color: string; unit: string; x: number; y: number; value: number } => Boolean(x))
})

const tooltipWidth = 250
const tooltipHeight = computed(() => 24 + hoveredRows.value.length * 14)
const tooltipX = computed(() => {
  const x = hoverX.value
  if (x === null) return dimensions.left + 8
  const minX = dimensions.left + 8
  const maxX = dimensions.width - dimensions.right - tooltipWidth - 4
  return Math.max(minX, Math.min(maxX, x + 10))
})
const tooltipY = dimensions.top + 8

function fmtHover(v: number) {
  return compareMode.value === 'absolute' ? v.toFixed(3) : v.toFixed(2)
}

function onChartMove(e: MouseEvent) {
  const target = e.currentTarget as SVGRectElement | null
  if (!target) return
  const bounds = target.getBoundingClientRect()
  const raw = e.clientX - bounds.left
  const ratio = Math.max(0, Math.min(1, raw / bounds.width))
  const idx = Math.round(ratio * Math.max(0, plotDates.value.length - 1))
  hoverIndex.value = Number.isFinite(idx) ? idx : null
}

function onChartLeave() {
  hoverIndex.value = null
}

function toggleSymbol(symbol: string) {
  if (visibleSymbols.value.includes(symbol)) {
    visibleSymbols.value = visibleSymbols.value.filter((x) => x !== symbol)
  } else {
    visibleSymbols.value = [...visibleSymbols.value, symbol]
  }
}

function isActive(symbol: string) {
  return visibleSymbols.value.includes(symbol)
}

const sourceRows = computed(() => {
  const history = historyMap.value
  const rows = cards.value.map((c) => {
    const h = history.get(c.symbol)
    return {
      symbol: c.symbol,
      name: c.displayName,
      liveNote: c.note || '-',
      historySource: h?.source || '-',
      historyNote: h?.note || '-'
    }
  })
  return rows
})

const fallbackHints = computed(() => {
  const out: string[] = []
  for (const c of cards.value) {
    const note = (c.note || '').toLowerCase()
    if (note.includes('fallback') || note.includes('回退') || note.includes('缓存') || note.includes('代理')) {
      out.push(`${c.displayName}: ${c.note}`)
    }
  }
  for (const w of props.health?.warnings || []) {
    out.push(w)
  }
  return out
})

const statusText = computed(() => {
  if (props.health?.status === 'ok') {
    return isEnglish.value ? 'Stable' : '系统稳定'
  }
  return isEnglish.value ? 'Degraded' : '数据降级'
})

const boardTitle = computed(() => (isEnglish.value ? 'LNG Market War Room' : 'LNG 市场战情看板'))
const updatedLabel = computed(() => (isEnglish.value ? 'Updated' : '更新'))
const rangeLabel = computed(() => (isEnglish.value ? 'Range' : '时间范围'))
const compareLabel = computed(() => (isEnglish.value ? 'Compare' : '对比模式'))
const compareAbsText = computed(() => (isEnglish.value ? 'Absolute' : '绝对值'))
const compareIdxText = computed(() => (isEnglish.value ? 'Indexed (start=100)' : '指数化(起点=100)'))
const sourceTitle = computed(() => (isEnglish.value ? 'Source and Fallback Notes' : '来源与回退说明'))
const liveSourceLabel = computed(() => (isEnglish.value ? 'Realtime note' : '实时来源'))
const histSourceLabel = computed(() => (isEnglish.value ? 'History source' : '历史来源'))
const fallbackTitle = computed(() => (isEnglish.value ? 'Warnings / fallback' : '异常与回退'))
const fullscreenText = computed(() => (isEnglish.value ? 'Fullscreen Chart' : '图表全屏'))
const exitFullscreenText = computed(() => (isEnglish.value ? 'Exit Fullscreen' : '退出全屏'))
const emptyHintText = computed(() => {
  return isEnglish.value
    ? 'No metric selected. Click the items above to show corresponding lines.'
    : '当前未选中任何指标，点击上方卡片可显示对应曲线。'
})
const chartAriaLabel = computed(() => (isEnglish.value ? 'Combined multi-metric line chart' : '多指标合并折线图'))
const tableTitle = computed(() => (isEnglish.value ? 'Historical Data (by Date)' : '历史数据（按日期）'))
const tableDateLabel = computed(() => (isEnglish.value ? 'Date' : '日期'))
const noTableDataHint = computed(() => (isEnglish.value ? 'No data in selected range.' : '当前时间范围内无数据。'))

const unitBySymbol = computed(() => {
  const map = new Map<string, string>()
  for (const card of cards.value) {
    map.set(card.symbol, card.unit)
  }
  for (const item of props.history?.series || []) {
    if (!map.has(item.symbol) && item.unit) {
      map.set(item.symbol, item.unit)
    }
  }
  return map
})

const historyRows = computed(() => {
  const sourceRows = Array.isArray(props.history?.rows) ? props.history.rows : []
  if (sourceRows.length) {
    return sourceRows
      .filter((row) => typeof row?.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(row.date))
      .map((row) => ({
        date: row.date,
        brent: Number.isFinite(Number(row.brent)) ? Number(row.brent) : null,
        jkm: Number.isFinite(Number(row.jkm)) ? Number(row.jkm) : null,
        ttf: Number.isFinite(Number(row.ttf)) ? Number(row.ttf) : null,
        henryHub: Number.isFinite(Number(row.henryHub)) ? Number(row.henryHub) : null,
        ttfOriginvalue: Number.isFinite(Number(row.ttfOriginvalue)) ? Number(row.ttfOriginvalue) : null
      }))
  }

  const mapBySymbol = historyMap.value
  const byDate = new Map<string, HistoryRow>()
  for (const symbol of cardOrder) {
    const series = mapBySymbol.get(symbol)
    if (!series) continue

    for (const point of series.points || []) {
      if (!point?.date) continue
      const row = byDate.get(point.date) || {
        date: point.date,
        brent: null,
        jkm: null,
        ttf: null,
        henryHub: null,
        ttfOriginvalue: null
      }

      const value = Number.isFinite(Number(point.value)) ? Number(point.value) : null
      if (symbol === 'Brent') row.brent = value
      if (symbol === 'JKM') row.jkm = value
      if (symbol === 'TTF') row.ttf = value
      if (symbol === 'Henry Hub') row.henryHub = value

      byDate.set(point.date, row)
    }
  }

  return [...byDate.values()]
})

const rangeDatesAsc = computed(() => {
  const dates = [...new Set(historyRows.value.map((row) => row.date))].sort((a, b) => a.localeCompare(b))
  if (rangeMode.value === '7d') return dates.slice(-7)
  if (rangeMode.value === '30d') return dates.slice(-30)
  return dates
})

const historyTableRows = computed(() => {
  const selectedDates = new Set(rangeDatesAsc.value)
  return historyRows.value
    .filter((row) => selectedDates.has(row.date))
    .sort((a, b) => b.date.localeCompare(a.date))
})

const fullscreenPanelRef = ref<HTMLElement | null>(null)
const isChartFullscreen = ref(false)

async function toggleChartFullscreen() {
  const el = fullscreenPanelRef.value
  if (!el) return

  if (!document.fullscreenElement) {
    await el.requestFullscreen()
  } else {
    await document.exitFullscreen()
  }
}

function syncFullscreenState() {
  isChartFullscreen.value = document.fullscreenElement === fullscreenPanelRef.value
}

onMounted(() => {
  document.addEventListener('fullscreenchange', syncFullscreenState)
})

onBeforeUnmount(() => {
  document.removeEventListener('fullscreenchange', syncFullscreenState)
})
</script>

<template>
  <section class="war-board">
    <header class="war-head">
      <div class="war-head-main">
        <div class="war-title-row">
          <h2>{{ boardTitle }}</h2>
          <button class="ctl-btn" type="button" @click="toggleChartFullscreen">
            {{ isChartFullscreen ? exitFullscreenText : fullscreenText }}
          </button>
        </div>
        <div class="war-meta">
          <span>{{ updatedLabel }}: {{ prices?.updatedAt || '-' }}</span>
          <span :class="['status-pill', health?.status === 'ok' ? 'ok' : 'degraded']">{{ statusText }}</span>
        </div>
      </div>
    </header>

    <div ref="fullscreenPanelRef" :class="['fullscreen-panel', isChartFullscreen ? 'is-fullscreen' : '']">
    <div class="control-row">
      <div class="control-group">
        <span class="control-label">{{ rangeLabel }}</span>
        <button :class="['ctl-btn', rangeMode === '7d' ? 'active' : '']" type="button" @click="rangeMode = '7d'">7D</button>
        <button :class="['ctl-btn', rangeMode === '30d' ? 'active' : '']" type="button" @click="rangeMode = '30d'">30D</button>
        <button :class="['ctl-btn', rangeMode === '1y' ? 'active' : '']" type="button" @click="rangeMode = '1y'">1Y</button>
      </div>
      <div class="control-group">
        <span class="control-label">{{ compareLabel }}</span>
        <button :class="['ctl-btn', compareMode === 'absolute' ? 'active' : '']" type="button" @click="compareMode = 'absolute'">{{ compareAbsText }}</button>
        <button :class="['ctl-btn', compareMode === 'indexed' ? 'active' : '']" type="button" @click="compareMode = 'indexed'">{{ compareIdxText }}</button>
      </div>
    </div>

    <div class="cards-grid">
      <button
        v-for="item in cards"
        :key="item.symbol"
        type="button"
        :class="['metric-card', isActive(item.symbol) ? 'active' : 'inactive']"
        :style="{ '--accent': colorMap[item.symbol] || '#90a4ae' }"
        @click="toggleSymbol(item.symbol)"
      >
        <div class="metric-top">
          <span class="metric-name">{{ item.displayName }}</span>
          <span class="metric-date">{{ item.date || '-' }}</span>
        </div>
        <div class="metric-value">{{ fmt(item.value) }}</div>
        <div class="metric-unit">{{ item.unit }}</div>
      </button>
    </div>

    <div class="chart-shell">
      <svg v-if="polylines.length" :viewBox="`0 0 ${dimensions.width} ${dimensions.height}`" class="chart" role="img" :aria-label="chartAriaLabel">
        <g>
          <line
            v-for="(tick, idx) in yTicks"
            :key="`g-${idx}`"
            :x1="dimensions.left"
            :x2="dimensions.width - dimensions.right"
            :y1="tick.y"
            :y2="tick.y"
            class="grid"
          />
        </g>

        <g>
          <polyline
            v-for="line in polylines"
            :key="line.symbol"
            :points="line.points"
            fill="none"
            :stroke="line.color"
            class="line"
          />
        </g>

        <rect
          :x="dimensions.left"
          :y="dimensions.top"
          :width="plot.w"
          :height="plot.h"
          class="hover-capture"
          @mousemove="onChartMove"
          @mouseleave="onChartLeave"
        />

        <g v-if="hoverDate && hoveredRows.length && hoverX !== null">
          <line
            :x1="hoverX"
            :x2="hoverX"
            :y1="dimensions.top"
            :y2="dimensions.top + plot.h"
            class="hover-line"
          />

          <circle
            v-for="row in hoveredRows"
            :key="`hp-${row.symbol}`"
            :cx="row.x"
            :cy="row.y"
            r="3.5"
            :fill="row.color"
            class="hover-point"
          />

          <rect
            :x="tooltipX"
            :y="tooltipY"
            :width="tooltipWidth"
            :height="tooltipHeight"
            rx="6"
            class="hover-tooltip-bg"
          />

          <text :x="tooltipX + 8" :y="tooltipY + 14" class="hover-tooltip-text">
            <tspan :x="tooltipX + 8" dy="0">{{ hoverDate }}</tspan>
            <tspan
              v-for="row in hoveredRows"
              :key="`ht-${row.symbol}`"
              :x="tooltipX + 8"
              dy="14"
            >{{ row.displayName }}: {{ fmtHover(row.value) }}{{ compareMode === 'absolute' ? ` ${row.unit}` : '' }}</tspan>
          </text>
        </g>

        <g>
          <text
            v-for="(tick, idx) in yTicks"
            :key="`yl-${idx}`"
            :x="dimensions.left - 8"
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
            :y="dimensions.height - 10"
            text-anchor="middle"
            class="axis-label"
          >{{ lbl.text }}</text>
        </g>
      </svg>

      <div v-else class="empty-hint">{{ emptyHintText }}</div>
    </div>

    <div class="legend-row" v-if="polylines.length">
      <span v-for="line in polylines" :key="`legend-${line.symbol}`" class="legend-item">
        <i :style="{ background: line.color }" />
        {{ line.displayName }}
      </span>
    </div>
    </div>

    <section class="history-table-block">
      <h3>{{ tableTitle }}</h3>
      <div class="table-shell" v-if="historyTableRows.length">
        <table class="history-table">
          <thead>
            <tr>
              <th>{{ tableDateLabel }}</th>
              <th>{{ displayLabel('Brent') }} ({{ unitBySymbol.get('Brent') || 'USD/Barrel' }})</th>
              <th>{{ displayLabel('JKM') }} ({{ unitBySymbol.get('JKM') || 'USD/MMBtu' }})</th>
              <th>{{ displayLabel('TTF') }} ({{ unitBySymbol.get('TTF') || 'USD/MMBtu' }})</th>
              <th>{{ displayLabel('Henry Hub') }} ({{ unitBySymbol.get('Henry Hub') || 'USD/MMBtu' }})</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in historyTableRows" :key="`h-row-${row.date}`">
              <td>{{ row.date }}</td>
              <td>{{ fmt(row.brent) }}</td>
              <td>{{ fmt(row.jkm) }}</td>
              <td>{{ fmt(row.ttf) }}</td>
              <td>{{ fmt(row.henryHub) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-else class="empty-hint table-empty">{{ noTableDataHint }}</div>
    </section>

    <section class="source-block">
      <h3>{{ sourceTitle }}</h3>
      <div class="source-grid">
        <div v-for="row in sourceRows" :key="`src-${row.symbol}`" class="source-item">
          <strong>{{ row.name }}</strong>
          <div>{{ liveSourceLabel }}: {{ row.liveNote }}</div>
          <div>{{ histSourceLabel }}: {{ row.historySource }}</div>
        </div>
      </div>
    </section>

    <section class="warn-block" v-if="fallbackHints.length">
      <h3>{{ fallbackTitle }}</h3>
      <ul class="warn-list">
        <li v-for="(msg, idx) in fallbackHints" :key="`w-${idx}`">{{ msg }}</li>
      </ul>
    </section>

    <ul v-else-if="(health?.warnings || []).length" class="warn-list">
      <li v-for="(msg, idx) in health?.warnings" :key="`w-legacy-${idx}`">{{ msg }}</li>
    </ul>
  </section>
</template>

<style scoped>
.war-board {
  --wb-text: var(--vp-c-text-1);
  --wb-subtle: var(--vp-c-text-2);
  --wb-heading: var(--vp-c-text-1);
  --wb-divider: color-mix(in srgb, var(--vp-c-divider) 90%, transparent);
  --wb-metric-name: var(--vp-c-text-1);
  --wb-metric-date: var(--vp-c-text-2);
  --wb-metric-value: var(--vp-c-text-1);
  --wb-metric-unit: var(--vp-c-text-2);
  --wb-grid: color-mix(in srgb, var(--vp-c-divider) 85%, transparent);
  --wb-axis: var(--vp-c-text-2);
  --wb-legend: var(--vp-c-text-2);
  --wb-empty: var(--vp-c-text-2);

  padding: 6px 0 0;
  margin: 8px 0 10px;
  background: transparent;
  color: var(--wb-text);
}

:global(.dark) .war-board {
  --wb-legend: #ffffff;
  --wb-metric-date: #ffffff;
  --wb-axis: #ffffff;
}

:global(.dark) .metric-date {
  color: #ffffff !important;
}

:global(.dark) .axis-label {
  fill: #ffffff !important;
}

:global(.dark) .legend-item {
  color: #ffffff !important;
}

.war-head {
  display: flex;
  align-items: stretch;
  gap: 12px;
  margin-bottom: 12px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--wb-divider);
}

.war-head-main {
  display: flex;
  flex-direction: column;
  width: 100%;
  gap: 8px;
}

.war-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.control-row {
  display: flex;
  gap: 14px;
  flex-wrap: wrap;
  margin: 0 0 12px;
}

.fullscreen-panel.is-fullscreen {
  min-height: 100vh;
  padding: 14px;
  background: var(--vp-c-bg);
  overflow: auto;
}

.control-group {
  display: inline-flex;
  gap: 6px;
  align-items: center;
  flex-wrap: wrap;
}

.control-label {
  font-size: 12px;
  color: var(--wb-subtle);
}

.ctl-btn {
  border: 1px solid var(--wb-divider);
  background: transparent;
  color: var(--wb-text);
  border-radius: 999px;
  padding: 3px 10px;
  font-size: 12px;
  cursor: pointer;
}

.ctl-btn.active {
  border-color: #00b8d9;
  color: #00e5ff;
}

.war-kicker {
  margin: 0;
  color: var(--wb-subtle);
  font-size: 12px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.war-head h2 {
  margin: 4px 0 0;
  font-size: 24px;
  color: var(--wb-heading);
}

.war-meta {
  display: inline-flex;
  gap: 8px;
  align-items: center;
  font-size: 12px;
  color: var(--wb-subtle);
  flex-wrap: wrap;
}

.status-pill {
  padding: 2px 8px;
  border-radius: 999px;
  border: 1px solid transparent;
}

.status-pill.ok {
  background: rgba(0, 200, 83, 0.12);
  color: #8bf5ae;
  border-color: rgba(0, 200, 83, 0.4);
}

.status-pill.degraded {
  background: rgba(255, 145, 0, 0.12);
  color: #ffd08a;
  border-color: rgba(255, 145, 0, 0.4);
}

.cards-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 10px;
}

.metric-card {
  border: 0;
  border-radius: 0;
  border-bottom: 2px solid color-mix(in srgb, var(--wb-divider) 70%, transparent);
  padding: 8px 2px 10px;
  text-align: left;
  background: transparent;
  color: inherit;
  cursor: pointer;
  transition: opacity 0.16s ease, border-color 0.16s ease;
}

.metric-card:hover {
  border-color: color-mix(in srgb, var(--accent) 78%, #ffffff);
}

.metric-card.active {
  border-color: color-mix(in srgb, var(--accent) 82%, #ffffff);
}

.metric-card.inactive {
  opacity: 0.42;
}

.metric-top {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  align-items: baseline;
}

.metric-name {
  font-size: 13px;
  color: var(--wb-metric-name);
}

.metric-date {
  font-size: 11px;
  color: var(--wb-metric-date);
}

.metric-value {
  margin-top: 6px;
  font-size: 34px;
  line-height: 1;
  font-weight: 700;
  color: var(--wb-metric-value);
}

.metric-unit {
  margin-top: 4px;
  font-size: 12px;
  color: var(--wb-metric-unit);
}

.chart-shell {
  border: 0;
  border-top: 1px solid var(--wb-divider);
  border-bottom: 1px solid var(--wb-divider);
  border-radius: 0;
  background: transparent;
  padding: 10px 0 8px;
}

.chart {
  width: 100%;
  height: auto;
  display: block;
}

.grid {
  stroke: var(--wb-grid);
  stroke-width: 1;
}

.line {
  stroke-width: 2.3;
  stroke-linejoin: round;
  stroke-linecap: round;
}

.hover-capture {
  fill: transparent;
  pointer-events: all;
}

.hover-line {
  stroke: color-mix(in srgb, var(--wb-axis) 70%, transparent);
  stroke-width: 1;
  stroke-dasharray: 3 3;
}

.hover-point {
  stroke: #0b111a;
  stroke-width: 1.2;
}

.hover-tooltip-bg {
  fill: rgba(9, 12, 18, 0.88);
  stroke: rgba(180, 196, 220, 0.35);
  stroke-width: 1;
}

.hover-tooltip-text {
  fill: #e8f1ff;
  font-size: 11px;
}

.axis-label {
  fill: var(--wb-axis);
  font-size: 11px;
}

.legend-row {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 10px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--wb-divider);
}

.legend-item {
  display: inline-flex;
  gap: 6px;
  align-items: center;
  color: var(--wb-legend);
  font-size: 12px;
}

.legend-item i {
  width: 12px;
  height: 3px;
  border-radius: 999px;
  display: inline-block;
}

.empty-hint {
  min-height: 180px;
  display: grid;
  place-items: center;
  color: var(--wb-empty);
  font-size: 13px;
}

.warn-list {
  margin: 10px 0 0;
  padding-left: 18px;
  color: #ffd08a;
  font-size: 12px;
}

.source-block,
.warn-block {
  margin-top: 12px;
}

.history-table-block {
  margin-top: 14px;
}

.history-table-block h3 {
  margin: 0 0 8px;
  font-size: 14px;
  color: var(--wb-metric-name);
}

.table-shell {
  overflow-x: auto;
  border-top: 1px solid var(--wb-divider);
  border-bottom: 1px solid var(--wb-divider);
}

.history-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
}

.history-table th,
.history-table td {
  padding: 8px 10px;
  white-space: nowrap;
  border-bottom: 1px solid color-mix(in srgb, var(--wb-divider) 70%, transparent);
}

.history-table thead th {
  text-align: left;
  color: var(--wb-metric-name);
  background: color-mix(in srgb, var(--vp-c-bg-alt) 55%, transparent);
}

.history-table tbody td {
  color: var(--wb-subtle);
}

.table-empty {
  min-height: 72px;
  border-top: 1px solid var(--wb-divider);
  border-bottom: 1px solid var(--wb-divider);
}

.source-block h3,
.warn-block h3 {
  margin: 0 0 8px;
  font-size: 14px;
  color: var(--wb-metric-name);
}

.source-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px 12px;
}

.source-item {
  border-left: 2px solid var(--wb-divider);
  padding-left: 8px;
  font-size: 12px;
  color: var(--wb-subtle);
  display: grid;
  gap: 3px;
}

.source-item strong {
  color: var(--wb-metric-name);
}

@media (max-width: 900px) {
  .cards-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .metric-value {
    font-size: 24px;
  }

  .war-head h2 {
    font-size: 20px;
  }

  .source-grid {
    grid-template-columns: 1fr;
  }
}
</style>
