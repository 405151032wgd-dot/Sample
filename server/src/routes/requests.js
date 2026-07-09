import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { getDb } from '../db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ts = Date.now();
    const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `${ts}-${safe}`);
  }
});
const upload = multer({ storage, limits: { fileSize: 50 * 1024 * 1024 } });

const router = Router();

function getRequestNo(db) {
  const now = new Date();
  const y = String(now.getFullYear());
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const prefix = `SY${y}${m}${d}-`;
  const last = db.prepare("SELECT request_no FROM sample_requests WHERE request_no LIKE ? ORDER BY id DESC LIMIT 1").get(`${prefix}%`);
  let seq = 1;
  if (last) {
    seq = parseInt(last.request_no.slice(-4)) + 1;
  }
  return `${prefix}${String(seq).padStart(4, '0')}`;
}

// GET /api/requests - List requests
router.get('/', (req, res) => {
  const db = getDb();
  const { status, applicant_id, type, search, page = 1, pageSize = 20 } = req.query;
  const userId = Number(req.headers.authorization) || 1 || 1;

  let where = ['1=1'];
  let params = [];

  if (status) {
    const statuses = status.split(',');
    where.push(`sr.status IN (${statuses.map(() => '?').join(',')})`);
    params.push(...statuses);
  }
  if (applicant_id) {
    where.push('sr.applicant_id = ?');
    params.push(Number(applicant_id));
  } else {
    // Default: only show own requests for non-admin
    const user = db.prepare('SELECT role FROM users WHERE id = ?').get(userId);
    if (user && !['admin', 'super_admin'].includes(user.role)) {
      where.push('sr.applicant_id = ?');
      params.push(userId);
    }
  }
  if (type) {
    where.push('sr.sample_type_id = ?');
    params.push(Number(type));
  }
  if (search) {
    where.push('(sr.title LIKE ? OR sr.request_no LIKE ? OR sr.applicant_company LIKE ? OR sr.applicant_name LIKE ?)');
    const kw = `%${search}%`;
    params.push(kw, kw, kw, kw);
  }

  const offset = (Number(page) - 1) * Number(pageSize);
  const countSql = `SELECT COUNT(*) as total FROM sample_requests sr WHERE ${where.join(' AND ')}`;
  const total = db.prepare(countSql).get(...params).total;

  const sql = `
    SELECT sr.*, u.name as applicant_name, d.name as department_name,
           st.name as sample_type_name, ind.name as industry_name,
           (SELECT COUNT(*) FROM sample_request_items WHERE request_id = sr.id) as item_count,
           (SELECT COUNT(*) FROM attachments WHERE request_id = sr.id) as attachment_count
    FROM sample_requests sr
    LEFT JOIN users u ON sr.applicant_id = u.id
    LEFT JOIN departments d ON u.department_id = d.id
    LEFT JOIN sample_types st ON sr.sample_type_id = st.id
    LEFT JOIN industries ind ON sr.industry_id = ind.id
    WHERE ${where.join(' AND ')}
    ORDER BY sr.created_at DESC
    LIMIT ? OFFSET ?
  `;

  const list = db.prepare(sql).all(...params, Number(pageSize), offset);
  res.json({ list, total, page: Number(page), pageSize: Number(pageSize) });
});

// GET /api/requests/query — Public query (no auth needed)
router.get('/query', (req, res) => {
  const db = getDb();
  const { no, company, phone } = req.query;

  if (!no && !(company && phone)) {
    return res.status(400).json({ error: '请提供申请编号，或公司名称+联系方式' });
  }

  let request;
  if (no) {
    request = db.prepare(`
      SELECT sr.*, u.name as applicant_name, d.name as department_name,
             st.name as sample_type_name, ind.name as industry_name
      FROM sample_requests sr
      LEFT JOIN users u ON sr.applicant_id = u.id
      LEFT JOIN departments d ON u.department_id = d.id
      LEFT JOIN sample_types st ON sr.sample_type_id = st.id
      LEFT JOIN industries ind ON sr.industry_id = ind.id
      WHERE sr.request_no LIKE ?
    `).get(`%${no}%`);
  } else {
    request = db.prepare(`
      SELECT sr.*, u.name as applicant_name, d.name as department_name,
             st.name as sample_type_name, ind.name as industry_name
      FROM sample_requests sr
      LEFT JOIN users u ON sr.applicant_id = u.id
      LEFT JOIN departments d ON u.department_id = d.id
      LEFT JOIN sample_types st ON sr.sample_type_id = st.id
      LEFT JOIN industries ind ON sr.industry_id = ind.id
      WHERE sr.applicant_company LIKE ? AND (sr.applicant_phone LIKE ? OR sr.applicant_email LIKE ?)
    `).get(`%${company}%`, `%${phone}%`, `%${phone}%`);
  }

  if (!request) return res.status(404).json({ error: '未找到匹配的申请' });

  const tracking = db.prepare(`
    SELECT st.*, u.name as operator_name FROM sample_tracking st
    LEFT JOIN users u ON st.operator_id = u.id
    WHERE st.request_id = ? ORDER BY st.operated_at ASC
  `).all(request.id);

  const items = db.prepare('SELECT i.*, st.name as sample_type_name FROM sample_request_items i LEFT JOIN sample_types st ON i.sample_type_id = st.id WHERE i.request_id = ? ORDER BY i.sort_order ASC').all(request.id);

  const attachments = db.prepare('SELECT * FROM attachments WHERE request_id = ?').all(request.id);

  res.json({ request, tracking, items, attachments });
});

