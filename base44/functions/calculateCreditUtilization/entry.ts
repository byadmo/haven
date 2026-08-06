import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

function rating(util) {
  if (util < 10) return 'excellent';
  if (util < 30) return 'good';
  if (util < 50) return 'warning';
  if (util < 75) return 'poor';
  return 'critical';
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const debts = await base44.entities.Debt.list();
    // Detect revolving credit accounts: either the name looks like a credit
    // card / line of credit, OR the user explicitly set a credit_limit on the
    // liability (credit_limit is the dedicated "track my utilization" field).
    const isCreditAccount = (d) =>
      /credit|card|mastercard|visa|amex|heloc|line of credit|\bloc\b/i.test(d.name || '') ||
      (d.credit_limit || 0) > 0;
    const cards = debts
      .filter((d) => isCreditAccount(d) && d.status !== 'paid_off' && (d.current_balance || 0) > 0)
      .map((d) => {
        const bal = d.current_balance || 0;
        const limit = d.credit_limit > 0 ? d.credit_limit : (d.original_balance || 0);
        const util = limit > 0 ? (bal / limit) * 100 : null;
        const recommendedPayment = limit > 0 ? Math.max(0, bal - 0.3 * limit) : 0;
        return {
          id: d.id,
          name: d.name,
          balance: Number(bal.toFixed(2)),
          credit_limit: Number(limit.toFixed(2)),
          utilization: util == null ? null : Number(util.toFixed(1)),
          health_rating: util == null ? 'unknown' : rating(util),
          recommended_payment_to_30: Number(recommendedPayment.toFixed(2)),
        };
      })
      .sort((a, b) => (b.utilization || 0) - (a.utilization || 0));

    const totalBal = cards.reduce((s, c) => s + c.balance, 0);
    const totalLimit = cards.reduce((s, c) => s + c.credit_limit, 0);
    const overall = totalLimit > 0 ? (totalBal / totalLimit) * 100 : null;
    const over50 = cards.filter((c) => c.utilization != null && c.utilization >= 50);

    return Response.json({
      cards,
      overall_utilization: overall == null ? null : Number(overall.toFixed(1)),
      overall_health_rating: overall == null ? 'unknown' : rating(overall),
      alerts: over50,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}