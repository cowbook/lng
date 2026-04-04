const fs = require('node:fs/promises');
const fsSync = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const DATA_DIR = path.join(ROOT, '.vitepress', 'data');

function loadDotEnv(envPath) {
  if (!fsSync.existsSync(envPath)) return;
  const raw = fsSync.readFileSync(envPath, 'utf8');
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    if (!key || process.env[key] !== undefined) continue;
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

loadDotEnv(path.join(ROOT, '.env'));

const FRED_BASE = 'https://api.stlouisfed.org/fred/series/observations';
const FRED_KEY = process.env.FRED_API_KEY || '';
const NDL_KEY = process.env.NASDAQ_DATA_LINK_API_KEY || '';
const FETCH_TIMEOUT_MS = Number(process.env.FETCH_TIMEOUT_MS || 15000);
const FETCH_RETRIES = Math.max(0, Number(process.env.FETCH_RETRIES || 1));
const FUTURES_MONTH_CODES = ['F', 'G', 'H', 'J', 'K', 'M', 'N', 'Q', 'U', 'V', 'X', 'Z'];
const MMBTU_PER_MWH = 3.412141633;
const DEFAULT_USD_PER_EUR = 1.1;
const HISTORY_DAYS = 365;
const STALE_NOTE_SUFFIX = '本次抓取日期较旧，保留现有较新值';
const RESPONSE_CACHE = new Map();
const LNG_NEWS_KEYWORDS = [
  'lng',
  'liquefied natural gas',
  'natural gas',
  'henry hub',
  'ttf',
  'jkm',
  'regasification',
  'gas market',
  'gas price',
  'gas supply',
  'gas storage',
  'pipeline gas',
  'european gas',
  'energy crisis'
];
const LNG_ACADEMIC_KEYWORDS = [
  'lng',
  'liquefied natural gas',
  'natural gas',
  'jkm',
  'ttf',
  'henry hub',
  'regasification',
  'gas market',
  'gas trade',
  'gas pricing',
  'gas storage',
  'pipeline gas'
];

const PRICE_SERIES = [
  {
    symbol: 'Brent',
    displayName: 'Brent 原油',
    seriesId: 'DCOILBRENTEU',
    unit: 'USD/Barrel',
    note: 'Barchart 公共页面抓取的 ICE Brent 活跃近月合约价格'
  },
  {
    symbol: 'JKM',
    displayName: 'JKM 东北亚基准价',
    seriesId: 'JKM_NDL',
    unit: 'USD/MMBtu',
    note: 'Barchart 公共页面抓取的 NYMEX JKM 近月活跃合约价格（基于 Platts JKM）'
  },
  {
    symbol: 'TTF',
    displayName: 'TTF 欧洲气价基准',
    seriesId: 'TTF_BARCHART',
    unit: 'EUR/MWh',
    note: 'Barchart 公共页面抓取的 ENDEX Dutch TTF Gas 活跃近月合约价格'
  },
  {
    symbol: 'Henry Hub',
    displayName: 'Henry Hub',
    seriesId: 'DHHNGSP',
    unit: 'USD/MMBtu',
    note: 'Barchart 公共页面抓取的 NYMEX Henry Hub Gas 活跃近月合约价格'
  }
];

const WECHAT_ACCOUNTS = [
  '天然气咨询',
  '金联创天然气',
  'skypiea',
  '天然气市场笔记',
  'LNG行业信息',
  '华气能源猎头',
  'ICIS安迅思',
  '振邦天然气LNG新能源'
];

const UPDATE_SECTION_TO_FILE = {
  market: 'market-prices.json',
  history: 'market-history.json',
  news: 'news-digest.json',
  wechat: 'wechat-watchlist.json'
};

function parseCliOptions(argv) {
  const options = {
    only: null,
    ifStaleMinutes: 0
  };

  for (let i = 2; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === '--only') {
      const value = argv[i + 1] || '';
      i += 1;
      const parsed = value
        .split(',')
        .map((x) => x.trim().toLowerCase())
        .filter(Boolean);
      const valid = parsed.filter((x) => Object.prototype.hasOwnProperty.call(UPDATE_SECTION_TO_FILE, x));
      options.only = valid.length ? new Set(valid) : new Set();
      continue;
    }

    if (token === '--if-stale-minutes') {
      const value = Number(argv[i + 1]);
      i += 1;
      options.ifStaleMinutes = Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
    }
  }

  return options;
}

async function isSectionFresh(section, minutes) {
  if (!minutes || minutes <= 0) {
    return false;
  }

  const fileName = UPDATE_SECTION_TO_FILE[section];
  if (!fileName) {
    return false;
  }

  const filePath = path.join(DATA_DIR, fileName);
  const payload = await readJsonSafe(filePath, null);
  const updatedAt = typeof payload?.updatedAt === 'string' ? payload.updatedAt : '';
  if (!updatedAt) {
    return false;
  }

  const ts = Date.parse(updatedAt);
  if (!Number.isFinite(ts)) {
    return false;
  }

  const ageMs = Date.now() - ts;
  return ageMs >= 0 && ageMs < minutes * 60 * 1000;
}

function skippedMarketHealth(reason) {
  return {
    itemCount: 0,
    staleCount: 0,
    fallbackCount: 0,
    errorCount: 0,
    nullValueCount: 0,
    warnings: [`market: skipped (${reason})`],
    skipped: true
  };
}

function skippedHistoryHealth(reason) {
  return {
    seriesCount: 0,
    warnings: [`history: skipped (${reason})`],
    skipped: true
  };
}

function skippedNewsHealth(reason) {
  return {
    newsCount: 0,
    academicCount: 0,
    usedNewsCache: false,
    usedAcademicCache: false,
    warnings: [`news: skipped (${reason})`],
    skipped: true
  };
}

function skippedWechatHealth(reason) {
  return {
    accountCount: 0,
    manualDigestCount: 0,
    warnings: [`wechat: skipped (${reason})`],
    skipped: true
  };
}

function toNumber(value) {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value !== 'string' || value.trim() === '.' || value.trim() === '') {
    return null;
  }

  const normalized = value.trim().replace(/,/g, '');
  const matched = normalized.match(/-?\d+(?:\.\d+)?/);
  if (!matched) {
    return null;
  }

  const n = Number(matched[0]);
  return Number.isFinite(n) ? n : null;
}

