# 数据源集成方案

## 项目框架分析
- **框架**: VitePress（文档生成框架）
- **运行环境**: Node.js + Vue 3
- **部署**: GitHub Pages 静态网站
- **约束**: 不支持后端服务（仅静态文件）

## 数据源需求分解

### 1. 实时LNG行情数据
**需求**: 实时显示LNG价格、行情走势

**可行方案**:

#### 方案A: 第三方金融API（推荐）
```javascript
// 可选的免费/付费API源：
- FRED (美国联邦数据): https://fred.stlouisfed.org/
- Yahoo Finance API
- Alpha Vantage
- IEX Cloud
- Finnhub
- 国内: 聚合数据、阿里云
```

**实现步骤**:
1. 选择API供应商 (推荐: FRED - 美国能源局数据)
2. 在 `.vitepress/data/` 目录创建数据文件
3. VitePress Data Loaders 加载数据
4. 在 markdown 中使用 Vue 组件展示

#### 方案B: 手动数据维护
```
在 data/ 目录维护 JSON 数据:
data/
  lng-prices.json      # 手动更新的价格数据
  market-trends.json   # 市场趋势
  suppliers.json       # 供应商信息
```

#### 方案C: Build-Time 爬虫
```javascript
// 在构建时运行爬虫抓取数据
// vitepress.config.js 中配置 buildEnd 钩子
export default {
  async buildEnd() {
    // 调用爬虫脚本更新数据
    await fetchLNGData()
  }
}
```

---

### 2. 微信公众号内容抓取

**挑战**: 微信有反爬机制，难度较高

**可行方案**:

#### 方案A: 微信公众号官方接口（推荐）
```
1. 申请微信公众号开发者权限
2. 获取 AppID & AppSecret
3. 接入微信官方 API:
   - 消息接收与回复
   - 获取用户信息
   - 自定义菜单管理
4. 使用 Node.js 库: https://github.com/wechat-community/wechat-api
```

#### 方案B: 定向RPA抓取
```javascript
// 使用 Puppeteer/Playwright 自动化浏览
// scripts/wechat-crawler.js
const { chromium } = require('playwright');

async function crawlWeChat() {
  const browser = await chromium.launch();
  // ... 抓取逻辑
}

// 定时运行 (使用 GitHub Actions)
```

#### 方案C: 人工整理 + RSS
```
1. 关注目标微信公众号
2. Mark 手动复制内容到项目
3. 如果公众号提供 RSS 源，直接订阅
4. 使用 https://rss.appinn.com/ 为微信公众号生成 RSS
```

**推荐**: 混合方案 - **自动爬虫 + 手动补充**

---

### 3. 其他行业新闻源

#### 方案A: RSS 订阅聚合
```
订阅源地址:
- Bloomberg Energy: https://www.bloomberg.com/
- Reuters Energy: https://www.reuters.com/energy/
- Energy Voice
- Oil & Gas Journal

使用 RSS 解析库:
npm install feed-read
或使用在线 RSS 聚合服务
```

#### 方案B: 新闻API
```
https://newsapi.org/
- 免费计划: 100 请求/天
- 支持按关键词搜索 LNG/能源
```

---

## 推荐实施方案（分阶段）

### 第一阶段（立即可做）
1. **维护JSON数据文件**
   ```
   .vitepress/
     data/
       lng-market.json    # LNG市场数据
       news-links.json    # 新闻链接
   ```

2. **创建 VitePress Data Loaders**
   ```javascript
   // .vitepress/loaders/market.data.js
   export default {
     load() {
       return import('../data/lng-market.json')
                 .then(m => m.default)
     }
   }
   ```

3. **在 markdown 中使用**
   ```vue
   <script setup>
   import { data as marketData } from '../loaders/market.data.js'
   </script>
   
   # LNG 实时行情
   <MarketTable :data="marketData" />
   ```

### 第二阶段（Build-Time 自动化）

