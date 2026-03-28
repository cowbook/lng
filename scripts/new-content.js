#!/usr/bin/env node

const fs = require('node:fs')
const path = require('node:path')

const ROOT = path.resolve(__dirname, '..')

function parseArgs(argv) {
  const args = {}
  for (let i = 2; i < argv.length; i += 1) {
    const token = argv[i]
    if (!token.startsWith('--')) continue
    const key = token.slice(2)
    const value = argv[i + 1]
    if (!value || value.startsWith('--')) {
      args[key] = true
      continue
    }
    args[key] = value
    i += 1
  }
  return args
}

function usage() {
  console.log('Usage: node scripts/new-content.js --type essay|report --slug <slug> --title <title> [--author <name>] [--source <url or text>] [--desc <description>] [--keywords "k1,k2"] [--lang zh|en] [--no-index]')
}

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true })
  }
}

function toKeywords(raw, lang) {
  if (!raw) {
    return lang === 'en'
      ? ['LNG', 'natural gas', 'market', 'trade']
      : ['LNG', '天然气', '市场', '贸易']
  }
  return raw.split(',').map((s) => s.trim()).filter(Boolean)
}

function buildTemplate({ title, desc, keywords, author, source, lang }) {
  const today = new Date().toISOString().slice(0, 10)
  const joinedKeywords = keywords.join(', ')

  if (lang === 'en') {
    return `---
title: "${title}"
description: "${desc}"
keywords: [${keywords.map((k) => `"${k}"`).join(', ')}]
date: "${today}"
author: "${author}"
source: "${source}"
enSyncStatus: "self"
---

# ${title}

## Abstract

- Put a 120-200 word summary here.

## Key Findings

- Finding 1
- Finding 2
- Finding 3

## Data and Charts

- Chart source:
- Core metric:
- Time range:

## Main Analysis

### 1. Context

### 2. Supply and Demand

### 3. Price and Risks

## Conclusion

- Final conclusion and actionable advice.

## Metadata

- Keywords: ${joinedKeywords}
- Chinese version sync: N/A
`
  }

  return `---
title: "${title}"
description: "${desc}"
keywords: [${keywords.map((k) => `"${k}"`).join(', ')}]
date: "${today}"
author: "${author}"
source: "${source}"
enSyncStatus: "pending"
---

# ${title}

## 摘要

- 在这里写 120-200 字摘要。

## 关键观点

- 观点 1
- 观点 2
- 观点 3

## 数据与图表

- 图表来源：
- 核心指标：
- 时间范围：

## 正文分析

### 1. 背景与问题

### 2. 供需与价格

### 3. 风险与情景

## 结论与建议

- 给出可执行结论和建议。

## 元数据

- 关键词: ${joinedKeywords}
- 英文同步状态: pending
`
}

function appendEssayIndex(indexPath, slug, title) {
  if (!fs.existsSync(indexPath)) return
  const current = fs.readFileSync(indexPath, 'utf8')
  const line = `### [${title}](./${slug})`
  if (current.includes(line)) return
  const next = `${current.trim()}\n\n${line}\n`
  fs.writeFileSync(indexPath, next, 'utf8')
}

function main() {
  const args = parseArgs(process.argv)
  const type = args.type
  const slug = args.slug
  const title = args.title
  const lang = args.lang === 'en' ? 'en' : 'zh'

  if (!type || !slug || !title) {
    usage()
    process.exit(1)
  }

  if (!['essay', 'report'].includes(type)) {
    console.error('Only --type essay|report is supported currently.')
    process.exit(1)
  }

  const sectionDir = path.join(ROOT, type)
  ensureDir(sectionDir)

  const filePath = path.join(sectionDir, `${slug}.md`)
  if (fs.existsSync(filePath)) {
    console.error(`Target file already exists: ${filePath}`)
    process.exit(1)
  }

  const desc = args.desc || (lang === 'en'
    ? 'LNG market and trade analysis article.'
    : 'LNG市场与贸易分析文章。')

  const author = args.author || 'Mark'
  const source = args.source || 'self-research'
  const keywords = toKeywords(args.keywords, lang)

  const content = buildTemplate({
    title,
    desc,
    keywords,
    author,
    source,
    lang,
  })

  fs.writeFileSync(filePath, content, 'utf8')

  if (type === 'essay' && !args['no-index']) {
    appendEssayIndex(path.join(ROOT, 'essay', 'index.md'), slug, title)
  }

  console.log(`Created: ${path.relative(ROOT, filePath)}`)
  if (type === 'essay' && !args['no-index']) {
    console.log('Updated: essay/index.md')
  }
}

main()
