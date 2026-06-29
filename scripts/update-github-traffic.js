const fs = require('node:fs/promises');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const OUT_FILE = path.join(ROOT, '.vitepress', 'data', 'github-traffic.json');

function resolveRepoSlug() {
  const fromEnv = process.env.GITHUB_REPOSITORY || '';
  if (fromEnv.includes('/')) return fromEnv;

  const owner = process.env.GH_OWNER || 'cowbook';
  const repo = process.env.GH_REPO || 'lng';
  return `${owner}/${repo}`;
}

async function writePayload(payload) {
  await fs.mkdir(path.dirname(OUT_FILE), { recursive: true });
  await fs.writeFile(OUT_FILE, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

async function main() {
  const repo = resolveRepoSlug();
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || '';

  if (!token) {
    await writePayload({
      updatedAt: new Date().toISOString(),
      source: 'github-traffic-api',
      repo,
      count: 0,
      uniques: 0,
      windowDays: 14,
      note: 'Missing GITHUB_TOKEN, fallback value written.'
    });
    console.log('[traffic] No GITHUB_TOKEN, wrote fallback data.');
    return;
  }

  const url = `https://api.github.com/repos/${repo}/traffic/views`;
  const res = await fetch(url, {
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28'
    }
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`GitHub traffic API failed: ${res.status} ${body}`);
  }

  const data = await res.json();
  await writePayload({
    updatedAt: new Date().toISOString(),
    source: 'github-traffic-api',
    repo,
    count: Number(data.count || 0),
    uniques: Number(data.uniques || 0),
    windowDays: Array.isArray(data.views) ? data.views.length : 14,
    note: 'Repository traffic views from GitHub API.'
  });

  console.log(`[traffic] Updated views for ${repo}: count=${data.count}, uniques=${data.uniques}`);
}

main().catch(async (err) => {
  console.error('[traffic] update failed:', err.message);
  try {
    await writePayload({
      updatedAt: new Date().toISOString(),
      source: 'github-traffic-api',
      repo: resolveRepoSlug(),
      count: 0,
      uniques: 0,
      windowDays: 14,
      note: `Failed to fetch traffic data: ${err.message}`
    });
  } catch (_) {
    // ignore secondary error
  }
  process.exit(1);
});
