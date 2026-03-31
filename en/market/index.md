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
</script>

<MarketWarBoard :prices="marketPrices" :history="marketHistory" :health="dataHealth" />

## Indicator Notes

- Brent: International crude benchmark. Primary source is publicly accessible Barchart ICE Brent front-month futures; fallback is FRED.
- JKM: Northeast Asia LNG benchmark. Primary source is publicly accessible Barchart NYMEX JKM front-month futures.
- TTF: European gas benchmark. Historical primary source is Yahoo `TTF=F` (native unit EUR/MWh, normalized to USD/MMBtu for display); on Yahoo failure it attempts Barchart historical data, and if both fail it reuses the latest cached history.
- Henry Hub: Core U.S. natural gas benchmark. Primary source is publicly accessible Barchart NYMEX Henry Hub front-month futures; fallback is FRED.
