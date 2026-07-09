import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Tag, Spin, Empty, Form, Input, InputNumber, Select, DatePicker, Button, message, Modal, Upload, Steps } from 'antd';
import { PlusOutlined, DeleteOutlined, UploadOutlined, InboxOutlined, CheckCircleFilled } from '@ant-design/icons';
 import { getDefaultIndustry, getIndustryFields, getSampleTypes, createRequest, uploadAttachments, getFrontSettings } from '../api';
import dayjs from 'dayjs';

const { TextArea } = Input;

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
    <span><Tag style={{ cursor: 'pointer', userSelect: 'none' }}
      color={value === 'true' || value === true ? 'green' : 'default'}
      onClick={() => onChange(value === 'true' || value === true ? 'false' : 'true')}>
      {value === 'true' || value === true ? '是' : '否'}
    </Tag></span>
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

// TEST_WRITE_OK
function _testMarker() { console.log("TEST_WRITE_OK"); }

export default function SampleDisplay() {
  const [form] = Form.useForm();
  const [industry, setIndustry] = useState(null);
  const [fields, setFields] = useState([]);
  const [fieldValues, setFieldValues] = useState({});
  const [showDraftModal, setShowDraftModal] = useState(false);
  const [sampleTypes, setSampleTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [fileList, setFileList] = useState([]);
  const [successModal, setSuccessModal] = useState({ open: false, requestNo: '' });
  const [layoutMode, setLayoutMode] = useState('standard');
  const [currentStep, setCurrentStep] = useState(1);

   const stepNames = ['技术信息', '基本信息', '产品清单', '申请人', '确认'];
  useEffect(() => {
    Promise.all([getDefaultIndustry(), getSampleTypes(), getFrontSettings()]).then(async ([indData, typeData, settings]) => {
      setSampleTypes(typeData.list);
      setLayoutMode(settings?.front_layout_mode || 'standard');
      const ind = indData.industry;
      setIndustry(ind);
      if (ind && indData.fields) {
        const active = indData.fields.filter(f => f.is_active);
        setFields(active);
        const defaults = {};
        active.forEach(f => { if (f.default_value) defaults[f.field_key] = f.default_value; });
        setFieldValues(defaults);
      }
      // Check for saved draft
      const saved = localStorage.getItem('sample_draft');
      if (saved) {
        try {
          const draft = JSON.parse(saved);
          if (draft && draft.savedAt) {
            setShowDraftModal(true);
          }
        } catch {}
      }
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const handleFieldChange = async (key, value) => {
    setFieldValues(prev => ({ ...prev, [key]: value }));
  };

  const saveDraft = () => {
    const formData = form.getFieldsValue();
    const draft = {
      savedAt: new Date().toISOString(),
      industryId: industry?.id,
      fieldValues,
      formData,
    };
    localStorage.setItem('sample_draft', JSON.stringify(draft));
    message.success('草稿已保存');
  };

  const restoreDraft = () => {
    const saved = localStorage.getItem('sample_draft');
    if (!saved) return;
    try {
      const draft = JSON.parse(saved);
      setShowDraftModal(false);
      setFieldValues(draft.fieldValues || {});
      // Restore form fields
      const f = draft.formData || {};
      const vals = {};
      if (f.items) vals.items = f.items;
      if (f.title) vals.title = f.title;
      if (f.urgency) vals.urgency = f.urgency;
      if (f.expected_date) vals.expected_date = dayjs(f.expected_date);
      if (f.purpose) vals.purpose = f.purpose;
      if (f.remark) vals.remark = f.remark;
      if (f.applicant_company) vals.applicant_company = f.applicant_company;
      if (f.applicant_name) vals.applicant_name = f.applicant_name;
      if (f.applicant_title) vals.applicant_title = f.applicant_title;
      if (f.applicant_phone) vals.applicant_phone = f.applicant_phone;
      if (f.applicant_email) vals.applicant_email = f.applicant_email;
      if (f.applicant_address) vals.applicant_address = f.applicant_address;
      form.setFieldsValue(vals);
      message.success('草稿已恢复');
    } catch {}
  };

  const clearDraft = () => {
    localStorage.removeItem('sample_draft');
    setShowDraftModal(false);
    message.info('草稿已删除');
  };



  const renderField = (field) => {
    const Comp = fieldTypeComponents[field.field_type] || fieldTypeComponents.text;
    return (
      <Comp field={field} value={fieldValues[field.field_key]}
        onChange={(v) => handleFieldChange(field.field_key, v)} />
    );
  };

  const nextStep = async () => {
    if (currentStep === 1) {
      for (const f of fields) {
        if (f.required && (!fieldValues[f.field_key] || fieldValues[f.field_key] === '')) {
          message.warning(`请填写：${f.field_label}`);
          return;
        }
      }
    } else if (currentStep === 4) {
      try { await form.validateFields(['title', 'expected_date', 'purpose']); }
      catch { return; }
    } else if (currentStep === 4) {
      const items = form.getFieldValue('items');
      if (!items || items.length === 0) { message.warning('请至少添加一个产品项目'); return; }
    } else if (currentStep === 4) {
      try { await form.validateFields(['applicant_company', 'applicant_name', 'applicant_phone']); }
      catch { return; }
    }
    setCurrentStep(prev => Math.min(prev + 1, 5));
  };
  const prevStep = () => setCurrentStep(prev => Math.max(prev - 1, 1));

  const onFinish = async (values) => {
    if (!industry) { message.warning('行业未加载'); return; }

    // Validate industry-specific fields
    for (const f of fields) {
      if (f.required && (!fieldValues[f.field_key] || fieldValues[f.field_key] === '')) {
        message.warning(`请填写：${f.field_label}`);
        return;
      }
    }

    // Validate at least one item
    if (!values.items || values.items.length === 0) {
      message.warning('请至少添加一个产品项目');
      return;
    }

    setSubmitting(true);
    try {
      const submitData = {
        title: values.title,
        items: values.items.map(item => ({
          sample_type_id: item.sample_type_id,
          specification: item.specification || '',
          quantity: item.quantity || 1,
          unit: item.unit || '件',
        })),
        purpose: values.purpose,
        expected_date: values.expected_date.format('YYYY-MM-DD'),
        urgency: values.urgency || '普通',
        remark: values.remark || '',
        industry_id: industry.id,
        field_values: fieldValues,
        applicant_company: values.applicant_company,
        applicant_name: values.applicant_name,
        applicant_title: values.applicant_title,
        applicant_phone: values.applicant_phone,
        applicant_email: values.applicant_email,
        applicant_address: values.applicant_address,
      };
      const result = await createRequest(submitData);

      // Upload files if any
      if (fileList.length > 0) {
        await uploadAttachments(result.id, fileList.map(f => f.originFileObj));
      }

      // Show success with request number
      setSuccessModal({ open: true, requestNo: result.request_no });
      localStorage.removeItem('sample_draft');
      form.resetFields();
      setFieldValues({});
      setFileList([]);
    } catch (err) {
      message.error(err.response?.data?.error || '提交失败');
    } finally { setSubmitting(false); }
  };

  if (loading) return <div style={{ textAlign: 'center', padding: 80 }}><Spin size="large" /></div>;

  return (
    <div>
      {/* Step Indicator - stepper mode */}
      {layoutMode === 'stepper' && (() => {
        const stepNums = [1,2,3,4,5];
        return (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 32, flexWrap: 'wrap' }}>
            {stepNums.map((sn, i) => {
              const active = sn === currentStep;
              const done = sn < currentStep;
              const bg = done ? '#10b981' : active ? 'var(--primary)' : '#fff';
              const txtColor = done ? '#fff' : active ? '#fff' : '#9ca3af';
              const lblColor = done ? '#10b981' : active ? 'var(--primary)' : '#9ca3af';
              const borderCls = (active || done) ? 'none' : '2px solid #d1d5db';
              const icon = done ? '✓' : sn;
              return (
                <React.Fragment key={i}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 600, flexShrink: 0, border: borderCls, background: bg, color: txtColor, transition: 'all 0.2s' }}>
                      {icon}
                    </div>
                    <span style={{ fontSize: 12, color: lblColor, fontWeight: (done || active) ? 600 : 400 }}>{stepNames[i]}</span>
                  </div>
                  {i < 4 && <div style={{ width: 40, height: 1, borderTop: `2px ${done ? 'solid' : 'dashed'} ${done ? '#10b981' : '#d1d5db'}`, margin: '0 4px' }} />}
                </React.Fragment>
              );
            })}
          </div>
        );
      })()}

      {/* Header */}
      <div style={{ marginBottom: 28, textAlign: 'center' }}>
        <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--fe-text-color)' }}>
          样品申请表
        </div>
       <div style={{ fontSize: 13, color: 'var(--fe-text-muted)', marginTop: 6 }}>
         可申请多个产品，请完整填写后提交
       </div>
        {industry && (
          <div style={{ marginTop: 12 }}>
            <span style={{
              display: 'inline-block', padding: '3px 14px',
              background: 'var(--primary)', color: '#fff',
              borderRadius: 20, fontSize: 13, fontWeight: 500,
              letterSpacing: 0.5,
            }}>
              {industry.name}
            </span>
          </div>
        )}
      </div>

      {/* Draft restore modal */}
      <Modal title="发现保存的草稿" open={showDraftModal}
        onCancel={() => setShowDraftModal(false)} footer={null} closable>
        <p style={{ color: '#666', marginBottom: 20 }}>
          您有一份上次未提交的申请草稿，是否恢复？
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
          <Button onClick={clearDraft}>删除草稿</Button>
          <Button onClick={restoreDraft} type="primary">恢复草稿</Button>
        </div>
      </Modal>


      <Form form={form} layout="vertical" onFinish={onFinish}
        initialValues={{
          items: [{ quantity: 1, unit: '件' }],
          urgency: '普通'
        }}>

        {/* Industry-specific fields - Step 0 */}
        {(layoutMode !== 'stepper' || currentStep === 1) && industry && fields.length > 0 && (
          <Card
            title={<span className="module-title">行业专属信息</span>}
            extra={<Tag color="var(--primary)">{industry.name}</Tag>}
            style={{ marginBottom: 20, borderRadius: 10, boxShadow: '0 1px 3px rgba(0,0,0,0.06)', display: (layoutMode === 'stepper' && currentStep !== 1) ? 'none' : undefined }}>
            <Row gutter={[16, 0]}>
              {fields.map(f => (
                <Col key={f.field_key} xs={24} sm={12}>
                  <Form.Item
                    label={<span>{f.field_label}{f.required ? <span style={{color:'#ff4d4f', marginLeft:4}}>*</span> : null}</span>}
                    required={!!f.required}
                  >
                    {renderField(f)}
                  </Form.Item>
                </Col>
              ))}
            </Row>
          </Card>
        )}

        {/* Basic info - Step 1 */}
        <Card
          title={<span className="module-title">基本信息</span>}
          style={{ marginBottom: 20, borderRadius: 10, boxShadow: '0 1px 3px rgba(0,0,0,0.06)', display: (layoutMode === 'stepper' && currentStep !== 2) ? 'none' : undefined }}>
          <Row gutter={16}>
            <Col span={24}>
              <Form.Item name="title" label="申请标题" rules={[{ required: true, message: '请输入申请标题' }]}>
                <Input placeholder="简要描述本次申请内容，如：XX项目样件申请" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item name="urgency" label="紧急程度">
                <Select>
                  <Select.Option value="普通">普通</Select.Option>
                  <Select.Option value="紧急">紧急</Select.Option>
                  <Select.Option value="特急">特急</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="expected_date" label="期望完成日期" rules={[{ required: true, message: '请选择日期' }]}>
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="purpose" label="用途说明" rules={[{ required: true, message: '请输入用途说明' }]}>
            <TextArea rows={3} placeholder="研发测试 / 客户演示 / 来料复检 / …" />
          </Form.Item>
          <Form.Item name="remark" label="备注">
            <TextArea rows={2} placeholder="其他需要说明的内容（选填）" />
          </Form.Item>
        </Card>

        {/* Product Items — Dynamic List */}
        <Card
          title={<span className="module-title">产品清单</span>}
          extra={<Tag color="orange" style={{ fontSize: 12 }}>可添加多个产品</Tag>}
          style={{ marginBottom: 20, borderRadius: 10, boxShadow: '0 1px 3px rgba(0,0,0,0.06)', display: (layoutMode === 'stepper' && currentStep !== 3) ? 'none' : undefined }}>
          <Form.List name="items" initialValue={[{ quantity: 1, unit: '件' }]}>
            {(items, { add, remove }) => (
              <>
                {items.map(({ key, name, ...rest }, index) => (
                  <div key={key}
                    style={{
                      background: index % 2 === 0 ? '#f9fafb' : '#fff',
                      padding: '16px 16px 0',
                      borderRadius: 8,
                      marginBottom: 12,
                      border: '1px solid #e8e8e8',
                      position: 'relative',
                    }}>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: 8,
                    }}>
                      <Tag color="var(--primary)" style={{ fontSize: 12, fontWeight: 600 }}>
                        产品 {index + 1}
                      </Tag>
                      {items.length > 1 && (
                        <Button
                          type="text"
                          danger
                          size="small"
                          icon={<DeleteOutlined />}
                          onClick={() => remove(name)}
                        >
                          移除
                        </Button>
                      )}
                    </div>
                    <Row gutter={16}>
                      <Col xs={24} sm={8}>
                        <Form.Item
                          {...rest}
                          name={[name, 'sample_type_id']}
                          label="样品类型"
                          rules={[{ required: true, message: '请选择' }]}
                        >
                          <Select placeholder="请选择样品类型">
                            {sampleTypes.map(t => (
                              <Select.Option key={t.id} value={t.id}>{t.name}</Select.Option>
                            ))}
                          </Select>
                        </Form.Item>
                      </Col>
                      <Col xs={24} sm={8}>
                        <Form.Item
                          {...rest}
                          name={[name, 'specification']}
                          label="规格型号"
                        >
                          <Input placeholder="如：6061-T6 50x50mm" />
                        </Form.Item>
                      </Col>
                      <Col xs={12} sm={4}>
                        <Form.Item
                          {...rest}
                          name={[name, 'quantity']}
                          label="数量"
                          rules={[{ required: true, message: '请输入' }]}
                        >
                          <InputNumber min={0.01} style={{ width: '100%' }} placeholder="1" />
                        </Form.Item>
                      </Col>
                      <Col xs={12} sm={4}>
                        <Form.Item
                          {...rest}
                          name={[name, 'unit']}
                          label="单位"
                          rules={[{ required: true, message: '请选择' }]}
                        >
                          <Select placeholder="单位">
                            {['件', '套', '米', '克', '千克', '个', '片', '包', '箱', '批'].map(u => (
                              <Select.Option key={u} value={u}>{u}</Select.Option>
                            ))}
                          </Select>
                        </Form.Item>
                      </Col>
                    </Row>
                  </div>
                ))}
                <Button
                  type="dashed"
                  onClick={() => {
                    add({ quantity: 1, unit: '件' });
                  }}
                  icon={<PlusOutlined />}
                  style={{ width: '100%', height: 48, marginTop: 4, borderStyle: 'dashed' }}
                >
                  添加产品
                </Button>
              </>
            )}
          </Form.List>
        </Card>
        {/* Applicant Info */}
        <Card
         title={<span className="module-title">申请人信息</span>}
          style={{ marginBottom: 20, borderRadius: 10, boxShadow: '0 1px 3px rgba(0,0,0,0.06)', display: (layoutMode === 'stepper' && currentStep !== 4) ? 'none' : undefined }}>
          {layoutMode === 'stepper' && (
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 24, height: 24, borderRadius: '50%', background: 'var(--primary)', color: '#fff', fontSize: 12, fontWeight: 600 }}>4</span>
              申请人信息
            </div>
          )}
          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item name="applicant_company" label="公司名称" rules={[{ required: true, message: '请输入' }]}>
                <Input placeholder="如：××汽车科技有限公司" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="applicant_name" label="姓名" rules={[{ required: true, message: '请输入' }]}>
                <Input placeholder="申请人姓名" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col xs={24} sm={8}>
              <Form.Item name="applicant_title" label="职务">
                <Input placeholder="如：研发工程师" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item name="applicant_phone" label="联系方式" rules={[{ required: true, message: '请输入' }]}>
                <Input placeholder="手机号" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item name="applicant_email" label="邮箱">
                <Input placeholder="Email（选填）" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="applicant_address" label="地址">
            <Input placeholder="公司地址（选填）" />
          </Form.Item>
        </Card>
        {/* Attachments - Step 4 */}
        <Card
          title={<span className="module-title">附件上传</span>}
          extra={<Tag style={{ fontSize: 12 }}>图纸 / 技术文件 / 参考照片</Tag>}
          style={{ marginBottom: 20, borderRadius: 10, boxShadow: '0 1px 3px rgba(0,0,0,0.06)', display: (layoutMode === 'stepper' && currentStep !== 5) ? 'none' : undefined }}>
          <Upload.Dragger
            multiple
            fileList={fileList}
            beforeUpload={(file) => {
              setFileList(prev => [...prev, file]);
              return false;
            }}
            onRemove={(file) => {
              setFileList(prev => prev.filter(f => f.uid !== file.uid || f.name !== file.name));
            }}
            accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.dwg,.dxf,.stp,.step,.igs,.iges"
          >
            <p className="ant-upload-drag-icon">
              <InboxOutlined />
            </p>
            <p className="ant-upload-text">点击或拖拽文件到此区域上传</p>
            <p className="ant-upload-hint">
              支持图纸（DWG/PDF）、技术文档、参考照片等，单个文件不超过 50MB
            </p>
          </Upload.Dragger>
        </Card>



        {/* Stepper navigation */}
        {layoutMode === 'stepper' && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 24 }}>
            {currentStep > 1 && (
              <Button onClick={prevStep}>← 上一步</Button>
            )}
            <div style={{ flex: 1 }} />
            {currentStep < 5 && currentStep > 0 && (
              <Button type="primary" onClick={nextStep}>下一步 →</Button>
            )}
            {currentStep === 5 && (
              <Button type="primary" htmlType="submit" loading={submitting}>提交申请</Button>
            )}
          </div>
        )}

        {/* Success Modal */}
        <Modal
          title={null}
          open={successModal.open}
          footer={null}
          closable={false}
          centered
          width={420}
        >
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <CheckCircleFilled style={{ fontSize: 64, color: '#52c41a', marginBottom: 16 }} />
            <div style={{ fontSize: 20, fontWeight: 600, marginBottom: 8 }}>申请提交成功</div>
            <div style={{ fontSize: 14, color: '#666', marginBottom: 24 }}>
              您的样品申请已成功提交，请妥善保管申请编号以便后续查询
            </div>
            <div style={{
              background: 'var(--fe-page-bg)',
              borderRadius: 8,
              padding: '16px 24px',
              marginBottom: 24,
            }}>
              <div style={{ fontSize: 12, color: '#999', marginBottom: 4 }}>申请编号</div>
              <div style={{
                fontSize: 22,
                fontWeight: 700,
                color: 'var(--fe-primary)',
                letterSpacing: 2,
                fontFamily: 'monospace'
              }}>
                {successModal.requestNo}
              </div>
            </div>
            <Button
              type="primary"
              size="large"
              style={{ minWidth: 160, height: 40, fontSize: 15 }}
              onClick={() => setSuccessModal({ open: false, requestNo: '' })}
            >
              继续申请
            </Button>
          </div>
        </Modal>

        {/* Submit */}
        <div style={{
          textAlign: 'center',
          padding: '28px 0',
          marginTop: 8,
        }}>
          <Button onClick={saveDraft}
            style={{ minWidth: 140, height: 48, fontSize: 15, marginRight: 16, borderRadius: 8 }}>
            保存草稿
          </Button>
          <Button
            type="primary"
            htmlType="submit"
            loading={submitting}
            size="large"
            style={{
              minWidth: 240,
              height: 48,
              fontSize: 16,
              borderRadius: 8,
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            }}
          >
            提交申请
          </Button>
        </div>
      </Form>
    </div>
  );
}