function isIsoDate(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function shouldKeepExistingData(existingItem, latestItem) {
  if (!existingItem || existingItem.value === null || existingItem.value === undefined) {
    return false;
  }
  if (!isIsoDate(existingItem.date) || !isIsoDate(latestItem.date)) {
    return false;
  }
  return existingItem.date > latestItem.date;
}

function stripHtml(text) {
  if (typeof text !== 'string') return '';
  return text
    .replace(/<[^>]*>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeCrossrefDate(item) {
  const now = new Date();
  const maxYear = now.getUTCFullYear() + 1;
  const minYear = 2000;
  const candidates = [
    item?.published?.['date-parts']?.[0],
    item?.['published-print']?.['date-parts']?.[0],
    item?.['published-online']?.['date-parts']?.[0],
    item?.issued?.['date-parts']?.[0],
    item?.created?.['date-parts']?.[0]
  ];

  for (const parts of candidates) {
    if (!Array.isArray(parts) || parts.length === 0) continue;

    const year = Number(parts[0]);
    const month = Math.min(12, Math.max(1, Number(parts[1] || 1)));
    const day = Math.min(28, Math.max(1, Number(parts[2] || 1)));

    if (!Number.isInteger(year) || year < minYear || year > maxYear) {
      continue;
    }

    const mm = String(month).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    return `${year}-${mm}-${dd}`;
  }

  return '';
}

function isLngAcademicRecord({ title, containerTitle, subject }) {
  const haystack = [title, containerTitle, ...(Array.isArray(subject) ? subject : [])]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return LNG_ACADEMIC_KEYWORDS.some((kw) => haystack.includes(kw));
}

function dedupeAcademicRows(rows) {
  const seen = new Set();
  const out = [];

  for (const row of rows) {
    const key = `${(row.title || '').toLowerCase()}::${row.link || ''}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(row);
  }

  return out;
}

function normalizeDateFromString(raw) {
  if (typeof raw !== 'string' || !raw.trim()) return '';
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return '';
  const year = d.getUTCFullYear();
  const now = new Date().getUTCFullYear();
  if (year < 2000 || year > now + 1) return '';
  return d.toISOString().slice(0, 10);
}

function normalizeNewsDate(raw) {
  const normalized = normalizeDateFromString(raw);
  return normalized || (typeof raw === 'string' ? raw.trim() : '');
}

function isLngNewsRecord({ title = '', link = '' }) {
  const haystack = `${title} ${link}`.toLowerCase();
  return LNG_NEWS_KEYWORDS.some((kw) => haystack.includes(kw));
}

function dedupeNewsRows(rows) {
  const seen = new Set();
  const out = [];

  for (const row of rows) {
    const title = (row.title || '').toLowerCase().trim();
    const link = (row.link || '').trim();
    const key = `${title}::${link}`;
    if (!title || !link || seen.has(key)) continue;
    seen.add(key);
    out.push(row);
  }

  return out;
}

function appendNoteOnce(baseNote, suffix) {
  const left = (baseNote || '').trim();
  const right = (suffix || '').trim();
  if (!right) return left;
  if (!left) return right;

  const parts = left
    .split(';')
    .map((x) => x.trim())
    .filter(Boolean);

  const dedupedParts = [];
  for (const part of parts) {
    if (!dedupedParts.includes(part)) {
      dedupedParts.push(part);
    }
  }

  if (!dedupedParts.includes(right)) {
    dedupedParts.push(right);
  }

  return dedupedParts.join('; ');
}

async function fetchUsdPerEurRate() {
  try {
    const latest = await fetchFredSeries('DEXUSEU');
    if (latest?.value && Number.isFinite(latest.value)) {
      return latest.value;
    }
  } catch (error) {
    console.warn(`[WARN] DEXUSEU failed, use default USD/EUR: ${error.message}`);
  }

  return DEFAULT_USD_PER_EUR;
}

function convertEurMwhToUsdMmbtu(valueEurPerMwh, usdPerEur) {
  if (!Number.isFinite(valueEurPerMwh) || !Number.isFinite(usdPerEur) || usdPerEur <= 0) {
    return null;
  }

  return Number(((valueEurPerMwh * usdPerEur) / MMBTU_PER_MWH).toFixed(3));
}

async function fetchJson(url) {
  return fetchWithRetry(url, {
    headers: {
      'User-Agent': 'lng.cool/1.0 (data updater)'
    }
  }, {
    parse: 'json',
    retries: FETCH_RETRIES,
    timeoutMs: FETCH_TIMEOUT_MS
  });
}

async function fetchWithRetry(url, options = {}, config = {}) {
  const {
    parse = 'text',
    retries = 0,
    timeoutMs = 10000,
    cacheKey,
    useCache = true
  } = config;

  const key = cacheKey || `${parse}:${url}:${JSON.stringify(options.headers || {})}`;
  if (useCache && RESPONSE_CACHE.has(key)) {
    return RESPONSE_CACHE.get(key);
  }

  const task = (async () => {
    let lastError = null;

    for (let attempt = 0; attempt <= retries; attempt += 1) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const response = await fetch(url, {
          ...options,
          signal: controller.signal
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${url}`);
        }

        if (parse === 'response') {
          return response;
        }

        if (parse === 'json') {
          return response.json();
        }

        return response.text();
      } catch (error) {
        const isAbort = error && error.name === 'AbortError';
        lastError = isAbort
          ? new Error(`Timeout ${timeoutMs}ms: ${url}`)
          : error;
        if (attempt < retries) {
          continue;
        }
      } finally {
        clearTimeout(timer);
      }
    }

    throw lastError || new Error(`Request failed: ${url}`);
  })();

  if (useCache) {
    RESPONSE_CACHE.set(key, task);
  }

  try {
    return await task;
  } catch (error) {
    if (useCache) {
      RESPONSE_CACHE.delete(key);
    }
    throw error;
  }
}

function pickLatestObservation(observations) {
  if (!Array.isArray(observations)) return null;

  for (const obs of observations) {
    const value = toNumber(obs.value);
    if (value !== null) {
      return {
        value,
        date: obs.date || ''
      };
    }
  }

  return null;
}

async function fetchFredSeries(seriesId) {
  const fetchFromApi = async () => {
    const params = new URLSearchParams({
      series_id: seriesId,
      file_type: 'json',
      sort_order: 'desc',
      limit: '14'
    });

    if (FRED_KEY) {
      params.set('api_key', FRED_KEY);
    }

    const url = `${FRED_BASE}?${params.toString()}`;
    const payload = await fetchJson(url);
    const latest = pickLatestObservation(payload.observations || []);

    if (!latest) {
      throw new Error(`No valid observation for ${seriesId}`);
    }

    return latest;
  };

  const fetchFromCsv = async () => {
    const csvUrl = `https://fred.stlouisfed.org/graph/fredgraph.csv?id=${encodeURIComponent(seriesId)}`;
    const csv = await fetchText(csvUrl);
    const lines = csv.trim().split('\n');

    for (let i = lines.length - 1; i >= 1; i -= 1) {
      const [date, valueRaw] = lines[i].split(',');
      const value = toNumber(valueRaw);
      if (value !== null) {
        return { value, date };
      }
    }

    throw new Error(`No valid CSV observation for ${seriesId}`);
  };

  try {
    return await fetchFromApi();
  } catch (error) {
    console.warn(`[WARN] ${seriesId} API failed, fallback CSV: ${error.message}`);
    return fetchFromCsv();
  }
}

