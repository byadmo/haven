import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

const fmtMoney = (n) => `$${Number(n || 0).toFixed(2)}`;

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    // Admin-only: scheduled-task functions authenticate via me() and require admin role.
    const caller = await base44.auth.me();
    if (!caller) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (caller.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    let body = {};
    try { body = await req.json(); } catch { body = {}; }
    const leadDays = Math.max(0, Number(body.lead_days ?? 3));
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    const debts = await base44.asServiceRole.entities.Debt.list();
    const users = await base44.asServiceRole.entities.User.list();
    const userById = {};
    users.forEach((u) => { userById[u.id] = u; });

    // Get Gmail OAuth token for sending
    let gmailToken = null;
    try {
      const conn = await base44.asServiceRole.connectors.getConnection('gmail');
      gmailToken = conn.accessToken;
    } catch (e) {
      return Response.json({ error: 'Gmail connector not connected. Authorize Gmail in the builder chat.' }, { status: 500 });
    }

    const upcoming = [];
    debts.forEach((d) => {
      if (d.status === 'paid_off' || !d.due_date) return;
      const due = new Date(d.due_date + 'T00:00:00');
      const diffDays = Math.round((due - startOfDay) / 86400000);
      if (diffDays >= 0 && diffDays <= leadDays) {
        upcoming.push({
          name: d.name,
          minimum_payment: d.minimum_payment ?? 0,
          interest_rate: d.interest_rate ?? 0,
          due,
          diffDays,
          owner_id: d.created_by_id,
        });
      }
    });

    const byOwner = {};
    upcoming.forEach((u) => {
      const oid = u.owner_id || '__nouser__';
      (byOwner[oid] = byOwner[oid] || []).push(u);
    });

    let sent = 0;
    const recipients = [];
    for (const oid of Object.keys(byOwner)) {
      const owner = userById[oid];
      if (!owner || !owner.email) continue;
      const items = byOwner[oid].sort((a, b) => a.diffDays - b.diffDays);
      const lines = items.map((it) => {
        const when = it.diffDays === 0 ? 'due today' : it.diffDays === 1 ? 'due tomorrow' : `due in ${it.diffDays} days`;
        return `• ${it.name} — min. ${fmtMoney(it.minimum_payment)} (${it.due.toLocaleDateString()} · ${when})`;
      }).join('\n');
      const totalMin = items.reduce((s, i) => s + Number(i.minimum_payment || 0), 0);
      const subject = items.length === 1
        ? `Debt reminder: ${items[0].name} is due soon`
        : `Debt reminders: ${items.length} payments coming due`;
      const emailBody = [
        `Hi ${owner.full_name || 'there'},`,
        '',
        'These debt payment(s) are coming up:',
        '',
        lines,
        '',
        `Total upcoming minimum payments: ${fmtMoney(totalMin)}.`,
        '',
        'Log in to Haven to review your payoff strategy.',
        '',
        '— Haven',
      ].join('\n');
      try {
        const rawMessage = [
          `To: ${owner.email}`,
          `Subject: ${subject}`,
          `Content-Type: text/plain; charset=UTF-8`,
          ``,
          emailBody,
        ].join('\r\n');
        const bytes = new TextEncoder().encode(rawMessage);
        let binary = '';
        for (const b of bytes) binary += String.fromCharCode(b);
        const encoded = btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
        const gmailRes = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${gmailToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ raw: encoded }),
        });
        if (!gmailRes.ok) {
          const errTxt = await gmailRes.text();
          throw new Error(errTxt);
        }
        sent++;
        recipients.push(owner.email);
      } catch (e) {
        // skip failed send, continue others
      }
    }

    return Response.json({ sent, reminders: upcoming.length, recipients, lead_days: leadDays });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}