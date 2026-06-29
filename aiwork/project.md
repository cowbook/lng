# 项目配置和系统信息

> 本文件只记录**当前事实与配置**，不记录计划和日志。
> 历史会话日志见 memory.md，数据源方案见 datasource-plan.md。

## 项目信息

**项目名称**: LNG.cool  
**项目用途**: 提供中英文双语LNG贸易知识、行业资讯、实时行情、在线研究工具  
**项目路径**: `/Users/yanzhang/Projects/lngcool`  
**生产地址**: https://lng.cool  
**GitHub仓库**: https://github.com/cowbook/lng  
**最后更新**: 2026-06-29

## 技术栈

| 项目 | 当前配置 |
|------|---------|
| 前端框架 | Vue 3 + VitePress 1.6.3 |
| 包管理器 | npm（CI 使用 pnpm 9.10.0） |
| CSS | Tailwind CSS 4 + 自定义 custom.css |
| 构建工具 | VitePress build |
| 部署平台 | GitHub Pages + GitHub Actions |
| Node 版本 | 18（CI） |
| 数学渲染 | markdown-it-mathjax3 |

## 常用命令

```bash
npm install            # 安装依赖
npm run docs:dev       # 本地开发
npm run docs:build     # 更新数据 + 构建（完整流程）
npm run update:data    # 仅更新数据 JSON
npm run check:bilingual  # 输出双语内容缺口报告
npm run wechat:add     # 手动录入微信公众号条目
git push origin main   # 触发 GitHub Actions 自动部署
```

## 项目结构

```
aiwork/          # 维护工作目录（不对外发布）
basis/           # 基础知识（中文）
en/              # 英文版本
essay/           # 论文/研究
market/          # 实时行情页
report/          # 行业报告
scripts/         # 构建与工具脚本
terminal/        # LNG接收站数据页
trade/           # 贸易合同内容
public/          # 静态资源（icon、images、robots.txt）
.vitepress/
  config.mts     # 站点配置（含 SEO transformPageData）
  data/          # 构建时 JSON 数据（market-prices、news-digest 等）
  theme/         # 自定义主题、组件
.github/
  workflows/     # GitHub Actions 自动部署
```

## 数据源现状（已落地）

| 类型 | 指标 | 主源 | 回退 |
|------|------|------|------|
| 实时价格 | Brent | Barchart ICE Brent (`CB` 合约族) | FRED DCOILBRENTEU |
| 实时价格 | JKM | Barchart NYMEX JKM | NASDAQ Data Link / FRED 旧缓存 |
| 实时价格 | TTF | Barchart Dutch TTF Gas (`TG*`) — EUR/MWh | FRED PNGASEUUSDM — USD/MMBtu |
| 实时价格 | Henry Hub | Barchart NYMEX NG | FRED DHHNGSP |
| 历史价格 | Brent | FRED DCOILBRENTEU（日频） | — |
| 历史价格 | JKM | NASDAQ Data Link CHRIS/CME_JKM1（日频） | Yahoo Finance `JKM=F` → 可选 FRED PNGASJPUSDM 月频代理 |
| 历史价格 | TTF | Yahoo Finance `TTF=F`（日频） | Barchart `TG*` 历史页日频抓取 → 最近缓存（不再回退 FRED 月频代理） |
| 历史价格 | Henry Hub | FRED DHHNGSP（日频） | — |
| 汇率 | EUR→USD | FRED DEXUSEU | 固定值 1.08 |
| 行业新闻 | LNG / 天然气新闻 | Natural Gas Intelligence RSS、Offshore Energy RSS | OilPrice RSS（当前 500 错误） |
| 学术文献 | LNG 研究 | Crossref（LNG 关键词过滤） | OpenAlex → arXiv |
| 微信 | 公众号观察池 | 手动录入（`npm run wechat:add`） | — |
| 站点访问量 | 首页访问量（最近14天） | GitHub Traffic Views API（构建期写入 `.vitepress/data/github-traffic.json`） | 无 token 时写入 fallback 值 |

## 英文内容现状

| 栏目 | 状态 | 说明 |
|------|------|------|
| en/basis/ | 部分完成 | `lng.md`、`lng-industry.md` 已有英文版 |
| en/market/ | 完成 | 市场 War Room 完整英文 UI，含历史图表与数据表 |
| en/terminal/ | **完成至 rt033** | 33 个接收站英文页全部创建；rt032/rt033 中文源为空模板，英文页标注"profile in preparation" |
| en/report/ | 部分完成 | China2025 英文版已有 50% |
| en/essay/ | 未开始 | — |
| en/trade/ | 未开始 | — |

**英文导航**（en 区 nav 当前条目）:
- Home → `/en/`
- Market → `/en/market/`
- Basis → `/en/basis/lng`
- China Receiving Terminal → `/en/terminal/`

## 相关人员

- **项目负责人**: Mark Zuang — markzuang0208@gmail.com — GitHub: cowbook
