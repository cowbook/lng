#!/usr/bin/env node
/**
 * check-bilingual.js
 * 扫描中文内容目录，与 en/ 对应路径比较，输出缺失英文页面清单。
 *
 * 用法：  node scripts/check-bilingual.js
 *         node scripts/check-bilingual.js --json   (机器可读 JSON 格式)
 */

const { readdirSync, existsSync, statSync } = require('fs')
const { join, relative, resolve } = require('path')

const ROOT = resolve(__dirname, '..')

// 优先级定义：越高越重要，翻译队列按此排序
const PRIORITY = {
  'basis/lng.md'           : 1,
  'basis/lng-industry.md'  : 1,
  'basis/trade.md'         : 2,
  'basis/trade2024.md'     : 2,
  'basis/types.md'         : 2,
  'basis/history.md'       : 3,
  'basis/lng-1.md'         : 3,
  'basis/lng-2.md'         : 3,
  'report/China2025.md'    : 1,
  'report/China2024.md'    : 1,
  'essay/ey251013.md'      : 3,
}

// 不纳入对比的目录（接收站逐条页意义不大）
const SKIP_DIRS = new Set(['terminal'])

function collectMd(dir, base) {
  const results = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) collectMd(full, base).forEach(p => results.push(p))
    } else if (entry.name.endsWith('.md')) {
      results.push(relative(base, full))
    }
  }
  return results
}

// 中文源目录（相对于项目根）
const ZH_DIRS = ['basis', 'report', 'essay', 'trade']
const EN_BASE = join(ROOT, 'en')

const missing = []
const present = []

for (const dir of ZH_DIRS) {
  const zhDir = join(ROOT, dir)
  if (!existsSync(zhDir)) continue
  const pages = collectMd(zhDir, ROOT)
  for (const rel of pages) {
    const enPath = join(EN_BASE, rel)
    if (existsSync(enPath)) {
      const zhSize = statSync(join(ROOT, rel)).size
      const enSize = statSync(enPath).size
      const ratio = enSize / zhSize
      present.push({ path: rel, enPath: 'en/' + rel, zhBytes: zhSize, enBytes: enSize, ratio: +ratio.toFixed(2) })
    } else {
      const priority = PRIORITY[rel] ?? 4
      missing.push({ path: rel, enPath: 'en/' + rel, priority })
    }
  }
}

// 按优先级排序
missing.sort((a, b) => a.priority - b.priority)

const isJson = process.argv.includes('--json')

if (isJson) {
  console.log(JSON.stringify({ missing, present }, null, 2))
} else {
  console.log('\n========== 双语内容缺口报告 ==========\n')
  console.log(`中文源页面合计: ${missing.length + present.length}`)
  console.log(`已有英文对应版本: ${present.length}`)
  console.log(`缺少英文版本: ${missing.length}\n`)

  if (missing.length) {
    console.log('--- 待翻译页面（按优先级排序）---')
    let lastP = null
    for (const { path, enPath, priority } of missing) {
      if (priority !== lastP) {
        const labels = { 1: 'P1 高优先（核心内容）', 2: 'P2 中优先（贸易基础）', 3: 'P3 低优先（附属内容）', 4: 'P4 不涉及' }
        console.log(`\n  [${labels[priority] ?? 'P' + priority}]`)
        lastP = priority
      }
      console.log(`    ✗  ${path}  →  ${enPath}`)
    }
  }

  if (present.length) {
    console.log('\n--- 已有英文版本页面 ---')
    for (const { path, enPath, ratio } of present) {
      const flag = ratio < 0.5 ? '  ⚠ 内容可能不完整' : ''
      console.log(`    ✓  ${path}  (en:zh 大小比 ${(ratio * 100).toFixed(0)}%)${flag}`)
    }
  }

  console.log('\n========================================\n')
}
