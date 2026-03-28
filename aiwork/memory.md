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

### 2026-03-28 11:12

按用户要求准备提交并推送当前仓库改动：
- 已检查当前未提交文件，仅包含 `.vitepress/config.mts`、`basis/lng.md`，并按约定先在 `aiwork/memory.md` 记录本次会话。
- 本次提交内容以当前工作区现状为准：VitePress 站点 `base` 从 `/lng/` 调整为 `/`，并同步保留 `basis/lng.md` 的现有内容改动。
- 提交前执行构建验证，确认当前变更可正常构建后再推送到远端。
- 提醒：`aiwork/optimization-plan.md` 中 P1 SEO 基线、双语一致性检查、aiwork 文档治理，以及 P2 内容生产流水线、终端行情页产品化仍未完成，后续提交前建议继续按清单推进。

### 2026-03-28 12:10

继续完成 P1-2 双语内容一致性检查和 P1-3 aiwork 文档治理：

**P1-2 双语内容一致性检查**
- 新增 `scripts/check-bilingual.js`（CommonJS），扫描 `basis/report/essay/trade` 目录，与 `en/` 对应路径比对，输出缺口报告。
- 新增 `npm run check:bilingual` 脚本（`package.json`）。
- 当前缺口：20 个中文页面中，3 个已有英文版，17 个缺少英文版。
  - P1 高优先缺失：`report/China2024.md`（`report/China2025.md` en 版已存在但完成度 50%）
  - P2 中优先缺失：`basis/trade.md / trade2024.md / types.md`
  - P3/P4：`basis/history.md` 等附属内容

**P1-3 aiwork 文档治理**
- `aiwork/project.md`：重写为当前事实配置文档（技术栈表格、常用命令、数据源现状表），删除所有"待确认"和过时内容，修正生产 URL（`https://lng.cool`）。
- `aiwork/datasource-plan.md`：保留当前数据源实现方案与待完善路线图，删除初期选型方案讨论和已实现的实施步骤。

### 2026-03-28 11:40

完成 P1-1 SEO 基线建设，核心变更如下：

**config.mts**
- 新增 `cleanUrls: true`，与已有导航链接格式保持一致。
- 新增 `sitemap: { hostname: 'https://lng.cool' }`，构建时自动生成 `sitemap.xml`（含中英文 hreflang 互链）；通过 `transformItems` 排除 `aiwork/`、`api-examples`、`markdown-examples` 等内部内容。
- 新增 `transformPageData` 钩子，对所有页面自动注入：
  - `<link rel="canonical">` 规范链接
  - `<link rel="alternate" hreflang="zh-CN|en|x-default">` 中英互链（仅在对应语言页实际存在时生效，通过 `siteConfig.pages` 校验）
  - `og:title / og:description / og:url / og:type / og:image / og:site_name`
  - `twitter:card / twitter:title / twitter:description`
  - 报告/论文页 `og:type` 自动设为 `article`，其余为 `website`

**核心页面 `description` frontmatter**
- 首页 `index.md` / `en/index.md`
- 市场页 `market/index.md` / `en/market/index.md`
- 基础知识 `basis/lng.md` / `en/basis/lng.md` / `basis/lng-industry.md`

**报告页 JSON-LD 结构化数据**
- `report/China2024.md` / `report/China2025.md`：新增 `Article` + `BreadcrumbList` JSON-LD

**robots.txt**
- 新增 `public/robots.txt`，禁止爬虫索引 `/aiwork/`、`/api-examples`、`/markdown-examples`，并声明 Sitemap 地址。

验证：`npm run docs:build` 通过，`sitemap.xml` 正确生成，建议接下来推进 P1-2 双语一致性检查。

### 2026-03-28 13:46

继续推进 P2-1 内容生产流水线（先落地基础能力）：

- 新增 `scripts/new-content.js`，提供统一内容脚手架（`essay`/`report`）：
   - 自动生成 frontmatter：`title`、`description`、`keywords`、`date`、`author`、`source`、`enSyncStatus`
   - 自动生成正文结构：摘要/关键观点/数据与图表/正文分析/结论
   - `essay` 类型默认自动追加到 `essay/index.md`（可用 `--no-index` 关闭）
- `package.json` 新增命令：`npm run content:new`
- `README.md` 新增“内容生产流水线”与“建议发布节奏”：
   - 每日快讯 1 篇（200-400 字）
   - 每周深度 1 篇（1200-2500 字）
   - 给出周一选题、周三成稿、周五发布的执行节拍
- 修正 `aiwork/datasource-plan.md` 末尾残留代码块符号，保持文档整洁。

验证：已实际运行 `npm run content:new` 完成脚本可用性校验，并清理测试稿；后续可继续推进 P2-2 终端行情页产品化。

### 2026-03-28 14:00

继续推进并完成 P2-2 终端行情页产品化（`MarketWarBoard.vue`）：

- 新增**时间维度切换**：`7D / 30D / 1Y`，图表可快速切换观察窗口。
- 新增**对比模式**：
   - 绝对值（Absolute）
   - 指数化（Indexed，起点=100），便于跨品种走势比较。
- 新增**来源与回退说明区块**：逐项展示实时来源说明（来自 `market-prices.note`）和历史来源链接（`market-history.series[].source`）。
- 新增**异常/回退提示区块**：合并 `health.warnings` 与指标 note 中包含 fallback/回退/代理/缓存关键词的提示信息。
- 兼容中英文：新增控制区和说明区文案均支持语言切换。

验证：`npm run docs:build` 通过，sitemap 正常生成；Google News/Crossref 外部源告警不影响构建。





