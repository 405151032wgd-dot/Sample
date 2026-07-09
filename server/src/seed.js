import { getDb } from './db.js';
import crypto from 'crypto';

function md5(s) {
  return crypto.createHash('md5').update(s).digest('hex');
}

const db = getDb();

// Clear existing data
db.exec(`
  DELETE FROM audit_logs; DELETE FROM satisfaction; DELETE FROM notifications;
  DELETE FROM workflow_nodes; DELETE FROM workflows; DELETE FROM sample_tracking;
  DELETE FROM approval_records; DELETE FROM attachments; DELETE FROM sample_requests;
  DELETE FROM sample_types; DELETE FROM users; DELETE FROM departments;
  DELETE FROM system_settings;
`);

// Departments
const deptStmt = db.prepare('INSERT INTO departments (name, parent_id, sort_order) VALUES (?, ?, ?)');
deptStmt.run('总经办', null, 1);
deptStmt.run('研发部', null, 2);
deptStmt.run('生产部', null, 3);
deptStmt.run('质检部', null, 4);
deptStmt.run('销售部', null, 5);
deptStmt.run('行政部', null, 6);

// Users (password: 123456)
const userStmt = db.prepare('INSERT INTO users (name, department_id, role, email, phone, password_hash, is_active) VALUES (?,?,?,?,?,?,?)');
const pwd = md5('123456');
userStmt.run('系统管理员', 1, 'admin', 'admin@company.com', '13800000001', pwd, 1);
userStmt.run('刘总', 1, 'admin', 'liu@company.com', '13800000002', pwd, 1);
userStmt.run('张工', 2, 'applicant', 'zhang@company.com', '13800000003', pwd, 1);
userStmt.run('王经理', 2, 'approver', 'wang@company.com', '13800000004', pwd, 1);
userStmt.run('李师傅', 3, 'operator', 'li@company.com', '13800000005', pwd, 1);
userStmt.run('陈工', 2, 'applicant', 'chen@company.com', '13800000006', pwd, 1);
userStmt.run('赵工', 4, 'applicant', 'zhao@company.com', '13800000007', pwd, 1);
userStmt.run('周经理', 4, 'approver', 'zhou@company.com', '13800000008', pwd, 1);

// Set department managers
db.prepare('UPDATE departments SET manager_id = 2 WHERE id = 1').run();
db.prepare('UPDATE departments SET manager_id = 4 WHERE id = 2').run();
db.prepare('UPDATE departments SET manager_id = 5 WHERE id = 3').run();
db.prepare('UPDATE departments SET manager_id = 8 WHERE id = 4').run();

// Sample types
const typeStmt = db.prepare('INSERT INTO sample_types (name, category, unit) VALUES (?,?,?)');
typeStmt.run('研发测试样品', '研发类', '件');
typeStmt.run('客户送样', '业务类', '套');
typeStmt.run('来料复检样', '质检类', '件');
typeStmt.run('竞品分析样', '市场类', '件');
typeStmt.run('工艺验证样', '生产类', '件');
typeStmt.run('包装试样', '业务类', '套');

// Workflows
const wfStmt = db.prepare('INSERT INTO workflows (name, description) VALUES (?,?)');
wfStmt.run('标准样品审批流程', '默认审批流程：主管审批 → 部门经理审批 → 生产部确认');

const wnStmt = db.prepare('INSERT INTO workflow_nodes (workflow_id, node_name, step_order, approver_type, timeout_hours, timeout_action, pass_rule) VALUES (?,?,?,?,?,?,?)');
wnStmt.run(1, '部门主管审批', 1, '部门主管', 24, 'remind', 'any');
wnStmt.run(1, '部门经理审批', 2, '上级部门主管', 48, 'remind', 'any');
wnStmt.run(1, '生产部确认', 3, '角色', 48, 'remind', 'any');
wnStmt.run(1, '技术副总审批（条件）', 4, '指定人', 72, 'escalate', 'any');

// System settings
const setStmt = db.prepare('INSERT OR REPLACE INTO system_settings (key, value) VALUES (?,?)');
setStmt.run('request_no_format', 'SY${year}${month}${day}-${seq}');
setStmt.run('max_file_size', '20');
setStmt.run('allowed_file_types', '.pdf,.dwg,.jpg,.png,.doc,.docx,.xls,.xlsx');
setStmt.run('max_attachments', '5');
setStmt.run('archive_months', '12');

