import { Router } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import { getDb, hashPassword, verifyPassword } from './db.js';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'haven-local-dev-secret-not-for-production';
const JWT_EXPIRES = '365d';

// Token store (browser localStorage mirror for the client SDK)
const activeTokens = new Map();

export function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  const tokenFromHeader = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  const token = tokenFromHeader || req.headers['x-base44-token'] || req.headers['x-app-token'];

  if (!token) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    req.token = token;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
}

// POST /api/auth/register
router.post('/register', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ message: 'Email and password required' });

  const db = getDb();
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) return res.status(409).json({ message: 'Email already registered' });

  // Generate OTP (in local mode we just return it)
  const code = String(Math.floor(100000 + Math.random() * 900000));
  db.prepare('INSERT INTO otp_codes (email, code) VALUES (?, ?)').run(email, code);

  // Store pending registration
  const id = crypto.randomUUID();
  const hash = hashPassword(password);
  db.prepare('INSERT INTO users (id, email, password_hash) VALUES (?, ?, ?)').run(id, email, hash);

  console.log(`[auth] Registration OTP for ${email}: ${code}`);

  res.json({ message: 'Verification code sent', _dev_otp: code });
});

// POST /api/auth/verify-otp
router.post('/verify-otp', (req, res) => {
  const { email, otpCode } = req.body;
  if (!email || !otpCode) return res.status(400).json({ message: 'Email and OTP code required' });

  const db = getDb();
  const record = db.prepare('SELECT * FROM otp_codes WHERE email = ? AND code = ? ORDER BY created_at DESC LIMIT 1').get(email, otpCode);

  if (!record) return res.status(400).json({ message: 'Invalid verification code' });

  // Clean up OTP
  db.prepare('DELETE FROM otp_codes WHERE email = ? AND code = ?').run(email, otpCode);

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user) return res.status(404).json({ message: 'User not found' });

  const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
  activeTokens.set(token, user.id);

  res.json({
    access_token: token,
    user: { id: user.id, email: user.email, full_name: user.full_name }
  });
});

// POST /api/auth/resend-otp
router.post('/resend-otp', (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: 'Email required' });

  const db = getDb();
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user) return res.status(404).json({ message: 'User not found' });

  const code = String(Math.floor(100000 + Math.random() * 900000));
  db.prepare('INSERT INTO otp_codes (email, code) VALUES (?, ?)').run(email, code);

  console.log(`[auth] Resent OTP for ${email}: ${code}`);
  res.json({ message: 'Code sent' });
});

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ message: 'Email and password required' });

  const db = getDb();
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user) return res.status(401).json({ message: 'Invalid email or password' });

  if (!verifyPassword(password, user.password_hash)) {
    return res.status(401).json({ message: 'Invalid email or password' });
  }

  const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
  activeTokens.set(token, user.id);

  res.json({
    access_token: token,
    user: { id: user.id, email: user.email, full_name: user.full_name }
  });
});

// GET /api/auth/me
router.get('/me', authMiddleware, (req, res) => {
  const db = getDb();
  const user = db.prepare('SELECT id, email, full_name, created_date FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(404).json({ message: 'User not found' });
  res.json(user);
});

// PATCH /api/auth/me
router.patch('/me', authMiddleware, (req, res) => {
  const db = getDb();
  const { full_name } = req.body;
  if (full_name !== undefined) {
    db.prepare('UPDATE users SET full_name = ?, updated_date = datetime(\'now\') WHERE id = ?').run(full_name, req.user.id);
  }
  const user = db.prepare('SELECT id, email, full_name, created_date FROM users WHERE id = ?').get(req.user.id);
  res.json(user);
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (token) activeTokens.delete(token);
  res.json({ message: 'Logged out' });
});

// GET /api/auth/is-authenticated
router.get('/is-authenticated', authMiddleware, (req, res) => {
  res.json({ authenticated: true, user_id: req.user.id });
});

// POST /api/auth/reset-password-request
router.post('/reset-password-request', (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: 'Email required' });

  const db = getDb();
  const user = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  // Don't leak whether email exists
  console.log(`[auth] Password reset requested for ${email} (exists: ${!!user})`);
  res.json({ message: 'If an account exists, a reset link has been sent' });
});

// POST /api/auth/reset-password
router.post('/reset-password', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ message: 'Email and password required' });

  const db = getDb();
  const user = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (!user) return res.status(404).json({ message: 'User not found' });

  const hash = hashPassword(password);
  db.prepare('UPDATE users SET password_hash = ?, updated_date = datetime(\'now\') WHERE id = ?').run(hash, user.id);
  res.json({ message: 'Password updated' });
});

export { router as authRoutes, JWT_SECRET };
