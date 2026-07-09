import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { getFrontSettings } from '../api';

const DEFAULTS = {
  front_primary_color: '#3461ff',
  front_nav_style: 'white',
  front_page_bg: '#f5f7fa',
  front_card_bg: '#ffffff',
  front_card_shadow: 'shadow',
  front_text_color: '#374151',
  front_text_muted: '#9ca3af',
  front_secondary_color: '#10b981',
};

export default function FrontendLayout() {
  const [settings, setSettings] = useState(DEFAULTS);

  useEffect(() => {
    getFrontSettings().then(data => {
      setSettings({ ...DEFAULTS, ...data });
    }).catch(() => {});
  }, []);

  const merged = { ...DEFAULTS, ...settings };
  const prim = merged.front_primary_color;
  const pageBg = merged.front_page_bg;
  const cardBg = merged.front_card_bg;
  const textColor = merged.front_text_color;
  const textMuted = merged.front_text_muted;
  const secondaryColor = merged.front_secondary_color;
  const cardShadowVal = merged.front_card_shadow;
  const cardShadow = cardShadowVal === 'shadow' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none';
  const navStyle = merged.front_nav_style;
  const navBg = navStyle === 'gradient'
    ? 'linear-gradient(135deg, #0a1628 0%, #0f2a4a 50%, #16487a 100%)'
    : navStyle === 'primary' ? prim : '#ffffff';
  const navTextColor = navStyle === 'white' ? '#1f2937' : '#ffffff';
  const logoColor = navStyle === 'white' ? prim : '#ffffff';

  return (
   <div className="frontend-root" style={{
      
      minHeight: '100vh',
      background: pageBg,
      '--page-bg': pageBg,
      '--card-bg': cardBg,
      '--card-shadow': cardShadow,
      '--primary': prim,
      '--secondary': secondaryColor,
      '--text-color': textColor,
      '--text-muted': textMuted,
      '--nav-bg': navBg,
      '--nav-text': navTextColor,
    }}>
      {/* Header nav bar */}
      <div style={{
        background: navBg, borderBottom: '1px solid #e5e7eb', padding: '0 40px', height: 60,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        boxShadow: navStyle === 'white' ? '0 1px 3px rgba(0,0,0,0.04)' : '0 1px 3px rgba(0,0,0,0.15)',
      }}>
         <a href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={logoColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
          </svg>
          <span style={{ fontSize: 16, fontWeight: 600, color: navTextColor }}>样品申请系统</span>
         </a>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <a href="/query" style={{
            color: navTextColor === '#ffffff' ? 'rgba(255,255,255,0.8)' : '#6b7280',
            textDecoration: 'none', fontSize: 14, transition: 'color 0.15s',
          }} onMouseEnter={e => e.target.style.color = prim} onMouseLeave={e => e.target.style.color = navTextColor === '#ffffff' ? 'rgba(255,255,255,0.8)' : '#6b7280'}>
            查询申请
          </a>
          <a href="/app/samples" style={{
            color: '#fff', textDecoration: 'none', fontSize: 13, fontWeight: 500,
            background: prim, padding: '6px 16px', borderRadius: 6, transition: 'background 0.15s',
          }}>
            进入后台 →
          </a>
        </div>
      </div>
      {/* Content */}
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '28px 24px' }}>
        <Outlet />
      </div>
    </div>
  );
}
