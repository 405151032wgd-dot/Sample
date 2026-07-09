import { Router } from 'express';
import { getDb } from '../db.js';
import crypto from 'crypto';

const router = Router();

function md5(s) {
  return crypto.createHash('md5').update(s).digest('hex');
}

// GET /api/admin/stats
router.get('/stats', (req, res) => {
  const db = getDb();
  const now = new Date();
  const monthStart = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-01`;
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth()-1, 1).toISOString().slice(0,10);

  const totalThisMonth = db.prepare("SELECT COUNT(*) as c FROM sample_requests WHERE created_at >= ?").get(monthStart).c;
  const totalLastMonth = db.prepare("SELECT COUNT(*) as c FROM sample_requests WHERE created_at >= ? AND created_at < ?").get(lastMonthStart, monthStart).c;
  const completed = db.prepare("SELECT COUNT(*) as c FROM sample_requests WHERE status IN ('已完成','已签收') AND created_at >= ?").get(monthStart).c;
  const totalTracked = db.prepare("SELECT COUNT(*) as c FROM sample_requests WHERE status NOT IN ('草稿','已取消') AND created_at >= ?").get(monthStart).c;
  const inProgress = db.prepare("SELECT COUNT(*) as c FROM sample_requests WHERE status IN ('待审批','已批准','制作中')").get().c;
  const overdue = db.prepare("SELECT COUNT(*) as c FROM sample_requests WHERE status NOT IN ('已完成','已签收','已取消','草稿','已驳回') AND expected_date < date('now')").get().c;

  // Average approval time (hours)
  const avgTime = db.prepare(`
    SELECT AVG(
      (julianday(ar.signed_at) - julianday(sr.created_at)) * 24
    ) as avg_hours
    FROM approval_records ar
    JOIN sample_requests sr ON ar.request_id = sr.id
    WHERE ar.action = '通过'
  `).get().avg_hours;

  // Department distribution
  const deptDist = db.prepare(`
    SELECT d.name, COUNT(*) as count
    FROM sample_requests sr
    JOIN users u ON sr.applicant_id = u.id
    JOIN departments d ON u.department_id = d.id
    WHERE sr.created_at >= ?
    GROUP BY d.name ORDER BY count DESC
  `).all(monthStart);

  // Sample type distribution
  const typeDist = db.prepare(`
    SELECT st.name, COUNT(*) as count
    FROM sample_requests sr
    JOIN sample_types st ON sr.sample_type_id = st.id
    WHERE sr.created_at >= ?
    GROUP BY st.name ORDER BY count DESC
  `).all(monthStart);

  // Monthly trend (last 12 months)
  const trend = db.prepare(`
    SELECT strftime('%Y-%m', created_at) as month, COUNT(*) as count
    FROM sample_requests
    WHERE created_at >= date('now', '-12 months')
    GROUP BY month ORDER BY month ASC
  `).all();

  res.json({
    totalThisMonth, totalLastMonth,
    completedRate: totalTracked > 0 ? Math.round(completed / totalTracked * 1000) / 10 : 0,
    avgApprovalHours: avgTime ? Math.round(avgTime * 10) / 10 : 0,
    inProgress, overdue,
    deptDist, typeDist, trend
  });
});

// GET /api/admin/users
router.get('/users', (req, res) => {
  const db = getDb();
  const { department_id, role, search } = req.query;
  let where = ['1=1'];
  let params = [];
  if (department_id) { where.push('u.department_id = ?'); params.push(Number(department_id)); }
  if (role) { where.push('u.role = ?'); params.push(role); }
  if (search) { where.push('(u.name LIKE ? OR u.email LIKE ?)'); params.push(`%${search}%`, `%${search}%`); }

  const list = db.prepare(`
    SELECT u.*, d.name as department_name
    FROM users u LEFT JOIN departments d ON u.department_id = d.id
    WHERE ${where.join(' AND ')}
    ORDER BY u.created_at DESC
  `).all(...params);
  res.json({ list });
});

// POST /api/admin/users
router.post('/users', (req, res) => {
  const db = getDb();
  const { name, department_id, role, email, phone } = req.body;
  if (!name || !email) return res.status(400).json({ error: '姓名和邮箱必填' });
  try {
    db.prepare(`INSERT INTO users (name, department_id, role, email, phone, password_hash, is_active)
      VALUES (?,?,?,?,?,?,1)`).run(name, department_id || null, role || 'applicant', email, phone || '', md5('123456'));
    res.json({ message: '创建成功' });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// PUT /api/admin/users/:id
router.put('/users/:id', (req, res) => {
  const db = getDb();
  const { name, department_id, role, email, phone, is_active } = req.body;
  db.prepare(`UPDATE users SET name=?, department_id=?, role=?, email=?, phone=?, is_active=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`)
    .run(name, department_id || null, role, email, phone || '', is_active ?? 1, Number(req.params.id));
  res.json({ message: '更新成功' });
});
// GET /api/admin/industries/default — Get the default industry (with fields)
router.get('/industries/default', (req, res) => {
  const db = getDb();
  const row = db.prepare("SELECT value FROM system_settings WHERE key = 'default_industry_id'").get();
  let defaultId = row ? Number(row.value) : null;
  if (!defaultId) {
    const first = db.prepare('SELECT * FROM industries WHERE is_active = 1 ORDER BY id ASC LIMIT 1').get();
    if (!first) return res.status(404).json({ error: '暂无行业' });
    defaultId = first.id;
  }
  const industry = db.prepare('SELECT * FROM industries WHERE id = ? AND is_active = 1').get(defaultId);
  if (!industry) {
    const first = db.prepare('SELECT * FROM industries WHERE is_active = 1 ORDER BY id ASC LIMIT 1').get();
    return res.json({ industry: first, fields: [] });
  }
  const fields = db.prepare('SELECT * FROM industry_field_configs WHERE industry_id = ? AND is_active = 1 ORDER BY sort_order ASC').all(industry.id);
  res.json({ industry, fields });
});

// POST /api/admin/industries/:id/set-default — Set default industry
router.post('/industries/:id/set-default', (req, res) => {
  const db = getDb();
  const industryId = Number(req.params.id);
  const industry = db.prepare('SELECT * FROM industries WHERE id = ?').get(industryId);
  if (!industry) return res.status(404).json({ error: '行业不存在' });
  db.prepare("INSERT OR REPLACE INTO system_settings (key, value, updated_at) VALUES ('default_industry_id', ?, CURRENT_TIMESTAMP)").run(String(industryId));
  res.json({ message: '已设为默认', industryId });
});


// DELETE /api/admin/users/:id
router.delete('/users/:id', (req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM users WHERE id = ?').run(Number(req.params.id));
  res.json({ message: '已删除' });
});

// Departments
router.get('/departments', (req, res) => {
  const db = getDb();
  const list = db.prepare('SELECT d.*, u.name as manager_name FROM departments d LEFT JOIN users u ON d.manager_id = u.id ORDER BY d.sort_order').all();
  res.json({ list });
});

router.post('/departments', (req, res) => {
  const db = getDb();
  const { name, parent_id } = req.body;
  if (!name) return res.status(400).json({ error: '部门名必填' });
  const max = db.prepare('SELECT MAX(sort_order) as m FROM departments').get().m || 0;
  db.prepare('INSERT INTO departments (name, parent_id, sort_order) VALUES (?,?,?)').run(name, parent_id || null, max + 1);
  res.json({ message: '创建成功' });
});

// Sample types
router.get('/sample-types', (req, res) => {
  const db = getDb();
  const list = db.prepare('SELECT * FROM sample_types ORDER BY category, name').all();
  res.json({ list });
});

router.post('/sample-types', (req, res) => {
  const db = getDb();
  const { name, category, unit } = req.body;
  if (!name) return res.status(400).json({ error: '类型名必填' });
  try {
    db.prepare('INSERT INTO sample_types (name, category, unit) VALUES (?,?,?)').run(name, category || '', unit || '件');
    res.json({ message: '创建成功' });
  } catch(e) { res.status(400).json({ error: e.message }); }
});

router.delete('/sample-types/:id', (req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM sample_types WHERE id = ?').run(Number(req.params.id));
  res.json({ message: '已删除' });
});

// Workflows
router.get('/workflows', (req, res) => {
  const db = getDb();
  const list = db.prepare('SELECT * FROM workflows ORDER BY created_at DESC').all();
  res.json({ list });
});

router.post('/workflows', (req, res) => {
  const db = getDb();
  const { name, description, icon } = req.body;
  if (!name) return res.status(400).json({ error: '流程名必填' });
  db.prepare('INSERT INTO workflows (name, description) VALUES (?,?)').run(name, description || '', icon || '');
  res.json({ message: '创建成功' });
});

router.get('/workflow-nodes/:workflowId', (req, res) => {
  const db = getDb();
  const list = db.prepare('SELECT * FROM workflow_nodes WHERE workflow_id = ? ORDER BY step_order').all(Number(req.params.workflowId));
  res.json({ list });
});

// Audit logs
router.get('/audit-logs', (req, res) => {
  const db = getDb();
  const { page = 1, pageSize = 50 } = req.query;
  const offset = (Number(page) - 1) * Number(pageSize);
  const total = db.prepare('SELECT COUNT(*) as c FROM audit_logs').get().c;
  const list = db.prepare(`
    SELECT al.*, u.name as user_name FROM audit_logs al
    LEFT JOIN users u ON al.user_id = u.id
    ORDER BY al.created_at DESC LIMIT ? OFFSET ?
  `).all(Number(pageSize), offset);
  res.json({ list, total });
});

// System settings
router.get('/settings', (req, res) => {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM system_settings').all();
  const settings = {};
  rows.forEach(r => { settings[r.key] = r.value; });
  res.json(settings);
});

router.put('/settings', (req, res) => {
  const db = getDb();
  const setStmt = db.prepare('INSERT OR REPLACE INTO system_settings (key, value, updated_at) VALUES (?,?,CURRENT_TIMESTAMP)');
  for (const [key, value] of Object.entries(req.body)) {
    setStmt.run(key, String(value));
  }
  res.json({ message: '保存成功' });
});

// Notifications
router.get('/notifications', (req, res) => {
  const db = getDb();
  const userId = Number(req.headers.authorization) || 1;
  const list = db.prepare('SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 20').all(userId);
  const unread = db.prepare('SELECT COUNT(*) as c FROM notifications WHERE user_id = ? AND is_read = 0').get(userId).c;
  res.json({ list, unread });
});

router.put('/notifications/read/:id', (req, res) => {
  const db = getDb();
  db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ?').run(Number(req.params.id));
  res.json({ message: '已读' });
});

router.put('/notifications/read-all', (req, res) => {
  const db = getDb();
  const userId = Number(req.headers.authorization) || 1;
  db.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ?').run(userId);
  res.json({ message: '全部已读' });
});

export default router;

// ============ INDUSTRIES ============

// GET /api/admin/industries
router.get('/industries', (req, res) => {
  const db = getDb();
  const list = db.prepare('SELECT * FROM industries WHERE is_active = 1 ORDER BY id DESC').all();
  res.json({ list });
});

// POST /api/admin/industries
router.post('/industries', (req, res) => {
  const db = getDb();
  const { name, description, icon } = req.body;
  if (!name) return res.status(400).json({ error: '行业名称必填' });
  try {
    db.prepare('INSERT INTO industries (name, description, icon) VALUES (?,?,?)').run(name, description || '', icon || '');
    res.json({ message: '创建成功' });
  } catch(e) { res.status(400).json({ error: e.message }); }
});

// PUT /api/admin/industries/:id
router.put('/industries/:id', (req, res) => {
  const db = getDb();
  const { name, description, icon } = req.body;
  db.prepare('UPDATE industries SET name=?, description=?, icon=? WHERE id=?')
    .run(name, description || '', icon || '', Number(req.params.id));
  res.json({ message: '更新成功' });
});

// DELETE /api/admin/industries/:id
router.delete('/industries/:id', (req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM industries WHERE id = ?').run(Number(req.params.id));
  res.json({ message: '已删除' });
});

// GET /api/admin/industry-fields/:industryId
router.get('/industry-fields/:industryId', (req, res) => {
  const db = getDb();
  const list = db.prepare('SELECT * FROM industry_field_configs WHERE industry_id = ? ORDER BY sort_order ASC').all(Number(req.params.industryId));
  res.json({ list });
});

// POST /api/admin/industry-fields
router.post('/industry-fields', (req, res) => {
  const db = getDb();
  const { industry_id, field_key, field_label, field_type, options, required, placeholder, default_value, sort_order } = req.body;
  if (!industry_id || !field_key || !field_label) return res.status(400).json({ error: '必填字段缺失' });
  try {
    db.prepare(`INSERT INTO industry_field_configs (industry_id, field_key, field_label, field_type, options, required, placeholder, default_value, sort_order)
      VALUES (?,?,?,?,?,?,?,?,?)`).run(industry_id, field_key, field_label, field_type || 'text', options || null, required ? 1 : 0, placeholder || null, default_value || null, sort_order || 0);
    res.json({ message: '字段添加成功' });
  } catch(e) { res.status(400).json({ error: e.message }); }
});

// DELETE /api/admin/industry-fields/:id
router.delete('/industry-fields/:id', (req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM industry_field_configs WHERE id = ?').run(Number(req.params.id));
  res.json({ message: '已删除' });
});

// PUT /api/admin/industry-fields/:id
router.put('/industry-fields/:id', (req, res) => {
  const db = getDb();
  const { field_label, field_type, options, required, placeholder, default_value, sort_order } = req.body;
  db.prepare(`UPDATE industry_field_configs SET field_label=?, field_type=?, options=?, required=?, placeholder=?, default_value=?, sort_order=? WHERE id=?`)
    .run(field_label, field_type, options, required ? 1 : 0, placeholder, default_value || null, sort_order, Number(req.params.id));
  res.json({ message: '更新成功' });
});
// GET /api/admin/industries/default — Get the default industry (with fields)
router.get('/industries/default', (req, res) => {
  const db = getDb();
  const row = db.prepare("SELECT value FROM system_settings WHERE key = 'default_industry_id'").get();
  let defaultId = row ? Number(row.value) : null;
  if (!defaultId) {
    const first = db.prepare('SELECT * FROM industries WHERE is_active = 1 ORDER BY id ASC LIMIT 1').get();
    if (!first) return res.status(404).json({ error: '暂无行业' });
    defaultId = first.id;
  }
  const industry = db.prepare('SELECT * FROM industries WHERE id = ? AND is_active = 1').get(defaultId);
  if (!industry) {
    const first = db.prepare('SELECT * FROM industries WHERE is_active = 1 ORDER BY id ASC LIMIT 1').get();
    return res.json({ industry: first, fields: [] });
  }
  const fields = db.prepare('SELECT * FROM industry_field_configs WHERE industry_id = ? AND is_active = 1 ORDER BY sort_order ASC').all(industry.id);
  res.json({ industry, fields });
});

// POST /api/admin/industries/:id/set-default — Set default industry
router.post('/industries/:id/set-default', (req, res) => {
  const db = getDb();
  const industryId = Number(req.params.id);
  const industry = db.prepare('SELECT * FROM industries WHERE id = ?').get(industryId);
  if (!industry) return res.status(404).json({ error: '行业不存在' });
  db.prepare("INSERT OR REPLACE INTO system_settings (key, value, updated_at) VALUES ('default_industry_id', ?, CURRENT_TIMESTAMP)").run(String(industryId));
  res.json({ message: '已设为默认', industryId });
});