async function fetchJkmPrice() {
  const fetchFromBarchart = async () => {
    const candidates = [];
    const now = new Date();

    for (let offset = 1; offset <= 8; offset += 1) {
      const contractDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + offset, 1));
      const monthCode = FUTURES_MONTH_CODES[contractDate.getUTCMonth()];
      const yearCode = String(contractDate.getUTCFullYear()).slice(-2);
      const symbol = `JKM${monthCode}${yearCode}`;
      const url = `https://www.barchart.com/futures/quotes/${symbol}/futures-prices`;
      const html = await fetchText(url);
      const initMatch = html.match(/data-ng-init='init\((\{[\s\S]*?\})\)'/);

      if (!initMatch) {
        continue;
      }

      const payload = JSON.parse(initMatch[1]);
      const value = toNumber(String(payload.lastPrice ?? ''));
      const tradeTimeRaw = typeof payload.tradeTime === 'string' ? payload.tradeTime : '';
      const tradeDate = /^\d{2}\/\d{2}\/\d{2}$/.test(tradeTimeRaw)
        ? `20${tradeTimeRaw.slice(6, 8)}-${tradeTimeRaw.slice(0, 2)}-${tradeTimeRaw.slice(3, 5)}`
        : '';

      if (value !== null) {
        candidates.push({
          symbol,
          value,
          date: tradeDate,
          tradeDate,
          contractDate: contractDate.toISOString().slice(0, 10)
        });
      }
    }

    if (!candidates.length) {
      throw new Error('No valid Barchart JKM contracts found');
    }

    const latestTradeDate = candidates.reduce((latest, item) => {
      return item.tradeDate > latest ? item.tradeDate : latest;
    }, '');

    const selected = candidates
      .filter((item) => item.tradeDate === latestTradeDate)
      .sort((a, b) => a.contractDate.localeCompare(b.contractDate))[0];

    if (!selected) {
      throw new Error('Unable to choose active Barchart JKM contract');
    }

    return {
      value: selected.value,
      date: selected.date,
      source: 'BARCHART',
      symbol: selected.symbol
    };
  };

  try {
    return await fetchFromBarchart();
  } catch (error) {
    console.warn(`[WARN] JKM Barchart failed, fallback NDL/FRED: ${error.message}`);
  }

  if (NDL_KEY) {
    try {
      const url = `https://data.nasdaq.com/api/v3/datasets/CHRIS/CME_JKM1/data.json?rows=5&order=desc&api_key=${NDL_KEY}`;
      const payload = await fetchJson(url);
      const rows = payload?.dataset_data?.data || [];

      for (const row of rows) {
        const date = row?.[0] || '';
        const settleRaw = row?.[4];
        const settle = typeof settleRaw === 'number' ? settleRaw : toNumber(String(settleRaw ?? ''));
        if (date && settle !== null) {
          return { value: settle, date, source: 'NASDAQ_DATA_LINK' };
        }
      }

      throw new Error('No valid settlement in CHRIS/CME_JKM1');
    } catch (error) {
      console.warn(`[WARN] JKM NDL failed, fallback FRED proxy: ${error.message}`);
    }
  }

  const fallback = await fetchFredSeries('PNGASJPUSDM');
  return {
    ...fallback,
    source: 'FRED_PROXY'
  };
}

async function fetchTtfPrice() {
  const candidates = [];
  const now = new Date();

  for (let offset = 1; offset <= 8; offset += 1) {
    const contractDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + offset, 1));
    const monthCode = FUTURES_MONTH_CODES[contractDate.getUTCMonth()];
    const yearCode = String(contractDate.getUTCFullYear()).slice(-2);
    const symbol = `TG${monthCode}${yearCode}`;
    const url = `https://www.barchart.com/futures/quotes/${symbol}/futures-prices`;
    const html = await fetchText(url);
    const initMatch = html.match(/data-ng-init='init\((\{[\s\S]*?\})\)'/);

    if (!initMatch) {
      continue;
    }

    const payload = JSON.parse(initMatch[1]);
    const value = toNumber(String(payload.lastPrice ?? ''));
    const tradeTimeRaw = typeof payload.tradeTime === 'string' ? payload.tradeTime : '';
    const tradeDateMatch = tradeTimeRaw.match(/(\d{2})\/(\d{2})\/(\d{2})/);
    const sessionDateRaw = typeof payload.sessionDateDisplayLong === 'string'
      ? payload.sessionDateDisplayLong.replace(/^[A-Za-z]{3},\s*/, '').replace(/(st|nd|rd|th)/g, '')
      : '';
    const sessionDate = sessionDateRaw ? new Date(`${sessionDateRaw} UTC`) : null;
    const tradeDate = tradeDateMatch
      ? `20${tradeDateMatch[3]}-${tradeDateMatch[1]}-${tradeDateMatch[2]}`
      : sessionDate && !Number.isNaN(sessionDate.getTime())
        ? sessionDate.toISOString().slice(0, 10)
        : '';

    if (value !== null) {
      candidates.push({
        symbol,
        value,
        date: tradeDate,
        tradeDate,
        contractDate: contractDate.toISOString().slice(0, 10)
      });
    }
  }

  if (candidates.length) {
    const latestTradeDate = candidates.reduce((latest, item) => {
      return item.tradeDate > latest ? item.tradeDate : latest;
    }, '');

    const selected = candidates
      .filter((item) => item.tradeDate === latestTradeDate)
      .sort((a, b) => a.contractDate.localeCompare(b.contractDate))[0];

    if (selected) {
      return {
        value: selected.value,
        date: selected.date,
        source: 'BARCHART',
        symbol: selected.symbol
      };
    }
  }

  const fallback = await fetchFredSeries('PNGASEUUSDM');
  return {
    ...fallback,
    source: 'FRED_PROXY'
  };
}

async function fetchBarchartActiveFutures(baseSymbol, offsetStart = 1, offsetEnd = 8) {
  const candidates = [];
  const now = new Date();

  for (let offset = offsetStart; offset <= offsetEnd; offset += 1) {
    const contractDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + offset, 1));
    const monthCode = FUTURES_MONTH_CODES[contractDate.getUTCMonth()];
    const yearCode = String(contractDate.getUTCFullYear()).slice(-2);
    const symbol = `${baseSymbol}${monthCode}${yearCode}`;
    const url = `https://www.barchart.com/futures/quotes/${symbol}/futures-prices`;
    const html = await fetchText(url);
    const initMatch = html.match(/data-ng-init='init\((\{[\s\S]*?\})\)'/);

    if (!initMatch) {
      continue;
    }

    const payload = JSON.parse(initMatch[1]);
    const value = toNumber(String(payload.lastPrice ?? ''));
    const tradeTimeRaw = typeof payload.tradeTime === 'string' ? payload.tradeTime : '';
    const tradeDateMatch = tradeTimeRaw.match(/(\d{2})\/(\d{2})\/(\d{2})/);
    const sessionDateRaw = typeof payload.sessionDateDisplayLong === 'string'
      ? payload.sessionDateDisplayLong.replace(/^[A-Za-z]{3},\s*/, '').replace(/(st|nd|rd|th)/g, '')
      : '';
    const sessionDate = sessionDateRaw ? new Date(`${sessionDateRaw} UTC`) : null;
    const tradeDate = tradeDateMatch
      ? `20${tradeDateMatch[3]}-${tradeDateMatch[1]}-${tradeDateMatch[2]}`
      : sessionDate && !Number.isNaN(sessionDate.getTime())
        ? sessionDate.toISOString().slice(0, 10)
        : '';

    if (value !== null) {
      candidates.push({
        symbol,
        value,
        date: tradeDate,
        tradeDate,
        contractDate: contractDate.toISOString().slice(0, 10)
      });
    }
  }

  if (!candidates.length) {
    throw new Error(`No valid Barchart contracts found for ${baseSymbol}`);
  }

  const latestTradeDate = candidates.reduce((latest, item) => {
    return item.tradeDate > latest ? item.tradeDate : latest;
  }, '');

  const selected = candidates
    .filter((item) => item.tradeDate === latestTradeDate)
    .sort((a, b) => a.contractDate.localeCompare(b.contractDate))[0];

  if (!selected) {
    throw new Error(`Unable to choose active Barchart contract for ${baseSymbol}`);
  }

  return {
    value: selected.value,
    date: selected.date,
    symbol: selected.symbol,
    source: 'BARCHART'
  };
}

async function fetchBrentPrice() {
  try {
    return await fetchBarchartActiveFutures('CB');
  } catch (error) {
    console.warn(`[WARN] Brent Barchart failed, fallback FRED: ${error.message}`);
    const fallback = await fetchFredSeries('DCOILBRENTEU');
    return {
      ...fallback,
      source: 'FRED_FALLBACK'
    };
  }
}

async function fetchHenryHubPrice() {
  try {
    return await fetchBarchartActiveFutures('NG');
  } catch (error) {
    console.warn(`[WARN] Henry Hub Barchart failed, fallback FRED: ${error.message}`);
    const fallback = await fetchFredSeries('DHHNGSP');
    return {
      ...fallback,
      source: 'FRED_FALLBACK'
    };
  }
}

