# 项目配置和系统信息

> 本文件只记录**当前事实与配置**，不记录计划和日志。
> 历史会话日志见 memory.md，数据源方案见 datasource-plan.md。

## 项目信息

**项目名称**: LNG.cool  
**项目用途**: 提供中英文双语LNG贸易知识、行业资讯、实时行情、在线研究工具  
**项目路径**: `/Users/yanzhang/Projects/lngcool`  
**生产地址**: https://lng.cool  
**GitHub仓库**: https://github.com/cowbook/lng  
**最后更新**: 2026-03-31

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

## 相关人员

- **项目负责人**: Mark Zuang — markzuang0208@gmail.com — GitHub: cowbook


## 技术栈

### 已确认
- **包管理器**: npm
- **前端框架**: Vue 3
- **项目配置**: package.json
- **构建工具**: docs:dev 脚本
- **静态生成**: VitePress

### 需要确认
- [ ] CSS框架/样式解决方案
- [ ] 数据获取方案（API/爬虫/手动）

## 项目结构
```
aiwork/              # 维护工作目录
basis/               # 基础知识内容（中文）
en/                  # 英文版本
essay/               # 文章/研究篇章
public/              # 静态资源和发布文件
report/              # 行业报告
scripts/             # 构建和工具脚本
terminal/            # 实时行情数据
top/                 # 头部/首页内容
trade/               # 交易相关内容
```

## 系统配置

### 开发环境
- **OS**: macOS
- **Node**: （待确认版本）
- **npm**: 使用 npm 进行包管理

### 依赖安装和构建
```bash
# 安装依赖
npm install

# 开发服务器启动
npm run docs:dev

# 生产构建
npm run docs:build

# 部署到GitHub Pages
npm run docs:deploy  # 或类似命令
```

## 发布和部署

### 当前发布配置
- **部署平台**: GitHub Pages
- **部署流程**: GitHub Actions (自动或手动)
- **域名配置**: github.io 域名或自定义域名
- **CDN/静态资源托管**: GitHub Pages 内置

### 发布位置
- **GitHub仓库**: https://github.com/cowbook/lng
- **生产环境URL**: https://cowbook.github.io/lng (或配置的自定义域名)
- **开发环境**: 本地 npm run docs:dev
- **版本控制**: GitHub (cowbook 账户)
- **发布频率**: 每日自动部署 + main 分支推送触发部署

## 脚本文件

### scripts/translateBasis.js
- **用途**: 翻译基础知识内容
- **输入**: basis/ 目录下的中文markdown文件
- **输出**: en/basis/ 的英文版本
- **执行方式**: `node scripts/translateBasis.js`（待确认）
数据源集成

### 需求
- 从网络获取实时LNG行情数据
- 从微信公众号提取信息（需要爬虫或API）
- 手动补充添加内容

### 数据源方案（待实现）
- [x] LNG行情API集成（FRED）
- [x] 展示指标: Brent、KJM(代理)、TTF(代理)、Henry Hub
- [ ] 微信公众号信息爬虫（RPA/Puppeteer）
- [x] 指定行业新闻源（RSS订阅）
- [x] 学术文章源（Crossref）
- [ ] 手动内容上传界面
- [x] 数据缓存和更新策略

### 微信公众号目标账号
- 天然气咨询
- 金联创天然气
- skypiea
- 天然气市场笔记
- LNG行业信息
- 华气能源猎头
- ICIS安迅思
- 振邦天然气LNG新能源

## 
## 性能优化配置

### 当前状态
- [ ] 图片优化方案: 待确认
- [ ] 代码分割配置: 待确认
- [ ] 缓存策略: 待确认
- [ ] 监控工具: 待确认

## 内容管理

### 编辑流程
- [ ] 编辑指导文档: 待补充
- [ ] 更新流程: 待补充
- [ ] 审核流程: 待补充

### 数据源
- [ ] LNG行情数据源: 待确认
- [ ] 新闻/资讯源: 待确认
- [ ] 报告数据源: 待确认

## 相关人员和联系方式
- **项目负责人**: Mark Zuang
- **技术负责人**: Mark Zuang (同一人)
- **内容负责人**: Mark Zuang (同一人)
- **联系邮箱**: markzuang0208@gmail.com
- **GitHub账户**: cowbook

## 关键日期和截止日期
- 项目创建日期: （待确认）
- 最后更新: 2026-03-26

## 常见问题排查

### 开发问题
- [ ] 本地开发环境搭建常见问题
- [ ] 依赖版本冲突处理
- [ ] 构建失败排查

### 部署问题
- [ ] 部署失败处理
- [ ] 回滚流程
- [ ] 应急联系方式



## AI对话日志
memory.md 文件记录了所有与AI重要的对话


---
**维护者注**: 此文件用于记录项目配置和系统信息，定期更新以确保信息准确性。
