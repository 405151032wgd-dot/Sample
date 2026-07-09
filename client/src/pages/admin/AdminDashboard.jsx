import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Spin, Table, Tag } from 'antd';
import { getAdminStats } from '../../api';

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAdminStats().then(setStats).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <Spin size="large" style={{ display:'block', margin:'100px auto' }} />;
  if (!stats) return <div>暂无数据</div>;

  return (
    <div>
      <div className="page-header"><h2>运营总览</h2></div>

      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card className="stat-card" bodyStyle={{ display: 'flex', alignItems: 'center', gap: 16, padding: '20px 24px' }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/></svg>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="stat-value">{stats.totalThisMonth}</div>
              <div className="stat-label">本月申请</div>
              <div className="stat-change" style={{ color: stats.totalThisMonth > stats.totalLastMonth ? '#52c41a' : '#ff4d4f', fontSize: 12 }}>
                {stats.totalLastMonth > 0 ? `${((stats.totalThisMonth - stats.totalLastMonth) / stats.totalLastMonth * 100).toFixed(1)}% vs 上月` : '-'}
              </div>
            </div>
          </Card>
        </Col>
        <Col span={6}>
          <Card className="stat-card" bodyStyle={{ display: 'flex', alignItems: 'center', gap: 16, padding: '20px 24px' }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="stat-value" style={{ color: '#22c55e' }}>{stats.completedRate}%</div>
              <div className="stat-label">按时完成率</div>
            </div>
          </Card>
        </Col>
        <Col span={6}>
          <Card className="stat-card" bodyStyle={{ display: 'flex', alignItems: 'center', gap: 16, padding: '20px 24px' }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: '#fffbeb', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="stat-value" style={{ color: '#f59e0b' }}>{stats.avgApprovalHours}h</div>
              <div className="stat-label">平均审批时长</div>
            </div>
          </Card>
        </Col>
        <Col span={6}>
          <Card className="stat-card" bodyStyle={{ display: 'flex', alignItems: 'center', gap: 16, padding: '20px 24px' }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12" y2="16"/></svg>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="stat-value" style={{ color: stats.overdue > 0 ? '#ef4444' : '#22c55e' }}>{stats.overdue}</div>
              <div className="stat-label">超期未完成</div>
            </div>
          </Card>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={12}>
          <Card title="部门分布">
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead><tr style={{ borderBottom:'1px solid #f0f0f0' }}><th style={{ textAlign:'left', padding:8 }}>部门</th><th style={{ textAlign:'right', padding:8 }}>申请数</th></tr></thead>
              <tbody>
                {stats.deptDist?.map(d => (
                  <tr key={d.name} style={{ borderBottom:'1px solid #f0f0f0' }}>
                    <td style={{ padding:8 }}>{d.name}</td>
                    <td style={{ textAlign:'right', padding:8 }}>{d.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {(!stats.deptDist || stats.deptDist.length === 0) && <div style={{ textAlign:'center', color:'#999', padding:16 }}>暂无数据</div>}
          </Card>
        </Col>
        <Col span={12}>
          <Card title="样品类型分布">
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead><tr style={{ borderBottom:'1px solid #f0f0f0' }}><th style={{ textAlign:'left', padding:8 }}>类型</th><th style={{ textAlign:'right', padding:8 }}>数量</th></tr></thead>
              <tbody>
                {stats.typeDist?.map(t => (
                  <tr key={t.name} style={{ borderBottom:'1px solid #f0f0f0' }}>
                    <td style={{ padding:8 }}>{t.name}</td>
                    <td style={{ textAlign:'right', padding:8 }}>{t.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {(!stats.typeDist || stats.typeDist.length === 0) && <div style={{ textAlign:'center', color:'#999', padding:16 }}>暂无数据</div>}
          </Card>
        </Col>
      </Row>

      <Card title="月度趋势" style={{ marginTop: 16 }}>
        <table style={{ width:'100%', borderCollapse:'collapse' }}>
          <thead><tr style={{ borderBottom:'1px solid #f0f0f0' }}><th style={{ textAlign:'left', padding:8 }}>月份</th><th style={{ textAlign:'right', padding:8 }}>申请数</th></tr></thead>
          <tbody>
            {stats.trend?.map(t => (
              <tr key={t.month} style={{ borderBottom:'1px solid #f0f0f0' }}>
                <td style={{ padding:8 }}>{t.month}</td>
                <td style={{ textAlign:'right', padding:8 }}>{t.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
