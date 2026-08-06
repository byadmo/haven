import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

const CONNECTOR_ID = '6a70ef7e9f47c094588c220b';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    let body = {};
    try { body = await req.json(); } catch { body = {}; }
    const weekStart = body.week_start;

    let token;
    try {
      const conn = await base44.asServiceRole.connectors.getCurrentAppUserConnection(CONNECTOR_ID);
      token = conn.accessToken;
    } catch (e) {
      return Response.json({ error: 'Google Calendar not connected.' }, { status: 400 });
    }

    // One-week window during the active semester
    const startDate = weekStart || new Date().toISOString().slice(0, 10);
    const timeMin = new Date(startDate + 'T00:00:00').toISOString();
    const endTime = new Date(timeMin); endTime.setDate(endTime.getDate() + 7);
    const timeMax = endTime.toISOString();

    const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}&maxResults=250&singleEvents=true&orderBy=startTime`;
    const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!r.ok) {
      const err = await r.text();
      return Response.json({ error: `Calendar API error: ${err}` }, { status: r.status });
    }
    const data = await r.json();
    const events = (data.items || []).map((e) => ({
      summary: e.summary || '',
      start: e.start?.dateTime || e.start?.date || '',
      end: e.end?.dateTime || e.end?.date || '',
      location: e.location || '',
      description: (e.description || '').slice(0, 400),
    })).filter((e) => e.summary);

    if (!events.length) {
      return Response.json({ courses: [], message: 'No calendar events found in that week.' });
    }

    // AI: detect recurring courses from the week of events
    const llm = await base44.integrations.Core.InvokeLLM({
      prompt:
        `Analyze a user's Google Calendar events for one week during an active university semester. Identify recurring academic courses by grouping events that share the same title and occur at the same time of day (these are recurring class lectures/labs/tutorials). For each distinct course, extract:\n` +
        `- title: the course/event title (cleaned)\n` +
        `- code: a course code if present in the title (e.g. "CSC110"), otherwise empty string\n` +
        `- schedule_days: array of weekday abbreviations from the set ["M","T","W","Th","F","S","Su"] the class meets on\n` +
        `- schedule_time: the time range as "HH:MM-HH:MM" (24h) based on the event start/end times, empty string if unknown\n` +
        `- location: the event location, empty string if none\n` +
        `- professor_name: any professor/instructor name found in the description, empty string if none\n` +
        `- credits: default 3 unless the description states otherwise\n\n` +
        `Ignore non-recurring one-off events (appointments, reminders, social). Return only clearly academic recurring classes. Here are the events (JSON):\n${JSON.stringify(events.slice(0, 120))}`,
      response_json_schema: {
        type: 'object',
        properties: {
          courses: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                code: { type: 'string' },
                title: { type: 'string' },
                schedule_days: { type: 'array', items: { type: 'string' } },
                schedule_time: { type: 'string' },
                location: { type: 'string' },
                professor_name: { type: 'string' },
                credits: { type: 'number' },
              },
            },
          },
        },
        required: ['courses'],
      },
    });

    const courses = (llm?.courses || []).map((c) => ({
      code: c.code || '',
      title: c.title || '',
      schedule_days: Array.isArray(c.schedule_days) ? c.schedule_days : [],
      schedule_time: c.schedule_time || '',
      location: c.location || '',
      professor_name: c.professor_name || '',
      professor_email: '',
      office_hours: '',
      target_weekly_hours: 6,
      credits: Number(c.credits) || 3,
    }));

    return Response.json({ courses });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}