---
layout: home
pageClass: market-war-home
description: Real-time LNG key price dashboard — JKM, TTF, Brent, and Henry Hub — with one-year historical charts powered by Barchart and FRED.
---

<script setup>
import marketPrices from '../../.vitepress/data/market-prices.json'
import marketHistory from '../../.vitepress/data/market-history.json'
import dataHealth from '../../.vitepress/data/data-health.json'
import MarketWarBoard from '../../.vitepress/theme/components/MarketWarBoard.vue'
import MarketHistoryChart from '../../.vitepress/theme/components/MarketHistoryChart.vue'
</script>

<MarketWarBoard :prices="marketPrices" :history="marketHistory" :health="dataHealth" />
