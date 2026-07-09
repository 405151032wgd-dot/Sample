import React, { useState, useEffect } from 'react';
import { Table, Tabs, Tag, Button, Modal, Input, Space, message, Descriptions, Popconfirm, Select } from 'antd';
import { useNavigate } from 'react-router-dom';
import { getPendingApprovals, getApprovalHistory, batchApproval, remindApproval, getRequest } from '../api';
import { StatusTag, UrgencyTag } from '../components/StatusTag';
import dayjs from 'dayjs';

const { TextArea } = Input;

export default function ApprovalList() {
  const navigate = useNavigate();
  const [pending, setPending] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('pending');
  const [selectedIds, setSelectedIds] = useState([]);
  const [batchModal, setBatchModal] = useState({ open: false, action: '' });
  const [batchComment, setBatchComment] = useState('');
  const [detailModal, setDetailModal] = useState({ open: false, data: null, loading: false });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [p, h] = await Promise.all([getPendingApprovals(), getApprovalHistory()]);
      setPending(p.list);
      setHistory(h.list);
    } catch {} finally { setLoading(false); }
  };

  const handleBatchApprove = async (action) => {
    try {
      const res = await batchApproval(selectedIds, action, batchComment);
      message.success(res.message);
      setBatchModal({ open: false, action: '' });
      setBatchComment('');
      setSelectedIds([]);
      loadData();
    } catch (err) { message.error(err.response?.data?.error || '操作失败'); }
  };

  const handleRemind = async (id) => {
    try {
      const res = await remindApproval(id);
      message.success(res.message);
    } catch { message.error('催办失败'); }
  };

  const showApprovalDetail = async (id) => {
    setDetailModal({ open: true, data: null, loading: true });
    try {
      const data = await getRequest(id);
      setDetailModal({ open: true, data, loading: false });
    } catch { message.error('加载失败'); setDetailModal({ open: false, data: null, loading: false }); }
  };

  const pendingColumns = [
    { title: '编号', dataIndex: 'request_no', width: 160, render: t => <span style={{fontFamily:'monospace', fontSize:13}}>{t}</span> },
    { title: '标题', dataIndex: 'title', ellipsis: true, render: (t, r) => <a onClick={() => showApprovalDetail(r.id)}>{t}</a> },
    { title: '申请人', dataIndex: 'applicant_name', width: 90 },
    { title: '公司', dataIndex: 'applicant_company', width: 100, ellipsis: true, render: v => v || '-' },
    { title: '数量', dataIndex: 'item_count', width: 55, align: 'center', render: v => <Tag color="orange">{v || 1}</Tag> },
    { title: '紧急', dataIndex: 'urgency', width: 70, render: u => <UrgencyTag urgency={u} /> },
    { title: '期望日', dataIndex: 'expected_date', width: 95 },
    { title: '提交', dataIndex: 'created_at', width: 130, render: t => dayjs(t).format('MM-DD HH:mm') },
    { title: '操作', width: 120,
      render: (_, r) => (
        <Space size={0}>
          <Button type="primary" size="small" onClick={() => showApprovalDetail(r.id)} style={{fontSize:12}}>审批</Button>
          <Button type="link" size="small" onClick={() => handleRemind(r.id)} style={{fontSize:12}}>催办</Button>
        </Space>
      )
    },
  ];

  const historyColumns = [
    { title: '编号', dataIndex: 'request_no', width: 160, render: t => <span style={{fontFamily:'monospace', fontSize:13}}>{t}</span> },
    { title: '标题', dataIndex: 'request_title', ellipsis: true, render: (t, r) => <a onClick={() => navigate(`/requests/${r.request_id}`)}>{t}</a> },
    { title: '操作', dataIndex: 'action', width: 70, render: a => <Tag color={a === '通过' ? 'green' : a === '驳回' ? 'red' : a === '退回修改' ? 'orange' : 'blue'}>{a}</Tag> },
    { title: '意见', dataIndex: 'comment', ellipsis: true },
    { title: '时间', dataIndex: 'signed_at', width: 130, render: t => dayjs(t).format('MM-DD HH:mm') },
  ];

  return (
    <div>
      <div className="page-header" style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <h2 style={{ margin: 0 }}>待办审批</h2>
        {tab === 'pending' && selectedIds.length > 0 && (
          <Space>
            <span style={{ fontSize: 13, color: '#666' }}>已选 {selectedIds.length} 项</span>
            <Button type="primary" onClick={() => setBatchModal({ open: true, action: '通过' })}>批量通过</Button>
            <Button danger onClick={() => setBatchModal({ open: true, action: '驳回' })}>批量驳回</Button>
            <Button onClick={() => setSelectedIds([])}>取消选择</Button>
          </Space>
        )}
      </div>
      <Tabs activeKey={tab} onChange={k => { setTab(k); setSelectedIds([]); }} items={[
        { key:'pending', label: `待审批 (${pending.length})`,
          children: (
            <Table dataSource={pending} columns={pendingColumns} rowKey="id" loading={loading}
              pagination={false} locale={{ emptyText: '暂无待审批事项' }}
              rowSelection={{ selectedRowKeys: selectedIds, onChange: setSelectedIds }}
              size="middle"
            />
          )
        },
        { key:'history', label: '已审批记录',
          children: <Table dataSource={history} columns={historyColumns} rowKey="id" loading={loading}
            pagination={{ pageSize: 20 }} locale={{ emptyText: '暂无审批记录' }} size="middle"
          />
        },
      ]} />

      {/* Batch Approval Modal */}
      <Modal title={`批量${batchModal.action === '通过' ? '通过' : '驳回'}`}
        open={batchModal.open} onCancel={() => setBatchModal({...batchModal, open: false})}
        onOk={() => handleBatchApprove(batchModal.action)} okText="确认">
        <p>将批量处理 <strong>{selectedIds.length}</strong> 个申请，{(batchModal.action === '通过') ? '确认通过？' : '确认驳回？'}</p>
        <TextArea rows={2} placeholder="批量操作备注（可选）" value={batchComment} onChange={e => setBatchComment(e.target.value)} />
      </Modal>

      {/* Approval Detail Modal */}
      <Modal title="审批详情" open={detailModal.open}
        onCancel={() => setDetailModal({...detailModal, open: false})}
        footer={null} width={640}
      >
        {detailModal.loading ? <div style={{textAlign:'center',padding:40}}>加载中...</div> : detailModal.data && (
          <div>
            <Descriptions column={2} bordered size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="编号">{detailModal.data.request_no}</Descriptions.Item>
              <Descriptions.Item label="标题">{detailModal.data.title}</Descriptions.Item>
              <Descriptions.Item label="申请人">{detailModal.data.applicant_name}</Descriptions.Item>
              <Descriptions.Item label="公司">{detailModal.data.applicant_company || '-'}</Descriptions.Item>
              <Descriptions.Item label="行业">{detailModal.data.industry_name || '-'}</Descriptions.Item>
              <Descriptions.Item label="紧急程度"><UrgencyTag urgency={detailModal.data.urgency} /></Descriptions.Item>
              <Descriptions.Item label="期望日">{detailModal.data.expected_date}</Descriptions.Item>
              <Descriptions.Item label="用途" span={2}>{detailModal.data.purpose}</Descriptions.Item>
            </Descriptions>

            {detailModal.data.items && detailModal.data.items.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <h4 style={{ marginBottom: 8 }}>产品清单</h4>
                <Table dataSource={detailModal.data.items} rowKey="id" size="small" pagination={false}
                  columns={[
                    { title: '序号', width: 50, render: (_, __, i) => i + 1 },
                    { title: '样品类型', dataIndex: 'sample_type_id', width: 100 },
                    { title: '规格型号', dataIndex: 'specification', ellipsis: true },
                    { title: '数量', dataIndex: 'quantity', width: 60, render: (v, r) => `${v}${r.unit}` },
                  ]}
                />
              </div>
            )}

            {detailModal.data.attachments && detailModal.data.attachments.length > 0 && (
              <div style={{ marginBottom: 16, padding: '8px 12px', background: '#f5f5f5', borderRadius: 6 }}>
                <span style={{ fontWeight: 500 }}>附件：</span>
                {detailModal.data.attachments.map(a => (
                  <Tag key={a.id} style={{ margin: '2px 4px' }}>{a.filename}</Tag>
                ))}
              </div>
            )}

            <Space style={{ width: '100%', justifyContent: 'center', marginTop: 12 }}>
              <Button type="primary" size="large" style={{ minWidth: 120 }}
                onClick={async () => {
                  try {
                    const { approvalAction } = await import('../api');
                    Modal.confirm({ title: '确认通过？', content: '',
                      onOk: async () => {
                        try {
                          await approvalAction(detailModal.data.id, '通过', '');
                          message.success('已批准');
                          setDetailModal({...detailModal, open: false});
                          loadData();
                        } catch (err) { message.error(err.response?.data?.error || '操作失败'); }
                      }
                    });
                  } catch { message.error('操作失败'); }
                }}
              >通过</Button>
              <Button danger size="large" style={{ minWidth: 120 }}
                onClick={() => {
                  Modal.confirm({ title: '确认驳回？',
                    content: <Input.TextArea rows={2} placeholder="驳回原因" id="reject-reason" />,
                    onOk: async () => {
                      const reason = document.getElementById('reject-reason')?.value || '';
                      try {
                        const { approvalAction } = await import('../api');
                        await approvalAction(detailModal.data.id, '驳回', reason);
                        message.success('已驳回');
                        setDetailModal({...detailModal, open: false});
                        loadData();
                      } catch (err) { message.error(err.response?.data?.error || '操作失败'); }
                    }
                  });
                }}
              >驳回</Button>
            </Space>
          </div>
        )}
      </Modal>
    </div>
  );
}