// GET /api/requests/:id
router.get('/:id', (req, res) => {
  const db = getDb();
  const reqId = Number(req.params.id);

  const request = db.prepare(`
    SELECT sr.*, u.name as applicant_name, d.name as department_name,
           st.name as sample_type_name, ind.name as industry_name,
           (SELECT COUNT(*) FROM sample_request_items WHERE request_id = sr.id) as item_count,
           (SELECT COUNT(*) FROM attachments WHERE request_id = sr.id) as attachment_count
    FROM sample_requests sr
    LEFT JOIN users u ON sr.applicant_id = u.id
    LEFT JOIN departments d ON u.department_id = d.id
    LEFT JOIN sample_types st ON sr.sample_type_id = st.id
    LEFT JOIN industries ind ON sr.industry_id = ind.id
    WHERE sr.id = ?
  `).get(reqId);

  if (!request) return res.status(404).json({ error: '申请不存在' });

  const approvals = db.prepare(`
    SELECT ar.*, u.name as approver_name
    FROM approval_records ar
    LEFT JOIN users u ON ar.approver_id = u.id
    WHERE ar.request_id = ?
    ORDER BY ar.signed_at ASC
  `).all(reqId);

  const tracking = db.prepare(`
    SELECT st.*, u.name as operator_name
    FROM sample_tracking st
    LEFT JOIN users u ON st.operator_id = u.id
    WHERE st.request_id = ?
    ORDER BY st.operated_at ASC
  `).all(reqId);

  const attachments = db.prepare('SELECT * FROM attachments WHERE request_id = ?').all(reqId);

  // Get industry info and field configs
  let industry = null;
  let industryFields = [];
  if (request.industry_id) {
    industry = db.prepare('SELECT * FROM industries WHERE id = ?').get(request.industry_id);
    industryFields = db.prepare('SELECT * FROM industry_field_configs WHERE industry_id = ? AND is_active = 1 ORDER BY sort_order ASC').all(request.industry_id);
  }

  // Get industry-specific field values
  const fieldValues = {};
  const fvRows = db.prepare('SELECT field_key, field_value FROM sample_request_field_values WHERE request_id = ?').all(reqId);
  fvRows.forEach(r => { fieldValues[r.field_key] = r.field_value; });

  // Get request items
  const requestItems = db.prepare('SELECT i.*, st.name as sample_type_name FROM sample_request_items i LEFT JOIN sample_types st ON i.sample_type_id = st.id WHERE i.request_id = ? ORDER BY i.sort_order ASC').all(reqId);

  res.json({ ...request, industry, industryFields, fieldValues, approvals, tracking, attachments, items: requestItems });
});

