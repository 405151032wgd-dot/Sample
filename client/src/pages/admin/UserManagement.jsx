import React, { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, Select, message, Space, Tag, Popconfirm } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { getUsers, createUser, updateUser, deleteUser, getDepartments } from '../../api';

export default function UserManagement() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [departments, setDepartments] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [form] = Form.useForm();

  const loadData = async () => {
    try {
      const [u, d] = await Promise.all([getUsers(), getDepartments()]);
      setData(u.list);
      setDepartments(d.list);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { loadData(); }, []);

  const openCreate = () => {
    setEditUser(null);
    form.resetFields();
    setModalOpen(true);
  };

  const openEdit = (user) => {
    setEditUser(user);
    form.setFieldsValue(user);
    setModalOpen(true);
  };

  const handleSave = async () => {
    const values = await form.validateFields();
    try {
      if (editUser) {
        await updateUser(editUser.id, values);
        message.success('更新成功');
      } else {
        await createUser(values);
        message.success('创建成功');
      }
      setModalOpen(false);
      loadData();
    } catch (err) { message.error(err.response?.data?.error || '操作失败'); }
  };

  const handleDelete = async (id) => {
    try {
      await deleteUser(id);
      message.success('已删除');
      loadData();
    } catch { message.error('删除失败'); }
  };

  const columns = [
    { title: '姓名', dataIndex: 'name', width: 100 },
    { title: '部门', dataIndex: 'department_name', width: 100 },
    { title: '角色', dataIndex: 'role', width: 100, render: r => {
      const roleMap = { applicant:'申请人', approver:'审批人', operator:'操作人', admin:'管理员', super_admin:'超级管理员' };
      return <Tag>{roleMap[r] || r}</Tag>;
    }},
    { title: '邮箱', dataIndex: 'email', width: 200 },
    { title: '电话', dataIndex: 'phone', width: 130 },
    { title: '状态', dataIndex: 'is_active', width: 70, render: v => v ? <Tag color="green">正常</Tag> : <Tag color="red">禁用</Tag> },
    { title: '操作', width: 120,
      render: (_, r) => (
        <Space>
          <Button type="link" size="small" onClick={() => openEdit(r)}>编辑</Button>
          <Popconfirm title="确认删除？" onConfirm={() => handleDelete(r.id)}>
            <Button type="link" size="small" danger>删除</Button>
          </Popconfirm>
        </Space>
      )
    },
  ];

  return (
    <div>
      <div className="page-header" style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <h2>用户管理</h2>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>添加用户</Button>
      </div>

      <Table dataSource={data} columns={columns} rowKey="id" loading={loading} pagination={{ pageSize: 20 }} />

      <Modal title={editUser ? '编辑用户' : '添加用户'} open={modalOpen} onCancel={() => setModalOpen(false)} onOk={handleSave} width={500}>
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="姓名" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="email" label="邮箱" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="department_id" label="部门">
            <Select allowClear placeholder="请选择">
              {departments.map(d => <Select.Option key={d.id} value={d.id}>{d.name}</Select.Option>)}
            </Select>
          </Form.Item>
          <Form.Item name="role" label="角色">
            <Select>
              <Select.Option value="applicant">申请人</Select.Option>
              <Select.Option value="approver">审批人</Select.Option>
              <Select.Option value="operator">操作人</Select.Option>
              <Select.Option value="admin">管理员</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="phone" label="电话">
            <Input />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