function extractItemsFromRss(xml, maxItems = 8) {
  const items = [];
  const matches = xml.match(/<item>[\s\S]*?<\/item>/g) || [];

  for (const raw of matches.slice(0, maxItems)) {
    const title = (raw.match(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/)?.[1]
      || raw.match(/<title>([\s\S]*?)<\/title>/)?.[1]
      || '').replace(/&amp;/g, '&').replace(/&#39;/g, "'").trim();

    const link = (raw.match(/<link>([\s\S]*?)<\/link>/)?.[1] || '').trim();
    const pubDate = (raw.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1] || '').trim();

    if (title && link) {
      items.push({ title, link, publishedAt: pubDate });
    }
  }

  return items;
}

async function fetchText(url) {
  return fetchWithRetry(url, {
    headers: {
      'User-Agent': 'lng.cool/1.0 (data updater)'
    }
  }, {
    parse: 'text',
    retries: FETCH_RETRIES,
    timeoutMs: FETCH_TIMEOUT_MS
  });
}

function formatDate(date) {
  return date.toISOString().slice(0, 10);
}

function parseIsoDate(dateStr) {
  return new Date(`${dateStr}T00:00:00Z`);
}

function expandMonthlyPointsToDaily(points, startDate, endDate) {
  if (!Array.isArray(points) || !points.length) {
    return [];
  }

  const sorted = [...points]
    .filter((x) => x && typeof x.date === 'string' && Number.isFinite(x.value))
    .sort((a, b) => a.date.localeCompare(b.date));

  if (!sorted.length) {
    return [];
  }

  const out = [];
  const end = parseIsoDate(endDate);
  const cursor = parseIsoDate(startDate);
  let idx = 0;

  while (cursor <= end) {
    const day = formatDate(cursor);

    while (idx + 1 < sorted.length && sorted[idx + 1].date <= day) {
      idx += 1;
    }

    if (sorted[idx] && sorted[idx].date <= day) {
      out.push({
        date: day,
        value: sorted[idx].value
      });
    }

    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return out;
}

function getHistoryWindow(days = HISTORY_DAYS) {
  const end = new Date();
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - days);
  return {
    start: formatDate(start),
    end: formatDate(end)
  };
}

async function fetchFredSeriesHistory(seriesId, startDate, endDate) {
  const url = `https://fred.stlouisfed.org/graph/fredgraph.csv?id=${encodeURIComponent(seriesId)}&cosd=${startDate}&coed=${endDate}`;
  const csv = await fetchText(url);
  const lines = csv.trim().split('\n');
  const points = [];

  for (let i = 1; i < lines.length; i += 1) {
    const [date, valueRaw] = lines[i].split(',');
    const value = toNumber(valueRaw);
    if (!date || value === null) {
      continue;
    }
    points.push({
      date,
      value
    });
  }

  return points;
}

async function fetchNdlJkmHistory(startDate, endDate) {
  if (!NDL_KEY) {
    throw new Error('NASDAQ_DATA_LINK_API_KEY is missing');
  }

  const params = new URLSearchParams({
    start_date: startDate,
    end_date: endDate,
    order: 'asc',
    rows: '5000',
    api_key: NDL_KEY
  });

  const url = `https://data.nasdaq.com/api/v3/datasets/CHRIS/CME_JKM1/data.json?${params.toString()}`;
  const payload = await fetchJson(url);
  const rows = Array.isArray(payload?.dataset_data?.data) ? payload.dataset_data.data : [];

  const points = rows
    .map((row) => {
      const date = row?.[0] || '';
      const settleRaw = row?.[4];
      const value = typeof settleRaw === 'number' ? settleRaw : toNumber(String(settleRaw ?? ''));
      if (!date || value === null) return null;
      return { date, value };
    })
    .filter((x) => x && isIsoDate(x.date));

  if (!points.length) {
    throw new Error('No valid rows in CHRIS/CME_JKM1 history');
  }

  return points;
}

async function fetchYahooHistory(symbol, startDate, endDate) {
  const start = Date.parse(`${startDate}T00:00:00Z`);
  const end = Date.parse(`${endDate}T23:59:59Z`);
  if (!Number.isFinite(start) || !Number.isFinite(end)) {
    throw new Error(`Invalid date range for Yahoo history: ${startDate}..${endDate}`);
  }

  const period1 = Math.floor(start / 1000);
  const period2 = Math.floor(end / 1000);
  const params = new URLSearchParams({
    period1: String(period1),
    period2: String(period2),
    interval: '1d',
    includeAdjustedClose: 'true'
  });
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?${params.toString()}`;
  const payload = await fetchJson(url);
  const result = payload?.chart?.result?.[0];
  const timestamps = Array.isArray(result?.timestamp) ? result.timestamp : [];
  const close = Array.isArray(result?.indicators?.quote?.[0]?.close)
    ? result.indicators.quote[0].close
    : [];

  const points = [];
  for (let i = 0; i < Math.min(timestamps.length, close.length); i += 1) {
    const ts = Number(timestamps[i]);
    const valueRaw = close[i];
    const value = typeof valueRaw === 'number' ? valueRaw : toNumber(String(valueRaw ?? ''));
    if (!Number.isFinite(ts) || value === null) continue;
    const date = new Date(ts * 1000).toISOString().slice(0, 10);
    if (!isIsoDate(date)) continue;
    if (date < startDate || date > endDate) continue;
    points.push({ date, value });
  }

  if (!points.length) {
    throw new Error(`No valid rows in Yahoo history for ${symbol}`);
  }

  return points;
}

function toIsoDateFromAny(value) {
  if (!value && value !== 0) return '';

  if (typeof value === 'number' && Number.isFinite(value)) {
    const ms = value > 2e10 ? value : value * 1000;
    const d = new Date(ms);
    return Number.isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
  }

  if (typeof value !== 'string') return '';

  const s = value.trim();
  if (!s) return '';
  if (isIsoDate(s)) return s;

  const mdy = s.match(/^(\d{2})\/(\d{2})\/(\d{2,4})$/);
  if (mdy) {
    const mm = mdy[1];
    const dd = mdy[2];
    const yy = mdy[3].length === 2 ? `20${mdy[3]}` : mdy[3];
    const iso = `${yy}-${mm}-${dd}`;
    return isIsoDate(iso) ? iso : '';
  }

  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
}

function normalizeBarchartHistoryPayload(payload, startDate, endDate) {
  const list = Array.isArray(payload?.data)
    ? payload.data
    : Array.isArray(payload?.results)
      ? payload.results
      : Array.isArray(payload?.records)
        ? payload.records
        : [];

  const points = list
    .map((row) => {
      const date = toIsoDateFromAny(
        row?.tradingDay
        || row?.tradeTime
        || row?.date
        || row?.timestamp
        || row?.dateTime
        || row?.localTimestamp
      );
      const value = toNumber(
        String(
          row?.close
          ?? row?.lastPrice
          ?? row?.closePrice
          ?? row?.settlement
          ?? row?.settle
          ?? ''
        )
      );

      if (!date || value === null) return null;
      if (date < startDate || date > endDate) return null;
      return { date, value };
    })
    .filter(Boolean)
    .sort((a, b) => a.date.localeCompare(b.date));

  if (!points.length) {
    throw new Error('No valid rows in Barchart history payload');
  }

  return points;
}

async function fetchBarchartHistoryBySymbol(symbol, startDate, endDate) {
  const historyPage = `https://www.barchart.com/futures/quotes/${symbol}/historical-prices`;
  const pageResponse = await fetchWithRetry(historyPage, {
    headers: {
      'User-Agent': 'Mozilla/5.0',
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
    }
  }, {
    parse: 'response',
    retries: FETCH_RETRIES,
    timeoutMs: FETCH_TIMEOUT_MS,
    useCache: false
  });

  const setCookie = pageResponse.headers.get('set-cookie') || '';
  const cookie = setCookie
    .split(/, (?=[^;]+?=)/)
    .map((x) => x.split(';')[0])
    .filter(Boolean)
    .join('; ');
  const tokenMatch = setCookie.match(/XSRF-TOKEN=([^;]+)/);
  const xsrfToken = tokenMatch ? decodeURIComponent(tokenMatch[1]) : '';

  const dayRange = Math.max(7, Math.ceil((parseIsoDate(endDate) - parseIsoDate(startDate)) / 86400000) + 7);
  const endpoints = [
    `https://www.barchart.com/proxies/timeseries/querydaysback?symbol=${encodeURIComponent(symbol)}&interval=1d&daysBack=${dayRange}`,
    `https://www.barchart.com/proxies/timeseries/query?symbol=${encodeURIComponent(symbol)}&interval=1d&startDate=${startDate}&endDate=${endDate}`
  ];

  let lastError = null;

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint, {
        headers: {
          'User-Agent': 'Mozilla/5.0',
          Accept: 'application/json,text/plain,*/*',
          Referer: historyPage,
          'X-Requested-With': 'XMLHttpRequest',
          'X-XSRF-TOKEN': xsrfToken,
          Cookie: cookie
        }
      }, {
        parse: 'text',
        retries: FETCH_RETRIES,
        timeoutMs: FETCH_TIMEOUT_MS,
        useCache: false
      });

      const payload = JSON.parse(response);
      const points = normalizeBarchartHistoryPayload(payload, startDate, endDate);
      if (points.length) {
        return points;
      }
    } catch (error) {
      lastError = error;
    }
  }

  throw new Error(`Barchart history unavailable for ${symbol}: ${lastError?.message || 'unknown error'}`);
}

