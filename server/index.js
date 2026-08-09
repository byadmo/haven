import express from 'express';
import cors from 'cors';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { initDb } from './db.js';
import { authRoutes, authMiddleware } from './auth.js';
import { entityRoutes } from './entities.js';
import { functionRoutes } from './functions.js';
import { integrationRoutes } from './integrations.js';
import { fileRoutes } from './uploads.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 4400;

const app = express();

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static files for uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Health check
app.get('/api/health', (req, res) => res.json({ ok: true }));

// Auth routes (public)
app.use('/api/auth', authRoutes);

// App public settings (mock — Base44 compatibility)
app.get('/api/apps/public/prod/public-settings/by-id/:appId', (req, res) => {
  res.json({ id: req.params.appId, public_settings: {} });
});

// Protected routes
app.use('/api/entities', authMiddleware, entityRoutes);
app.use('/api/functions', authMiddleware, functionRoutes);
app.use('/api/integrations', authMiddleware, integrationRoutes);
app.use('/api/files', authMiddleware, fileRoutes);

// User profile (protected)
app.get('/api/user/me', authMiddleware, (req, res) => {
  res.json({
    id: req.user.id,
    email: req.user.email,
    full_name: req.user.full_name,
    created_date: req.user.created_date,
  });
});

app.patch('/api/user/me', authMiddleware, (req, res) => {
  const db = initDb();
  const { full_name } = req.body;
  if (full_name !== undefined) {
    db.prepare('UPDATE users SET full_name = ? WHERE id = ?').run(full_name, req.user.id);
  }
  const row = db.prepare('SELECT id, email, full_name, created_date FROM users WHERE id = ?').get(req.user.id);
  res.json(row);
});

initDb();

app.listen(PORT, () => {
  console.log(`[server] Haven backend running on http://localhost:${PORT}`);
});
