import { base44 } from "@/api/base44Client";

/**
 * Signed effect a transaction has on its linked account balance.
 * Income adds, expense subtracts.
 */
export function txEffect(t) {
  const amt = parseFloat(t.amount) || 0;
  return t.type === "income" ? amt : -amt;
}

/**
 * Adjust an Account balance by `delta` and persist it.
 */
export async function adjustAccountBalance(accountId, delta) {
  if (!accountId) return null;
  const acct = await base44.entities.Account.get(accountId);
  const next = (acct.balance || 0) + delta;
  await base44.entities.Account.update(accountId, { balance: next });
  return next;
}