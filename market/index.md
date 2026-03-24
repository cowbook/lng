# 市场信息

<script setup>
import marketPrices from '../.vitepress/data/market-prices.json'
import dataHealth from '../.vitepress/data/data-health.json'

const fmt = (value) => {
	if (value === null || value === undefined || Number.isNaN(Number(value))) return '-'
	return Number(value).toFixed(3)
}

const healthLabel = dataHealth.status === 'ok' ? '正常' : '降级'
</script>

这里集中展示 LNG 相关市场指标，作为接收站栏目之外的独立市场页。

## LNG 关键价格（自动更新）

数据更新时间: {{ marketPrices.updatedAt }}

数据健康状态: **{{ healthLabel }}**

<ul v-if="(dataHealth.warnings || []).length">
	<li v-for="(msg, idx) in dataHealth.warnings" :key="idx">{{ msg }}</li>
</ul>

<table>
	<thead>
		<tr>
			<th>品种</th>
			<th>最新价格</th>
			<th>单位</th>
			<th>日期</th>
			<!--
			<th>备注</th>
			-->
		</tr>
	</thead>
	<tbody>
		<tr v-for="item in marketPrices.items" :key="item.seriesId">
			<td :title="item.note">{{ item.displayName }}</td>
			<td>{{ fmt(item.value) }}</td>
			<td>{{ item.unit }}</td>
			<td>{{ item.date || '-' }}</td>
			<!--
			<td>{{ item.note }}</td>
			-->
		</tr>
	</tbody>
</table>

## 指标说明

- Brent: 国际原油价格基准，优先采用 Barchart 可公开访问的 ICE Brent 活跃近月合约价格，失败时回退 FRED
- JKM: 东北亚 LNG 基准价格，优先采用 Barchart 可公开访问的 NYMEX JKM 活跃近月合约价格
- TTF: 欧洲气价基准，优先采用 Barchart 可公开访问的 ENDEX Dutch TTF Gas 活跃近月合约价格（原始单位 EUR/MWh）；回退到 FRED 代理时使用 USD/MMBtu
- Henry Hub: 美国天然气价格核心参考，优先采用 Barchart 可公开访问的 NYMEX Henry Hub Gas 活跃近月合约价格，失败时回退 FRED

