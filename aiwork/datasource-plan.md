# 数据源方案（当前实现）

> 本文件只记录**现行方案与待完善路线图**，不记录历史讨论。

## 已落地链路（scripts/update-datasources.js）

所有数据在 `npm run docs:build`（即 `npm run update:data && vitepress build`）前更新，
结果写入 `.vitepress/data/*.json`，由 Vue 组件读取展示。

GitHub Actions 每日 08:30（北京时间）自动触发完整构建+部署。

### 行情数据

| 指标 | 主源 | 回退 | 输出字段 |
|------|------|------|---------|
| Brent | Barchart ICE Brent `CB*` | FRED DCOILBRENTEU | `market-prices.json` |
| JKM | Barchart NYMEX JKM `JK*` | NASDAQ Data Link → FRED/缓存 | 同上 |
| TTF | Barchart Dutch TTF `TG*`（EUR/MWh）| FRED PNGASEUUSDM（USD/MMBtu）| 同上 |
| Henry Hub | Barchart NYMEX NG `NG*` | FRED DHHNGSP | 同上 |
| TTF 汇率（EUR→USD）| FRED DEXUSEU | 固定值 1.08 | 内部使用 |
| 历史数据（Brent）| FRED DCOILBRENTEU（日频） | — | `market-history.json` |
| 历史数据（JKM）| NASDAQ Data Link CHRIS/CME_JKM1（日频） | Yahoo Finance `JKM=F` → 可选 FRED PNGASJPUSDM 月频代理 | 同上 |
| 历史数据（TTF）| Yahoo Finance `TTF=F`（日频） | FRED PNGASEUUSDM 月频代理 | 同上 |
| 历史数据（Henry Hub）| FRED DHHNGSP（日频） | — | 同上 |
| 数据健康状态 | 本地汇总逻辑 | — | `data-health.json` |

**环境变量**: 根目录 `.env` 与 GitHub Actions secrets 需配置 `FRED_API_KEY`、`NASDAQ_DATA_LINK_API_KEY`；若允许 JKM 末级代理兜底，可设置 `JKM_HISTORY_ALLOW_PROXY=true`。

### 新闻数据（news-digest.json）

| 类型 | 当前来源 |
|------|---------|
| 行业新闻（主链）| Natural Gas Intelligence RSS、Offshore Energy RSS |
| 行业新闻（回退）| OilPrice RSS（当前 HTTP 500，定期检查是否恢复）|
| 学术文献（主链）| Crossref（LNG 关键词过滤 + 日期校验） |
| 学术文献（回退）| OpenAlex → arXiv |
| 微信内容 | 手动录入（`npm run wechat:add`），存 `wechat-watchlist.json` |

**过滤规则**: 标题含 LNG/天然气/液化天然气/natural gas 关键词，发布日期在当年±1年内，去重。

---

## 待完善

| 优先级 | 任务 | 说明 |
|--------|------|------|
| P1 | 微信自动化抓取 | 目前仅支持手动录入，考虑 RSS 代理或 RPA 方案 |
| P2 | OilPrice RSS 稳定性 | 当前 HTTP 500，可替换为 S&P Global Commodity Insights RSS |
| P2 | NASDAQ Data Link 稳定性 | 当前网络下存在 403 风险，现已增加 Yahoo Finance `JKM=F` 真日频回退，可继续寻找更稳定官方源 |
| P3 | 更多学术源 | 可接入 ScienceDirect / Springer LNG 专题 |
