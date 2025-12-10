import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { cssVariables } from './theme/theme';
import './App.css';
import './global.css';

// Import new layout and pages
import AppLayout from './components/layout/AppLayout';

import DataSourcePage from './pages/DataSourcePage';
import LineagePage from './pages/LineagePage';
import LineageManagement from './pages/LineageManagement';
import SettingsPage from './pages/SettingsPage';
import ImportPage from './pages/ImportPage';
import TableBrowsePage from './pages/TableBrowsePage';
import TableDetailPage from './pages/TableDetailPage';
import TableCreatePage from './pages/TableCreatePage';
import DashboardPage from './pages/DashboardPage';

function App() {
  return (
    <div className="app-root" style={cssVariables}>
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/tables" element={<TableBrowsePage />} />
          <Route path="/tables/create" element={<TableCreatePage />} />
          <Route path="/table/:id" element={<TableDetailPage />} />
          <Route path="/datasources" element={<DataSourcePage />} />
          <Route path="/data-sources" element={<DataSourcePage />} />
          <Route path="/import" element={<ImportPage />} />
          <Route path="/lineage" element={<LineagePage />} />
          <Route path="/lineage-management" element={<LineageManagement />} />
          <Route path="/analytics" element={<LineagePage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </div>
  );
}

export default App;
