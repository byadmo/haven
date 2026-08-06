import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

const CONNECTOR_ID = '6a70ef7e9f47c094588c220b';
const CAL_NAME = 'EduSync - Academic Schedule';
const SYNC_TAG = 'edusync-sync';
const BYDAY = { M: 'MO', T: 'TU', W: 'WE', Th: 'TH', F: 'FR', S: 'SA', Su: 'SU' };

async function getToken(base44) {
  const conn = await base44.asServiceRole.connectors.getCurrentAppUserConnection(CONNECTOR_ID);
  return conn.accessToken;
}

async function getUserEmail(token) {
  const r = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!r.ok) return null;
  const j = await r.json();
  return j.email || null;
}

async function findEduCal(token) {
  const r = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList?maxResults=250', {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!r.ok) return null;
  const j = await r.json();
  const found = (j.items || []).find((c) => c.summary === CAL_NAME);
  return found ? found.id : null;
}

async function ensureCalendar(token) {
  const existing = await findEduCal(token);
  if (existing) return { id: existing, created: false, fallback: false };
  try {
    const r = await fetch('https://www.googleapis.com/calendar/v3/calendars', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ summary: CAL_NAME, description: `${SYNC_TAG}\nCalendar managed by Haven Education EduSync.` }),
    });
    if (!r.ok) throw new Error('insert_failed');
    const j = await r.json();
    return { id: j.id, created: true, fallback: false };
  } catch (e) {
    // The connected account only granted the calendar.events scope, which
    // cannot create new calendars — fall back to the primary calendar so
    // sync still works. A dedicated calendar can be added by granting the
    // full `calendar` scope.
    return { id: 'primary', created: false, fallback: true };
  }
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    let body = {};
    try { body = await req.json(); } catch { body = {}; }
    const action = body.action || 'status';

    let token;
    try {
      token = await getToken(base44);
    } catch (e) {
      return Response.json({ connected: false, error: 'Google Calendar not connected.' }, { status: 200 });
    }
    const email = await getUserEmail(token);

    // ── STATUS: light connection check ──
    if (action === 'status') {
      return Response.json({ connected: true, email });
    }

    // ── SETUP: ensure the EduSync calendar exists ──
    if (action === 'setup') {
      const cal = await ensureCalendar(token);
      return Response.json({ connected: true, email, calendar_id: cal.id, calendar_created: cal.created, using_primary_fallback: cal.fallback });
    }

    // ── SYNC: push classes / assignments / exams ──
    if (action === 'sync') {
      const calendar_id = body.calendar_id || (await ensureCalendar(token)).id;
      const pushClasses = body.push_classes !== false;
      const pushAssignments = body.push_assignments !== false;
      const pushExams = body.push_exams !== false;
      const semester_id = body.semester_id;

      let courses = [];
      let deliverables = [];
      if (semester_id) {
        courses = await base44.entities.Course.filter({ semester_id }).catch(() => []);
        const courseIds = courses.map((c) => c.id);
        if (courseIds.length) {
          deliverables = await base44.entities.Deliverable.filter({ course_id: { $in: courseIds } }).catch(() => []);
        }
      }

      // Load existing synced events to avoid duplicates
      const existingKeys = new Set();
      let listUrl = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendar_id)}/events?maxResults=250&q=${encodeURIComponent(SYNC_TAG)}`;
      let lr = await fetch(listUrl, { headers: { Authorization: `Bearer ${token}` } }).catch(() => null);
      if (lr && lr.ok) {
        const ld = await lr.json();
        (ld.items || []).forEach((e) => {
          existingKeys.add(`${e.summary}|${e.start?.date || e.start?.dateTime?.split('T')[0] || ''}`);
        });
      }

      let created = 0, skipped = 0;
      const baseHeaders = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
      const evUrl = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendar_id)}/events`;

      async function upsert(ev) {
        const key = `${ev.summary}|${ev.start?.date || ev.start?.dateTime?.split('T')[0] || ''}`;
        if (existingKeys.has(key)) { skipped++; return; }
        const r = await fetch(evUrl, { method: 'POST', headers: baseHeaders, body: JSON.stringify(ev) });
        if (r.ok) { created++; existingKeys.add(key); }
      }

      // Classes → weekly recurring events
      if (pushClasses) {
        for (const c of courses) {
          if (!c.schedule_days?.length || !c.schedule_time || !c.schedule_time.includes('-')) continue;
          const [st, en] = c.schedule_time.split('-').map((s) => s.trim());
          const dayStart = c.semester_start || new Date().toISOString().slice(0, 10);
          // first occurrence
          const startDate = semesterStartForAction(body.semester_start, c.schedule_days[0]);
          const startDt = `${startDate}T${pad(st)}:00`;
          const endDt = `${startDate}T${pad(en)}:00`;
          const byday = c.schedule_days.map((d) => BYDAY[d] || d).join(',');
          const until = (body.semester_end || addMonths(startDate, 4)).replace(/-/g, '') + 'T000000Z';
          const summary = `${c.code} — ${c.title || 'Class'}`;
          const desc = `${SYNC_TAG}\nCourse: ${c.code}\n${c.location ? 'Location: ' + c.location + '\n' : ''}${c.professor_name ? 'Professor: ' + c.professor_name : ''}`.trim();
          await upsert({
            summary,
            description: desc,
            location: c.location || undefined,
            start: { dateTime: startDt, timeZone: 'America/Toronto' },
            end: { dateTime: endDt, timeZone: 'America/Toronto' },
            recurrence: [`RRULE:FREQ=WEEKLY;BYDAY=${byday};UNTIL=${until}`],
            reminders: { useDefault: true },
          });
        }
      }

      // Assignments + exams → all-day events on due_date
      for (const d of deliverables) {
        if (!d.due_date) continue;
        const isExam = d.is_exam || d.type === 'exam' || d.type === 'midterm' || d.type === 'final';
        if (isExam && !pushExams) continue;
        if (!isExam && !pushAssignments) continue;
        const course = courses.find((c) => c.id === d.course_id);
        const summary = `${isExam ? '📝' : '📘'} ${course?.code || ''} — ${d.title}`;
        const endDate = addDay(d.due_date);
        await upsert({
          summary,
          description: `${SYNC_TAG}\n${isExam ? 'Exam' : 'Assignment'} · ${course?.code || ''}\nWeight: ${d.weight || 0}%`,
          start: { date: d.due_date },
          end: { date: endDate },
          reminders: { useDefault: true },
        });
      }

      return Response.json({ connected: true, email, calendar_id, created, skipped });
    }

    // ── FETCH_EVENTS: list events in a range for the Schedule view ──
    if (action === 'fetch_events') {
      const calendar_id = body.calendar_id || (await ensureCalendar(token)).id;
      const timeMin = body.range_start ? new Date(body.range_start + 'T00:00:00').toISOString() : new Date().toISOString();
      const timeMax = body.range_end ? new Date(body.range_end + 'T23:59:59').toISOString() : new Date(Date.now() + 30 * 86400000).toISOString();
      const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendar_id)}/events?maxResults=250&singleEvents=true&orderBy=startTime&timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}`;
      const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } }).catch(() => null);
      const items = [];
      if (r && r.ok) {
        const j = await r.json();
        (j.items || []).forEach((e) => {
          items.push({
            id: e.id,
            summary: e.summary || '(Untitled)',
            start: e.start?.dateTime || e.start?.date,
            end: e.end?.dateTime || e.end?.date,
            allDay: !e.start?.dateTime,
            location: e.location || '',
            is_edusync: !!(e.description || '').includes(SYNC_TAG),
          });
        });
      }
      return Response.json({ connected: true, email, calendar_id, items });
    }

    // ── SYNC_TASKS: push deliverables as all-day events, create-or-update by google_event_id ──
    if (action === 'sync_tasks') {
      const calendar_id = body.calendar_id || (await ensureCalendar(token)).id;
      const tasks = Array.isArray(body.tasks) ? body.tasks : [];
      const evUrl = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendar_id)}/events`;
      const baseHeaders = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
      let created = 0, updated = 0, failed = 0;
      const mappings = [];
      for (const t of tasks) {
        if (!t.due_date) continue;
        const isExam = ['exam', 'midterm', 'final'].includes(t.type);
        const summary = `${isExam ? '📝' : '📘'} ${t.course_code || ''} — ${t.title}`.trim().replace(/\s+/g, ' ');
        const description = `${SYNC_TAG}\n${isExam ? 'Exam' : 'Task'} · ${t.course_code || ''}${t.weight ? '\nWeight: ' + t.weight + '%' : ''}`.trim();
        const evBody = {
          summary,
          description,
          start: { date: t.due_date },
          end: { date: addDay(t.due_date) },
          reminders: { useDefault: true },
        };
        if (t.google_event_id) {
          const r = await fetch(`${evUrl}/${encodeURIComponent(t.google_event_id)}`, { method: 'PUT', headers: baseHeaders, body: JSON.stringify(evBody) }).catch(() => null);
          if (r && r.ok) updated++; else { failed++; mappings.push({ deliverable_id: t.id, failed: true }); }
        } else {
          const r = await fetch(evUrl, { method: 'POST', headers: baseHeaders, body: JSON.stringify(evBody) }).catch(() => null);
          if (r && r.ok) { const j = await r.json(); created++; mappings.push({ deliverable_id: t.id, google_event_id: j.id }); }
          else failed++;
        }
      }
      return Response.json({ connected: true, email, calendar_id, created, updated, failed, mappings });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

function pad(t) { return (t || '').padStart(5, '0'); }
function addDay(d) { const x = new Date(d + 'T00:00:00'); x.setDate(x.getDate() + 1); return x.toISOString().slice(0, 10); }
function addMonths(d, m) { const x = new Date(d + 'T00:00:00'); x.setMonth(x.getMonth() + m); return x.toISOString().slice(0, 10); }
function semesterStartForAction(start, _day) { return start || new Date().toISOString().slice(0, 10); }