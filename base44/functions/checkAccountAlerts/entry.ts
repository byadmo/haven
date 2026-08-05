import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const alerts = (await base44.entities.AccountAlert.list()).filter((a) => a.is_active !== false);
    const accounts = await base44.entities.Account.list();
    const accountMap = {};
    for (const a of accounts) accountMap[a.id] = a;

    const transactions = await base44.entities.Transaction.list();
    const triggered = [];

    for (const alert of alerts) {
      const account = accountMap[alert.account_id];
      if (!account) continue;
      const balance = account.balance || 0;

      if (alert.threshold_type === 'minimum_balance') {
        if (balance < alert.threshold_value) {
          triggered.push({
            alert_id: alert.id,
            account_id: account.id,
            account_name: account.name,
            current_balance: Number(balance.toFixed(2)),
            threshold_value: alert.threshold_value,
            threshold_type: alert.threshold_type,
            shortfall: Number((alert.threshold_value - balance).toFixed(2)),
            recommended_action: `Transfer at least $${(alert.threshold_value - balance).toFixed(2)} to stay above the minimum.`,
          });
        }
      } else if (alert.threshold_type === 'percentage_drop') {
        const ref = alert.last_triggered ? new Date(alert.last_triggered) : new Date(Date.now() - 30 * 86400000);
        const refKey = ref.toISOString().slice(0, 10);
        const since = transactions.filter((t) => t.account_id === account.id && t.date >= refKey && t.type === 'expense');
        const withdrawals = since.reduce((s, t) => s + Math.abs(t.amount || 0), 0);
        const baseline = balance + withdrawals;
        const dropPct = baseline > 0 ? (withdrawals / baseline) * 100 : 0;
        if (dropPct > alert.threshold_value) {
          triggered.push({
            alert_id: alert.id,
            account_id: account.id,
            account_name: account.name,
            current_balance: Number(balance.toFixed(2)),
            threshold_value: alert.threshold_value,
            threshold_type: alert.threshold_type,
            drop_percentage: Number(dropPct.toFixed(1)),
            recommended_action: `Balance dropped ${dropPct.toFixed(1)}% since last check — review recent withdrawals.`,
          });
        }
      }
    }

    return Response.json({ triggered, count: triggered.length, monitored: alerts.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}