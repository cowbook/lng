# LNG.cool

有关 LNG 贸易与市场的网站（VitePress）。

## 环境

- Node.js 18+
- npm

## 安装

```bash
npm install
```

## 本地开发

```bash
npm run docs:dev
```

## 更新数据

```bash
npm run update:data
```

## 构建

`npm run docs:build` 会先执行数据更新，再执行 VitePress 构建。

```bash
npm run docs:build
```

## 预览

```bash
npm run docs:preview
```

## 内容生产流水线

统一模板入口（支持 `essay` 与 `report`）：

```bash
npm run content:new -- --type essay --slug ey260328 --title "示例标题"
```

常用可选参数：

- `--author "作者名"`
- `--source "来源链接或来源说明"`
- `--desc "页面 description"`
- `--keywords "LNG,天然气,贸易"`
- `--lang zh|en`
- `--no-index`（仅 essay 默认会自动追加到 `essay/index.md`）

生成结果：

- 新文稿包含统一字段：摘要、关键词、数据与图表、结论、英文同步状态（`enSyncStatus`）
- `essay` 类型默认自动更新索引

## 建议发布节奏

- 每日快讯：1 篇（200-400 字，关注价格、政策、船期、供应中断）
- 每周深度：1 篇（1200-2500 字，含图表、结论、英文同步计划）

执行建议：

1. 周一确定选题（快讯 5 个、深度 1 个）
2. 周三完成深度稿初稿与图表
3. 周五完成发布与英文同步状态更新



## 已采用数据源

向维护这些数据源的供应商表示感谢: