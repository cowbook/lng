const fs = require('fs');
const path = require('path');
const https = require('https');

const target = process.argv[2];
if (!target) {
  console.error('Usage: node scripts/translate-report-zh.js <markdown-file-path>');
  process.exit(1);
}

const filePath = path.resolve(target);
const backupPath = filePath.replace(/\.md$/i, '.en.md');

function requestTranslate(text) {
  return new Promise((resolve, reject) => {
    const url =
      'https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=zh-CN&dt=t&q=' +
      encodeURIComponent(text);

    const req = https.get(url, (res) => {
        let raw = '';
        res.on('data', (chunk) => {
          raw += chunk;
        });
        res.on('end', () => {
          try {
            const data = JSON.parse(raw);
            if (!Array.isArray(data) || !Array.isArray(data[0])) {
              return resolve(text);
            }
            const translated = data[0].map((part) => part[0] || '').join('');
            resolve(translated);
          } catch (err) {
            reject(err);
          }
        });
      });

    req.setTimeout(12000, () => {
      req.destroy(new Error('request timeout'));
    });

    req.on('error', reject);
  });
}

async function requestTranslateWithRetry(text, retries = 3) {
  let lastErr = null;
  for (let i = 0; i < retries; i++) {
    try {
      return await requestTranslate(text);
    } catch (err) {
      lastErr = err;
      await new Promise((r) => setTimeout(r, 300 * (i + 1)));
    }
  }
  throw lastErr;
}

function skipLine(line) {
  const t = line.trim();
  if (!t) return true;
  if (/^!\[\]\(.+\)$/.test(t)) return true;
  if (/^```/.test(t)) return true;
  if (/^\|?\s*[-:| ]+\s*\|?$/.test(t)) return true;
  return false;
}

function hasEnglish(line) {
  return /[A-Za-z]/.test(line);
}

function shouldTranslateLine(line) {
  const zhCount = (line.match(/[\u4e00-\u9fff]/g) || []).length;
  const enCount = (line.match(/[A-Za-z]/g) || []).length;
  if (enCount === 0) return false;
  // Skip lines that are already mostly Chinese text with only a few acronyms.
  if (zhCount > 0 && enCount < zhCount) return false;
  return true;
}

function splitLong(text, maxLen = 1200) {
  if (text.length <= maxLen) return [text];
  const units = text.split(/(?<=[.!?;:])\s+/);
  const out = [];
  let acc = '';

  for (const u of units) {
    const next = acc ? acc + ' ' + u : u;
    if (next.length > maxLen && acc) {
      out.push(acc);
      acc = u;
    } else {
      acc = next;
    }
  }
  if (acc) out.push(acc);
  const base = out.length ? out : [text];
  const hardSplit = [];
  for (const item of base) {
    if (item.length <= maxLen) {
      hardSplit.push(item);
      continue;
    }
    for (let i = 0; i < item.length; i += maxLen) {
      hardSplit.push(item.slice(i, i + maxLen));
    }
  }
  return hardSplit;
}

function polishAcademicZh(line) {
  return line
    .replace(/贸易额/g, '贸易量')
    .replace(/在\s*2025\s*年同比/g, '在2025年同比')
    .replace(/同比增长率/g, '同比增速')
    .replace(/长期展望/g, '长期增长前景')
    .replace(/气化终端/g, '再气化终端');
}

async function run() {
  const src = fs.readFileSync(filePath, 'utf8');
  if (!fs.existsSync(backupPath)) {
    fs.writeFileSync(backupPath, src, 'utf8');
  }

  const lines = src.split('\n');
  const out = [];
  let count = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (skipLine(line) || !hasEnglish(line) || !shouldTranslateLine(line)) {
      out.push(line);
      continue;
    }

    try {
      const chunks = splitLong(line);
      const zhChunks = [];
      for (const chunk of chunks) {
        const zh = await requestTranslateWithRetry(chunk);
        zhChunks.push(zh);
      }
      let zhLine = zhChunks.join(' ');
      zhLine = polishAcademicZh(zhLine);
      out.push(zhLine);
      count++;
      if (count % 120 === 0) {
        console.log(`translated ${count}/${lines.length}`);
      }
      if (count % 60 === 0) {
        fs.writeFileSync(filePath, out.concat(lines.slice(i + 1)).join('\n'), 'utf8');
      }
    } catch (err) {
      out.push(line);
      console.error(`line ${i + 1} failed: ${err.message}`);
    }
  }

  fs.writeFileSync(filePath, out.join('\n'), 'utf8');
  console.log(`done: translated ${count} lines`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
