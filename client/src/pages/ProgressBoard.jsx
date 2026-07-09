import React, { useState, useEffect } from 'react';
import { Card, Tag, Spin, Empty, message, Badge, Modal, Descriptions, Table, Button, Select, Input, Timeline, Space } from 'antd';
import { ClockCircleOutlined, CheckCircleOutlined, CloseCircleOutlined, SyncOutlined } from '@ant-design/icons';
import { getRequests, updateSampleStatus } from '../api';
import { StatusTag } from '../components/StatusTag';
import dayjs from 'dayjs';

const COLUMNS = [
  { status: '待审批', color: '#1890ff' },
  { status: '已批准', color: '#52c41a' },
  { status: '制作中', color: '#faad14' },
  { status: '已完成', color: '#13c2c2' },
  { status: '已签收', color: '#722ed1' },
  { status: '已驳回', color: '#ff4d4f' },
];

const TRANSITIONS = {
  '已批准': '制作中',
  '制作中': '已完成',
  '已完成': '已签收',
};

export default function ProgressBoard() {
  const [allItems, setAllItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [statusRemark, setStatusRemark] = useState('');

  const loadAll = async () => {
    setLoading(true);
    try {
      const seen = new Set();
      const items = [];
      for (const status of ['待审批','已批准','制作中','已完成','已签收','已驳回']) {
        const res = await getRequests({ status, pageSize: 50 });
        for (const item of (res.list || [])) {
          if (!seen.has(item.id)) { seen.add(item.id); items.push(item); }
        }
      }
      setAllItems(items);
    } catch { message.error('加载失败'); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadAll(); }, []);

  const getColumnItems = (status) => allItems.filter(i => i.status === status);

  const showDetail = (item) => {
    setDetail(item);
    setDetailOpen(true);
    setStatusRemark('');
  };

  const handleStatusAdvance = async () => {
    if (!detail) return;
    const next = TRANSITIONS[detail.status];
    if (!next) return;
    try {
      await updateSampleStatus(detail.id, next, statusRemark);
      message.success(`已推进到「${next}」`);
      setDetailOpen(false);
      loadAll();
    } catch { message.error('操作失败'); }
  };

  const itemColumns = [
    { title: '序号', width: 50, render: (_, __, i) => i + 1 },
    { title: '样品类型', dataIndex: 'sample_type_name', width: 120 },
    { title: '规格型号', dataIndex: 'specification', ellipsis: true },
    { title: '数量', dataIndex: 'quantity', width: 60, render: (v, r) => `${v}${r.unit}` },
  ];

  const timelineStatusColor = {
    '待审批': 'blue', '已批准': 'green', '制作中': 'orange',
    '已完成': 'cyan', '已签收': 'purple', '已驳回': 'red',
  };

  if (loading) return <Spin size="large" style={{ display: 'block', margin: '100px auto' }} />;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div className="page-title-bar" style={{ marginBottom: 0 }}>
          <h2>进度看板</h2>
          <p>按状态分组展示所有样品申请记录</p>
        </div>
        <Button icon={<SyncOutlined />} onClick={loadAll} size="small">刷新</Button>
      </div>

      <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 12, minHeight: 'calc(100vh - 200px)' }}>
        {COLUMNS.map(col => {
          const items = getColumnItems(col.status);
          return (
            <div key={col.status} style={{ minWidth: 260, width: 260, flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, padding: '0 4px' }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: col.color }} />
                <span style={{ fontSize: 14, fontWeight: 600 }}>{col.status}</span>
                <Tag style={{ marginLeft: 'auto', fontSize: 11 }}>{items.length}</Tag>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {items.length === 0 && (
                  <div style={{ textAlign: 'center', color: '#dce0e8', padding: 32, fontSize: 13 }}>
                    <Empty description={false} />
                    <div style={{ marginTop: 4 }}>暂无</div>
                  </div>
                )}
                {items.map(item => {
                  const days = dayjs().diff(dayjs(item.created_at), 'day');
                  return (
                    <Card key={item.id} size="small" hoverable
                      onClick={() => showDetail(item)}
                      style={{ borderRadius: 8, borderLeft: `3px solid ${col.color}` }}>
                      <div style={{ fontFamily: 'monospace', fontSize: 12, color: '#9ca3af', marginBottom: 4 }}>{item.request_no}</div>
                      <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title}</div>
                      <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>{item.applicant_company || item.applicant_name || '-'}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11 }}>
                        {item.item_count > 0 && <Tag color="orange" style={{ fontSize: 10, lineHeight: '18px' }}>{item.item_count}产品</Tag>}
                        <span style={{ color: '#9ca3af' }}>{days === 0 ? '今日' : `${days}天前`}</span>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Detail Modal */}
      <Modal title={null} open={detailOpen} onCancel={() => setDetailOpen(false)} footer={null} width={640}>
        {detail && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div><h3 style={{ margin: 0 }}>{detail.title}</h3></div>
              <StatusTag status={detail.status} />
            </div>
            <Descriptions column={2} bordered size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="申请编号"><span style={{ fontFamily: 'monospace' }}>{detail.request_no}</span></Descriptions.Item>
              <Descriptions.Item label="行业">{detail.industry_name || '-'}</Descriptions.Item>
              <Descriptions.Item label="申请人">{detail.applicant_name}</Descriptions.Item>
              <Descriptions.Item label="公司">{detail.applicant_company || '-'}</Descriptions.Item>
              <Descriptions.Item label="申请目的" span={2}>{detail.purpose}</Descriptions.Item>
              <Descriptions.Item label="期望完成日">{detail.expected_date}</Descriptions.Item>
              <Descriptions.Item label="紧急程度">{detail.urgency}</Descriptions.Item>
            </Descriptions>

            {/* Quick status advance */}
            {TRANSITIONS[detail.status] && (
              <div style={{ marginBottom: 16, padding: 12, background: '#f9fafb', borderRadius: 8 }}>
                <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 8 }}>状态推进</div>
                <Input.TextArea rows={2} placeholder="备注（可选）" value={statusRemark}
                  onChange={e => setStatusRemark(e.target.value)} style={{ marginBottom: 8 }} />
                <Button type="primary" size="small" onClick={handleStatusAdvance}>
                  推进到「{TRANSITIONS[detail.status]}」
                </Button>
              </div>
            )}

            {/* Timeline */}
            <h4 style={{ fontSize: 14, marginBottom: 8 }}>进度时间线</h4>
            <Timeline items={[
              { color: 'blue', children: <div><strong>提交申请</strong><br /><span style={{ fontSize: 12, color: '#9ca3af' }}>{dayjs(detail.created_at).format('MM-DD HH:mm')}</span></div> },
              detail.status !== '待审批' && { color: 'green', children: <div><strong>已批准</strong><br /><span style={{ fontSize: 12, color: '#9ca3af' }}>已通过审批</span></div> },
              (detail.status === '制作中' || detail.status === '已完成' || detail.status === '已签收') && { color: 'orange', children: <div><strong>制作中</strong><br /><span style={{ fontSize: 12, color: '#9ca3af' }}>正在制作</span></div> },
              (detail.status === '已完成' || detail.status === '已签收') && { color: 'cyan', children: <div><strong>已完成</strong><br /><span style={{ fontSize: 12, color: '#9ca3af' }}>制作完成</span></div> },
              detail.status === '已签收' && { color: 'purple', children: <div><strong>已签收</strong><br /><span style={{ fontSize: 12, color: '#9ca3af' }}>已签收</span></div> },
              detail.status === '已驳回' && { color: 'red', children: <div><strong>已驳回</strong><br /><span style={{ fontSize: 12, color: '#9ca3af' }}>审批不通过</span></div> },
            ].filter(Boolean)} />
          </div>
        )}
      </Modal>
    </div>
  );
}
