import React, { useState, useEffect, useMemo } from 'react';
import { Form, Input, InputNumber, Select, DatePicker, Button, Card, message, Space, Switch, Radio, Tag, Row, Col } from 'antd';
import { useNavigate } from 'react-router-dom';
import { createRequest, getSampleTypes, getIndustries, getIndustryFields } from '../api';
import dayjs from 'dayjs';

const { TextArea } = Input;

// Field type component map
const fieldTypeComponents = {
  text: ({ field, value, onChange }) => (
    <Input placeholder={field.placeholder || `请输入${field.field_label}`} value={value}
      onChange={e => onChange(e.target.value)} />
  ),
  textarea: ({ field, value, onChange }) => (
    <TextArea rows={2} placeholder={field.placeholder || `请输入${field.field_label}`}
      value={value} onChange={e => onChange(e.target.value)} />
  ),
  number: ({ field, value, onChange }) => (
    <InputNumber style={{ width: '100%' }}
      placeholder={field.placeholder || `请输入${field.field_label}`}
      value={value} onChange={onChange} />
  ),
  date: ({ field, value, onChange }) => (
    <DatePicker style={{ width: '100%' }}
      value={value ? dayjs(value) : null}
      onChange={d => onChange(d ? d.format('YYYY-MM-DD') : '')} />
  ),
  boolean: ({ field, value, onChange }) => (
    <Switch checkedChildren="是" unCheckedChildren="否"
      checked={value === 'true' || value === true}
      onChange={v => onChange(String(v))} />
  ),
  select: ({ field, value, onChange }) => {
    const options = (field.options || '').split('|').filter(Boolean);
    return (
      <Select value={value || undefined} onChange={onChange}
        placeholder={field.placeholder || '请选择'} allowClear style={{ width: '100%' }}>
        {options.map(o => <Select.Option key={o} value={o}>{o}</Select.Option>)}
      </Select>
    );
  },
};

