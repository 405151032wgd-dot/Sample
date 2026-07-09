import React, { useState } from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
 import { DatabaseOutlined, ApartmentOutlined, SearchOutlined, BgColorsOutlined, PartitionOutlined } from '@ant-design/icons';

 const menuItems = [
   { key: '/app/samples', icon: <DatabaseOutlined />, label: '样品申请' },
   { key: '/app/progress', icon: <PartitionOutlined />, label: '进度看板' },
   { key: '/admin/industries', icon: <ApartmentOutlined />, label: '行业管理' },
   { key: '/admin/query-settings', icon: <SearchOutlined />, label: '查询设置' },
   { key: '/admin/style-settings', icon: <BgColorsOutlined />, label: '风格设置' },
 ];

export default function AppLayout() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (key) => {
    return location.pathname.startsWith(key);
  };

  const userName = user?.name || '管理员';
  const userDept = user?.department || '总经办';

  return (
    <div className="app">
      {/* Header — full-width white bg */}
      <header className="app-header">
        <div className="app-container">
          <div className="logo">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
            </svg>
            <span>样品申请系统</span>
          </div>
          <div className="header-right">
            <a href="/" className="frontend-link">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
              </svg>
              前台
            </a>
            <div className="user-info">
              <span>{userName}</span>
              <span className="user-badge role-badge-admin">管理员</span>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation — full-width white bg */}
      <nav className="admin-tabs">
        <div className="app-container">
          <div className="admin-tabs-inner">
             {menuItems.map(item => {
               const active = isActive(item.key);
               return (
                 <a key={item.key} className={active ? 'active' : ''}
                    onClick={() => navigate(item.key)}
                    href="#">
                   {React.cloneElement(item.icon, { style: { fontSize: 16 } })}
                   <span>{item.label}</span>
                 </a>
               );
             })}
          </div>
        </div>
      </nav>

      {/* Content — 80% container with white card */}
      <main className="app-main">
        <div className="app-container">
          <div className="app-content-card">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
}
