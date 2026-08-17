import { base44 } from "@/api/base44Client";

/**
 * Completely wipe every record of one entity owned by the current user from
 * the backend.
 *
 * The SDK's deleteMany guards against loose/empty ({}) filters as a safety
 * measure, so we list the user's records (RLS scopes the list to this user's
 * own rows) and delete them by id, paging until the entity is genuinely
 * empty. Returns the number of records deleted.
 *
 * @param {string} entityName — the Base44 entity to wipe (e.g. "Transaction")
 * @param {object} [opts]
 * @param {(record: object) => boolean} [opts.match] — optional predicate; only
 *   matching records are deleted. The list is re-run until either empty or
 *   every listed record has been processed.
 * @returns {Promise<number>} count of records deleted.
 */
export async function wipeAllRecords(entityName, { match } = {}) {
  const entity = base44.entities[entityName];
  if (!entity) throw new Error(`Unknown entity: ${entityName}`);
  let total = 0;
  // Hard cap (~50k records) — a safety bound in case the delete loop ever
  // stalls.
  for (let i = 0; i < 50; i++) {
    const records = await entity.list("-created_date", 1000);
    if (!records?.length) break;
    const targets = match ? records.filter(match) : records;
    if (!targets.length) break;
    await Promise.all(targets.map((r) => entity.delete(r.id).catch(() => {})));
    total += targets.length;
    // If a match filter excluded every record on this page, the next page may
    // still have matching rows — keep paging as long as the list isn't empty
    // (the loop above exits when records come back empty).
  }
  return total;
}

/**
 * Wipe many entities at once. Each entity is wiped independently so a failure
 * on one doesn't block the others. Returns a map of { entityName: count }.
 */
export async function wipeAllEntities(entityNames) {
  const results = {};
  await Promise.all(
    entityNames.map(async (name) => {
      try { results[name] = await wipeAllRecords(name); }
      catch { results[name] = -1; }
    })
  );
  return results;
}