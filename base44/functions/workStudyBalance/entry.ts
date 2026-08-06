import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const credits = Number(body?.credits ?? 0);
    const study = Number(body?.target_study_hours ?? 0);
    const classH = Number(body?.class_hours ?? 0);
    const sleepPerDay = Number(body?.sleep_hours_per_day ?? 8);

    const sleepWeekly = sleepPerDay * 7;
    const free = 168 - sleepWeekly - classH - study;
    const maxWork = Math.max(0, Math.floor(free / 2));
    const remainingFree = Math.max(0, free - maxWork);

    // AI health assessment (green / yellow / red + one-sentence reason).
    let health = { color: "green", reason: "Well balanced with adequate sleep and study time." };
    try {
      const prompt = `You are a student work-study balance evaluator. Given a weekly schedule and credit load, return a health verdict.
Inputs:
- credits = ${credits}
- sleep = ${sleepWeekly}h/week
- class = ${classH}h/week
- study = ${study}h/week
- max_work_capacity = ${maxWork}h/week
- remaining_free = ${remainingFree}h/week

Rules:
- GREEN = optimal: sleep >= 49h/week, reasonable study load, work capacity >= ~8h, not overloaded.
- YELLOW = sub-optimal: slightly low sleep, heavy study relative to credits, or limited work capacity.
- RED = non-optimal: sleep < 42h/week, dangerously overloaded, or zero work capacity.

Return JSON: { "color": "green" | "yellow" | "red", "reason": "one short sentence" }.
Example reasons:
- Green: Well balanced with adequate sleep and study time.
- Yellow: Study load is high relative to credit count.
- Red: Sleep is critically low at under 6 hours.`;
      const res = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            color: { type: "string", enum: ["green", "yellow", "red"] },
            reason: { type: "string" },
          },
          required: ["color", "reason"],
        },
      });
      const d = res?.data ?? res;
      if (d && d.color && d.reason) health = { color: d.color, reason: d.reason };
    } catch {}

    return Response.json({
      sleep_weekly: sleepWeekly,
      class_weekly: classH,
      study_weekly: study,
      max_work_weekly: maxWork,
      remaining_free: remainingFree,
      color: health.color,
      reason: health.reason,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}