创建 `scripts/update-datasources.js`:
```javascript
// 在：npm run docs:build 前运行
// 1. 从API获取LNG数据
// 2. 爬取微信内容
// 3. 抓取新闻标题
// 4. 更新 .vitepress/data/*.json
```

集成到 package.json:
```json
{
  "scripts": {
    "docs:build": "node scripts/update-datasources.js && vitepress build",
    "update:data": "node scripts/update-datasources.js"
  }
}
```

### 第三阶段（CI/CD自动化）

GitHub Actions 定时任务:
```yaml
# .github/workflows/update-data.yml
name: Update Data Sources
on:
  schedule:
    - cron: '0 */6 * * *'  # 每6小时更新一次
  workflow_dispatch:

jobs:
  update:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm run update:data
      - run: npm run docs:build
      - uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./docs/.vitepress/dist
```

---

## 推荐的API服务商

### LNG实时数据
1. **FRED API** (美国联邦储备系统)
   - 免费、无限请求
   - 美国LNG出口/进口数据
   - 官网: https://fred.stlouisfed.org/

2. **IEA (国际能源署)**
   - 能源数据库
   - 需要帐户: https://www.iea.org/

3. **Trading Economics**
   - 商品期货数据
   - 需付费 API

### 微信内容
1. **WeChat Official API**
   - 需要企业认证
   - 最可靠方式

2. **IFTTT / Zapier**
   - 连接微信公众号和 Webhook
   - 自动推送新内容

### 新闻聚合
1. **NewsAPI** - https://newsapi.org/
2. **RSSHub** - https://docs.rsshub.app/
3. **Feedly API** - https://developer.feedly.com/

---

## 文件结构建议

```
.
├── .vitepress/
│   ├── data/
│   │   ├── lng-prices.json
│   │   ├── news-feed.json
│   │   ├── wechat-articles.json
│   │   └── market-analysis.json
│   ├── loaders/
│   │   ├── market.data.js
│   │   ├── news.data.js
│   │   └── wechat.data.js
│   ├── theme/
│   │   └── components/
│   │       ├── MarketChart.vue
│   │       ├── NewsCard.vue
│   │       └── DataTable.vue
│   └── config.js
├── scripts/
│   ├── update-datasources.js      # 主更新脚本
│   ├── fetch-lng-prices.js        # LNG价格爬虫
│   ├── fetch-wechat.js            # 微信爬虫
│   └── fetch-news.js              # 新闻爬虫
└── terminal/                       # 实时行情页面
    └── index.md
```

---

## 关键技术栈

### 前端库
```json
{
  "dependencies": {
    "axios": "^1.6.0",           // HTTP请求
    "cheerio": "^1.0.0",         // HTML 解析
    "puppeteer": "^20.0.0",      // 浏览器自动化
    "node-cron": "^3.0.0"        // 定时任务
  }
}
```

### 爬虫示例
```javascript
// 示例：简单的HTML解析
import axios from 'axios';
import * as cheerio from 'cheerio';

async function fetchWeChat() {
  const response = await axios.get('https://mp.weixin.qq.com/...');
  const $ = cheerio.load(response.data);
  const articles = [];
  
  $('article').each((i, el) => {
    articles.push({
      title: $(el).find('h2').text(),
      link: $(el).find('a').attr('href'),
      date: $(el).find('time').text()
    });
  });
  
  return articles;
}
```

---

## 下一步计划

- [ ] 确定具体使用的LNG数据源 API
- [ ] 选择微信内容获取方式
- [ ] 创建 `scripts/update-datasources.js` 脚本
- [ ] 添加响应的 npm 依赖包
- [ ] 实现数据加载器 (VitePress Data Loaders)
- [ ] 创建展示数据的 Vue 组件
- [ ] 配置 GitHub Actions 自动更新
- [ ] 测试数据流程

**注**: Mark 可以从这些方案中选择，我可以逐步实现具体的代码。
