import { base44 } from "@/api/base44Client";
import { isFuture, parseISO } from "date-fns";

/**
 * A transaction only affects an account balance once its date has arrived
 * (today or earlier). Future-dated transactions leave the balance untouched.
 */
export function balanceApplies(dateStr) {
  if (!dateStr) return true;
  try {
    return !isFuture(parseISO(dateStr));
  } catch {
    return true;
  }
}

/**
 * Signed effect a transaction has on its linked account balance.
 * Income adds, expense subtracts.
 */
export function txEffect(t) {
  const amt = parseFloat(t.amount) || 0;
  return t.type === "income" ? amt : -amt;
}

/**
 * The transfer direction a transaction used for its primary account_id
 * when it was created, accounting for type:
 *   expense → account_id IS the "FROM" account → direction "out"
 *   income  → account_id IS the "TO"   account → direction "in"
 * Liabilities invert the meaning of out/in versus bank accounts, but
 * `adjustTransferInOut` already handles that, so the caller only needs to
 * pass the right direction here.
 */
export function txAccountDirection(tx) {
  return tx.type === "income" ? "in" : "out";
}

/**
 * Apply (or re-apply) a transaction's effect to its primary account_id,
 * correctly handling bank accounts and liabilities. Only runs when the
 * transaction date has arrived (not in the future).
 */
export async function applyTxAccountEffect(tx) {
  if (!tx?.account_id || !balanceApplies(tx?.date)) return null;
  return adjustTransferInOut(tx.account_id, tx.amount, txAccountDirection(tx));
}

/**
 * Reverse a transaction's effect on its primary account_id, correctly
 * handling bank accounts and liabilities. Only runs when the transaction
 * date has arrived. This is the symmetric counterpart of applyTxAccountEffect.
 */
export async function reverseTxAccountEffect(tx) {
  if (!tx?.account_id || !balanceApplies(tx?.date)) return null;
  const reverse = txAccountDirection(tx) === "out" ? "in" : "out";
  return adjustTransferInOut(tx.account_id, tx.amount, reverse);
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

/**
 * Adjust the balance of whatever a transaction's `account_id` points at —
 * a bank Account (balance) or a liability Debt (current_balance). Used so the
 * Quick Add / edit flows can target liability accounts the same way as banks.
 */
export async function adjustLinkedBalance(id, delta) {
  if (!id) return null;
  let rec = null;
  let kind = null;
  try {
    rec = await base44.entities.Account.get(id);
    if (rec && rec.id) kind = "account";
  } catch { /* not an account */ }
  if (!kind) {
    try {
      rec = await base44.entities.Debt.get(id);
      if (rec && rec.id) kind = "debt";
    } catch { /* not a debt either */ }
  }
  if (!kind) return null;
  if (kind === "account") {
    const next = (rec.balance || 0) + delta;
    await base44.entities.Account.update(id, { balance: next });
    return next;
  }
  const next = (rec.current_balance || 0) + delta;
  await base44.entities.Debt.update(id, { current_balance: next });
  return next;
}

/**
 * Adjust an account/liability balance for a transfer leg.
 * direction 'out' = money leaves this entity (FROM).
 * direction 'in'  = money arrives at this entity (TO).
 *
 * Bank accounts:  out → balance decreases,      in → balance increases.
 * Liabilities:    out → current_balance increases (borrow more), in → current_balance decreases (pay down).
 */
export async function adjustTransferInOut(accountId, amount, direction) {
  if (!accountId || !amount) return null;
  let rec = null;
  let kind = null;
  try {
    rec = await base44.entities.Account.get(accountId);
    if (rec && rec.id) kind = "account";
  } catch { /* not an account */ }
  if (!kind) {
    try {
      rec = await base44.entities.Debt.get(accountId);
      if (rec && rec.id) kind = "debt";
    } catch { /* not a debt either */ }
  }
  if (!kind) return null;

  const amt = parseFloat(amount) || 0;
  let delta;
  if (kind === "account") {
    delta = direction === "out" ? -amt : amt;
  } else {
    delta = direction === "out" ? amt : -amt;
  }

  if (kind === "account") {
    const next = (rec.balance || 0) + delta;
    await base44.entities.Account.update(accountId, { balance: next });
    return next;
  }
  const next = (rec.current_balance || 0) + delta;
  await base44.entities.Debt.update(accountId, { current_balance: next });
  return next;
}