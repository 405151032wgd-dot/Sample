import { Router } from 'express';
import { getDb } from '../db.js';

const router = Router();

// GET /api/approvals/pending
router.get('/pending', (req, res) => {
  const db = getDb();
  const userId = Number(req.headers.authorization) || 1;
  // A real system would check the workflow. For simplicity:
  // Approvers (role = 'approver' or 'admin') see all pending requests
  const user = db.prepare('SELECT role, department_id FROM users WHERE id = ?').get(userId);
  if (!user) return res.status(401).json({ error: '未登录' });

  let where = "sr.status IN ('待审批')";
  let params = [];

  if (user.role === 'approver') {
    // Approver sees requests from their department or assigned to them
    where += " AND (sr.current_approver_id = ? OR (SELECT department_id FROM users WHERE id = sr.applicant_id) = ?)";
    params.push(userId, user.department_id);
  } else if (['admin', 'super_admin', 'operator'].includes(user.role)) {
    // Admin/operator sees all
  } else {
    // Applicant sees none pending (they can't approve)
    where += ' AND 1=0';
  }

  const list = db.prepare(`
    SELECT sr.*, u.name as applicant_name, d.name as department_name,
           st.name as sample_type_name
    FROM sample_requests sr
    LEFT JOIN users u ON sr.applicant_id = u.id
    LEFT JOIN departments d ON u.department_id = d.id
    LEFT JOIN sample_types st ON sr.sample_type_id = st.id
    WHERE ${where}
    ORDER BY sr.urgency DESC, sr.created_at ASC
  `).all(...params);

  res.json({ list });
});

// POST /api/approvals/:id/action
router.post('/:id/action', (req, res) => {
  const db = getDb();
  const userId = Number(req.headers.authorization) || 1;
  const reqId = Number(req.params.id);
  const { action, comment } = req.body;

  if (!['通过', '驳回', '退回修改'].includes(action)) {
    return res.status(400).json({ error: '无效操作' });
  }

  const request = db.prepare('SELECT * FROM sample_requests WHERE id = ?').get(reqId);
  if (!request) return res.status(404).json({ error: '申请不存在' });
  if (request.status !== '待审批') return res.status(400).json({ error: '当前状态不允许审批' });

  const newStatus = action === '通过' ? '已批准' : action === '驳回' ? '已驳回' : '待审批';

  db.prepare(`UPDATE sample_requests SET status=?, current_approver_id=NULL, updated_at=CURRENT_TIMESTAMP WHERE id=?`).run(newStatus, reqId);

  // Get next level
  const lastApproval = db.prepare("SELECT MAX(level) as lvl FROM approval_records WHERE request_id = ?").get(reqId);
  const nextLevel = (lastApproval.lvl || 0) + 1;

  db.prepare(`INSERT INTO approval_records (request_id, approver_id, level, action, comment) VALUES (?,?,?,?,?)`).run(reqId, userId, nextLevel, action, comment || '');
  db.prepare(`INSERT INTO sample_tracking (request_id, from_status, to_status, operator_id, remark) VALUES (?,?,?,?,?)`).run(reqId, request.status, newStatus, userId, comment || '');

  // Notify applicant
  db.prepare(`INSERT INTO notifications (user_id, title, content, type, target_type, target_id)
    VALUES (?,?,?,?,?,?)`).run(request.applicant_id,
    action === '通过' ? '审批已通过' : '审批未通过',
    `您的申请"${request.title}"已被${action === '通过' ? '通过' : '驳回'}：${comment || '无备注'}`,
    action === '通过' ? 'success' : 'error', 'request', reqId);

  // Audit log
  db.prepare(`INSERT INTO audit_logs (user_id, action, entity_type, entity_id, old_value, new_value)
    VALUES (?,?,?,?,?,?)`).run(userId, `审批${action}`, 'sample_request', reqId, request.status, newStatus);

  res.json({ message: action === '通过' ? '已批准' : action === '驳回' ? '已驳回' : '已退回修改', newStatus });
});

// GET /api/approvals/history
router.get('/history', (req, res) => {
  const db = getDb();
  const userId = Number(req.headers.authorization) || 1;
  const list = db.prepare(`
    SELECT ar.*, sr.title as request_title, sr.request_no,
           u.name as approver_name
    FROM approval_records ar
    LEFT JOIN sample_requests sr ON ar.request_id = sr.id
    LEFT JOIN users u ON ar.approver_id = u.id
    WHERE ar.approver_id = ?
    ORDER BY ar.signed_at DESC
    LIMIT 50
  `).all(userId);
  res.json({ list });
});

// POST /api/approvals/batch — Batch approve/reject
router.post('/batch', (req, res) => {
  const db = getDb();
  const userId = Number(req.headers.authorization) || 1;
  const { ids, action, comment } = req.body;

  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: '请选择申请' });
  }
  if (!['通过', '驳回'].includes(action)) {
    return res.status(400).json({ error: '无效操作' });
  }

  let success = 0;
  let failed = 0;
  const newStatus = action === '通过' ? '已批准' : '已驳回';

  ids.forEach(reqId => {
    const request = db.prepare('SELECT * FROM sample_requests WHERE id = ? AND status = ?').get(reqId, '待审批');
    if (!request) { failed++; return; }

    db.prepare(`UPDATE sample_requests SET status=?, current_approver_id=NULL, updated_at=CURRENT_TIMESTAMP WHERE id=?`).run(newStatus, reqId);

    const lastApproval = db.prepare("SELECT MAX(level) as lvl FROM approval_records WHERE request_id = ?").get(reqId);
    const nextLevel = (lastApproval.lvl || 0) + 1;

    db.prepare(`INSERT INTO approval_records (request_id, approver_id, level, action, comment) VALUES (?,?,?,?,?)`).run(reqId, userId, nextLevel, action, comment || '');
    db.prepare(`INSERT INTO sample_tracking (request_id, from_status, to_status, operator_id, remark) VALUES (?,?,?,?,?)`).run(reqId, '待审批', newStatus, userId, comment || '');

    db.prepare(`INSERT INTO notifications (user_id, title, content, type, target_type, target_id) VALUES (?,?,?,?,?,?)`).run(request.applicant_id,
      action === '通过' ? '审批已通过' : '审批未通过',
      `您的申请"${request.title}"已被批量${action === '通过' ? '通过' : '驳回'}`,
      action === '通过' ? 'success' : 'error', 'request', reqId);
  });

  res.json({ message: `批量${action}完成，成功 ${success} 项` + (failed ? `，${failed} 项跳过` : ''), success, failed });
});

// POST /api/approvals/:id/remind — Send reminder
router.post('/:id/remind', (req, res) => {
  const db = getDb();
  const reqId = Number(req.params.id);
  const request = db.prepare('SELECT title, current_approver_id FROM sample_requests WHERE id = ?').get(reqId);
  if (!request) return res.status(404).json({ error: '申请不存在' });

  if (request.current_approver_id) {
    db.prepare(`INSERT INTO notifications (user_id, title, content, type, target_type, target_id) VALUES (?,?,?,?,?,?)`).run(
      request.current_approver_id, '审批催办',
      `申请"${request.title}"等待审批，请尽快处理`, 'warning', 'request', reqId);
  }

  res.json({ message: '催办通知已发送' });
});

export default router;
