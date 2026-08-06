import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Parses an uploaded syllabus document into structured course data using the
// Core.InvokeLLM integration (vision-capable). Returns the extracted JSON object.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const file_url = body && body.file_url;
    if (!file_url) return Response.json({ error: 'file_url is required' }, { status: 400 });

    const today = new Date().toISOString().slice(0, 10);
    const res = await base44.integrations.Core.InvokeLLM({
      prompt:
        'You are a syllabus parser. Read the attached document and extract the course information as JSON. ' +
        `Today's date is ${today}; infer due dates (ISO YYYY-MM-DD) relative to a typical current term. ` +
        'Fields: code (string, e.g. "CSC110"), title, professor_name, professor_email, office_hours, ' +
        'schedule_days (array of day abbreviations from M,T,W,Th,F,S,Su), schedule_time, location, ' +
        'target_weekly_hours (number), credits (number), ' +
        'deliverables (array of {title, due_date, weight (number percent), type (one of assignment,exam,quiz,project,midterm,final,lab,other), is_exam (boolean)}), ' +
        'materials (array of {title, estimated_cost (number), required (boolean)}). ' +
        'If a field is not present in the document, infer a sensible default or leave empty. Be concise.',
      file_urls: [file_url],
      response_json_schema: {
        type: 'object',
        properties: {
          code: { type: 'string' },
          title: { type: 'string' },
          professor_name: { type: 'string' },
          professor_email: { type: 'string' },
          office_hours: { type: 'string' },
          schedule_days: { type: 'array', items: { type: 'string' } },
          schedule_time: { type: 'string' },
          location: { type: 'string' },
          target_weekly_hours: { type: 'number' },
          credits: { type: 'number' },
          deliverables: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                title: { type: 'string' },
                due_date: { type: 'string' },
                weight: { type: 'number' },
                type: { type: 'string' },
                is_exam: { type: 'boolean' },
              },
            },
          },
          materials: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                title: { type: 'string' },
                estimated_cost: { type: 'number' },
                required: { type: 'boolean' },
              },
            },
          },
        },
      },
    });

    return Response.json(res);
  } catch (error) {
    return Response.json({ error: error.message || String(error) }, { status: 500 });
  }
}