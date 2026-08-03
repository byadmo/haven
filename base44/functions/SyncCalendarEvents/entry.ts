import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

const SYNC_TAG = 'debtflow-sync';
const fmtMoney = (n) => `$${Number(n || 0).toFixed(2)}`;

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // Get Google Calendar OAuth token (shared connector)
    let calendarToken;
    try {
      const conn = await base44.asServiceRole.connectors.getConnection('googlecalendar');
      calendarToken = conn.accessToken;
    } catch (e) {
      return Response.json({ error: 'Google Calendar not connected. Authorize it in the builder chat.' }, { status: 500 });
    }

    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const calApi = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';

    // Collect upcoming items to sync
    const items = [];

    // Scheduled transactions (recurring expenses/income with upcoming next_date)
    const scheduledTxns = await base44.entities.Transaction.filter({ is_scheduled: true });
    scheduledTxns.forEach((t) => {
      const dateStr = t.next_date || t.date;
      if (!dateStr || dateStr < todayStr) return;
      const isExpense = t.type === 'expense';
      const summary = `${isExpense ? '💸' : '💰'} ${t.description || 'Transaction'} — ${fmtMoney(t.amount)}`;
      items.push({
        key: `${summary}|${dateStr}`,
        summary,
        description: `${SYNC_TAG}\nType: ${isExpense ? 'Expense' : 'Income'}\nAmount: ${fmtMoney(t.amount)}\nCategory: ${t.category || 'N/A'}\nFrequency: ${t.frequency || 'one_time'}`,
        date: dateStr,
      });
    });

    // Debts with due dates and minimum payments
    const debts = await base44.entities.Debt.filter({ status: 'active' });
    debts.forEach((d) => {
      if (!d.due_date || d.due_date < todayStr) return;
      if (!d.minimum_payment || d.minimum_payment <= 0) return;
      const summary = `💳 ${d.name} — Min. Payment ${fmtMoney(d.minimum_payment)}`;
      items.push({
        key: `${summary}|${d.due_date}`,
        summary,
        description: `${SYNC_TAG}\nLiability: ${d.name}\nBalance: ${fmtMoney(d.current_balance)}\nMin. Payment: ${fmtMoney(d.minimum_payment)}\nInterest: ${d.interest_rate || 0}% ${d.interest_type || 'APR'}`,
        date: d.due_date,
      });
    });

    if (items.length === 0) {
      return Response.json({ created: 0, skipped: 0, total: 0, message: 'No upcoming scheduled expenses or debt payments found.' });
    }

    // Fetch existing synced events to avoid duplicates
    const timeMin = today.toISOString();
    const listRes = await fetch(`${calApi}?q=${encodeURIComponent(SYNC_TAG)}&timeMin=${encodeURIComponent(timeMin)}&maxResults=250`, {
      headers: { 'Authorization': `Bearer ${calendarToken}` },
    });
    const listData = await listRes.json();
    const existingKeys = new Set();
    (listData.items || []).forEach((e) => {
      if (e.description && e.description.includes(SYNC_TAG)) {
        const key = `${e.summary}|${e.start?.date || ''}`;
        existingKeys.add(key);
      }
    });

    let created = 0;
    let skipped = 0;
    for (const item of items) {
      if (existingKeys.has(item.key)) {
        skipped++;
        continue;
      }

      const endDate = new Date(item.date + 'T00:00:00');
      endDate.setDate(endDate.getDate() + 1);
      const endDateStr = endDate.toISOString().split('T')[0];

      const eventBody = {
        summary: item.summary,
        description: item.description,
        start: { date: item.date },
        end: { date: endDateStr },
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'email', minutes: 1440 },
            { method: 'popup', minutes: 1440 },
          ],
        },
      };

      const createRes = await fetch(calApi, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${calendarToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(eventBody),
      });

      if (createRes.ok) created++;
    }

    return Response.json({ created, skipped, total: items.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}