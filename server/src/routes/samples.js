import { Router } from 'express';
import { getDb } from '../db.js';

const router = Router();

// GET /api/samples - Ledger (admin)
router.get('/', (req, res) => {
  const db = getDb();
  const { status, department_id, applicant_company, date_from, date_to, search, page = 1, pageSize = 20 } = req.query;

  let where = ["sr.status NOT IN ('草稿','已取消')"];
  let params = [];

  if (status) {
    const stats = status.split(',');
    where.push(`sr.status IN (${stats.map(() => '?').join(',')})`);
    params.push(...stats);
  }
  if (department_id) {
    where.push('u.department_id = ?');
    params.push(Number(department_id));
  }
  if (search) {
    where.push('(sr.request_no LIKE ? OR sr.title LIKE ? OR sr.applicant_company LIKE ? OR sr.applicant_name LIKE ?)');
    const kw = `%${search}%`;
    params.push(kw, kw, kw, kw);
  }
  if (applicant_company) {
    where.push('sr.applicant_company LIKE ?');
    params.push(`%${applicant_company}%`);
  }
  if (date_from) {
    where.push('sr.expected_date >= ?');
    params.push(date_from);
  }
  if (date_to) {
    where.push('sr.expected_date <= ?');
    params.push(date_to);
  }

  const offset = (Number(page) - 1) * Number(pageSize);
  const total = db.prepare(`SELECT COUNT(*) as total FROM sample_requests sr LEFT JOIN users u ON sr.applicant_id = u.id WHERE ${where.join(' AND ')}`).get(...params).total;

  const list = db.prepare(`
    SELECT sr.*, u.name as applicant_name, d.name as department_name,
           st.name as sample_type_name
    FROM sample_requests sr
    LEFT JOIN users u ON sr.applicant_id = u.id
    LEFT JOIN departments d ON u.department_id = d.id
    LEFT JOIN sample_types st ON sr.sample_type_id = st.id
    WHERE ${where.join(' AND ')}
    ORDER BY sr.created_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, Number(pageSize), offset);

  res.json({ list, total, page: Number(page), pageSize: Number(pageSize) });
});

// PUT /api/samples/:id/status
router.put('/:id/status', (req, res) => {
  const db = getDb();
  const userId = Number(req.headers.authorization) || 1;
  const sampleId = Number(req.params.id);
 const { status, remark } = req.body;
  const { tracking_no, carrier } = req.body;

 const validTransitions = {
     '待审批': '已批准|已驳回',
     '已批准': '制作中|已发货',
     '制作中': '已发货',
     '已发货': '已完成',
   };

  const request = db.prepare('SELECT * FROM sample_requests WHERE id = ?').get(sampleId);
  if (!request) return res.status(404).json({ error: '申请不存在' });

  const allowed = validTransitions[request.status];
  if (!allowed || !allowed.split('|').includes(status)) {
    return res.status(400).json({ error: `不能从 ${request.status} 变更为 ${status}` });
  }

  if (status === '已发货') {
    db.prepare(`UPDATE sample_requests SET status=?, tracking_no=?, carrier=?, shipped_at=CURRENT_TIMESTAMP, updated_at=CURRENT_TIMESTAMP WHERE id=?`).run(status, tracking_no || '', carrier || '', sampleId);
  } else {
    db.prepare(`UPDATE sample_requests SET status=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`).run(status, sampleId);
  }
  db.prepare(`INSERT INTO sample_tracking (request_id, from_status, to_status, operator_id, remark) VALUES (?,?,?,?,?)`).run(sampleId, request.status, status, userId, remark || '');

  // Notify applicant
  const msg = status === '已驳回' ? '申请已被驳回' : status === '已批准' ? '申请已通过审核' : status === '已发货' ? `样品已发货，物流单号：${tracking_no || '待更新'}` : '样品已完成';
  db.prepare(`INSERT INTO notifications (user_id, title, content, type, target_type, target_id) VALUES (?,?,?,?,?,?)`).run(request.applicant_id, msg, `"${request.title}"状态更新为：${status}`, 'info', 'request', sampleId);

  db.prepare(`INSERT INTO audit_logs (user_id, action, entity_type, entity_id, old_value, new_value) VALUES (?,?,?,?,?,?)`).run(userId, '状态变更', 'sample_request', sampleId, request.status, status);

  res.json({ message: '状态已更新', newStatus: status });
});

// GET /api/samples/export — Export CSV (must be before :id)
router.get('/export', (req, res) => {
  const db = getDb();
  const { status, search } = req.query;
  let where = ["sr.status NOT IN ('草稿','已取消')"];
  let params = [];
  if (status) {
    const stats = status.split(',');
    where.push(`sr.status IN (${stats.map(() => '?').join(',')})`);
    params.push(...stats);
  }
  if (search) {
    where.push('(sr.request_no LIKE ? OR sr.title LIKE ? OR sr.applicant_company LIKE ? OR sr.applicant_name LIKE ?)');
    const kw = `%${search}%`;
    params.push(kw, kw, kw, kw);
  }
  const list = db.prepare(`
    SELECT sr.request_no, sr.title, sr.specification, sr.quantity, sr.unit, sr.purpose,
           sr.expected_date, sr.urgency, sr.status, sr.created_at,
           u.name as applicant_name, d.name as department_name, st.name as sample_type_name,
           ind.name as industry_name, sr.applicant_company, sr.applicant_phone
    FROM sample_requests sr
    LEFT JOIN users u ON sr.applicant_id = u.id
    LEFT JOIN departments d ON u.department_id = d.id
    LEFT JOIN sample_types st ON sr.sample_type_id = st.id
    LEFT JOIN industries ind ON sr.industry_id = ind.id
    WHERE ${where.join(' AND ')}
    ORDER BY sr.created_at DESC
  `).all(...params);

  const BOM = '\uFEFF';
  const headers = '编号,名称,规格,数量,单位,申请人,公司,部门,行业,用途,期望日,紧急程度,状态,电话,提交时间';
  const rows = list.map(r => [
    r.request_no, r.title, r.specification || '', r.quantity, r.unit,
    r.applicant_name, r.applicant_company || '', r.department_name || '', r.industry_name || '',
    r.purpose, r.expected_date, r.urgency, r.status, r.applicant_phone || '',
    new Date(r.created_at).toISOString().slice(0, 10)
  ].map(v => `"${(v || '').toString().replace(/"/g, '""')}"`).join(','));

  const csv = BOM + headers + '\n' + rows.join('\n');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename=sample_ledger.csv');
  res.send(csv);
});

