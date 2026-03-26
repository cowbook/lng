# 对话记录与重要信息

## 项目目标
- 完善LNG.cool网站
- 增加访问流量
- 提供中英文双语的LNG贸易基础、产业链知识、行业资讯、实时行情、在线研究工具

## 核心需求
1. **双语支持**: 中文和英文内容
2. **主要栏目**:
   - 基础知识 (basis/)
   - 行业报告 (report/)
   - 交易信息 (trade/)
   - 英文版本 (en/)
   - 文章/研究 (essay/)
   - 实时行情 (terminal/)
   - 头部内容 (top/)

## 重要配置
- 框架: Vue 3 + VitePress
- 包管理: npm（项目中保留 pnpm 锁文件用于 CI）
- 开发命令: npm run docs:dev
- 数据更新命令: npm run update:data
- 部署方式: GitHub Pages + GitHub Actions 每日自动部署

## 待讨论确认
- [ ] 流量优化策略：SEO、内容更新频率、用户体验优化
- [ ] 内容管理：编辑流程、更新周期
- [ ] 分析工具：当前使用的数据分析工具

## 进行中的任务
- [x] 项目结构分析完成
- [x] 系统配置文档完成
- [x] 发布流程文档完成
- [x] FRED 四项价格接入（Brent/KJM/TTF/Henry Hub）
- [x] 每日自动部署流程接入
- [ ] 微信公众号文章自动化抓取能力增强

## 相关命令
```bash
# 依赖安装
npm install

# 开发启动
npm run docs:dev

# 构建
npm run docs:build

# 部署到GitHub Pages
git push origin main  # 自动触发GitHub Actions部署
```

## 团队信息
- **项目所有者**: Mark Zuang
- **负责人邮箱**: markzuang0208@gmail.com
- **GitHub账户**: cowbook
- **仓库URL**: https://github.com/cowbook/lng

## 数据源需求
1. **实时行情数据（FRED）**:
   - Brent: DCOILBRENTEU
   - JKM回退代理: PNGASJPUSDM
   - TTF回退代理: PNGASEUUSDM
   - Henry Hub: DHHNGSP
2. **实时行情主源（已落地）**:
   - JKM主源: Barchart 公共页面（NYMEX JKM 活跃近月合约）
   - TTF主源: Barchart 公共页面（ENDEX Dutch TTF Gas 活跃近月合约）
   - JKM回退链路: Barchart -> NASDAQ Data Link -> FRED代理
   - TTF回退链路: Barchart -> FRED代理
2. **微信公众号目标账号**:
   - 天然气咨询、金联创天然气、skypiea、天然气市场笔记
   - LNG行业信息、华气能源猎头、ICIS安迅思、振邦天然气LNG新能源
3. **每日内容要求**: 每天收集有价值新闻与学术文章
4. **手动补充**: Mark 会持续人工补充



# 所有对话日志记在下面

## 所有AI与Mark交流记录

### 2026-03-23 10:50

完成 JKM/TTF 主源切换到可访问公开源，保留回退链路，完成本地与构建验证，并记录 FRED 日期滞后原因
- 已完成 JKM 名称与来源修正：从日本进口价代理表述改为 JKM 东北亚基准价
- 已完成 TTF 名称与来源修正：从欧洲气价代理表述改为 TTF 欧洲气价基准
- 已实现 JKM 与 TTF 的可程序化公开源抓取，并保留稳定回退机制
- 已完成本地更新与构建验证，市场页可正常展示新数据
- 已定位 FRED 日期偏前原因为上游发布节奏，不是脚本故障
- 已在 GitHub Actions 配置 NASDAQ_DATA_LINK_API_KEY，当前网络环境下该接口存在 403 风险，系统可自动回退

### 2026-03-24 07:14

本次会话已按用户要求保存到 aiwork 目录并准备发布。
- 对话保存：在 `aiwork/memory.md` 追加会话摘要与执行结果。
- 状态确认：检测到用户撤销了首页 `index.md` 的上一轮改动，保留当前文件现状不强制覆盖。
- 发布动作：将当前工作区改动（排除 `.DS_Store`）提交到 `main` 并推送到 GitHub。
- 部署说明：推送 `main` 后由 GitHub Actions 自动触发站点发布流程。

### 2026-03-24 07:24

按用户要求补充提交策略并执行：
- 将 `.gitignore` 纳入本次提交并推送到 GitHub。
- 新约定：以后每次提交前，先在 `aiwork/memory.md` 记录本次变更摘要，再执行 `git commit`。
- 背景说明：此前线上 TTF 数据出现回退，已通过脚本防回退逻辑修复，并完成发布流程。

### 2026-03-24 09:40

按优化清单推进并已完成 P0-1、P0-2：
- 新增 `aiwork/optimization-plan.md`，形成可执行的分级优化任务（P0/P1/P2、工时与验收标准）。
- 修复学术数据抓取质量：
   - 在 `scripts/update-datasources.js` 增加 LNG 学术关键词过滤、日期合法性校验、结果去重。
   - Crossref 失败或结果不达标时，回退链路改为 OpenAlex 定向检索，再回退 arXiv LNG 关键词查询。
   - 避免学术列表出现明显无关内容和异常未来年份。
- 统一本地与 CI 构建入口：
   - `package.json` 中 `docs:build` 改为先执行 `update:data` 再构建。
   - `.github/workflows/deploy.yml` 删除重复的数据更新步骤，改为在 build 步骤统一注入数据源密钥并执行 `docs:build`。
- README 已同步更新命令说明，明确构建时会自动刷新数据。
- 本地验证：`npm run docs:build` 已执行通过，流程为“更新数据 -> VitePress 构建”。

### 2026-03-24 09:55

