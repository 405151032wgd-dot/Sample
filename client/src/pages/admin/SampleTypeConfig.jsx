import React, { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, Select, message, Space, Popconfirm, Tag } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { getSampleTypes, createSampleType, deleteSampleType } from '../../api';

export default function SampleTypeConfig() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm();

  const loadData = async () => {
    try { const d = await getSampleTypes(); setData(d.list); } catch {}
    finally { setLoading(false); }
  };

  useEffect(() => { loadData(); }, []);

  const handleCreate = async () => {
    const values = await form.validateFields();
    try {
      await createSampleType(values);
      message.success('创建成功');
      setModalOpen(false);
      form.resetFields();
      loadData();
    } catch (err) { message.error(err.response?.data?.error || '失败'); }
  };

  const handleDelete = async (id) => {
    try { await deleteSampleType(id); message.success('已删除'); loadData(); }
    catch { message.error('删除失败'); }
  };

  const columns = [
    { title: '名称', dataIndex: 'name' },
    { title: '分类', dataIndex: 'category', render: v => <Tag>{v || '-'}</Tag> },
    { title: '默认单位', dataIndex: 'unit' },
    { title: '状态', dataIndex: 'is_active', render: v => v ? <Tag color="green">启用</Tag> : <Tag color="red">停用</Tag> },
    { title: '操作', render: (_, r) => <Popconfirm title="确认删除？" onConfirm={() => handleDelete(r.id)}><Button type="link" size="small" danger>删除</Button></Popconfirm> },
  ];

  return (
    <div>
      <div className="page-header" style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <h2>样品类型管理</h2>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>添加类型</Button>
      </div>

      <Table dataSource={data} columns={columns} rowKey="id" loading={loading} pagination={false} />

      <Modal title="添加样品类型" open={modalOpen} onCancel={() => setModalOpen(false)} onOk={handleCreate}>
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="名称" rules={[{ required: true }]}>
            <Input placeholder="如：研发测试样品" />
          </Form.Item>
          <Form.Item name="category" label="分类">
            <Input placeholder="如：研发类、业务类" />
          </Form.Item>
          <Form.Item name="unit" label="默认单位">
            <Select>
              {['件','套','米','克','千克','个','片'].map(u => <Select.Option key={u} value={u}>{u}</Select.Option>)}
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
