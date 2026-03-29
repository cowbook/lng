const fs = require('node:fs/promises');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const DATA_DIR = path.join(ROOT, '.vitepress', 'data');

const FRED_BASE = 'https://api.stlouisfed.org/fred/series/observations';
const FRED_KEY = process.env.FRED_API_KEY || '';
const NDL_KEY = process.env.NASDAQ_DATA_LINK_API_KEY || '';
const FUTURES_MONTH_CODES = ['F', 'G', 'H', 'J', 'K', 'M', 'N', 'Q', 'U', 'V', 'X', 'Z'];
const MMBTU_PER_MWH = 3.412141633;
const DEFAULT_USD_PER_EUR = 1.1;
const HISTORY_DAYS = 365;
const STALE_NOTE_SUFFIX = '本次抓取日期较旧，保留现有较新值';
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
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'lng.cool/1.0 (data updater)'
    }
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${url}`);
  }

  return response.json();
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
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'lng.cool/1.0 (data updater)'
    }
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${url}`);
  }

  return response.text();
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

async function updateMarketHistory() {
  const window = getHistoryWindow(HISTORY_DAYS);
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
      sourceSeriesId: 'PNGASJPUSDM',
      source: 'https://fred.stlouisfed.org/series/PNGASJPUSDM',
      note: 'FRED 月频代理序列'
    },
    {
      symbol: 'TTF',
      displayName: 'TTF 欧洲气价基准',
      unit: 'USD/MMBtu',
      sourceSeriesId: 'PNGASEUUSDM',
      source: 'https://fred.stlouisfed.org/series/PNGASEUUSDM',
      note: 'FRED 月频代理序列'
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
      const rawPoints = await fetchFredSeriesHistory(item.sourceSeriesId, window.start, window.end);
      const points = (item.symbol === 'TTF' || item.symbol === 'JKM')
        ? expandMonthlyPointsToDaily(rawPoints, window.start, window.end)
        : rawPoints;

      const note = (item.symbol === 'TTF' || item.symbol === 'JKM')
        ? `${item.note}; 已按自然日展开（月频序列转日频展示）`
        : item.note;

      series.push({
        ...item,
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

  await writeJson('market-history.json', {
    updatedAt: new Date().toISOString(),
    window,
    series
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
        note: `${series.note}; 更新失败已回退缓存`
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
  console.log('[data] update started');
  const marketHealth = await updateMarketPrices();
  const historyHealth = await updateMarketHistory();
  const newsHealth = await updateNewsDigest();
  const wechatHealth = await updateWechatWatchlist();

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
