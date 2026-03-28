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
</script>

<MarketWarBoard :prices="marketPrices" :history="marketHistory" :health="dataHealth" />

## 指标说明

- Brent: 国际原油价格基准，优先采用 Barchart 可公开访问的 ICE Brent 活跃近月合约价格，失败时回退 FRED
- JKM: 东北亚 LNG 基准价格，优先采用 Barchart 可公开访问的 NYMEX JKM 活跃近月合约价格
- TTF: 欧洲气价基准，优先采用 Barchart 可公开访问的 ENDEX Dutch TTF Gas 活跃近月合约价格（原始单位 EUR/MWh）；回退到 FRED 代理时使用 USD/MMBtu
- Henry Hub: 美国天然气价格核心参考，优先采用 Barchart 可公开访问的 NYMEX Henry Hub Gas 活跃近月合约价格，失败时回退 FRED