// POST /api/requests - Create
router.post('/', (req, res) => {
  const db = getDb();
  const userId = Number(req.headers.authorization) || 1;
  const { title, purpose, expected_date, urgency, project_code, cost_center, remark, industry_id,
          applicant_company, applicant_name, applicant_title, applicant_phone, applicant_email, applicant_address } = req.body;

  if (!title || !purpose || !expected_date) {
    return res.status(400).json({ error: '请填写必填项：标题、用途、期望日期' });
  }
  const items = req.body.items;
  if (!items || items.length === 0) {
    return res.status(400).json({ error: '请至少添加一个产品项目' });
  }
  // Use first item's values for the main request record (for backward compatibility)
  const firstItem = items[0];
  const sample_type_id = firstItem.sample_type_id;
  const specification = firstItem.specification || '';
  const quantity = firstItem.quantity || 1;
  const unit = firstItem.unit || '件';

  const requestNo = getRequestNo(db);
  const result = db.prepare(`
    INSERT INTO sample_requests (request_no, title, sample_type_id, specification, quantity, unit,
      purpose, expected_date, urgency, status, applicant_id, project_code, cost_center, remark, industry_id,
      applicant_company, applicant_name, applicant_title, applicant_phone, applicant_email, applicant_address)
    VALUES (?,?,?,?,?,?,?,?,?,'待审批',?,?,?,?,?,?,?,?,?,?,?)
  `).run(requestNo, title, sample_type_id, specification || '', quantity || 1,
    unit || '件', purpose, expected_date, urgency || '普通', userId,
    project_code || '', cost_center || '', remark || '', industry_id || null,
    applicant_company || '', applicant_name || '', applicant_title || '', applicant_phone || '', applicant_email || '', applicant_address || '');

  const requestId = result.lastInsertRowid;

  // Save multiple product items
  const itemStmt = db.prepare(`INSERT INTO sample_request_items (request_id, sample_type_id, specification, quantity, unit, sort_order) VALUES (?,?,?,?,?,?)`);
  items.forEach((item, idx) => {
    itemStmt.run(requestId, item.sample_type_id, item.specification || '', item.quantity || 1, item.unit || '件', idx);
  });

  // Save industry-specific field values
  if (req.body.field_values && typeof req.body.field_values === 'object') {
    const fvStmt = db.prepare('INSERT OR REPLACE INTO sample_request_field_values (request_id, field_key, field_value) VALUES (?,?,?)');
    for (const [key, val] of Object.entries(req.body.field_values)) {
      if (val !== undefined && val !== null && val !== '') {
        fvStmt.run(requestId, key, String(val));
      }
    }
  }

  // Audit log
  db.prepare(`INSERT INTO audit_logs (user_id, action, entity_type, entity_id, new_value)
    VALUES (?,?,?,?,?)`).run(userId, '创建申请', 'sample_request', requestId, title);

  // Tracking
  db.prepare(`INSERT INTO sample_tracking (request_id, from_status, to_status, operator_id, remark)
    VALUES (?,NULL,'待审批',?,'提交申请')`).run(requestId, userId);

  // Notification for approvers (simplified: notify user id 4 and 8)
  db.prepare(`INSERT INTO notifications (user_id, title, content, type, target_type, target_id)
    VALUES (?,?,?,?,?,?)`).run(4, '新申请待审批', `${title} 申请待您审批`, 'info', 'request', requestId);

  res.json({ id: requestId, request_no: requestNo, message: '提交成功' });
});

// PUT /api/requests/:id - Update
router.put('/:id', (req, res) => {
  const db = getDb();
  const reqId = Number(req.params.id);
  const request = db.prepare('SELECT * FROM sample_requests WHERE id = ?').get(reqId);
  if (!request) return res.status(404).json({ error: '申请不存在' });
  if (request.status !== '草稿' && request.status !== '已驳回') {
    return res.status(400).json({ error: '当前状态不允许修改' });
  }

  const { title, sample_type_id, specification, quantity, unit, purpose,
          expected_date, urgency, project_code, cost_center, remark, industry_id,
          applicant_company, applicant_name, applicant_title, applicant_phone, applicant_email, applicant_address } = req.body;

  db.prepare(`
    UPDATE sample_requests SET title=?, sample_type_id=?, specification=?, quantity=?,
      unit=?, purpose=?, expected_date=?, urgency=?, project_code=?, cost_center=?,
      remark=?, updated_at=CURRENT_TIMESTAMP WHERE id=?
  `).run(title, sample_type_id, specification, quantity, unit, purpose,
    expected_date, urgency, project_code, cost_center, remark, reqId);

  res.json({ message: '更新成功' });
});

// DELETE /api/requests/:id - Cancel
router.delete('/:id', (req, res) => {
  const db = getDb();
  const reqId = Number(req.params.id);
  const request = db.prepare('SELECT * FROM sample_requests WHERE id = ?').get(reqId);
  if (!request) return res.status(404).json({ error: '申请不存在' });
  if (!['草稿', '待审批'].includes(request.status)) {
    return res.status(400).json({ error: '当前状态不允许取消' });
  }

  db.prepare(`UPDATE sample_requests SET status='已取消', updated_at=CURRENT_TIMESTAMP WHERE id=?`).run(reqId);
  db.prepare(`INSERT INTO sample_tracking (request_id, from_status, to_status, operator_id, remark) VALUES (?,?,?,?,?)`).run(reqId, request.status, '已取消', Number(req.headers.authorization) || 1, '申请人取消');
  res.json({ message: '已取消' });
});

