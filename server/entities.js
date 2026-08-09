import { Router } from 'express';
import crypto from 'node:crypto';
import { getDb } from './db.js';

const router = Router();

// Helper: get table name from entity type (camelCase to lowercase)
function entityTypeFromReq(req) {
  // Accept either URL param or body
  return req.params.entityType;
}

// POST /api/entities/:entityType/list
// Body: { sort, limit, filter }
router.post('/:entityType/list', (req, res) => {
  const db = getDb();
  const entityType = entityTypeFromReq(req);
  const { sort = '-created_date', limit = 100, filter } = req.body || {};

  let sql = 'SELECT id, data, created_date, updated_date FROM entities WHERE entity_type = ? AND user_id = ?';
  const params = [entityType, req.user.id];

  // Apply simple filter (field equality)
  if (filter && typeof filter === 'object') {
    const conditions = [];
    for (const [key, value] of Object.entries(filter)) {
      if (value !== undefined && value !== null) {
        conditions.push(`json_extract(data, '$.${key}') = ?`);
        params.push(JSON.stringify(value));
      }
    }
    if (conditions.length > 0) {
      sql += ' AND ' + conditions.join(' AND ');
    }
  }

  // Sort
  const sortField = sort.replace(/^-/, '');
  const sortDir = sort.startsWith('-') ? 'DESC' : 'ASC';
  const validSortFields = ['created_date', 'updated_date', 'display_order', 'name', 'date', 'due_date', 'target_date', 'completed_at'];
  if (validSortFields.includes(sortField)) {
    sql += ` ORDER BY ${sortField} ${sortDir}`;
  } else {
    // Try JSON field sort
    sql += ` ORDER BY json_extract(data, '$.${sortField}') ${sortDir}`;
  }

  sql += ` LIMIT ?`;
  params.push(limit);

  const rows = db.prepare(sql).all(...params);
  const results = rows.map(row => ({
    id: row.id,
    ...JSON.parse(row.data),
    created_date: row.created_date,
    updated_date: row.updated_date,
  }));

  res.json(results);
});

