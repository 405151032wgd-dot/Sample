import React, { useState, useEffect } from 'react';
import { Card, Form, Switch, Select, Checkbox, InputNumber, Button, message, Spin, Space } from 'antd';
import { getQuerySettings, updateQuerySettings } from '../../api';

export default function QuerySettings() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getQuerySettings().then(data => {
      form.setFieldsValue({
        enabled: data.enabled === "true",
        methods: (data.methods || "no,company_phone").split(",").filter(Boolean),
        display_fields: (data.display_fields || "basic_info,items,tracking").split(",").filter(Boolean),
        rate_limit: Number(data.rate_limit) || 10,
      });
    }).catch(() => {}).finally(() => setLoading(false));
  }, [form]);

  const onFinish = async (values) => {
    setSaving(true);
    try {
      await updateQuerySettings({
        enabled: values.enabled ? "true" : "false",
        methods: (values.methods || []).join(","),
        display_fields: (values.display_fields || []).join(","),
        rate_limit: String(values.rate_limit || 10),
      });
      message.success("保存成功");
    } catch { message.error("保存失败"); }
    finally { setSaving(false); }
  };

  if (loading) return <Spin size="large" style={{ display: "block", margin: "100px auto" }} />;

  return (
    <div>
      <div className="page-title-bar"><h2>查询设置</h2><p>配置前台「查询申请」功能的行为和展示</p></div>
      <Card style={{ maxWidth: 720 }}>
        <Form form={form} layout="vertical" onFinish={onFinish}>
          <Form.Item name="enabled" label="公开查询" valuePropName="checked">
            <Switch checkedChildren="开启" unCheckedChildren="关闭" />
          </Form.Item>
          <div style={{ fontSize: 12, color: "#9ca3af", marginTop: -12, marginBottom: 20 }}>
            关闭后前台查询页面提示"查询功能暂不可用"
          </div>
          <Form.Item name="methods" label="允许的查询方式" rules={[{ required: true, message: "请至少选择一种" }]}>
            <Checkbox.Group>
              <Space direction="vertical">
                <Checkbox value="no">按申请编号查询</Checkbox>
                <Checkbox value="company_phone">按公司名称 + 联系方式查询</Checkbox>
              </Space>
            </Checkbox.Group>
          </Form.Item>
          <Form.Item name="display_fields" label="查询结果显示字段" rules={[{ required: true, message: "请至少选择一项" }]}>
            <Checkbox.Group>
              <Space direction="vertical">
                <Checkbox value="basic_info">基本信息（编号、标题、状态、提交时间）</Checkbox>
                <Checkbox value="items">产品清单</Checkbox>
                <Checkbox value="tracking">进度追踪</Checkbox>
                <Checkbox value="attachments">附件列表</Checkbox>
              </Space>
            </Checkbox.Group>
          </Form.Item>
          <Form.Item name="rate_limit" label="每分钟查询次数限制">
            <InputNumber min={1} max={100} style={{ width: 120 }} />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={saving}>保存设置</Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