async function fetchBarchartTtfHistory(startDate, endDate) {
  const active = await fetchBarchartActiveFutures('TG');
  const points = await fetchBarchartHistoryBySymbol(active.symbol, startDate, endDate);
  return {
    symbol: active.symbol,
    points
  };
}

function convertHistoryPointsEurMwhToUsdMmbtu(points, usdPerEur) {
  if (!Array.isArray(points) || !Number.isFinite(usdPerEur) || usdPerEur <= 0) {
    return [];
  }

  return points
    .map((point) => {
      const originvalue = toNumber(point?.value);
      if (originvalue === null || !isIsoDate(point?.date)) {
        return null;
      }

      const value = convertEurMwhToUsdMmbtu(originvalue, usdPerEur);
      if (value === null) {
        return null;
      }

      return {
        date: point.date,
        value,
        originvalue
      };
    })
    .filter(Boolean);
}

function normalizeCachedTtfPoints(points, cacheUnit, usdPerEur, sourceSeriesId) {
  const normalizedUnit = String(cacheUnit || '').trim().toUpperCase();
  const finiteValues = (Array.isArray(points) ? points : [])
    .map((point) => toNumber(point?.value))
    .filter((value) => value !== null);
  const avgValue = finiteValues.length
    ? finiteValues.reduce((sum, value) => sum + value, 0) / finiteValues.length
    : null;
  const hasOriginvalue = (Array.isArray(points) ? points : []).some((point) => toNumber(point?.originvalue) !== null);
  const likelyEurMwhFromMislabeledCache = (
    String(sourceSeriesId || '').toUpperCase() === 'TTF=F'
    && !hasOriginvalue
    && avgValue !== null
    && avgValue > 25
  );
  const shouldConvert = normalizedUnit === 'EUR/MWH' || likelyEurMwhFromMislabeledCache;

  if (shouldConvert) {
    return convertHistoryPointsEurMwhToUsdMmbtu(points, usdPerEur);
  }

  return (Array.isArray(points) ? points : [])
    .map((point) => {
      if (!isIsoDate(point?.date)) return null;
      const value = toNumber(point?.value);
      if (value === null) return null;
      const row = {
        date: point.date,
        value
      };
      const originvalue = toNumber(point?.originvalue);
      if (originvalue !== null) {
        row.originvalue = originvalue;
      }
      return row;
    })
    .filter(Boolean);
}

function buildHistoryRowsByDate(seriesList) {
  const fieldBySymbol = {
    Brent: 'brent',
    JKM: 'jkm',
    TTF: 'ttf',
    'Henry Hub': 'henryHub'
  };

  const rowMap = new Map();

  for (const series of Array.isArray(seriesList) ? seriesList : []) {
    const field = fieldBySymbol[series?.symbol];
    if (!field) continue;

    for (const point of Array.isArray(series?.points) ? series.points : []) {
      if (!isIsoDate(point?.date)) continue;
      const row = rowMap.get(point.date) || {
        date: point.date,
        brent: null,
        jkm: null,
        ttf: null,
        henryHub: null,
        ttfOriginvalue: null
      };

      row[field] = Number.isFinite(point?.value) ? point.value : null;
      if (series.symbol === 'TTF') {
        row.ttfOriginvalue = Number.isFinite(point?.originvalue) ? point.originvalue : null;
      }

      rowMap.set(point.date, row);
    }
  }

  return [...rowMap.values()].sort((a, b) => b.date.localeCompare(a.date));
}