// GET /api/entities/:entityType/:id
router.get('/:entityType/:id', (req, res) => {
  const db = getDb();
  const row = db.prepare('SELECT id, data, created_date, updated_date FROM entities WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!row) return res.status(404).json({ message: 'Not found' });
  res.json({
    id: row.id,
    ...JSON.parse(row.data),
    created_date: row.created_date,
    updated_date: row.updated_date,
  });
});

// POST /api/entities/:entityType
router.post('/:entityType', (req, res) => {
  const db = getDb();
  const entityType = entityTypeFromReq(req);
  const id = crypto.randomUUID();
  const data = JSON.stringify(req.body || {});

  db.prepare('INSERT INTO entities (id, entity_type, user_id, data) VALUES (?, ?, ?, ?)').run(
    id, entityType, req.user.id, data
  );

  const row = db.prepare('SELECT id, data, created_date, updated_date FROM entities WHERE id = ?').get(id);
  res.status(201).json({
    id: row.id,
    ...JSON.parse(row.data),
    created_date: row.created_date,
    updated_date: row.updated_date,
  });
});

// PATCH /api/entities/:entityType/:id
router.patch('/:entityType/:id', (req, res) => {
  const db = getDb();
  const existing = db.prepare('SELECT id, data FROM entities WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!existing) return res.status(404).json({ message: 'Not found' });

  const current = JSON.parse(existing.data);
  const updated = { ...current, ...req.body };
  db.prepare('UPDATE entities SET data = ?, updated_date = datetime(\'now\') WHERE id = ?').run(
    JSON.stringify(updated), req.params.id
  );

  const row = db.prepare('SELECT id, data, created_date, updated_date FROM entities WHERE id = ?').get(req.params.id);
  res.json({
    id: row.id,
    ...JSON.parse(row.data),
    created_date: row.created_date,
    updated_date: row.updated_date,
  });
});

// DELETE /api/entities/:entityType/:id
router.delete('/:entityType/:id', (req, res) => {
  const db = getDb();
  const result = db.prepare('DELETE FROM entities WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
  if (result.changes === 0) return res.status(404).json({ message: 'Not found' });
  res.json({ success: true });
});

// POST /api/entities/:entityType/bulk-create
router.post('/:entityType/bulk-create', (req, res) => {
  const db = getDb();
  const entityType = entityTypeFromReq(req);
  const items = Array.isArray(req.body) ? req.body : (req.body.items || []);

  const stmt = db.prepare('INSERT INTO entities (id, entity_type, user_id, data) VALUES (?, ?, ?, ?)');
  const results = [];
  const tx = db.transaction(() => {
    for (const item of items) {
      const id = crypto.randomUUID();
      stmt.run(id, entityType, req.user.id, JSON.stringify(item));
      results.push({ id, ...item });
    }
  });
  tx();

  res.status(201).json(results);
});

// POST /api/entities/:entityType/bulk-update
router.post('/:entityType/bulk-update', (req, res) => {
  const db = getDb();
  const { filter, set } = req.body;
  // Simple implementation: update all matching entities
  let sql = 'SELECT id, data FROM entities WHERE entity_type = ? AND user_id = ?';
  const params = [entityTypeFromReq(req), req.user.id];

  if (filter && typeof filter === 'object') {
    const conditions = [];
    for (const [key, value] of Object.entries(filter)) {
      conditions.push(`json_extract(data, '$.${key}') = ?`);
      params.push(JSON.stringify(value));
    }
    if (conditions.length > 0) sql += ' AND ' + conditions.join(' AND ');
  }

  const rows = db.prepare(sql).all(...params);
  const stmt = db.prepare('UPDATE entities SET data = ?, updated_date = datetime(\'now\') WHERE id = ?');
  const tx = db.transaction(() => {
    for (const row of rows) {
      const current = JSON.parse(row.data);
      const updated = { ...current };
      if (set?.$set) Object.assign(updated, set.$set);
      stmt.run(JSON.stringify(updated), row.id);
    }
  });
  tx();

  res.json({ updated: rows.length });
});

// POST /api/entities/:entityType/delete-many
router.post('/:entityType/delete-many', (req, res) => {
  const db = getDb();
  const { filter } = req.body;

  let sql = 'DELETE FROM entities WHERE entity_type = ? AND user_id = ?';
  const params = [entityTypeFromReq(req), req.user.id];

  if (filter && typeof filter === 'object') {
    const conditions = [];
    for (const [key, value] of Object.entries(filter)) {
      if (value === undefined || value === null) continue;
      conditions.push(`json_extract(data, '$.${key}') = ?`);
      params.push(JSON.stringify(value));
    }
    if (conditions.length > 0) sql += ' AND ' + conditions.join(' AND ');
  } else if (JSON.stringify(filter) === '{}') {
    // Empty filter = delete all for this user/entity
  }

  const result = db.prepare(sql).run(...params);
  res.json({ deleted: result.changes });
});

// POST /api/entities/:entityType/filter
router.post('/:entityType/filter', (req, res) => {
  const db = getDb();
  const { filter, sort = '-created_date', limit = 100 } = req.body || {};

  let sql = 'SELECT id, data, created_date, updated_date FROM entities WHERE entity_type = ? AND user_id = ?';
  const params = [entityTypeFromReq(req), req.user.id];

  if (filter && typeof filter === 'object') {
    const conditions = [];
    for (const [key, value] of Object.entries(filter)) {
      if (value === undefined || value === null) continue;
      conditions.push(`json_extract(data, '$.${key}') = ?`);
      params.push(JSON.stringify(value));
    }
    if (conditions.length > 0) sql += ' AND ' + conditions.join(' AND ');
  }

  const sortField = sort.replace(/^-/, '');
  const sortDir = sort.startsWith('-') ? 'DESC' : 'ASC';
  sql += ` ORDER BY ${['created_date', 'updated_date', 'display_order', 'name', 'date'].includes(sortField) ? sortField : 'created_date'} ${sortDir}`;
  sql += ` LIMIT ?`;
  params.push(limit);

  const rows = db.prepare(sql).all(...params);
  const results = rows.map(row => ({
    id: row.id,
    ...JSON.parse(row.data),
    created_date: row.created_date,
    updated_date: row.updated_date,
  }));

  res.json(results);
});

// POST /api/entities/:entityType/subscribe (SSE - no-op in local mode)
router.post('/:entityType/subscribe', (req, res) => {
  // Return immediately — local mode doesn't support real-time subscriptions
  res.json({ subscribed: true });
});

export { router as entityRoutes };
