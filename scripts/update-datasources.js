const fs = require('node:fs/promises');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const DATA_DIR = path.join(ROOT, '.vitepress', 'data');

const FRED_BASE = 'https://api.stlouisfed.org/fred/series/observations';
const FRED_KEY = process.env.FRED_API_KEY || '';
const NDL_KEY = process.env.NASDAQ_DATA_LINK_API_KEY || '';
const FUTURES_MONTH_CODES = ['F', 'G', 'H', 'J', 'K', 'M', 'N', 'Q', 'U', 'V', 'X', 'Z'];

const PRICE_SERIES = [
  {
    symbol: 'Brent',
    displayName: 'Brent 原油',
    seriesId: 'DCOILBRENTEU',
    unit: 'USD/Barrel',
    note: 'FRED 官方序列'
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
    unit: 'USD/MMBtu',
    note: 'Barchart 公共页面抓取的 ENDEX Dutch TTF Gas 活跃近月合约价格'
  },
  {
    symbol: 'Henry Hub',
    displayName: 'Henry Hub',
    seriesId: 'DHHNGSP',
    unit: 'USD/MMBtu',
    note: 'FRED 官方序列'
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
  if (typeof value !== 'string' || value.trim() === '.' || value.trim() === '') {
    return null;
  }
  const n = Number(value);
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

async function fetchIndustryNews() {
  const rssUrl = 'https://news.google.com/rss/search?q=LNG%20OR%20%22natural%20gas%22%20OR%20Henry%20Hub%20OR%20TTF%20when%3A1d&hl=en-US&gl=US&ceid=US%3Aen';
  const xml = await fetchText(rssUrl);
  return extractItemsFromRss(xml, 10);
}

async function fetchAcademicArticles() {
  const fetchFromCrossref = async () => {
    const queryUrl = 'https://api.crossref.org/works?query=liquefied%20natural%20gas%20market&filter=from-pub-date:2025-01-01&sort=published&order=desc&rows=10';
    const payload = await fetchJson(queryUrl);
    const items = payload?.message?.items || [];

    return items.map((item) => {
      const title = Array.isArray(item.title) && item.title.length > 0 ? item.title[0] : 'Untitled';
      const doi = item.DOI ? `https://doi.org/${item.DOI}` : '';
      const dateParts = item?.published?.['date-parts']?.[0] || item?.issued?.['date-parts']?.[0] || [];
      const publishedAt = dateParts.length ? dateParts.join('-') : '';

      return {
        title,
        link: doi,
        publishedAt,
        source: 'Crossref'
      };
    }).filter((x) => x.link);
  };

  const fetchFromArxivRss = async () => {
    const xml = await fetchText('https://export.arxiv.org/rss/econ');
    const items = extractItemsFromRss(xml, 10);
    return items.map((x) => ({
      ...x,
      source: 'arXiv'
    }));
  };

  try {
    return await fetchFromCrossref();
  } catch (error) {
    console.warn(`[WARN] crossref failed, fallback arXiv RSS: ${error.message}`);
    return fetchFromArxivRss();
  }
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

  const items = [];

  for (const series of PRICE_SERIES) {
    try {
      const latest = series.seriesId === 'JKM_NDL'
        ? await fetchJkmPrice()
        : series.seriesId === 'TTF_BARCHART'
          ? await fetchTtfPrice()
        : await fetchFredSeries(series.seriesId);

      const fallback = existingBySeries.get(series.seriesId);

      if (shouldKeepExistingData(fallback, latest)) {
        items.push({
          ...series,
          value: fallback.value,
          date: fallback.date,
          note: `${fallback.note || series.note}; 本次抓取日期较旧，保留现有较新值`
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
        : series.note;

      items.push({
        ...series,
        note,
        value: latest.value,
        date: latest.date
      });
    } catch (error) {
      const fallback = existingBySeries.get(series.seriesId);
      items.push({
        ...series,
        value: fallback?.value ?? null,
        date: fallback?.date ?? '',
        note: `${series.note}; 更新失败已回退缓存`
      });
      console.warn(`[WARN] ${series.seriesId}: ${error.message}`);
    }
  }

  await writeJson('market-prices.json', {
    updatedAt: new Date().toISOString(),
    source: 'FRED API + Barchart + NASDAQ Data Link',
    items
  });
}

async function updateNewsDigest() {
  let news = [];
  let academic = [];

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

  await writeJson('news-digest.json', {
    updatedAt: new Date().toISOString(),
    news,
    academic
  });
}

async function updateWechatWatchlist() {
  const existingPath = path.join(DATA_DIR, 'wechat-watchlist.json');
  const existing = await readJsonSafe(existingPath, { manualDigest: [] });

  await writeJson('wechat-watchlist.json', {
    updatedAt: new Date().toISOString(),
    accounts: WECHAT_ACCOUNTS,
    manualDigest: Array.isArray(existing.manualDigest) ? existing.manualDigest : []
  });
}

async function main() {
  console.log('[data] update started');
  await updateMarketPrices();
  await updateNewsDigest();
  await updateWechatWatchlist();
  console.log('[data] update completed');
}

main().catch((error) => {
  console.error('[data] update failed:', error);
  process.exit(1);
});
