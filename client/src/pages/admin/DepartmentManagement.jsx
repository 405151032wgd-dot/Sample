import React, { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, message, Space } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { getDepartments, createDepartment } from '../../api';

export default function DepartmentManagement() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm();

  const loadData = async () => {
    try { const d = await getDepartments(); setData(d.list); } catch {}
    finally { setLoading(false); }
  };

  useEffect(() => { loadData(); }, []);

  const handleCreate = async () => {
    const values = await form.validateFields();
    try {
      await createDepartment(values);
      message.success('创建成功');
      setModalOpen(false);
      form.resetFields();
      loadData();
    } catch (err) { message.error(err.response?.data?.error || '失败'); }
  };

  const columns = [
    { title: '部门名称', dataIndex: 'name' },
    { title: '负责人', dataIndex: 'manager_name', render: v => v || '-' },
    { title: '排序', dataIndex: 'sort_order' },
  ];

  return (
    <div>
      <div className="page-header" style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <h2>部门管理</h2>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>添加部门</Button>
      </div>

      <Table dataSource={data} columns={columns} rowKey="id" loading={loading} pagination={false} />

      <Modal title="添加部门" open={modalOpen} onCancel={() => setModalOpen(false)} onOk={handleCreate}>
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="部门名称" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