// Industries
const indStmt = db.prepare('INSERT INTO industries (name, description) VALUES (?,?)');
indStmt.run('精密制造/机械加工', '适用于机械零部件、模具、材料等试样申请');
indStmt.run('电子/半导体', '适用于PCB板、芯片、元器件等样品申请');
indStmt.run('化工/新材料', '适用于配方、原料、改性材料等试样申请');
indStmt.run('医疗器械', '适用于生物试样、植入物、设备样品等申请');
indStmt.run('汽车零部件', '适用于总成、耐久测试样件等申请');
indStmt.run('消费品/日化', '适用于包装、配方、香精等样品申请');
indStmt.run('食品/农产品', '适用于原料、成品、竞品等样品申请');
indStmt.run('纺织/服装', '适用于面料、色卡、辅料等样品申请');
indStmt.run('建材/五金', '适用于型材、涂层、连接件等试样申请');

// Industry-specific field configs
const fcStmt = db.prepare(`INSERT INTO industry_field_configs
  (industry_id, field_key, field_label, field_type, required, placeholder, sort_order) VALUES (?,?,?,?,?,?,?)`);

// 1. 精密制造/机械加工
fcStmt.run(1, 'dwg_no', '图纸编号', 'text', 0, '如：DWG-2026-001', 1);
fcStmt.run(1, 'material_grade', '材料牌号', 'text', 0, '如：SUS304, 45#钢', 2);
fcStmt.run(1, 'surface_treatment', '表面处理', 'text', 0, '如：镀铬、阳极氧化', 3);
fcStmt.run(1, 'tolerance_grade', '公差等级', 'select', 0, 'IT6|IT7|IT8|IT9|无特殊要求', 4);

// 2. 电子/半导体
fcStmt.run(2, 'schematic_no', '电路图号', 'text', 0, '如：SCH-2026-001', 1);
fcStmt.run(2, 'pcb_layers', 'PCB层数', 'select', 0, '2|4|6|8|10|12', 2);
fcStmt.run(2, 'bom_required', '需BOM清单', 'boolean', 0, '', 3);
fcStmt.run(2, 'test_items', '测试项目', 'textarea', 0, '如：功能测试、ICT、FCT', 4);

// 3. 化工/新材料
fcStmt.run(3, 'formula_no', '配方编号', 'text', 0, '如：FM-2026-001', 1);
fcStmt.run(3, 'msds_required', '需安全数据表(MSDS)', 'boolean', 1, '', 2);
fcStmt.run(3, 'storage_condition', '储存条件', 'text', 0, '如：阴凉干燥、冷藏', 3);
fcStmt.run(3, 'shelf_life', '保质期要求', 'text', 0, '如：6个月', 4);

// 4. 医疗器械
fcStmt.run(4, 'registration_no', '注册证号', 'text', 1, '如：国械注准2026XXXX', 1);
fcStmt.run(4, 'biocompatibility', '生物相容性要求', 'textarea', 0, '如：ISO 10993 细胞毒性', 2);
fcStmt.run(4, 'sterilization', '灭菌方式', 'select', 0, '环氧乙烷|辐照|高温高压|紫外线|无要求', 3);
fcStmt.run(4, 'expiry_date', '有效期', 'number', 0, '单位：月', 4);

// 5. 汽车零部件
fcStmt.run(5, 'part_no', '零件号', 'text', 1, '如：A12345678', 1);
fcStmt.run(5, 'material_standard', '材料标准', 'text', 0, '如：DIN EN 10025', 2);
fcStmt.run(5, 'durability_test', '耐久测试要求', 'textarea', 0, '如：10万次循环', 3);
fcStmt.run(5, 'pv_test', 'PV测试要求', 'boolean', 0, '', 4);

// 6. 消费品/日化
fcStmt.run(6, 'packaging_spec', '包装规格', 'text', 0, '如：30ml/瓶', 1);
fcStmt.run(6, 'fragrance_type', '香型', 'text', 0, '如：薰衣草、柑橘', 2);
fcStmt.run(6, 'color_spec', '颜色要求', 'text', 0, '如：RAL色号、Pantone', 3);
fcStmt.run(6, 'shelf_life_months', '保质期(月)', 'number', 0, '如：36', 4);