// POST /api/requests/:id/attachments - Upload files
router.post('/:id/attachments', upload.array('files'), (req, res) => {
  const db = getDb();
  const reqId = Number(req.params.id);
  const request = db.prepare('SELECT * FROM sample_requests WHERE id = ?').get(reqId);
  if (!request) return res.status(404).json({ error: '申请不存在' });

  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: '请选择要上传的文件' });
  }

  const stmt = db.prepare('INSERT INTO attachments (request_id, filename, filepath, file_size) VALUES (?,?,?,?)');
  const results = [];
  req.files.forEach(file => {
    const result = stmt.run(reqId, file.originalname, file.filename, file.size);
    results.push({ id: result.lastInsertRowid, filename: file.originalname, size: file.size });
  });

  // Audit log
  db.prepare(`INSERT INTO audit_logs (user_id, action, entity_type, entity_id, new_value)
    VALUES (?,?,?,?,?)`).run(Number(req.headers.authorization) || 1, '上传附件', 'attachment', reqId, `${req.files.length} 个文件`);

  res.json({ message: '上传成功', files: results });
});


// GET /api/requests/query — Public query (no auth needed)
router.get('/query', (req, res) => {
  const db = getDb();
  const { no, company, phone } = req.query;

  if (!no && !(company && phone)) {
    return res.status(400).json({ error: '请提供申请编号，或公司名称+联系方式' });
  }

  let request;
  if (no) {
    request = db.prepare(`
      SELECT sr.*, u.name as applicant_name, d.name as department_name,
             st.name as sample_type_name, ind.name as industry_name
      FROM sample_requests sr
      LEFT JOIN users u ON sr.applicant_id = u.id
      LEFT JOIN departments d ON u.department_id = d.id
      LEFT JOIN sample_types st ON sr.sample_type_id = st.id
      LEFT JOIN industries ind ON sr.industry_id = ind.id
      WHERE sr.request_no LIKE ?
    `).get(`%${no}%`);
  } else {
    request = db.prepare(`
      SELECT sr.*, u.name as applicant_name, d.name as department_name,
             st.name as sample_type_name, ind.name as industry_name
      FROM sample_requests sr
      LEFT JOIN users u ON sr.applicant_id = u.id
      LEFT JOIN departments d ON u.department_id = d.id
      LEFT JOIN sample_types st ON sr.sample_type_id = st.id
      LEFT JOIN industries ind ON sr.industry_id = ind.id
      WHERE sr.applicant_company LIKE ? AND (sr.applicant_phone LIKE ? OR sr.applicant_email LIKE ?)
    `).get(`%${company}%`, `%${phone}%`, `%${phone}%`);
  }

  if (!request) return res.status(404).json({ error: '未找到匹配的申请' });

  const tracking = db.prepare(`
    SELECT st.*, u.name as operator_name FROM sample_tracking st
    LEFT JOIN users u ON st.operator_id = u.id
    WHERE st.request_id = ? ORDER BY st.operated_at ASC
  `).all(request.id);

  const items = db.prepare('SELECT i.*, st.name as sample_type_name FROM sample_request_items i LEFT JOIN sample_types st ON i.sample_type_id = st.id WHERE i.request_id = ? ORDER BY i.sort_order ASC').all(request.id);

  const attachments = db.prepare('SELECT * FROM attachments WHERE request_id = ?').all(request.id);

 res.json({ request, tracking, items, attachments });
});

export default router;
 
 // GET /api/requests/:requestId/notifications
 router.get('/:requestId/notifications', (req, res) => {
   const db = getDb();
   const requestId = Number(req.params.requestId);
   const list = db.prepare(`
     SELECT id, title, content, type, is_read, target_type, target_id, created_at
     FROM notifications
     WHERE target_type = 'request' AND target_id = ?
     ORDER BY created_at DESC
   `).all(requestId);
   res.json({ list });
 });
 
// PUT /api/requests/:id/field-values
router.put('/:id/field-values', (req, res) => {
  const db = getDb();
  const reqId = Number(req.params.id);
  const { field_values } = req.body;
  if (!field_values || typeof field_values !== 'object') {
    return res.status(400).json({ error: 'field_values 必须是对象' });
  }
  const fvStmt = db.prepare('INSERT OR REPLACE INTO sample_request_field_values (request_id, field_key, field_value) VALUES (?,?,?)');
  for (const [key, val] of Object.entries(field_values)) {
    if (val !== undefined && val !== null && val !== '') {
      fvStmt.run(reqId, key, String(val));
    }
  }
  res.json({ message: '字段值已保存' });
});