async function updateMarketHistory() {
  const window = getHistoryWindow(HISTORY_DAYS);
  const existingPath = path.join(DATA_DIR, 'market-history.json');
  const existing = await readJsonSafe(existingPath, { series: [] });
  const existingJkmTrueDaily = Array.isArray(existing?.series)
    ? existing.series.find((s) => (
      s?.symbol === 'JKM' &&
      Array.isArray(s?.points) &&
      s.points.length > 0 &&
      !String(s?.note || '').includes('月频代理')
    ))
    : null;
  const existingTtfTrueDaily = Array.isArray(existing?.series)
    ? existing.series.find((s) => (
      s?.symbol === 'TTF' &&
      Array.isArray(s?.points) &&
      s.points.length > 0 &&
      !String(s?.note || '').includes('月频代理')
    ))
    : null;
  const existingTtfCached = Array.isArray(existing?.series)
    ? existing.series.find((s) => (
      s?.symbol === 'TTF' &&
      Array.isArray(s?.points) &&
      s.points.length > 0
    ))
    : null;
  const allowJkmProxyFallback = /^(1|true|yes)$/i.test(String(process.env.JKM_HISTORY_ALLOW_PROXY || ''));
  const usdPerEur = await fetchUsdPerEurRate();
  const historySeries = [
    {
      symbol: 'Brent',
      displayName: 'Brent 原油',
      unit: 'USD/Barrel',
      sourceSeriesId: 'DCOILBRENTEU',
      source: 'https://fred.stlouisfed.org/series/DCOILBRENTEU',
      note: 'FRED 日频历史序列'
    },
    {
      symbol: 'JKM',
      displayName: 'JKM 东北亚基准价',
      unit: 'USD/MMBtu',
      sourceSeriesId: 'CHRIS/CME_JKM1',
      source: 'https://data.nasdaq.com/data/CHRIS/CME_JKM1',
      note: 'NASDAQ Data Link 连续合约日频结算价（近月）'
    },
    {
      symbol: 'TTF',
      displayName: 'TTF 欧洲气价基准',
      unit: 'USD/MMBtu',
      sourceSeriesId: 'TTF=F',
      source: 'https://finance.yahoo.com/quote/TTF=F/history',
      note: 'Yahoo Finance 连续合约日频收盘价（原始单位 EUR/MWh，展示口径转换为 USD/MMBtu）'
    },
    {
      symbol: 'Henry Hub',
      displayName: 'Henry Hub',
      unit: 'USD/MMBtu',
      sourceSeriesId: 'DHHNGSP',
      source: 'https://fred.stlouisfed.org/series/DHHNGSP',
      note: 'FRED 日频历史序列'
    }
  ];

  const series = [];
  const warnings = [];

  for (const item of historySeries) {
    try {
      let points = [];
      let note = item.note;
      let source = item.source;
      let sourceSeriesId = item.sourceSeriesId;

      if (item.symbol === 'JKM') {
        try {
          points = await fetchNdlJkmHistory(window.start, window.end);
        } catch (error) {
          try {
            console.warn(`[WARN] JKM history NDL failed, fallback Yahoo true-daily: ${error.message}`);
            points = await fetchYahooHistory('JKM=F', window.start, window.end);
            sourceSeriesId = 'JKM=F';
            source = 'https://finance.yahoo.com/quote/JKM=F/history';
            note = 'Yahoo Finance 连续合约日频收盘价';
          } catch (yahooError) {
            if (allowJkmProxyFallback) {
              console.warn(`[WARN] JKM history Yahoo failed, fallback FRED proxy by env switch: ${yahooError.message}`);
              const rawPoints = await fetchFredSeriesHistory('PNGASJPUSDM', window.start, window.end);
              points = expandMonthlyPointsToDaily(rawPoints, window.start, window.end);
              sourceSeriesId = 'PNGASJPUSDM';
              source = 'https://fred.stlouisfed.org/series/PNGASJPUSDM';
              note = 'FRED 月频代理序列; 已按自然日展开（月频序列转日频展示）';
            } else if (existingJkmTrueDaily?.points?.length) {
              console.warn(`[WARN] JKM history Yahoo failed, reuse cached true-daily points: ${yahooError.message}`);
              points = existingJkmTrueDaily.points;
              sourceSeriesId = existingJkmTrueDaily.sourceSeriesId || sourceSeriesId;
              source = existingJkmTrueDaily.source || source;
              note = appendNoteOnce(existingJkmTrueDaily.note || note, '当前刷新失败，沿用最近一次真日频缓存');
            } else {
              throw new Error(`JKM true-daily source unavailable (NDL: ${error.message}; Yahoo: ${yahooError.message}); verify source access or opt-in JKM_HISTORY_ALLOW_PROXY=true`);
            }
          }
        }
      } else if (item.symbol === 'TTF') {
        try {
          points = await fetchYahooHistory('TTF=F', window.start, window.end);
          points = convertHistoryPointsEurMwhToUsdMmbtu(points, usdPerEur);
          note = appendNoteOnce(note, `按 DEXUSEU=${usdPerEur} 将 EUR/MWh 换算为 USD/MMBtu，并保留 originvalue 原始值`);
        } catch (error) {
          try {
            console.warn(`[WARN] TTF history Yahoo failed, fallback Barchart: ${error.message}`);
            const barchart = await fetchBarchartTtfHistory(window.start, window.end);
            points = convertHistoryPointsEurMwhToUsdMmbtu(barchart.points, usdPerEur);
            sourceSeriesId = barchart.symbol;
            source = `https://www.barchart.com/futures/quotes/${barchart.symbol}/historical-prices`;
            note = `Barchart ${barchart.symbol} 日频收盘价（原始单位 EUR/MWh，展示口径转换为 USD/MMBtu）`;
            note = appendNoteOnce(note, `按 DEXUSEU=${usdPerEur} 将 EUR/MWh 换算为 USD/MMBtu，并保留 originvalue 原始值`);
          } catch (barchartError) {
            if (existingTtfTrueDaily?.points?.length) {
              console.warn(`[WARN] TTF history Barchart failed, reuse cached true-daily points: ${barchartError.message}`);
              points = normalizeCachedTtfPoints(
                existingTtfTrueDaily.points,
                existingTtfTrueDaily.unit,
                usdPerEur,
                existingTtfTrueDaily.sourceSeriesId
              );
              sourceSeriesId = existingTtfTrueDaily.sourceSeriesId || sourceSeriesId;
              source = existingTtfTrueDaily.source || source;
              note = appendNoteOnce(existingTtfTrueDaily.note || note, '当前刷新失败，沿用最近一次真日频缓存');
            } else if (existingTtfCached?.points?.length) {
              console.warn(`[WARN] TTF history Barchart failed, reuse cached points: ${barchartError.message}`);
              points = normalizeCachedTtfPoints(
                existingTtfCached.points,
                existingTtfCached.unit,
                usdPerEur,
                existingTtfCached.sourceSeriesId
              );
              sourceSeriesId = existingTtfCached.sourceSeriesId || sourceSeriesId;
              source = existingTtfCached.source || source;
              note = appendNoteOnce(existingTtfCached.note || note, '当前刷新失败，沿用最近一次缓存');
            } else {
              throw new Error(`TTF true-daily source unavailable (Yahoo: ${error.message}; Barchart: ${barchartError.message})`);
            }
          }
        }
      } else {
        const rawPoints = await fetchFredSeriesHistory(item.sourceSeriesId, window.start, window.end);
        points = rawPoints;
      }

      series.push({
        ...item,
        sourceSeriesId,
        source,
        note,
        points
      });
      if (!points.length) {
        warnings.push(`${item.symbol}: 历史数据为空`);
      }
    } catch (error) {
      warnings.push(`${item.symbol}: 历史抓取失败`);
      series.push({
        ...item,
        points: []
      });
      console.warn(`[WARN] ${item.symbol} history failed: ${error.message}`);
    }
  }

  const rows = buildHistoryRowsByDate(series);

  await writeJson('market-history.json', {
    updatedAt: new Date().toISOString(),
    window,
    series,
    rows
  });

  return {
    seriesCount: series.length,
    warnings
  };
}

async function fetchIndustryNews() {
  const sources = [
    {
      name: 'Google News',
      url: 'https://news.google.com/rss/search?q=LNG%20OR%20%22natural%20gas%22%20OR%20Henry%20Hub%20OR%20TTF%20OR%20JKM%20when%3A1d&hl=en-US&gl=US&ceid=US%3Aen'
    },
    {
      name: 'Natural Gas Intelligence',
      url: 'https://www.naturalgasintel.com/feed/'
    },
    {
      name: 'Offshore Energy',
      url: 'https://www.offshore-energy.biz/feed/'
    },
    {
      name: 'OilPrice',
      url: 'https://oilprice.com/rss/main'
    }
  ];

  const all = [];

  for (const source of sources) {
    try {
      const xml = await fetchText(source.url);
      const rows = extractItemsFromRss(xml, 20)
        .map((item) => ({
          ...item,
          title: stripHtml(item.title),
          publishedAt: normalizeNewsDate(item.publishedAt),
          source: source.name
        }))
        .filter((item) => item.title && item.link)
        .filter((item) => isLngNewsRecord({ title: item.title, link: item.link }));

      all.push(...rows);
    } catch (error) {
      console.warn(`[WARN] news source ${source.name} failed: ${error.message}`);
    }
  }

  const rows = dedupeNewsRows(all)
    .sort((a, b) => String(b.publishedAt || '').localeCompare(String(a.publishedAt || '')))
    .slice(0, 10);

  if (!rows.length) {
    throw new Error('No LNG-relevant news records from all providers');
  }

  return rows;
}

