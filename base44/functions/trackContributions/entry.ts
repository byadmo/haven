import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

const TYPES = ['TFSA', 'RRSP', 'FHSA', 'RESP', 'Non-Registered', 'Cash', 'Other'];

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const stocks = await base44.entities.Stock.list();
    const rooms = await base44.entities.ContributionRoom.list();
    const currentYear = String(new Date().getFullYear());

    const byAccount = {};
    for (const s of stocks) {
      const acct = s.account || 'Other';
      const value = (s.shares || 0) * (s.avg_buy_price || 0);
      byAccount[acct] = (byAccount[acct] || 0) + value;
    }
    for (const k of Object.keys(byAccount)) byAccount[k] = Number(byAccount[k].toFixed(2));

    const roomByType = {};
    for (const r of rooms) roomByType[r.account_type] = r;

    const summary = ['TFSA', 'RRSP', 'FHSA'].map((type) => {
      const invested = byAccount[type] || 0;
      const room = roomByType[type];
      const annualLimit = room?.annual_limit || 0;
      const currentYearContrib = room?.current_year_contribution || invested;
      const totalRoom = room?.total_contribution_room || 0;
      const remaining = Math.max(0, (totalRoom || annualLimit) - currentYearContrib);
      const pct = (annualLimit || totalRoom) > 0 ? (currentYearContrib / (annualLimit || totalRoom)) * 100 : 0;
      return {
        account_type: type,
        invested: Number(invested.toFixed(2)),
        annual_limit: annualLimit,
        current_year_contribution: Number(currentYearContrib.toFixed(2)),
        total_contribution_room: totalRoom,
        remaining_room: Number(remaining.toFixed(2)),
        percentage_used: Number(pct.toFixed(1)),
        tax_year: room?.tax_year || currentYear,
        approaching_limit: pct >= 80,
        last_updated: room?.last_updated || null,
      };
    });

    return Response.json({
      invested_by_account: byAccount,
      contributions: summary,
      total_invested: Number(Object.values(byAccount).reduce((s, x) => s + x, 0).toFixed(2)),
      current_year: currentYear,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}