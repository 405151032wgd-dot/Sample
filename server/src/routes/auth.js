import { Router } from 'express';
import { getDb } from '../db.js';
import crypto from 'crypto';

const router = Router();

function md5(s) {
  return crypto.createHash('md5').update(s).digest('hex');
}

function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: '请输入邮箱和密码' });
  }

  const db = getDb();
  const user = db.prepare('SELECT * FROM users WHERE email = ? AND is_active = 1').get(email);

  if (!user || user.password_hash !== md5(password)) {
    return res.status(401).json({ error: '邮箱或密码错误' });
  }

  const token = generateToken();
  // In production, use a real JWT. For simplicity, store token in a session-like way.
  // We'll pass the user ID as a simple token for now.

  const dept = db.prepare('SELECT name FROM departments WHERE id = ?').get(user.department_id);

  res.json({
    token: String(user.id),
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      department: dept ? dept.name : '',
      department_id: user.department_id,
    }
  });
});

// GET /api/auth/me
router.get('/me', (req, res) => {
  const userId = req.headers.authorization || '1';
  if (!userId) return res.status(401).json({ error: '未登录' });

  const db = getDb();
  const user = db.prepare('SELECT id, name, email, role, department_id, is_active FROM users WHERE id = ? AND is_active = 1').get(Number(userId));
  if (!user) return res.status(401).json({ error: '用户不存在' });

  const dept = db.prepare('SELECT name FROM departments WHERE id = ?').get(user.department_id);
  res.json({ user: { ...user, department: dept ? dept.name : '' } });
});

export default router;