export default function NewRequest() {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const [sampleTypes, setSampleTypes] = useState([]);
  const [industries, setIndustries] = useState([]);
  const [industryFields, setIndustryFields] = useState([]);
  const [fieldValues, setFieldValues] = useState({});
  const [loading, setLoading] = useState(false);
  const [selectedIndustry, setSelectedIndustry] = useState(null);
  const [initLoading, setInitLoading] = useState(true);

  useEffect(() => {
    Promise.all([getSampleTypes(), getIndustries()]).then(([st, ind]) => {
      setSampleTypes(st.list);
      setIndustries(ind.list);
      // Auto-select first industry as default
      if (ind.list.length > 0) {
        handleIndustryChange(ind.list[0].id);
      }
    }).catch(() => {}).finally(() => setInitLoading(false));
  }, []);

  // Load industry-specific fields
  const handleIndustryChange = async (industryId) => {
    setSelectedIndustry(industryId);
    setFieldValues({});
    if (industryId) {
      try {
        const d = await getIndustryFields(industryId);
        setIndustryFields(d.list.filter(f => f.is_active));
        // Auto-fill default values
        const defaults = {};
        d.list.filter(f => f.is_active).forEach(f => {
          if (f.default_value) defaults[f.field_key] = f.default_value;
        });
        if (Object.keys(defaults).length > 0) setFieldValues(defaults);
      } catch { setIndustryFields([]); }
    } else {
      setIndustryFields([]);
    }
  };

  const handleFieldValueChange = (key, value) => {
    setFieldValues(prev => ({ ...prev, [key]: value }));
  };

  const renderDynamicField = (field) => {
    const Comp = fieldTypeComponents[field.field_type] || fieldTypeComponents.text;
    return (
      <Comp
        field={field}
        value={fieldValues[field.field_key]}
        onChange={(v) => handleFieldValueChange(field.field_key, v)}
      />
    );
  };

  const onFinish = async (values) => {
    if (!selectedIndustry) {
      message.warning('请先选择所属行业');
      return;
    }
    // Validate required industry fields
    for (const f of industryFields) {
      if (f.required && (!fieldValues[f.field_key] || fieldValues[f.field_key] === '')) {
        message.warning(`请填写行业专属字段：${f.field_label}`);
        return;
      }
    }
    setLoading(true);
    try {
      const data = await createRequest({
        ...values,
        expected_date: values.expected_date.format('YYYY-MM-DD'),
        quantity: values.quantity || 1,
        industry_id: selectedIndustry,
        field_values: fieldValues,
      });
      message.success('提交成功！');
      navigate(`/requests/${data.id}`);
    } catch (err) {
      message.error(err.response?.data?.error || '提交失败');
    } finally {
      setLoading(false);
    }
  };

  // Group industries for visual selection
  const industryOptions = useMemo(() => [
    { label: '制造与工程', value: 'manufacturing', children: ['精密制造/机械加工', '电子/半导体', '汽车零部件', '建材/五金'] },
    { label: '材料与化工', value: 'material', children: ['化工/新材料', '医疗器械'] },
    { label: '消费品与民生', value: 'consumer', children: ['消费品/日化', '食品/农产品', '纺织/服装'] },
  ], []);

  const selectedIndustryData = industries.find(i => i.id === selectedIndustry);

  if (initLoading) return <div style={{ textAlign:'center', padding:80 }}>加载中...</div>;

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <div className="page-header">
        <h2>新建样品申请</h2>
        <p style={{ color: '#666', marginTop: 4 }}>先选择所属行业，系统将自动加载该行业的专属申请字段</p>
      </div>

      {/* Step 1: Industry Selection - Visual Cards */}
      <Card title={<span style={{ fontSize:16 }}>第一步：选择所属行业 <span style={{color:'#ff4d4f'}}>*</span></span>}
        style={{ marginBottom: 24, border: selectedIndustry ? '1px solid #d9d9d9' : '1px solid #1677ff' }}>
        <Radio.Group value={selectedIndustry} onChange={e => handleIndustryChange(e.target.value)}
          style={{ width: '100%' }}>
          <Row gutter={[12, 12]}>
            {industries.map(ind => (
              <Col key={ind.id} xs={12} sm={8} md={6}>
                <Card
                  hoverable
                  size="small"
                  onClick={() => handleIndustryChange(ind.id)}
                  style={{
                    cursor: 'pointer',
                    textAlign: 'center',
                    border: selectedIndustry === ind.id ? '2px solid #1677ff' : '1px solid #f0f0f0',
                    background: selectedIndustry === ind.id ? '#f0f5ff' : '#fff',
                    transition: 'all 0.2s',
                  }}
                >
                  <Radio value={ind.id} style={{ display: 'none' }} />
                  <div style={{ fontSize: 13, fontWeight: selectedIndustry === ind.id ? 600 : 400 }}>
                    {ind.name}
                  </div>
                  <div style={{ fontSize: 11, color: '#999', marginTop: 4, lineHeight: 1.3 }}>
                    {ind.description}
                  </div>
                </Card>
              </Col>
            ))}
          </Row>
        </Radio.Group>
      </Card>

      <Form form={form} layout="vertical" onFinish={onFinish}
        initialValues={{ quantity: 1, unit: '件', urgency: '普通' }}>

        {/* Step 2: Industry-specific fields */}
        {selectedIndustry && (
          <Card
            title={<span style={{ fontSize:16 }}>第二步：填写行业专属信息 <span style={{color:'#ff4d4f'}}>*</span></span>}
            extra={<Tag color="blue">{selectedIndustryData?.name}</Tag>}
            style={{ marginBottom: 24, borderLeft: '3px solid #1677ff' }}
          >
            {industryFields.length > 0 ? (
              <Row gutter={[16, 0]}>
                {industryFields.map(field => (
                  <Col key={field.field_key} xs={24} sm={field.field_type === 'textarea' ? 24 : 12}>
                    <Form.Item
                      label={<span>{field.field_label}{field.required ? <span style={{color:'#ff4d4f', marginLeft:4}}>*</span> : null}</span>}
                      required={!!field.required}
                      validateStatus={
                        field.required && (!fieldValues[field.field_key] || fieldValues[field.field_key] === '')
                          ? undefined : undefined
                      }
                    >
                      {renderDynamicField(field)}
                    </Form.Item>
                  </Col>
                ))}
              </Row>
            ) : (
              <div style={{ textAlign: 'center', color: '#999', padding: 16 }}>
                该行业暂未配置专属字段，请联系管理员添加
              </div>
            )}
          </Card>
        )}

        {/* Step 3: Common Information */}
        <Card title={<span style={{ fontSize:16 }}>第三步：填写通用信息</span>} style={{ marginBottom: 24 }}>
          <Row gutter={16}>
            <Col span={24}>
              <Form.Item name="title" label="申请标题" rules={[{ required: true, message: '请输入申请标题' }]}>
                <Input placeholder="请简短概括样品申请内容" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="sample_type_id" label="样品类型" rules={[{ required: true, message: '请选择' }]}>
                <Select placeholder="请选择样品类型">
                  {sampleTypes.map(t => <Select.Option key={t.id} value={t.id}>{t.name}</Select.Option>)}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="specification" label="规格型号">
                <Input placeholder="如：ABS+30%GF, 6061-T6" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="quantity" label="数量" rules={[{ required: true, message: '请输入' }]}>
                <InputNumber min={0.01} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="unit" label="单位">
                <Select style={{ width: '100%' }}>
                  {['件','套','米','克','千克','个','片','卷','根'].map(u =>
                    <Select.Option key={u} value={u}>{u}</Select.Option>
                  )}
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="urgency" label="紧急程度">
                <Select style={{ width: '100%' }}>
                  <Select.Option value="普通">普通</Select.Option>
                  <Select.Option value="紧急">紧急</Select.Option>
                  <Select.Option value="特急">特急</Select.Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="purpose" label="用途说明" rules={[{ required: true, message: '请输入用途说明' }]}>
                <TextArea rows={3} placeholder="研发测试 / 客户演示 / 来料复检 / …" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="remark" label="其他要求/备注">
                <TextArea rows={3} placeholder="其他需要说明的内容" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="expected_date" label="期望完成日期" rules={[{ required: true, message: '请选择日期' }]}>
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="project_code" label="项目编号">
                <Input placeholder="如：PRJ-2026-089" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="cost_center" label="成本中心">
                <Input placeholder="如：R&D-003" />
              </Form.Item>
            </Col>
          </Row>
        </Card>

        {/* Submit */}
        <div style={{ textAlign: 'center', padding: 24, background: '#fafafa', borderRadius: 8 }}>
          <Space size={24}>
            <Button size="large" onClick={() => navigate(-1)}>取消</Button>
            <Button type="primary" htmlType="submit" loading={loading} size="large"
              style={{ minWidth: 160, height: 44 }}>
              提交申请
            </Button>
          </Space>
        </div>
      </Form>
    </div>
  );
}
