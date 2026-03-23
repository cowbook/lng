# 项目配置和系统信息

## 项目信息
**项目名称**: LNG.cool  
**项目类型**: 前端网站  
**项目用途**: 提供中英文双语LNG贸易知识、行业资讯、实时行情、在线研究工具  
**项目路径**: `/Volumes/T4/2026/lng/lngcool`  

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
- 最后更新: 2026-03-23

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
