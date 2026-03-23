# 市场信息

<script setup>
import marketPrices from '../.vitepress/data/market-prices.json'

const fmt = (value) => {
	if (value === null || value === undefined || Number.isNaN(Number(value))) return '-'
	return Number(value).toFixed(3)
}
</script>

这里集中展示 LNG 相关市场指标，作为接收站栏目之外的独立市场页。

## LNG 关键价格（自动更新）

数据更新时间: {{ marketPrices.updatedAt }}

<table>
	<thead>
		<tr>
			<th>品种</th>
			<th>最新价格</th>
			<th>日期</th>
			<th>单位</th>
			<th>备注</th>
		</tr>
	</thead>
	<tbody>
		<tr v-for="item in marketPrices.items" :key="item.seriesId">
			<td>{{ item.displayName }}</td>
			<td>{{ fmt(item.value) }}</td>
			<td>{{ item.date || '-' }}</td>
			<td>{{ item.unit }}</td>
			<td>{{ item.note }}</td>
		</tr>
	</tbody>
</table>

## 指标说明

- Brent: 国际原油价格基准
- JKM: 东北亚 LNG 基准价格，优先采用 Barchart 可公开访问的 NYMEX JKM 活跃近月合约价格
- TTF: 欧洲气价基准，优先采用 Barchart 可公开访问的 ENDEX Dutch TTF Gas 活跃近月合约价格
- Henry Hub: 美国天然气现货价格核心参考