async function fetchAcademicArticles() {
  const fetchFromCrossref = async () => {
    const oneYearAgo = new Date();
    oneYearAgo.setUTCFullYear(oneYearAgo.getUTCFullYear() - 1);
    const fromDate = oneYearAgo.toISOString().slice(0, 10);
    const params = new URLSearchParams({
      query: 'liquefied natural gas natural gas market jkm ttf henry hub',
      filter: `from-pub-date:${fromDate},type:journal-article`,
      sort: 'published',
      order: 'desc',
      rows: '60',
      select: 'title,DOI,published,published-print,published-online,issued,created,container-title,subject'
    });

    const queryUrl = `https://api.crossref.org/works?${params.toString()}`;
    const payload = await fetchJson(queryUrl);
    const items = payload?.message?.items || [];

    const mapped = items.map((item) => {
      const titleRaw = Array.isArray(item.title) && item.title.length > 0 ? item.title[0] : '';
      const title = stripHtml(titleRaw);
      const containerTitle = stripHtml(Array.isArray(item['container-title']) ? item['container-title'][0] : '');
      const subject = Array.isArray(item.subject) ? item.subject.map((x) => stripHtml(String(x))) : [];
      const doi = item.DOI ? `https://doi.org/${item.DOI}` : '';
      const publishedAt = normalizeCrossrefDate(item);

      return {
        title,
        link: doi,
        publishedAt,
        source: 'Crossref',
        _containerTitle: containerTitle,
        _subject: subject
      };
    }).filter((x) => x.link && x.title && x.publishedAt);

    const filtered = mapped.filter((x) => isLngAcademicRecord({
      title: x.title,
      containerTitle: x._containerTitle,
      subject: x._subject
    }));

    const deduped = dedupeAcademicRows(filtered)
      .sort((a, b) => (b.publishedAt || '').localeCompare(a.publishedAt || ''))
      .slice(0, 10)
      .map(({ _containerTitle, _subject, ...row }) => row);

    if (!deduped.length) {
      throw new Error('Crossref returned no LNG-relevant academic records after filtering');
    }

    return deduped;
  };

  const fetchFromArxivRss = async () => {
    const query = encodeURIComponent('all:"liquefied natural gas" OR all:"natural gas market" OR all:regasification');
    const xml = await fetchText(`https://export.arxiv.org/api/query?search_query=${query}&start=0&max_results=20&sortBy=submittedDate&sortOrder=descending`);
    const entries = xml.match(/<entry>[\s\S]*?<\/entry>/g) || [];

    const mapped = entries.map((raw) => {
      const title = stripHtml((raw.match(/<title>([\s\S]*?)<\/title>/)?.[1] || '').replace(/\n/g, ' '));
      const link = (raw.match(/<id>([\s\S]*?)<\/id>/)?.[1] || '').trim();
      const publishedRaw = (raw.match(/<published>([\s\S]*?)<\/published>/)?.[1] || '').trim();
      const publishedAt = normalizeDateFromString(publishedRaw);

      return { title, link, publishedAt, source: 'arXiv' };
    }).filter((x) => x.title && x.link && x.publishedAt);

    const filtered = mapped.filter((x) => isLngAcademicRecord({ title: x.title }));
    return dedupeAcademicRows(filtered)
      .sort((a, b) => (b.publishedAt || '').localeCompare(a.publishedAt || ''))
      .slice(0, 10);
  };

  const fetchFromOpenAlex = async () => {
    const oneYearAgo = new Date();
    oneYearAgo.setUTCFullYear(oneYearAgo.getUTCFullYear() - 1);
    const fromDate = oneYearAgo.toISOString().slice(0, 10);

    const params = new URLSearchParams({
      search: 'liquefied natural gas natural gas market jkm ttf henry hub',
      filter: `from_publication_date:${fromDate},type:article,has_doi:true`,
      sort: 'publication_date:desc',
      'per-page': '50'
    });

    const payload = await fetchJson(`https://api.openalex.org/works?${params.toString()}`);
    const items = Array.isArray(payload?.results) ? payload.results : [];

    const mapped = items.map((item) => {
      const title = stripHtml(item?.display_name || '');
      const doiUrl = typeof item?.doi === 'string' && item.doi.startsWith('http')
        ? item.doi
        : typeof item?.doi === 'string' && item.doi
          ? `https://doi.org/${item.doi.replace(/^https?:\/\/doi\.org\//, '')}`
          : '';
      const publishedAt = normalizeDateFromString(item?.publication_date || '');
      const venue = stripHtml(item?.primary_location?.source?.display_name || '');
      const concepts = Array.isArray(item?.concepts)
        ? item.concepts.map((x) => stripHtml(x?.display_name || '')).filter(Boolean)
        : [];

      return {
        title,
        link: doiUrl,
        publishedAt,
        source: 'OpenAlex',
        _containerTitle: venue,
        _subject: concepts
      };
    }).filter((x) => x.title && x.link && x.publishedAt);

    const filtered = mapped.filter((x) => isLngAcademicRecord({
      title: x.title,
      containerTitle: x._containerTitle,
      subject: x._subject
    }));

    const deduped = dedupeAcademicRows(filtered)
      .sort((a, b) => (b.publishedAt || '').localeCompare(a.publishedAt || ''))
      .slice(0, 10)
      .map(({ _containerTitle, _subject, ...row }) => row);

    if (!deduped.length) {
      throw new Error('OpenAlex returned no LNG-relevant academic records after filtering');
    }

    return deduped;
  };

  try {
    return await fetchFromCrossref();
  } catch (error) {
    console.warn(`[WARN] crossref failed, fallback OpenAlex: ${error.message}`);
  }

  try {
    return await fetchFromOpenAlex();
  } catch (error) {
    console.warn(`[WARN] OpenAlex failed, fallback arXiv query: ${error.message}`);
  }

  const arxivRows = await fetchFromArxivRss();
  if (!arxivRows.length) {
    throw new Error('No LNG-relevant academic records from all providers');
  }

  return arxivRows;
}

