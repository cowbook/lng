---
layout: home
pageClass: market-war-home
description: 实时LNG关键价格行情：JKM、TTF、Brent和Henry Hub，包含过去一年历史走势图，数据来自Barchart与FRED。
---

<script setup>
import marketPrices from '../.vitepress/data/market-prices.json'
import marketHistory from '../.vitepress/data/market-history.json'
import dataHealth from '../.vitepress/data/data-health.json'
import MarketWarBoard from '../.vitepress/theme/components/MarketWarBoard.vue'
import MarketHistoryChart from '../.vitepress/theme/components/MarketHistoryChart.vue'
</script>

<MarketWarBoard :prices="marketPrices" :history="marketHistory" :health="dataHealth" />