// GET /api/samples/:id
router.get('/:id', (req, res) => {
  const db = getDb();
  const sample = db.prepare(`
    SELECT sr.*, u.name as applicant_name, d.name as department_name,
           st.name as sample_type_name, ind.name as industry_name
    FROM sample_requests sr
    LEFT JOIN users u ON sr.applicant_id = u.id
    LEFT JOIN departments d ON u.department_id = d.id
    LEFT JOIN sample_types st ON sr.sample_type_id = st.id
    LEFT JOIN industries ind ON sr.industry_id = ind.id
    WHERE sr.id = ?
  `).get(Number(req.params.id));

  if (!sample) return res.status(404).json({ error: '记录不存在' });

  const tracking = db.prepare(`
    SELECT st.*, u.name as operator_name FROM sample_tracking st
    LEFT JOIN users u ON st.operator_id = u.id
    WHERE st.request_id = ? ORDER BY st.operated_at ASC
  `).all(sample.id);

  const items = db.prepare('SELECT i.*, st.name as sample_type_name FROM sample_request_items i LEFT JOIN sample_types st ON i.sample_type_id = st.id WHERE i.request_id = ? ORDER BY i.sort_order ASC').all(sample.id);

  const attachments = db.prepare('SELECT * FROM attachments WHERE request_id = ?').all(sample.id);

  let industry = null;
  let industryFields = [];
  let fieldValues = {};
  if (sample.industry_id) {
    industry = db.prepare('SELECT * FROM industries WHERE id = ?').get(sample.industry_id);
    industryFields = db.prepare('SELECT * FROM industry_field_configs WHERE industry_id = ? AND is_active = 1 ORDER BY sort_order ASC').all(sample.industry_id);
    const fvRows = db.prepare('SELECT field_key, field_value FROM sample_request_field_values WHERE request_id = ?').all(sample.id);
    fvRows.forEach(r => { fieldValues[r.field_key] = r.field_value; });
  }

  res.json({ ...sample, tracking, items, attachments, industry, industryFields, fieldValues });
});

// GET /api/samples/export — Export CSV
export default router;