// 7. 食品/农产品
fcStmt.run(7, 'prod_date', '生产日期', 'date', 0, '', 1);
fcStmt.run(7, 'shelf_life_days', '保质期(天)', 'number', 0, '如：180', 2);
fcStmt.run(7, 'storage_temp', '储存温度', 'text', 0, '如：-18°C冷冻、2-8°C冷藏', 3);
fcStmt.run(7, 'allergen_info', '过敏原信息', 'textarea', 0, '含：花生、乳制品等', 4);

// 8. 纺织/服装
fcStmt.run(8, 'fabric_content', '面料成分', 'text', 0, '如：80%棉 20%涤纶', 1);
fcStmt.run(8, 'color_no', '色号/色卡号', 'text', 0, '如：PANTONE 18-1663', 2);
fcStmt.run(8, 'yarn_count', '纱支', 'text', 0, '如：40S/2', 3);
fcStmt.run(8, 'gram_weight', '克重(g/m²)', 'number', 0, '如：180', 4);

// 9. 建材/五金
fcStmt.run(9, 'profile_no', '型材编号', 'text', 0, '如：JC-6063-T5', 1);
fcStmt.run(9, 'surface_finish', '表面处理', 'select', 0, '粉末喷涂|氟碳喷涂|阳极氧化|电泳|拉丝', 2);
fcStmt.run(9, 'dimension_spec', '尺寸规格', 'text', 0, '如：50x50x2mm', 3);
fcStmt.run(9, 'compression_grade', '抗压等级', 'text', 0, '如：C30、Q235B', 4);



