import React, { useState, useEffect } from 'react';
import { Card, Form, Input, InputNumber, Select, Button, message, Spin, Switch } from 'antd';
import { getSettings, updateSettings } from '../../api';

export default function SystemSettings() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getSettings().then(data => {
      form.setFieldsValue({
        request_no_format: data.request_no_format || 'SY${year}${month}${day}-${seq}',
        max_file_size: Number(data.max_file_size) || 20,
        allowed_file_types: data.allowed_file_types || '.pdf,.dwg,.jpg,.png,.doc,.docx,.xls,.xlsx',
        max_attachments: Number(data.max_attachments) || 5,
        archive_months: Number(data.archive_months) || 12,
      });
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const values = form.getFieldsValue();
      await updateSettings(values);
      message.success('保存成功');
    } catch { message.error('保存失败'); }
    finally { setSaving(false); }
  };

  if (loading) return <Spin style={{ display:'block', margin:'100px auto' }} />;

  return (
    <div style={{ maxWidth: 700, margin: '0 auto' }}>
      <div className="page-header"><h2>系统设置</h2></div>

      <Form form={form} layout="vertical">
        <Card title="编号规则" style={{ marginBottom: 16 }}>
          <Form.Item name="request_no_format" label="申请编号格式">
            <Input placeholder="SY${year}${month}${day}-${seq}" />
          </Form.Item>
          <div style={{ fontSize: 12, color: '#999' }}>变量：${year} ${month} ${day} ${seq}（4位序号）</div>
        </Card>

        <Card title="附件限制" style={{ marginBottom: 16 }}>
          <Form.Item name="max_file_size" label="单文件最大 (MB)">
            <InputNumber min={1} max={100} />
          </Form.Item>
          <Form.Item name="allowed_file_types" label="允许类型">
            <Input placeholder=".pdf,.dwg,.jpg,.png,.doc,.docx,.xls,.xlsx" />
          </Form.Item>
          <Form.Item name="max_attachments" label="单次最多">
            <InputNumber min={1} max={20} />
          </Form.Item>
        </Card>

        <Card title="数据维护" style={{ marginBottom: 16 }}>
          <Form.Item name="archive_months" label="归档策略（月）">
            <InputNumber min={1} max={60} addonAfter="个月后自动归档" style={{ width: 300 }} />
          </Form.Item>
        </Card>

        <div style={{ textAlign: 'center', marginTop: 24 }}>
          <Button type="primary" onClick={handleSave} loading={saving} size="large">保存设置</Button>
        </div>
      </Form>
    </div>
  );
}
