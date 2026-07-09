import React, { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, Select, Switch, message, Space, Popconfirm, Tag, Card, Row, Col } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SettingOutlined } from '@ant-design/icons';
 import { getIndustries, createIndustry, updateIndustry, deleteIndustry, getIndustryFields, createIndustryField, deleteIndustryField, updateIndustryField, setDefaultIndustry } from '../../api';

const FIELD_TYPES = [
  { value: 'text', label: '文本' },
  { value: 'textarea', label: '多行文本' },
  { value: 'select', label: '下拉选择' },
  { value: 'number', label: '数字' },
  { value: 'date', label: '日期' },
  { value: 'boolean', label: '开关' },
];

export default function IndustryManagement() {
  const [industries, setIndustries] = useState([]);
  const [loading, setLoading] = useState(true);
 const [indModal, setIndModal] = useState({ open: false });
 const [editIndustry, setEditIndustry] = useState(null);
  const [defaultIndustryId, setDefaultIndustryId] = useState(null);
  const [fieldsModal, setFieldsModal] = useState({ open: false, industry: null, fields: [] });
 const [fieldModal, setFieldModal] = useState({ open: false, editField: null });
  const [searchText, setSearchText] = useState('');
  const [form] = Form.useForm();
  const [fieldForm] = Form.useForm();
  const [fieldsLoading, setFieldsLoading] = useState(false);

  const loadIndustries = async () => {
    try {
      const d = await getIndustries();
      let list = d.list;
      try {
        const def = await (await fetch('/api/admin/settings')).json();
        const did = Number(def.default_industry_id) || null;
        setDefaultIndustryId(did);
        if (did) {
          const idx = list.findIndex(i => i.id === did);
          if (idx > 0) {
            const item = list.splice(idx, 1)[0];
            list.unshift(item);
          }
        }
      } catch {}
      setIndustries(list);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { loadIndustries(); }, []);

 const handleCreateIndustry = async () => {
   const values = await form.validateFields();
   try {
     if (editIndustry) {
       await updateIndustry(editIndustry.id, values);
       message.success('行业更新成功');
     } else {
       await createIndustry(values);
       message.success('行业创建成功');
     }
     setIndModal({ open: false });
     setEditIndustry(null);
     form.resetFields();
     loadIndustries();
   } catch (err) { message.error(err.response?.data?.error || '失败'); }
 };

 const openEditIndustry = (ind) => {
   setEditIndustry(ind);
   form.setFieldsValue({
     name: ind.name,
     description: ind.description || '',
     icon: ind.icon || '',
   });
   setIndModal({ open: true });
 };

 const openAddIndustry = () => {
   setEditIndustry(null);
   form.resetFields();
   setIndModal({ open: true });
 };

  const handleDeleteIndustry = async (id) => {
    try { await deleteIndustry(id); message.success('已删除'); loadIndustries(); }
    catch { message.error('删除失败'); }
  };

  const showFields = async (ind) => {
    setFieldsLoading(true);
    setFieldsModal({ open: true, industry: ind, fields: [] });
    try {
      const d = await getIndustryFields(ind.id);
      setFieldsModal(prev => ({ ...prev, fields: d.list.filter(f => f.is_active) }));
    } catch {}
    setFieldsLoading(false);
  };

  const openAddField = () => {
    setFieldModal({ open: true, editField: null });
    fieldForm.resetFields();
  };

  const openEditField = (f) => {
    setFieldModal({ open: true, editField: f });
    fieldForm.setFieldsValue({
      field_label: f.field_label,
      field_type: f.field_type,
      options: f.options,
      placeholder: f.placeholder,
      default_value: f.default_value,
      required: !!f.required,
      sort_order: f.sort_order,
    });
  };

  const handleSaveField = async () => {
    const values = await fieldForm.validateFields();
    try {
      if (fieldModal.editField) {
        await updateIndustryField(fieldModal.editField.id, values);
        message.success('字段更新成功');
      } else {
        await createIndustryField({ ...values, industry_id: fieldsModal.industry.id });
        message.success('字段添加成功');
      }
      setFieldModal({ open: false });
      showFields(fieldsModal.industry);
    } catch (err) { message.error(err.response?.data?.error || '失败'); }
  };

  const handleDeleteField = async (id) => {
    try { await deleteIndustryField(id); message.success('字段已删除'); showFields(fieldsModal.industry); }
    catch { message.error('删除失败'); }
  };

  const fieldTypeRender = (type) => {
    const t = FIELD_TYPES.find(x => x.value === type);
    return t ? t.label : type;
  };

  const indColumns = [
    { title: '行业名称', dataIndex: 'name', width: 160, ellipsis: true,
      render: (t, r) => <span>{r.icon ? <span style={{marginRight:6}}>{r.icon}</span> : null}{t}</span>
    },
    { title: '描述', dataIndex: 'description', width: '55%', ellipsis: true },
     { title: '操作', width: 340,
     render: (_, r) => (
       <Space>
         <Button size="small" icon={<EditOutlined />} onClick={() => openEditIndustry(r)}>编辑</Button>
         <Button type="primary" size="small" icon={<SettingOutlined />} onClick={() => showFields(r)}>配置字段</Button>
          {defaultIndustryId === r.id ? (
            <Tag color="blue">默认</Tag>
          ) : (
            <Button type="primary" ghost size="small" onClick={() => { setDefaultIndustry(r.id).then(() => { message.success('已设为默认'); loadIndustries(); }); }}>设为默认</Button>
          )}
          <Popconfirm title="确认删除此行业？" onConfirm={() => handleDeleteIndustry(r.id)}>
            <Button size="small" danger icon={<DeleteOutlined />}>删除</Button>
          </Popconfirm>
        </Space>
      )
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>行业管理</h2>
        <Space>
          <Input.Search placeholder="搜索行业名称" allowClear value={searchText}
            onChange={e => setSearchText(e.target.value)}
            onSearch={v => setSearchText(v)}
            style={{ width: 240 }} />
          <Button type="primary" icon={<PlusOutlined />} onClick={openAddIndustry}>添加行业</Button>
        </Space>
      </div>

      <Table dataSource={industries.filter(ind => !searchText || ind.name.includes(searchText) || (ind.description || '').includes(searchText))}
        columns={indColumns} rowKey="id" loading={loading}
        pagination={{ pageSize: 10, showSizeChanger: false, showTotal: t => `共 ${t} 条` }}
        locale={{ emptyText: '暂无行业，请添加' }} />

      {/* Add Industry Modal */}
      <Modal title={editIndustry ? '编辑行业' : '添加行业'} open={indModal.open} onCancel={() => { setIndModal({ open: false }); setEditIndustry(null); form.resetFields(); }} onOk={handleCreateIndustry}>
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="行业名称" rules={[{ required: true, message: '请输入行业名称' }]}>
            <Input placeholder="如：精密制造/机械加工" />
          </Form.Item>
          <Form.Item name="description" label="描述">
           <Input.TextArea rows={2} placeholder="简要描述该行业的样品申请特点" />
          </Form.Item>
          <Form.Item name="icon" label="图标">
            <Input placeholder="输入 Emoji 图标，如 🚗🔩⚙️" />
          </Form.Item>
        </Form>
      </Modal>

      {/* Field Configuration Modal */}
      <Modal title={`字段配置 - ${fieldsModal.industry?.name || ''}`}
        open={fieldsModal.open}
        onCancel={() => setFieldsModal({ ...fieldsModal, open: false })}
        footer={null} width={960}>
        <Button type="primary" icon={<PlusOutlined />} onClick={openAddField} style={{ marginBottom: 16 }}>
          添加字段
        </Button>
        <Table dataSource={fieldsModal.fields} rowKey="id" loading={fieldsLoading}
          pagination={false} locale={{ emptyText: '暂未配置字段' }}
          columns={[
            { title: '字段标签', dataIndex: 'field_label' },
            { title: '字段键名', dataIndex: 'field_key', width: 130 },
            { title: '类型', dataIndex: 'field_type', width: 90, render: fieldTypeRender },
            { title: '必填', dataIndex: 'required', width: 60, render: v => v ? <Tag color="red">是</Tag> : <Tag>否</Tag> },
            { title: '排序', dataIndex: 'sort_order', width: 60 },
            { title: '提示', dataIndex: 'placeholder', ellipsis: true },
            { title: '默认值', dataIndex: 'default_value', ellipsis: true },
            { title: '操作', width: 170,
              render: (_, f) => (
                <Space>
                  <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openEditField(f)}>编辑</Button>
                  <Popconfirm title="确认删除？" onConfirm={() => handleDeleteField(f.id)}>
                    <Button type="link" size="small" danger icon={<DeleteOutlined />}>删除</Button>
                  </Popconfirm>
                </Space>
              )
            },
          ]}
        />
      </Modal>

      {/* Add/Edit Field Modal */}
      <Modal title={fieldModal.editField ? '编辑字段' : '添加字段'}
        open={fieldModal.open}
        onCancel={() => setFieldModal({ open: false })}
        onOk={handleSaveField}
        okText={fieldModal.editField ? '保存' : '添加'}
        width={640}>
        <Form form={fieldForm} layout="vertical">
          {!fieldModal.editField && (
            <Form.Item name="field_key" label="字段键名" rules={[{ required: true }]}
              tooltip="英文标识，用于数据存储，如 material_grade">
              <Input placeholder="material_grade" />
            </Form.Item>
          )}
          <Form.Item name="field_label" label="字段标签" rules={[{ required: true }]}>
            <Input placeholder="如：材料牌号" />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="field_type" label="字段类型" rules={[{ required: true }]}>
                <Select placeholder="请选择">
                  {FIELD_TYPES.map(t => <Select.Option key={t.value} value={t.value}>{t.label}</Select.Option>)}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="required" label="是否必填" valuePropName="checked">
                <Switch checkedChildren="必填" unCheckedChildren="选填" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="options" label="选项（下拉选择类型用）" tooltip="仅 select 类型需要，用 | 分隔选项">
            <Input placeholder="选项1|选项2|选项3" />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="placeholder" label="占位提示">
                <Input placeholder="输入框下方的提示文字" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="default_value" label="默认值">
                <Input placeholder="填写默认值（可选）" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="sort_order" label="排序" tooltip="数字越小越靠前">
            <Input type="number" placeholder="0" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
