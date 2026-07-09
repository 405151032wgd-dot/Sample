import React, { useState, useEffect } from 'react';
import { Card, List, Button, Modal, Form, Input, message, Tag, Space, Empty } from 'antd';
import { PlusOutlined, PartitionOutlined } from '@ant-design/icons';
import { getWorkflows, createWorkflow, getWorkflowNodes } from '../../api';

export default function WorkflowConfig() {
  const [workflows, setWorkflows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [nodesModal, setNodesModal] = useState({ open: false, workflow: null, nodes: [] });
  const [form] = Form.useForm();

  const loadData = async () => {
    try { const w = await getWorkflows(); setWorkflows(w.list); } catch {}
    finally { setLoading(false); }
  };

  useEffect(() => { loadData(); }, []);

  const handleCreate = async () => {
    const values = await form.validateFields();
    try {
      await createWorkflow(values);
      message.success('创建成功');
      setModalOpen(false);
      form.resetFields();
      loadData();
    } catch (err) { message.error(err.response?.data?.error || '失败'); }
  };

  const showNodes = async (wf) => {
    try {
      const n = await getWorkflowNodes(wf.id);
      setNodesModal({ open: true, workflow: wf, nodes: n.list });
    } catch {}
  };

  return (
    <div>
      <div className="page-header" style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <h2>审批流程管理</h2>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>新建流程</Button>
      </div>

      <List dataSource={workflows} loading={loading} locale={{ emptyText: '暂无流程' }}
        renderItem={item => (
          <List.Item onClick={() => showNodes(item)} style={{ cursor:'pointer' }}>
            <List.Item.Meta
              avatar={<PartitionOutlined style={{ fontSize:24, color:'#1677ff' }} />}
              title={item.name}
              description={item.description || '暂无描述'}
            />
            <Tag color={item.is_active ? 'green' : 'default'}>{item.is_active ? '启用' : '停用'}</Tag>
          </List.Item>
        )}
      />

      <Modal title="新建流程" open={modalOpen} onCancel={() => setModalOpen(false)} onOk={handleCreate}>
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="流程名称" rules={[{ required: true }]}>
            <Input placeholder="如：标准样品审批流程" />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal title={`审批节点 - ${nodesModal.workflow?.name || ''}`} open={nodesModal.open}
        onCancel={() => setNodesModal({...nodesModal, open: false})} footer={null} width={600}>
        {nodesModal.nodes.length > 0 ? (
          <List dataSource={nodesModal.nodes} renderItem={n => (
            <List.Item>
              <List.Item.Meta
                title={<Space>步骤 {n.step_order}：{n.node_name}<Tag>{n.approver_type}</Tag></Space>}
                description={`超时: ${n.timeout_hours}h · 通过规则: ${n.pass_rule === 'any' ? '一人通过' : '全部通过'}`}
              />
            </List.Item>
          )} />
        ) : <Empty description="暂无节点配置" />}
      </Modal>
    </div>
  );
}
