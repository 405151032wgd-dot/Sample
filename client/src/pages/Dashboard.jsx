import React, { useState, useEffect } from 'react';
import { Card, Row, Col, List, Tag, Button, Spin, Empty } from 'antd';
import { PlusOutlined, CheckCircleOutlined, ClockCircleOutlined, InboxOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getRequests, getPendingApprovals, getNotifications, getRequest } from '../api';
import { StatusTag, UrgencyTag } from '../components/StatusTag';
import dayjs from 'dayjs';

export default function Dashboard() {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [recentRequests, setRecentRequests] = useState([]);
  const [pendingApprovals, setPendingApprovals] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [reqRes, notifRes] = await Promise.all([
        getRequests({ applicant_id: user.id, pageSize: 5 }),
        getNotifications(),
      ]);
      setRecentRequests(reqRes.list);
      setNotifications(notifRes.list);

      if (['approver','admin','super_admin','operator'].includes(user.role)) {
        const pendRes = await getPendingApprovals();
        setPendingApprovals(pendRes.list);
      }
    } catch {} finally { setLoading(false); }
  };

  const statCards = [
    { title: '我的申请', value: recentRequests.length, color: '#1677ff', icon: <PlusOutlined /> },
    { title: '待审批', value: pendingApprovals.length, color: '#faad14', icon: <ClockCircleOutlined /> },
    { title: '待签收', value: recentRequests.filter(r => r.status === '已完成').length, color: '#52c41a', icon: <InboxOutlined /> },
  ];

  if (loading) return <Spin size="large" style={{ display:'block', margin:'100px auto' }} />;

  return (
    <div>
      <div className="page-header"><h2>工作台</h2><p style={{ color: '#666', marginTop: 4 }}>欢迎回来，{user?.name}</p></div>

      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card className="stat-card" onClick={() => navigate('/requests')} style={{ cursor:'pointer' }}>
            <div className="stat-value" style={{ color: '#1677ff' }}>{recentRequests.length}</div>
            <div className="stat-label">我的申请</div>
          </Card>
        </Col>
        <Col span={6}>
          <Card className="stat-card" onClick={() => navigate('/approvals')} style={{ cursor:'pointer' }}>
            <div className="stat-value" style={{ color: '#faad14' }}>{pendingApprovals.length}</div>
            <div className="stat-label">待审批</div>
          </Card>
        </Col>
        <Col span={6}>
          <Card className="stat-card" onClick={() => navigate('/samples')} style={{ cursor:'pointer' }}>
            <div className="stat-value" style={{ color: '#52c41a' }}>{recentRequests.filter(r => r.status === '已完成').length}</div>
            <div className="stat-label">待签收</div>
          </Card>
        </Col>
        <Col span={6}>
          <Card className="stat-card" onClick={() => navigate('/requests/new')} style={{ cursor:'pointer', background: '#1677ff', color:'#fff' }}>
            <div style={{ fontSize:32 }}><PlusOutlined /></div>
            <div className="stat-label" style={{ color:'#fff', marginTop:4 }}>新建申请</div>
          </Card>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={12}>
          <Card title="我的申请" extra={<a onClick={() => navigate('/requests')}>查看全部</a>}>
            <List dataSource={recentRequests} locale={{ emptyText: '暂无申请' }}
              renderItem={item => (
                <List.Item onClick={() => navigate(`/requests/${item.id}`)} style={{ cursor:'pointer' }}>
                  <List.Item.Meta
                    title={<div style={{ display:'flex', gap:8, alignItems:'center' }}><span>{item.title}</span><StatusTag status={item.status} /></div>}
                    description={<div style={{ fontSize:12, color:'#999' }}>{item.request_no} · {dayjs(item.created_at).format('MM-DD HH:mm')} {item.urgency !== '普通' && <UrgencyTag urgency={item.urgency} />}</div>}
                  />
                </List.Item>
              )}
            />
          </Card>
        </Col>
        <Col span={12}>
          <Card title="待办审批" extra={pendingApprovals.length > 0 ? <a onClick={() => navigate('/approvals')}>查看全部</a> : null}>
            {pendingApprovals.length > 0 ? (
              <List dataSource={pendingApprovals} renderItem={item => (
                <List.Item onClick={() => navigate(`/requests/${item.id}`)} style={{ cursor:'pointer' }}>
                  <List.Item.Meta
                    title={<div style={{ display:'flex', gap:8, alignItems:'center' }}><span>{item.title}</span><UrgencyTag urgency={item.urgency} /></div>}
                    description={<div style={{ fontSize:12, color:'#999' }}>{item.applicant_name} · {item.department_name} · {dayjs(item.created_at).format('MM-DD HH:mm')}</div>}
                  />
                </List.Item>
              )} />
            ) : <Empty description="暂无待审批事项" />}
          </Card>
        </Col>
      </Row>
    </div>
  );
}
