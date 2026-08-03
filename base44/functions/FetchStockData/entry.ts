import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

const RANGE_DEFAULTS = {
  '1m': '5d',
  '2m': '1mo',
  '5m': '1mo',
  '15m': '1mo',
  '30m': '1mo',
  '60m': '3mo',
  '1d': '1y',
};

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    let body = {};
    try {
      body = await req.json();
    } catch (e) {
      body = {};
    }
    const symbols = (body.symbols || []).filter((s) => typeof s === 'string' && s.trim()).map((s) => s.trim().toUpperCase());
    const interval = body.interval || '5m';
    const range = body.range || RANGE_DEFAULTS[interval] || '1mo';

    const series = {};
    const prices = {};
    let timestamps = null;

    await Promise.all(symbols.map(async (sym) => {
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?interval=${encodeURIComponent(interval)}&range=${encodeURIComponent(range)}`;
      try {
        const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (base44 app)' } });
        if (!r.ok) return;
        const j = await r.json();
        const res = j?.chart?.result?.[0];
        if (!res) return;
        const ts = res.timestamp || [];
        const closes = (res.indicators?.quote?.[0]?.close) || [];
        prices[sym] = res.meta?.regularMarketPrice ?? closes[closes.length - 1] ?? null;
        series[sym] = closes.map((v) => (v == null ? null : v));
        if (!timestamps) timestamps = ts;
      } catch (e) {
        // skip failed symbol
      }
    }));

    return Response.json({
      timestamps: timestamps || [],
      series,
      prices,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}