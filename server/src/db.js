import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, '..', 'data', 'sample_requests.db');

let db;

export function getDb() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    initSchema(db);
  }
  return db;
}

function initSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS departments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      parent_id INTEGER REFERENCES departments(id),
      manager_id INTEGER,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      department_id INTEGER REFERENCES departments(id),
      role TEXT NOT NULL DEFAULT 'applicant' CHECK(role IN ('applicant','approver','operator','admin','super_admin')),
      email TEXT UNIQUE,
      phone TEXT,
      password_hash TEXT NOT NULL DEFAULT 'e10adc3949ba59abbe56e057f20f883e',
      is_active INTEGER NOT NULL DEFAULT 1,
      avatar_url TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS sample_types (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      category TEXT,
      unit TEXT NOT NULL DEFAULT '件',
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS sample_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      request_no TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      sample_type_id INTEGER NOT NULL REFERENCES sample_types(id),
      specification TEXT,
      quantity REAL NOT NULL DEFAULT 1,
      unit TEXT NOT NULL DEFAULT '件',
      purpose TEXT NOT NULL,
      expected_date DATE NOT NULL,
      urgency TEXT NOT NULL DEFAULT '普通' CHECK(urgency IN ('普通','紧急','特急')),
       status TEXT NOT NULL DEFAULT '草稿' CHECK(status IN ('草稿','待审批','已驳回','已批准','制作中','已发货','已完成','已签收','已取消')),
      priority INTEGER NOT NULL DEFAULT 0,
      applicant_id INTEGER NOT NULL REFERENCES users(id),
      current_approver_id INTEGER REFERENCES users(id),
      project_code TEXT,
      cost_center TEXT,
      remark TEXT,
      industry_id INTEGER REFERENCES industries(id),
      applicant_company TEXT,
      applicant_name TEXT,
      applicant_title TEXT,
      applicant_phone TEXT,
      applicant_email TEXT,
      applicant_address TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP    );

    CREATE TABLE IF NOT EXISTS sample_request_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      request_id INTEGER NOT NULL REFERENCES sample_requests(id) ON DELETE CASCADE,
      sample_type_id INTEGER NOT NULL REFERENCES sample_types(id),
      specification TEXT DEFAULT '',
      quantity REAL NOT NULL DEFAULT 1,
      unit TEXT NOT NULL DEFAULT '件',
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_request_items_request ON sample_request_items(request_id);

    CREATE TABLE IF NOT EXISTS attachments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      request_id INTEGER NOT NULL REFERENCES sample_requests(id),
      filename TEXT NOT NULL,
      filepath TEXT NOT NULL,
      file_size INTEGER,
      uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS approval_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      request_id INTEGER NOT NULL REFERENCES sample_requests(id),
      approver_id INTEGER NOT NULL REFERENCES users(id),
      level INTEGER NOT NULL DEFAULT 1,
      action TEXT NOT NULL CHECK(action IN ('提交','通过','驳回','退回修改','转交')),
      comment TEXT,
      signed_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS sample_tracking (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      request_id INTEGER NOT NULL REFERENCES sample_requests(id),
      from_status TEXT,
      to_status TEXT NOT NULL,
      operator_id INTEGER NOT NULL REFERENCES users(id),
      remark TEXT,
      operated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS workflows (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      description TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS workflow_nodes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      workflow_id INTEGER NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
      node_name TEXT NOT NULL,
      step_order INTEGER NOT NULL,
      approver_type TEXT NOT NULL CHECK(approver_type IN ('指定人','部门主管','上级部门主管','角色')),
      approver_id INTEGER REFERENCES users(id),
      role_id TEXT,
      timeout_hours INTEGER DEFAULT 48,
      timeout_action TEXT DEFAULT 'remind' CHECK(timeout_action IN ('remind','escalate','auto_pass')),
      pass_rule TEXT DEFAULT 'any' CHECK(pass_rule IN ('any','all')),
      conditions TEXT
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      title TEXT NOT NULL,
      content TEXT,
      type TEXT NOT NULL DEFAULT 'info',
      is_read INTEGER NOT NULL DEFAULT 0,
      target_type TEXT,
      target_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS satisfaction (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      request_id INTEGER NOT NULL REFERENCES sample_requests(id),
      rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),
      tags TEXT,
      comment TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER REFERENCES users(id),
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id INTEGER,
      old_value TEXT,
      new_value TEXT,
      ip_address TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS system_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );


    CREATE TABLE IF NOT EXISTS industries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      description TEXT,
      icon TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS industry_field_configs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      industry_id INTEGER NOT NULL REFERENCES industries(id) ON DELETE CASCADE,
      field_key TEXT NOT NULL,
      field_label TEXT NOT NULL,
      field_type TEXT NOT NULL DEFAULT 'text' CHECK(field_type IN ('text','textarea','select','number','date','file','boolean')),
      options TEXT,
      required INTEGER NOT NULL DEFAULT 0,
      placeholder TEXT,
      default_value TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS sample_request_field_values (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      request_id INTEGER NOT NULL REFERENCES sample_requests(id) ON DELETE CASCADE,
      field_key TEXT NOT NULL,
      field_value TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Indexes
    CREATE INDEX IF NOT EXISTS idx_requests_status ON sample_requests(status);
    CREATE INDEX IF NOT EXISTS idx_requests_applicant ON sample_requests(applicant_id);
    CREATE INDEX IF NOT EXISTS idx_requests_created ON sample_requests(created_at);
    CREATE INDEX IF NOT EXISTS idx_tracking_request ON sample_tracking(request_id);
    CREATE INDEX IF NOT EXISTS idx_approvals_request ON approval_records(request_id);
    CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at);
    CREATE INDEX IF NOT EXISTS idx_field_configs_industry ON industry_field_configs(industry_id);
    CREATE INDEX IF NOT EXISTS idx_field_values_request ON sample_request_field_values(request_id);
  `);
}

export default getDb;
