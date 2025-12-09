import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  TableCellsIcon,
  MagnifyingGlassIcon,
  ShareIcon,
  Cog6ToothIcon,
  ChartBarIcon,
  DocumentArrowDownIcon,
  HomeIcon,
  Square3Stack3DIcon,
} from '@heroicons/react/24/outline';
import { colors, spacing, radius, cssVariables } from '../../theme/theme';
import './AppLayout.css';

const AppLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeKey, setActiveKey] = useState('home');

  // Navigation configuration
  const navItems = [
    { key: 'home', label: '仪表板', icon: Square3Stack3DIcon, path: '/' },
    { key: 'tables', label: '数据表管理', icon: TableCellsIcon, path: '/tables' },
    { key: 'search', label: '搜索与血缘', icon: MagnifyingGlassIcon, path: '/lineage' },
    { key: 'sources', label: '数据源管理', icon: ShareIcon, path: '/data-sources' },
    { key: 'import', label: '数据导入', icon: DocumentArrowDownIcon, path: '/import' },
    { key: 'analytics', label: '数据分析', icon: ChartBarIcon, path: '/analytics' },
    { key: 'settings', label: '系统设置', icon: Cog6ToothIcon, path: '/settings' },
  ];

  // Update active key based on current route
  useEffect(() => {
    const currentPath = location.pathname;
    const activeItem = navItems.find(item =>
      item.path === currentPath || currentPath.startsWith(item.path + '/')
    );
    if (activeItem) {
      setActiveKey(activeItem.key);
    }
  }, [location.pathname]);

  const handleNavClick = (item) => {
    setActiveKey(item.key);
    navigate(item.path);
  };

  return (
    <div className="app-root" style={cssVariables}>
      {/* Sidebar */}
      <aside className="app-sidebar">
        {/* Logo Section */}
        <div className="sidebar-logo">
          <div className="logo-mark">M</div>
          <div className="logo-text">MetaV2</div>
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav">
          {navItems.map(item => (
            <button
              key={item.key}
              className={`sidebar-item ${activeKey === item.key ? 'active' : ''}`}
              onClick={() => handleNavClick(item)}
            >
              <item.icon className="sidebar-item-icon" />
              <span className="sidebar-item-label">{item.label}</span>
            </button>
          ))}
        </nav>

        {/* Footer Section - 可以在这里放置其他底部信息 */}
        <div className="sidebar-footer">
          {/* 底部区域暂时留空，可用于版本信息或其他底部内容 */}
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
};

export default AppLayout;