async function readJsonSafe(filePath, fallback) {
  try {
    const raw = await fs.readFile(filePath, 'utf8');
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

async function writeJson(fileName, data) {
  const filePath = path.join(DATA_DIR, fileName);
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

async function updateMarketPrices() {
  const existingPath = path.join(DATA_DIR, 'market-prices.json');
  const existing = await readJsonSafe(existingPath, { items: [] });
  const existingBySeries = new Map((existing.items || []).map((item) => [item.seriesId, item]));
  const usdPerEur = await fetchUsdPerEurRate();

  const items = [];
  const health = {
    staleCount: 0,
    fallbackCount: 0,
    errorCount: 0,
    nullValueCount: 0,
    warnings: []
  };

  for (const series of PRICE_SERIES) {
    try {
      const latest = series.seriesId === 'JKM_NDL'
        ? await fetchJkmPrice()
        : series.seriesId === 'TTF_BARCHART'
          ? await fetchTtfPrice()
        : series.seriesId === 'DCOILBRENTEU'
          ? await fetchBrentPrice()
          : series.seriesId === 'DHHNGSP'
            ? await fetchHenryHubPrice()
            : await fetchFredSeries(series.seriesId);

      const fallback = existingBySeries.get(series.seriesId);

      if (shouldKeepExistingData(fallback, latest)) {
        health.staleCount += 1;
        health.warnings.push(`${series.symbol}: 使用较新缓存值（抓取值日期较旧）`);
        items.push({
          ...series,
          value: fallback.value,
          date: fallback.date,
          unit: fallback.unit || series.unit,
          originvalue: fallback.originvalue,
          note: appendNoteOnce(fallback.note || series.note, STALE_NOTE_SUFFIX)
        });
        continue;
      }

      const note = series.seriesId === 'JKM_NDL' && latest.source === 'FRED_PROXY'
        ? 'JKM 公开期货源暂不可用，临时回退日本 LNG 进口价代理'
        : series.seriesId === 'JKM_NDL' && latest.source === 'NASDAQ_DATA_LINK'
          ? 'NASDAQ Data Link 连续合约结算价（当前网络下 Barchart 不可用时回退）'
          : series.seriesId === 'JKM_NDL' && latest.source === 'BARCHART'
            ? `Barchart 公共页面抓取的 NYMEX JKM 活跃近月合约 ${latest.symbol}`
        : series.seriesId === 'TTF_BARCHART' && latest.source === 'FRED_PROXY'
          ? 'TTF 公开期货源暂不可用，临时回退欧洲天然气价格代理'
          : series.seriesId === 'TTF_BARCHART' && latest.source === 'BARCHART'
            ? `Barchart 公共页面抓取的 ENDEX Dutch TTF Gas 活跃近月合约 ${latest.symbol}`
        : series.seriesId === 'DCOILBRENTEU' && latest.source === 'FRED_FALLBACK'
          ? 'Brent 公共期货源暂不可用，临时回退 FRED 序列'
        : series.seriesId === 'DCOILBRENTEU' && latest.source === 'BARCHART'
          ? `Barchart 公共页面抓取的 ICE Brent 活跃近月合约 ${latest.symbol}`
        : series.seriesId === 'DHHNGSP' && latest.source === 'FRED_FALLBACK'
          ? 'Henry Hub 公共期货源暂不可用，临时回退 FRED 序列'
        : series.seriesId === 'DHHNGSP' && latest.source === 'BARCHART'
          ? `Barchart 公共页面抓取的 NYMEX Henry Hub Gas 活跃近月合约 ${latest.symbol}`
        : series.note;

      if (latest.source === 'FRED_PROXY' || latest.source === 'NASDAQ_DATA_LINK' || latest.source === 'FRED_FALLBACK') {
        health.fallbackCount += 1;
        health.warnings.push(`${series.symbol}: 使用回退数据源 ${latest.source}`);
      }

      const isTtfBarchart = series.seriesId === 'TTF_BARCHART' && latest.source === 'BARCHART';
      const convertedTtfValue = isTtfBarchart
        ? convertEurMwhToUsdMmbtu(latest.value, usdPerEur)
        : latest.value;
      const convertedNote = isTtfBarchart
        ? appendNoteOnce(note, `按 DEXUSEU=${usdPerEur} 将 EUR/MWh 换算为 USD/MMBtu`) : note;

      items.push({
        ...series,
        note: convertedNote,
        unit: series.seriesId === 'TTF_BARCHART' && latest.source === 'FRED_PROXY'
          ? 'USD/MMBtu'
          : series.seriesId === 'TTF_BARCHART'
            ? 'USD/MMBtu'
            : series.unit,
        value: convertedTtfValue,
        originvalue: isTtfBarchart ? latest.value : undefined,
        date: latest.date
      });

      if (convertedTtfValue === null || convertedTtfValue === undefined) {
        health.nullValueCount += 1;
      }
    } catch (error) {
      const fallback = existingBySeries.get(series.seriesId);
      health.errorCount += 1;
      health.warnings.push(`${series.symbol}: 抓取失败，回退缓存`);
      items.push({
        ...series,
        value: fallback?.value ?? null,
        date: fallback?.date ?? '',
        unit: fallback?.unit || series.unit,
        originvalue: fallback?.originvalue,
        note: appendNoteOnce(series.note, '更新失败已回退缓存')
      });
      console.warn(`[WARN] ${series.seriesId}: ${error.message}`);
    }
  }

  await writeJson('market-prices.json', {
    updatedAt: new Date().toISOString(),
    source: 'Barchart futures + FRED/NASDAQ fallback',
    items
  });

  return {
    itemCount: items.length,
    ...health
  };
}

async function updateNewsDigest() {
  const existingPath = path.join(DATA_DIR, 'news-digest.json');
  const existing = await readJsonSafe(existingPath, { news: [], academic: [] });

  let news = [];
  let academic = [];
  const health = {
    usedNewsCache: false,
    usedAcademicCache: false,
    warnings: []
  };

  try {
    news = await fetchIndustryNews();
  } catch (error) {
    console.warn(`[WARN] news feed: ${error.message}`);
  }

  try {
    academic = await fetchAcademicArticles();
  } catch (error) {
    console.warn(`[WARN] academic feed: ${error.message}`);
  }

  if (!news.length) {
    news = Array.isArray(existing.news) ? existing.news : [];
    health.usedNewsCache = true;
    health.warnings.push('news: 本轮抓取为空，使用缓存');
  }

  if (!academic.length) {
    academic = Array.isArray(existing.academic) ? existing.academic : [];
    health.usedAcademicCache = true;
    health.warnings.push('academic: 本轮抓取为空，使用缓存');
  }

  await writeJson('news-digest.json', {
    updatedAt: new Date().toISOString(),
    news,
    academic
  });

  return {
    newsCount: news.length,
    academicCount: academic.length,
    ...health
  };
}

async function updateWechatWatchlist() {
  const existingPath = path.join(DATA_DIR, 'wechat-watchlist.json');
  const existing = await readJsonSafe(existingPath, { manualDigest: [] });

  await writeJson('wechat-watchlist.json', {
    updatedAt: new Date().toISOString(),
    accounts: WECHAT_ACCOUNTS,
    manualDigest: Array.isArray(existing.manualDigest) ? existing.manualDigest : []
  });

  return {
    accountCount: WECHAT_ACCOUNTS.length,
    manualDigestCount: Array.isArray(existing.manualDigest) ? existing.manualDigest.length : 0
  };
}

async function main() {
  const options = parseCliOptions(process.argv);
  console.log('[data] update started');
  const shouldRun = (section) => !options.only || options.only.has(section);
  const staleReason = (minutes) => `fresh within ${minutes} minute(s)`;

  const [marketHealth, historyHealth, newsHealth, wechatHealth] = await Promise.all([
    (async () => {
      if (!shouldRun('market')) return skippedMarketHealth('not selected');
      if (await isSectionFresh('market', options.ifStaleMinutes)) return skippedMarketHealth(staleReason(options.ifStaleMinutes));
      return updateMarketPrices();
    })(),
    (async () => {
      if (!shouldRun('history')) return skippedHistoryHealth('not selected');
      if (await isSectionFresh('history', options.ifStaleMinutes)) return skippedHistoryHealth(staleReason(options.ifStaleMinutes));
      return updateMarketHistory();
    })(),
    (async () => {
      if (!shouldRun('news')) return skippedNewsHealth('not selected');
      if (await isSectionFresh('news', options.ifStaleMinutes)) return skippedNewsHealth(staleReason(options.ifStaleMinutes));
      return updateNewsDigest();
    })(),
    (async () => {
      if (!shouldRun('wechat')) return skippedWechatHealth('not selected');
      if (await isSectionFresh('wechat', options.ifStaleMinutes)) return skippedWechatHealth(staleReason(options.ifStaleMinutes));
      return updateWechatWatchlist();
    })()
  ]);

  const warnings = [
    ...(marketHealth.warnings || []),
    ...(historyHealth.warnings || []),
    ...(newsHealth.warnings || [])
  ];

  const degraded =
    marketHealth.errorCount > 0
    || marketHealth.nullValueCount > 0
    || marketHealth.fallbackCount > 0
    || marketHealth.staleCount > 0
    || newsHealth.usedNewsCache
    || newsHealth.usedAcademicCache;

  await writeJson('data-health.json', {
    updatedAt: new Date().toISOString(),
    status: degraded ? 'degraded' : 'ok',
    options: {
      only: options.only ? [...options.only] : ['market', 'history', 'news', 'wechat'],
      ifStaleMinutes: options.ifStaleMinutes
    },
    summary: {
      market: marketHealth,
      history: historyHealth,
      news: newsHealth,
      wechat: wechatHealth
    },
    warnings
  });

  console.log('[data] update completed');
}

main().catch((error) => {
  console.error('[data] update failed:', error);
  process.exit(1);
});
