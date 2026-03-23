const fs = require('node:fs/promises');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const WATCHLIST_FILE = path.join(ROOT, '.vitepress', 'data', 'wechat-watchlist.json');

function parseArgs(argv) {
  const args = {};
  const rest = [...argv];

  while (rest.length > 0) {
    const token = rest.shift();
    if (!token || !token.startsWith('--')) continue;

    const noPrefix = token.slice(2);
    if (noPrefix.includes('=')) {
      const [k, ...v] = noPrefix.split('=');
      args[k] = v.join('=');
      continue;
    }

    const next = rest[0];
    if (next && !next.startsWith('--')) {
      args[noPrefix] = rest.shift();
    } else {
      args[noPrefix] = 'true';
    }
  }

  return args;
}

function usage() {
  console.log('Usage: npm run wechat:add -- --account="天然气咨询" --title="..." --link="https://..." [--type=news] [--source=WeChat] [--publishedAt=2026-03-23] [--summary="..."]');
}

async function readJson() {
  const raw = await fs.readFile(WATCHLIST_FILE, 'utf8');
  return JSON.parse(raw);
}

async function writeJson(data) {
  await fs.writeFile(WATCHLIST_FILE, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help === 'true' || args.h === 'true') {
    usage();
    return;
  }

  const required = ['account', 'title', 'link'];
  const missing = required.filter((x) => !args[x]);
  if (missing.length > 0) {
    console.error(`Missing required args: ${missing.join(', ')}`);
    usage();
    process.exit(1);
  }

  const payload = await readJson();
  const accounts = Array.isArray(payload.accounts) ? payload.accounts : [];
  const manualDigest = Array.isArray(payload.manualDigest) ? payload.manualDigest : [];

  if (!accounts.includes(args.account)) {
    console.error(`Unknown account: ${args.account}`);
    console.error(`Allowed accounts: ${accounts.join(', ')}`);
    process.exit(1);
  }

  if (manualDigest.some((item) => item.link === args.link)) {
    console.log('Skipped: duplicated link already exists.');
    return;
  }

  const now = new Date().toISOString();
  const publishedAt = args.publishedAt || now.slice(0, 10);
  const entry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    account: args.account,
    title: args.title,
    link: args.link,
    type: args.type || 'news',
    source: args.source || 'WeChat',
    summary: args.summary || '',
    publishedAt,
    collectedAt: now
  };

  payload.updatedAt = now;
  payload.manualDigest = [entry, ...manualDigest].slice(0, 600);

  await writeJson(payload);
  console.log('Added item:', entry.title);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