继续完成 P0-3（数据健康摘要）：
- 在 `scripts/update-datasources.js` 增加健康指标汇总并输出 `.vitepress/data/data-health.json`。
- 健康状态规则：当出现数据回退、陈旧保留、空值或新闻抓取失败时，状态标记为 `degraded`。
- `market/index.md` 已接入健康状态展示与告警列表，页面可直接查看“正常/降级”及原因。
- 顺带修复备注重复累加问题：同一条“抓取日期较旧”提示不再无限叠加。
- 构建验证：`npm run docs:build` 通过，健康文件生成成功。

### 2026-03-24 10:10

继续修复新闻源空列表问题并验证：
- `scripts/update-datasources.js` 的 `fetchIndustryNews` 改为多源抓取：
   - Google News（可选）
   - Natural Gas Intelligence RSS（主源）
   - Offshore Energy RSS
   - OilPrice RSS
- 新增新闻关键词过滤、日期规范化、去重逻辑，确保保留 LNG/天然气相关条目。
- 在当前网络下 Google News 仍可能失败，但不会影响总结果；其余源可稳定提供内容。
- 验证结果：`news-digest.json` 中 `newsCount` 已恢复到 10，`data-health.json` 不再出现 `news` 缓存回退告警。
- 回归验证：`npm run docs:build` 通过。

### 2026-03-24 15:10

- TTF EUR/MWh → USD/MMBtu 单位换算，原始值保存到 `originvalue` 字段；`fetchUsdPerEurRate()` 从 FRED DEXUSEU 实时获取汇率。
- 新增 `updateMarketHistory()`，生成 `market-history.json`（4 个品种过去 365 天日频数据：Brent/DCOILBRENTEU、JKM/PNGASJPUSDM、TTF/PNGASEUUSDM、HH/DHHNGSP）。
- 新增 `MarketHistoryChart.vue`，纯 SVG 折线图，无新依赖，支持品种切换下拉，兼容 VitePress 明暗主题。
- `market/index.md` 接入折线图组件，添加"过去一年价格折线图"节。
- 各历史序列 meta 字段补充 `source`（FRED 系列页 URL），便于溯源。
- 本地构建验证通过（`npm run docs:build`）。

### 2026-03-24 14:30

按用户要求继续优化市场页并升级 Brent/Henry Hub 数据源：
- `scripts/update-datasources.js` 新增通用 Barchart 活跃合约抓取方法 `fetchBarchartActiveFutures`。
- Brent 数据链路改为：Barchart（ICE Brent, `CB` 合约族）优先，失败时回退 FRED。
- Henry Hub 数据链路改为：Barchart（NYMEX NG 合约族）优先，失败时回退 FRED。
- 修复数值解析：Barchart 返回值可能带后缀（如 `72.48s`），`toNumber` 已增强为可解析带后缀与千分位的数字。
- `market/index.md` 指标说明已同步为“Barchart 主源 + FRED 回退”策略。
- 验证结果：
   - Brent 更新到 `CBK26` 合约、Henry Hub 更新到 `NGJ26` 合约，日期均为当日或最新交易日。
   - `data-health.json` 状态恢复为 `ok`。
   - `npm run docs:build` 通过。

### 2026-03-25 09:20

按用户反馈修正 TTF 单位口径：
- 已确认 TTF 主源取值来自 Barchart `TG*`（Dutch TTF Gas），原始口径应为 `EUR/MWh`。
- 修复逻辑：
   - Barchart 主源时，TTF 单位展示为 `EUR/MWh`；
   - 回退到 FRED 代理时，TTF 单位展示为 `USD/MMBtu`。
- `market/index.md` 的指标说明已同步，明确主源与回退单位差异。
- 验证结果：`market-prices.json` 中 TTF 已显示 `EUR/MWh`，构建通过。

### 2026-03-25 11:05

按用户要求将 TTF 历史改为日频展示方案：
- 原因确认：`market-history` 原始 TTF 来源是 FRED `PNGASEUUSDM`，属于月频序列，导致历史图每月一个点。
- 实施方案：在 `update-datasources.js` 中新增“月频点按自然日展开”逻辑，仅对 TTF 历史序列生效。
- 结果：TTF 历史点位由 11 个扩展为 366 个，日期连续（按天）。
- 说明：该方案为“月频转日频展示”（同月内值相同），并在 `note` 标注，避免被误认为交易所真实逐日结算价。
- 验证：`npm run update:data` 与 `npm run docs:build` 均通过。

### 2026-03-26 16:40

按用户要求完成市场页 War Room 重构、主题联动与英文化补齐：
- 市场页改为 Home Layout 全页展示，去除左右边栏语义，并新增自定义全页样式。
- 新增 `MarketWarBoard.vue`，将行情页改为“战情看板”结构（4 指标 + 合并折线 + 指标开关）。
- 页面视觉由“面板卡片”调整为“深色底直出内容”，并实现明暗主题切换（暗色文本自动提亮）。
- 修复暗色主题可读性：`metric-date`、`axis-label`、`legend-item` 在 dark 下强制白色显示。
- 组件文案支持中英文自动切换（标题、状态、更新时间、空态提示、图表 aria 标签）。
- 修复图表中残留中文：基于 `symbol` 做中英文名称映射，并结合路由 `/en/` + `lang` 双判定确保英文页稳定显示英文指标名与图例。
- 新增英文市场页 `en/market/index.md`，并将英文导航 `Market` 重链到 `/en/market/`。
- 检查英文导航缺失项后，新增 `en/basis/lng.md`（由中文页翻译生成），并将英文导航 `Basis` 重链到 `/en/basis/lng`。
- 验证结果：多次执行 `npm run docs:build` 均通过（外部数据源告警不影响构建产出）。





