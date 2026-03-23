<script setup lang="ts">
import { computed, ref } from 'vue'
import wechatData from '../../data/wechat-watchlist.json'
import newsDigest from '../../data/news-digest.json'

type ManualItem = {
  id?: string
  account?: string
  title?: string
  link?: string
  source?: string
  type?: string
  summary?: string
  publishedAt?: string
  collectedAt?: string
}

const selectedDate = ref(new Date().toISOString().slice(0, 10))
const selectedAccount = ref('全部账号')

const allAccounts = computed(() => ['全部账号', ...(wechatData.accounts || [])])

const manualDigest = computed<ManualItem[]>(() => {
  const rows = Array.isArray(wechatData.manualDigest) ? wechatData.manualDigest : []
  return [...rows].sort((a, b) => (b.collectedAt || '').localeCompare(a.collectedAt || ''))
})

function normalizeDate(value?: string) {
  if (!value) return ''
  return value.slice(0, 10)
}

const filteredDigest = computed(() => {
  return manualDigest.value.filter((row) => {
    const rowDate = normalizeDate(row.publishedAt) || normalizeDate(row.collectedAt)
    const hitDate = selectedDate.value ? rowDate === selectedDate.value : true
    const hitAccount = selectedAccount.value === '全部账号' || row.account === selectedAccount.value
    return hitDate && hitAccount
  })
})

const dailyProgress = computed(() => {
  const rows = filteredDigest.value
  const touched = new Set(
    rows
      .map((x) => x.account)
      .filter((x): x is string => Boolean(x))
  )
  const total = (wechatData.accounts || []).length
  const done = touched.size
  const ratio = total > 0 ? Math.round((done / total) * 100) : 0
  return { done, total, ratio }
})

const accountRows = computed(() => {
  return (wechatData.accounts || []).map((name) => {
    const rows = filteredDigest.value.filter((x) => x.account === name)
    const latest = rows[0]
    return {
      name,
      count: rows.length,
      latestTitle: latest?.title || '-',
      latestLink: latest?.link || ''
    }
  })
})

const suggestedRows = computed(() => {
  const news = (newsDigest.news || []).map((item: any) => ({ ...item, kind: 'news' }))
  const academic = (newsDigest.academic || []).map((item: any) => ({ ...item, kind: 'academic' }))
  return [...news, ...academic].slice(0, 12)
})
</script>

<template>
  <section class="wechat-panel">
    <h2>公众号半自动采集面板</h2>
    <p>更新于: {{ wechatData.updatedAt }}</p>

    <div class="filter-row">
      <label>
        采集日期
        <input v-model="selectedDate" type="date" />
      </label>
      <label>
        账号筛选
        <select v-model="selectedAccount">
          <option v-for="name in allAccounts" :key="name" :value="name">{{ name }}</option>
        </select>
      </label>
    </div>

    <div class="progress-box">
      <strong>当日覆盖进度: {{ dailyProgress.done }}/{{ dailyProgress.total }} ({{ dailyProgress.ratio }}%)</strong>
    </div>

    <h3>账号执行清单</h3>
    <table>
      <thead>
        <tr>
          <th>公众号</th>
          <th>当日条数</th>
          <th>最近一条</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="row in accountRows" :key="row.name">
          <td>{{ row.name }}</td>
          <td>{{ row.count }}</td>
          <td>
            <a v-if="row.latestLink" :href="row.latestLink" target="_blank" rel="noreferrer">{{ row.latestTitle }}</a>
            <span v-else>-</span>
          </td>
        </tr>
      </tbody>
    </table>

    <h3>手动补录列表</h3>
    <table>
      <thead>
        <tr>
          <th>日期</th>
          <th>账号</th>
          <th>类型</th>
          <th>标题</th>
          <th>来源</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="row in filteredDigest" :key="row.id || row.link || row.title">
          <td>{{ normalizeDate(row.publishedAt) || normalizeDate(row.collectedAt) || '-' }}</td>
          <td>{{ row.account || '-' }}</td>
          <td>{{ row.type || 'news' }}</td>
          <td>
            <a v-if="row.link" :href="row.link" target="_blank" rel="noreferrer">{{ row.title || row.link }}</a>
            <span v-else>{{ row.title || '-' }}</span>
          </td>
          <td>{{ row.source || 'WeChat' }}</td>
        </tr>
        <tr v-if="filteredDigest.length === 0">
          <td colspan="5">当前筛选条件下暂无补录内容</td>
        </tr>
      </tbody>
    </table>

    <h3>自动建议池（新闻+学术）</h3>
    <ul>
      <li v-for="item in suggestedRows" :key="item.link + item.kind">
        <a :href="item.link" target="_blank" rel="noreferrer">{{ item.title }}</a>
        <span>（{{ item.kind }} / {{ item.publishedAt || '无日期' }}）</span>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.wechat-panel {
  border: 1px solid var(--vp-c-divider);
  border-radius: 14px;
  padding: 18px;
  margin: 16px 0;
  background: linear-gradient(180deg, var(--vp-c-bg-soft), var(--vp-c-bg));
}

.filter-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 12px;
  margin: 14px 0;
}

.filter-row label {
  display: grid;
  gap: 6px;
  font-size: 14px;
}

.filter-row input,
.filter-row select {
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  padding: 8px 10px;
}

.progress-box {
  margin: 8px 0 16px;
  padding: 10px 12px;
  border-radius: 10px;
  background: var(--vp-c-bg-soft);
}

table {
  width: 100%;
  display: table;
  margin: 10px 0 18px;
}

ul {
  margin: 0;
  padding-left: 18px;
}
</style>
