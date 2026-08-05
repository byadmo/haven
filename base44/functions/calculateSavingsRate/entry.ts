import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth() - 3, 1);
    const startKey = start.toISOString().slice(0, 10);

    const accounts = await base44.entities.Account.list();
    const invAccountIds = new Set(
      accounts.filter((a) => /wealthsimple|invest|tfsa|rrsp|fhsa|questrade|brokerage/i.test(a.name || '')).map((a) => a.id)
    );

    const txs = await base44.entities.Transaction.list();
    const recent = txs.filter((t) => t.date && t.date >= startKey);
    const payments = (await base44.entities.DebtPayment.list()).filter((p) => p.date && p.date >= startKey);

    const monthly = {};
    function bucket(d) {
      return d.slice(0, 7);
    }
    for (const t of recent) {
      const m = bucket(t.date);
      if (!monthly[m]) monthly[m] = { income: 0, spending: 0, debt: 0, investments: 0 };
      if (t.type === 'income') monthly[m].income += Math.abs(t.amount || 0);
      else {
        monthly[m].spending += Math.abs(t.amount || 0);
        if (invAccountIds.has(t.transfer_account_id)) monthly[m].investments += Math.abs(t.amount || 0);
      }
    }
    for (const p of payments) {
      const m = bucket(p.date);
      if (!monthly[m]) monthly[m] = { income: 0, spending: 0, debt: 0, investments: 0 };
      monthly[m].debt += p.amount || 0;
    }

    const months = Object.keys(monthly).sort();
    let totalIncome = 0, totalSpending = 0, totalDebt = 0, totalInvestments = 0;
    const trend = months.map((m, i) => {
      const v = monthly[m];
      totalIncome += v.income; totalSpending += v.spending; totalDebt += v.debt; totalInvestments += v.investments;
      const sr = v.income > 0 ? (v.income - v.spending - v.debt) / v.income * 100 : 0;
      return {
        month: m,
        income: Number(v.income.toFixed(2)),
        spending: Number(v.spending.toFixed(2)),
        debt_payments: Number(v.debt.toFixed(2)),
        investments: Number(v.investments.toFixed(2)),
        savings_rate: Number(sr.toFixed(1)),
      };
    });

    const lastTwo = trend.slice(-2);
    const trendDir = lastTwo.length < 2 ? 'stable' : (lastTwo[1].savings_rate > lastTwo[0].savings_rate + 1 ? 'improving' : lastTwo[1].savings_rate < lastTwo[0].savings_rate - 1 ? 'declining' : 'stable');

    const savingsRate = totalIncome > 0 ? (totalIncome - totalSpending - totalDebt) / totalIncome * 100 : 0;
    const debtRate = totalIncome > 0 ? totalDebt / totalIncome * 100 : 0;
    const investRate = totalIncome > 0 ? totalInvestments / totalIncome * 100 : 0;
    const spendingRate = totalIncome > 0 ? totalSpending / totalIncome * 100 : 0;

    return Response.json({
      months: months.length,
      total_income: Number(totalIncome.toFixed(2)),
      total_spending: Number(totalSpending.toFixed(2)),
      total_debt_payments: Number(totalDebt.toFixed(2)),
      total_investments: Number(totalInvestments.toFixed(2)),
      savings_rate: Number(savingsRate.toFixed(1)),
      debt_payoff_rate: Number(debtRate.toFixed(1)),
      investment_rate: Number(investRate.toFixed(1)),
      spending_rate: Number(spendingRate.toFixed(1)),
      trend: trendDir,
      monthly: trend,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}