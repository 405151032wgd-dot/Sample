import React, { useState } from 'react';
import { Card, Input, Button, message, Spin, Descriptions, Tag, Timeline, Table, Divider } from 'antd';
import { SearchOutlined, CheckCircleFilled, CloseCircleFilled, ClockCircleFilled } from '@ant-design/icons';
 import { getQuerySettings, getRequestNotifications } from '../api';
import { StatusTag } from '../components/StatusTag';
import dayjs from 'dayjs';

const STATUS_CONFIG = {
  '待审批': { color: '#1890ff', icon: <ClockCircleFilled /> },
  '已批准': { color: '#52c41a', icon: <CheckCircleFilled /> },
  '已发货': { color: '#722ed1', icon: <CheckCircleFilled /> },
  '已完成': { color: '#13c2c2', icon: <CheckCircleFilled /> },
  '已驳回': { color: '#ff4d4f', icon: <CloseCircleFilled /> },
  '已取消': { color: '#999', icon: <CloseCircleFilled /> },
};

export default function TrackQuery() {
  const [queryNo, setQueryNo] = useState('');
  const [queryCompany, setQueryCompany] = useState('');
  const [queryPhone, setQueryPhone] = useState('');
  const [mode, setMode] = useState('no'); // 'no' or 'company'
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [notifications, setNotifications] = useState([]);
  const [hasNewNotify, setHasNewNotify] = useState(false);

  const handleQuery = async () => {
    let params = {};
    if (mode === 'no') {
      if (!queryNo.trim()) { message.warning('请输入申请编号'); return; }
      params.no = queryNo.trim();
    } else {
      if (!queryCompany.trim() || !queryPhone.trim()) { message.warning('请输入公司名称和联系方式'); return; }
      params.company = queryCompany.trim();
      params.phone = queryPhone.trim();
    }

    setLoading(true);
    setResult(null);
    setError('');
    try {
      const res = await fetch(`/api/requests/query?${new URLSearchParams(params)}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || '查询失败');
      } else {
        setResult(data);
        // Fetch notifications
        try {
          const notifRes = await getRequestNotifications(data.request.id);
          const notifList = notifRes.list || [];
          setNotifications(notifList);
          // Check if there are unseen notifications
          const key = 'viewed_notif_' + data.request.id;
          const lastView = localStorage.getItem(key);
          if (lastView) {
            const hasNew = notifList.some(n => new Date(n.created_at) > new Date(lastView));
            setHasNewNotify(hasNew);
          } else {
            setHasNewNotify(notifList.length > 0);
          }
        } catch {}
      }
    } catch {
      setError('网络错误，请稍后重试');
    } finally { setLoading(false); }
  };

  const timelineColors = {
    '待审批': 'blue', '已批准': 'green', '已发货': 'purple',
    '已完成': 'cyan', '已驳回': 'red',
  };

  if (settings && settings.enabled === 'false') {
    return (
      <div style={{ textAlign: 'center', padding: 80 }}>
        <div style={{ fontSize: 48, color: '#dce0e8', marginBottom: 16, lineHeight: 1 }}>🔍</div>
        <div style={{ fontSize: 18, color: '#6b7280' }}>查询功能暂不可用</div>
        <div style={{ fontSize: 13, color: '#9ca3af', marginTop: 8 }}>请联系管理员获取申请信息</div>
      </div>
    );
  }
  return (
    <div>
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div style={{ fontSize: 24, fontWeight: 700, color: '#0a1628', marginBottom: 8 }}>
          查询申请进度
        </div>
        <div style={{ fontSize: 13, color: '#888' }}>
          输入申请编号，或输入公司名称+联系方式查询申请状态
        </div>
      </div>

      {/* Query Form */}
      <Card style={{ maxWidth: 760, margin: '0 auto 24px', borderRadius: 10, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
        <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
          <Button type={mode === 'no' ? 'primary' : 'default'} size="small"
            onClick={() => setMode('no')} style={{ borderRadius: 6 }}>按编号查询</Button>
          <Button type={mode === 'company' ? 'primary' : 'default'} size="small"
            onClick={() => setMode('company')} style={{ borderRadius: 6 }}>按公司查询</Button>
        </div>

        {mode === 'no' ? (
          <div style={{ display: 'flex', gap: 12 }}>
            <Input placeholder="输入申请编号，如 SY20260629-0001"
              value={queryNo} onChange={e => setQueryNo(e.target.value)}
              onPressEnter={handleQuery} size="large" style={{ flex: 1 }} />
            <Button type="primary" icon={<SearchOutlined />} onClick={handleQuery}
              loading={loading} size="large" style={{ minWidth: 100 }}>查询</Button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Input placeholder="输入公司名称" value={queryCompany}
              onChange={e => setQueryCompany(e.target.value)} size="large" />
            <div style={{ display: 'flex', gap: 12 }}>
              <Input placeholder="输入手机号或邮箱" value={queryPhone}
                onChange={e => setQueryPhone(e.target.value)} size="large" style={{ flex: 1 }} />
              <Button type="primary" icon={<SearchOutlined />} onClick={handleQuery}
                loading={loading} size="large" style={{ minWidth: 100 }}>查询</Button>
            </div>
          </div>
        )}
      </Card>

      {/* Loading */}
      {loading && <div style={{ textAlign: 'center', padding: 40 }}><Spin size="large" /></div>}

      {/* Error */}
      {error && (
        <Card style={{ maxWidth: 760, margin: '0 auto 24px', borderRadius: 10, borderLeft: '3px solid #ff4d4f' }}>
          <div style={{ textAlign: 'center', color: '#ff4d4f', padding: 16 }}>
            <CloseCircleFilled style={{ fontSize: 36, marginBottom: 12, display: 'block' }} />
            <div style={{ fontSize: 15 }}>{error}</div>
          </div>
        </Card>
      )}

      {/* Result */}
      {result && (
        <Card style={{ maxWidth: 760, margin: '0 auto', borderRadius: 10, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div>
              <span style={{ fontSize: 18, fontWeight: 600 }}>申请详情</span>
              <Tag color="blue" style={{ marginLeft: 12, fontSize: 13, fontFamily: 'monospace' }}>
                {result.request.request_no}
              </Tag>
            </div>
            <StatusTag status={result.request.status} />
            {hasNewNotify && <Tag color="red" style={{marginLeft:8}}>🔔 新通知</Tag>}
          </div>

          <Descriptions column={2} bordered size="small" style={{ marginBottom: 20 }}>
            <Descriptions.Item label="申请标题">{result.request.title}</Descriptions.Item>
            <Descriptions.Item label="行业">{result.request.industry_name || '-'}</Descriptions.Item>
            <Descriptions.Item label="申请人">{result.request.applicant_name || '-'}</Descriptions.Item>
            <Descriptions.Item label="公司">{result.request.applicant_company || '-'}</Descriptions.Item>
            <Descriptions.Item label="提交时间">{dayjs(result.request.created_at).format('YYYY-MM-DD HH:mm')}</Descriptions.Item>
            <Descriptions.Item label="期望完成">{result.request.expected_date}</Descriptions.Item>
           <Descriptions.Item label="用途" span={2}>{result.request.purpose}</Descriptions.Item>
            {result.request.tracking_no ? (
              <Descriptions.Item label="物流信息" span={2}>
                承运商：{result.request.carrier || '-'}　单号：{result.request.tracking_no}
              </Descriptions.Item>
            ) : null}
          </Descriptions>

          {/* Product Items */}
          {result.items && result.items.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <h4 style={{ marginBottom: 8, fontSize: 14 }}>产品清单</h4>
              <Table dataSource={result.items} rowKey="id" size="small" pagination={false}
                columns={[
                  { title: '序号', width: 50, render: (_, __, i) => i + 1 },
                  { title: '样品类型', dataIndex: 'sample_type_name', width: 120 },
                  { title: '规格型号', dataIndex: 'specification', ellipsis: true },
                  { title: '数量', dataIndex: 'quantity', width: 80, render: (v, r) => `${v} ${r.unit}` },
                ]}
              />
            </div>
          )}

          {/* Notifications Section */}
          {notifications.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <h4 style={{ marginBottom: 8, fontSize: 14 }}>
                🔔 通知公告 {hasNewNotify && <Tag color="red" size="small">新</Tag>}
              </h4>
              {notifications.map((n, i) => (
                <div key={i} style={{
                  padding: '8px 12px', marginBottom: 6,
                  background: i === 0 && hasNewNotify ? '#fff7e6' : '#f9fafb',
                  borderRadius: 6, borderLeft: i === 0 && hasNewNotify ? '3px solid #fa8c16' : '3px solid #e5e7eb',
                  fontSize: 13,
                }}>
                  <div style={{ fontWeight: 500 }}>{n.title}</div>
                  <div style={{ color: '#666', fontSize: 12, marginTop: 2 }}>{n.content}</div>
                  <div style={{ color: '#999', fontSize: 11, marginTop: 2 }}>
                    {dayjs(n.created_at).format('MM-DD HH:mm')}
                  </div>
                </div>
              ))}
            </div>
          )}
          {/* Mark as viewed */}
          {hasNewNotify && (
            <Button size="small" type="link" style={{marginBottom:12}}
              onClick={() => {
                localStorage.setItem('viewed_notif_' + result.request.id, new Date().toISOString());
                setHasNewNotify(false);
              }}>
                标记为已读
            </Button>
          )}

          {/* Timeline */}
          <h4 style={{ marginBottom: 8, fontSize: 14 }}>进度追踪</h4>
          <Timeline items={result.tracking?.map(t => ({
            color: timelineColors[t.to_status] || 'blue',
            children: <div>
              <strong style={{ color: STATUS_CONFIG[t.to_status]?.color }}>{t.to_status}</strong>
              <span style={{ marginLeft: 8, fontSize: 12, color: '#999' }}>
                {dayjs(t.operated_at).format('MM-DD HH:mm')}
              </span>
              {t.remark && <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>{t.remark}</div>}
            </div>
         })) || []} />
          {result.request.tracking_no ? (
            <div style={{ marginTop: 16, padding: '12px 16px', background: '#f0f5ff', borderRadius: 8, borderLeft: '3px solid #722ed1' }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>📦 物流信息</div>
              <div style={{ fontSize: 13, color: '#555' }}>
                承运商：{result.request.carrier || '-'}　
                物流单号：<span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{result.request.tracking_no}</span>
              </div>
           </div>
          ) : null}
        </Card>
      )}
    </div>
  );
}
