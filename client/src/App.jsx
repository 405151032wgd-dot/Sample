import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import FrontendLayout from './components/FrontendLayout';
import AppLayout from './components/AppLayout';
import SampleDisplay from './pages/SampleDisplay';

import SampleLedger from './pages/SampleLedger';
import ProgressBoard from './pages/ProgressBoard';
import QuerySettings from './pages/admin/QuerySettings';
import StyleSettings from './pages/admin/StyleSettings';
import IndustryManagement from './pages/admin/IndustryManagement';
import TrackQuery from './pages/TrackQuery';
import './App.css';

export default function App() {
  return (
    <Routes>
      {/* Frontend - no sidebar */}
      <Route path="/" element={<FrontendLayout />}>
        <Route index element={<SampleDisplay />} />
        <Route path="display" element={<SampleDisplay />} />
        <Route path="query" element={<TrackQuery />} />
      </Route>

      {/* Backend - with sidebar */}
      <Route path="/admin" element={<AppLayout />}>
        <Route index element={<Navigate to="/app/samples" replace />} />
        <Route path="industries" element={<IndustryManagement />} />
        <Route path="query-settings" element={<QuerySettings />} />
        <Route path="style-settings" element={<StyleSettings />} />
      </Route>

      {/* Backend - samples management (with sidebar) */}
      <Route path="/app" element={<AppLayout />}>
        <Route index element={<Navigate to="samples" replace />} />
        <Route path="samples" element={<SampleLedger />} />
        <Route path="progress" element={<ProgressBoard />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
