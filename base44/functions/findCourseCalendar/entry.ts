import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Stage A: FAST calendar-URL discovery for the student's specific
// faculty + degree program + specialization.
//
// Primary path (~3-8s): crawl the university's OWN calendar index (1-2 HTTP
// fetches to its own domain, which is reachable from the backend) and parse
// anchor links to locate the program's course-listing page. No LLM involved.
// Fallback (~10-40s): AI (gemini_3_flash) web search only if the crawl fails.

const STOP = new Set(['of','the','and','in','for','a','an','to','program','programs','degree','bachelor','beng','honours','hons','engineering','science','arts','faculty','school','department']);

function slug(s) {
  return (s || '').toLowerCase().trim()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '')
    .slice(0, 60);
}

function programWords(s) {
  return (s || '').toLowerCase().split(/[^a-z0-9]+/i).filter((w) => w.length >= 4 && !STOP.has(w));
}

function fetchHtml(url, ms) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  return fetch(url, {
    signal: ctrl.signal,
    redirect: 'follow',
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36', 'Accept': 'text/html,*/*' },
  }).then(async (r) => (r.ok ? await r.text() : null)).catch(() => null).finally(() => clearTimeout(t));
}

function parseLinks(html, origin) {
  const out = [];
  const re = /<a\b[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
  let m;
  while ((m = re.exec(html)) && out.length < 800) {
    let h = m[1];
    if (!h || h.startsWith('#') || h.startsWith('mailto:') || h.startsWith('javascript:')) continue;
    if (h.startsWith('//')) h = 'https:' + h;
    else if (h.startsWith('/')) h = origin + h;
    if (!/^https?:\/\//i.test(h)) continue;
    const title = (m[2] || '').replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').trim();
    let host = '';
    try { host = new URL(h).hostname.replace(/^www\./, '').toLowerCase(); } catch { continue; }
    out.push({ url: h, title, host });
  }
  return out;
}

function normalizeProgramUrl(u) {
  // Prefer the clean "/programs/<...>/<prog>/" form over legacy ".html" variants.
  try {
    const p = new URL(u);
    if (/\.html?$/i.test(p.pathname) && /\/programs?\/[^?#]+/i.test(p.pathname)) {
      p.pathname = p.pathname.replace(/\.html?$/i, '') + '/';
      return p.toString();
    }
  } catch {}
  return u;
}

function scoreProgramLink(l, words, slugs) {
  let u; try { u = new URL(l.url); } catch { return -1; }
  const p = (u.pathname + ' ' + l.title).toLowerCase();
  let s = 0;
  let matched = 0;
  for (const w of words) if (p.includes(w)) matched++;
  s += matched * 3;
  for (const sl of slugs) if (sl && (p.includes(sl) || p.replace(/-/g, '').includes(sl.replace(/-/g, '')))) s += 2;
  if (/calendar/i.test(p)) s += 2;
  if (/\/programs?\//i.test(u.pathname)) s += 3;
  if (/\/courses?\//i.test(u.pathname)) s += 2;
  if (/course-list|course-desc|course-outline/i.test(p)) s += 2;
  if (matched < Math.max(1, words.length - 1)) s -= 4;
  if (/admission|apply|about|news|events|contact|important-dates|deadlines?|policies|dates|graduate/i.test(p)) s -= 6;
  if (/\.(pdf|jpg|png|js|css)$/i.test(u.pathname)) s -= 10;
  return s;
}

async function crawlFind(startUrl, words, slugs) {
  let origin;
  try { origin = new URL(startUrl).origin; } catch { return { candidates: [], best_url: '', method: 'ai' }; }

  const h1 = await fetchHtml(startUrl, 6000);
  if (!h1) return { candidates: [], best_url: '', method: 'ai' };
  const links1 = parseLinks(h1, origin);
  if (!links1.length) return { candidates: [], best_url: '', method: 'ai' };

  // Strong same-origin filter.
  const wantHost = new URL(startUrl).hostname.replace(/^www\./, '').toLowerCase();
  const root = wantHost.split('.').slice(-2).join('.');
  const same = links1.filter((l) => l.host === wantHost || l.host.endsWith('.' + root));

  // (a) A direct program page on the start page → return immediately (1 fetch).
  const direct = same.map((l) => ({ l, s: scoreProgramLink(l, words, slugs) })).filter((x) => x.s >= 9).sort((a, b) => b.s - a.s);
  if (direct.length) {
    const top = direct.slice(0, 3).map((x) => ({ url: normalizeProgramUrl(x.l.url), title: x.l.title || x.l.url, confidence: x.s >= 11 ? 'high' : 'medium' }));
    return { candidates: top, best_url: top[0].url, method: 'fast' };
  }

  // (b) Find an undergraduate "programs" index link to crawl one level deeper.
  const indexCandidates = same.map((l) => {
    let u; try { u = new URL(l.url); } catch { return null; }
    const p = (u.pathname + ' ' + l.title).toLowerCase();
    let s = 0;
    if (/\/calendar\/\d{4}-\d{4}\/programs?\/?$/i.test(u.pathname) || /\/calendar\/\d{4}\/programs?\/?$/.test(u.pathname)) s += 8;
    if (/\/programs?\/?$/i.test(u.pathname) && /calendar/i.test(p)) s += 5;
    if (/calendar/i.test(p)) s += 3;
    if (/undergraduate|undergrad/i.test(p)) s += 2;
    if (/graduate|admission|about|news|events|dates|policies/i.test(p)) s -= 6;
    return { l, s };
  }).filter(Boolean).filter((x) => x.s > 0).sort((a, b) => b.s - a.s);

  const bestIndex = indexCandidates[0]?.l;
  if (!bestIndex) return { candidates: [], best_url: '', method: 'ai' };

  // Hop 2: fetch the programs index and locate the specific program page.
  const h2 = await fetchHtml(bestIndex.url, 6000);
  if (!h2) return { candidates: [], best_url: '', method: 'ai' };
  let origin2; try { origin2 = new URL(bestIndex.url).origin; } catch { origin2 = origin; }
  const links2 = parseLinks(h2, origin2).filter((l) => l.host === wantHost || l.host.endsWith('.' + root));
  const ranked = links2.map((l) => ({ l, s: scoreProgramLink(l, words, slugs) })).filter((x) => x.s > 0).sort((a, b) => b.s - a.s);
  if (!ranked.length) return { candidates: [], best_url: '', method: 'ai' };
  const top = ranked.slice(0, 3).map((x) => ({ url: normalizeProgramUrl(x.l.url), title: x.l.title || x.l.url, confidence: x.s >= 11 ? 'high' : x.s >= 8 ? 'medium' : 'low' }));
  return { candidates: top, best_url: top[0].url, method: 'fast' };
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({})) || {};
    let university_name = body.university_name;
    let faculty = body.faculty;
    let degree_program = body.degree_program;
    let specialization = body.specialization;
    let university_domain = body.university_domain;
    let university_course_catalog_url = body.university_course_catalog_url;

    if (!university_name || faculty === undefined || degree_program === undefined) {
      const settings = await base44.entities.EduSettings.list();
      const s = Array.isArray(settings) ? settings[0] : null;
      if (s) {
        university_name = university_name || s.university_name;
        faculty = faculty === undefined ? s.faculty : faculty;
        degree_program = degree_program === undefined ? s.degree_program : degree_program;
        specialization = specialization === undefined ? s.specialization : specialization;
        university_domain = university_domain || s.university_domain;
        university_course_catalog_url = university_course_catalog_url || s.university_course_catalog_url;
      }
    }
    if (!university_name) return Response.json({ error: 'university_name is required' }, { status: 400 });

    const words = programWords(degree_program + ' ' + specialization);
    const slugs = [slug(degree_program), slug(specialization)].filter(Boolean);

    // Build a calendar-start URL for the crawl.
    let startUrl = (university_course_catalog_url && /^https?:\/\//i.test(university_course_catalog_url)) ? university_course_catalog_url : '';
    if (!startUrl && university_domain) {
      const d = university_domain.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
      startUrl = `https://${d}/calendar/`;
    }

    // ---- Fast path: crawl the university's own calendar (~3-8s) ----
    let fast = { candidates: [], best_url: '', method: 'ai' };
    if (startUrl) try { fast = await crawlFind(startUrl, words, slugs); } catch (e) { fast = { candidates: [], best_url: '', method: 'ai' }; }

    if (fast.candidates.length) {
      const uniqC = []; const seen = new Set();
      for (const c of fast.candidates) { if (seen.has(c.url)) continue; seen.add(c.url); uniqC.push(c); if (uniqC.length >= 3) break; }
      return Response.json({ candidates: uniqC, best_url: fast.best_url, method: 'fast', university_name, faculty: faculty || '', degree_program: degree_program || '', specialization: specialization || '' });
    }

    // ---- Fallback: AI web search (~10-40s) ----
    const programStr = degree_program ? `"${degree_program}"${faculty ? `, ${faculty}` : ''}` : (faculty || '');
    const catalogHint = university_course_catalog_url ? ` An existing catalog URL is ${university_course_catalog_url} — verify it or find the program-specific course-listing page.` : '';
    const prompt = [
      `Find the ONE URL of the official undergraduate academic-calendar / course-listing page listing this student's program courses. University: ${university_name}. Program: ${programStr || '(general)'}.${catalogHint}`,
      `Run a single web search (e.g. "${university_name} undergraduate calendar ${degree_program || faculty || ''} courses") and answer from search SNIPPETS only.`,
      "Do ONE search; do NOT open or read any page; return URLs from the results immediately.",
      "Need a page that lists individual courses (codes+titles+descriptions), not a homepage. Prefer the program/faculty course-listing page.",
      "Return ONLY JSON: { best_url: string, candidates: [{url,title,confidence}] up to 3 }. Never fabricate URLs. If nothing, best_url='' and candidates=[].",
    ].join(" ");

    let candidates = [];
    let best_url = "";
    try {
      const res = await base44.integrations.Core.InvokeLLM({
        prompt,
        add_context_from_internet: true,
        model: "gemini_3_flash",
        response_json_schema: {
          type: "object",
          properties: {
            best_url: { type: "string" },
            candidates: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  url: { type: "string" },
                  title: { type: "string" },
                  confidence: { type: "string", enum: ["high", "medium", "low"] },
                },
                required: ["url", "title"],
              },
            },
          },
          required: ["candidates"],
        },
      });
      const d = res?.data ?? res;
      const raw = Array.isArray(d?.candidates) ? d.candidates : [];
      candidates = raw
        .filter((c) => c && c.url && /^https?:\/\//i.test(c.url))
        .map((c) => ({ url: String(c.url).trim(), title: String(c.title || c.url).trim(), confidence: c.confidence || "medium" }))
        .slice(0, 3);
      best_url = (d?.best_url && /^https?:\/\//i.test(d.best_url)) ? String(d.best_url).trim() : (candidates[0]?.url || "");
    } catch (e) { /* fall through */ }

    return Response.json({ candidates, best_url, method: 'ai', university_name, faculty: faculty || '', degree_program: degree_program || '', specialization: specialization || '' });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}