// Sample requests
const reqStmt = db.prepare(`INSERT INTO sample_requests
  (request_no, title, sample_type_id, specification, quantity, unit, purpose,
   expected_date, urgency, status, applicant_id, current_approver_id,
   project_code, cost_center, remark, industry_id, created_at,
   applicant_company, applicant_name, applicant_title, applicant_phone, applicant_email, applicant_address)
  VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);

const itemStmt = db.prepare(`INSERT INTO sample_request_items (request_id, sample_type_id, specification, quantity, unit, sort_order) VALUES (?,?,?,?,?,?)`);

const now = new Date();
const today = now.toISOString().slice(0,10);

const r1 = reqStmt.run('SY20260628-001', 'ABS改性材料测试样', 1, 'ABS+30%GF', 3, '件',
  '研发阶段性能测试，对标竞品A材料，需测试拉伸强度、冲击韧性',
  '2026-07-10', '紧急', '制作中', 3, 5,
  'PRJ-2026-089', 'R&D-003', '请优先安排', 1, '2026-06-28 09:00:00',
  '中汽零部件公司', '王工', '研发工程师', '13910001001', 'wang@example.com', '北京市亦庄开发区');
itemStmt.run(r1.lastInsertRowid, 1, 'ABS+30%GF', 3, '件', 0);

const r2 = reqStmt.run('SY20260627-001', '铝合金型材试样', 1, '6061-T6 50x50mm', 2, '件',
  '新供应商材料验证，需做金相分析和硬度测试',
  '2026-07-05', '普通', '已批准', 6, null,
  'PRJ-2026-085', 'R&D-002', '', 2, '2026-06-27 14:30:00',
  '华锐精密制造', '李工', '工艺工程师', '13820002002', 'li@huarui.com', '苏州市工业园区');
itemStmt.run(r2.lastInsertRowid, 1, '6061-T6 50x50mm', 2, '件', 0);

const r3 = reqStmt.run('SY20260626-001', '橡胶密封圈样品', 3, 'NBR70 Φ50x5mm', 20, '件',
  '来料批次复检，需与标准样品对比尺寸和硬度',
  '2026-07-01', '普通', '已签收', 7, null,
  '', 'QC-001', '', 7, '2026-06-26 10:00:00',
  '申海橡胶科技', '陈主管', '质检主管', '13730003003', 'chen@shenhai.com', '宁波市北仑区');
itemStmt.run(r3.lastInsertRowid, 3, 'NBR70 Φ50x5mm', 20, '件', 0);

const r4 = reqStmt.run('SY20260625-001', 'PCB样板（4层）', 1, 'FR-4 100x80mm 4层', 5, '件',
  '新产品电路验证，需贴片后做功能测试',
  '2026-07-15', '特急', '待审批', 3, 4,
  'PRJ-2026-092', 'R&D-003', '急需，客户下月来访演示', 2, '2026-06-25 16:45:00',
  '速达电子科技', '赵工程师', '硬件主管', '13640004004', 'zhao@suda.com', '深圳市南山区');
itemStmt.run(r4.lastInsertRowid, 1, 'FR-4 100x80mm 4层', 5, '件', 0);

const r5 = reqStmt.run('SY20260624-001', '包装彩盒样品', 6, '300g铜版纸 覆哑膜', 100, '套',
  '新产品上市包装确认，需印刷打样',
  '2026-07-08', '普通', '待审批', 6, 4,
  'MKT-2026-012', 'MKT-001', '', 6, '2026-06-24 11:20:00',
  '悦美日化', '刘经理', '产品经理', '13550005005', 'liu@yuemei.com', '广州市白云区');
itemStmt.run(r5.lastInsertRowid, 6, '300g铜版纸 覆哑膜', 100, '套', 0);

// Tracking records
const trkStmt = db.prepare('INSERT INTO sample_tracking (request_id, from_status, to_status, operator_id, remark, operated_at) VALUES (?,?,?,?,?,?)');
trkStmt.run(1, null, '待审批', 3, '提交申请', '2026-06-28 09:00:00');
trkStmt.run(1, '待审批', '已批准', 4, '同意，请安排制作', '2026-06-28 09:32:00');
trkStmt.run(1, '已批准', '制作中', 5, '开始制作', '2026-06-29 08:00:00');
trkStmt.run(2, null, '待审批', 6, '提交申请', '2026-06-27 14:30:00');
trkStmt.run(2, '待审批', '已批准', 4, '批准', '2026-06-28 10:00:00');
trkStmt.run(3, null, '待审批', 7, '提交申请', '2026-06-26 10:00:00');
trkStmt.run(3, '待审批', '已批准', 8, '同意复检', '2026-06-26 15:00:00');
trkStmt.run(3, '已批准', '已完成', 5, '检测完成', '2026-06-28 17:00:00');
trkStmt.run(3, '已完成', '已签收', 7, '样品已领取，合格', '2026-06-29 09:00:00');

// Approval records
const aprStmt = db.prepare('INSERT INTO approval_records (request_id, approver_id, level, action, comment, signed_at) VALUES (?,?,?,?,?,?)');
aprStmt.run(1, 3, 1, '提交', '提交申请', '2026-06-28 09:00:00');
aprStmt.run(1, 4, 2, '通过', '同意，请生产部安排制作', '2026-06-28 09:32:00');
aprStmt.run(2, 6, 1, '提交', '提交申请', '2026-06-27 14:30:00');
aprStmt.run(2, 4, 2, '通过', '批准', '2026-06-28 10:00:00');

// Satisfaction for completed request
const satStmt = db.prepare('INSERT INTO satisfaction (request_id, rating, tags, comment) VALUES (?,?,?,?)');
satStmt.run(3, 5, '准时,质量好', '样品检测结果符合预期，效率高');

// Notifications
const notStmt = db.prepare('INSERT INTO notifications (user_id, title, content, type, target_type, target_id, is_read) VALUES (?,?,?,?,?,?,?)');
notStmt.run(3, '样品制作完成', 'ABS改性材料测试样已制作完成，请及时签收', 'success', 'request', 1, 0);
notStmt.run(6, '审批已通过', '铝合金型材试样审批已通过', 'success', 'request', 2, 1);
notStmt.run(4, '待审批提醒', 'PCB样板（4层）申请待您审批', 'info', 'request', 4, 0);
notStmt.run(4, '待审批提醒', '包装彩盒样品申请待您审批', 'info', 'request', 5, 0);

console.log('Seed data inserted successfully!');
console.log('Test accounts:');
console.log('  Admin:     admin@company.com / 123456');
console.log('  Approver:  wang@company.com / 123456');
console.log('  Applicant: zhang@company.com / 123456');
console.log('  Operator:  li@company.com / 123456');
