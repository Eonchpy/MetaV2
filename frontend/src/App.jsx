import React from 'react'
import { Routes, Route, Link, useLocation } from 'react-router-dom'
import { Layout, Menu } from 'antd'
import { DatabaseOutlined, LineChartOutlined, SettingOutlined, UploadOutlined, TableOutlined, PlusOutlined } from '@ant-design/icons'
import './App.css'

import DataSourcePage from './pages/DataSourcePage'
import LineagePage from './pages/LineagePage'
import SettingsPage from './pages/SettingsPage'
import ImportPage from './pages/ImportPage'
import TableBrowsePage from './pages/TableBrowsePage'
import TableDetailPage from './pages/TableDetailPage'
import TableCreatePage from './pages/TableCreatePage'

const { Header, Content, Sider } = Layout

function App() {
  const location = useLocation();
  const currentPath = location.pathname;
  
  return (
    <Layout className="app-layout">
      <Header className="app-header">
        <div className="app-logo">元数据管理系统</div>
      </Header>
      <Layout>
        <Sider width={200} className="app-sider">
          <Menu mode="inline" selectedKeys={[currentPath]}>
            <Menu.Item key="/tables" icon={<TableOutlined />}>
              <Link to="/tables">表浏览与搜索</Link>
            </Menu.Item>
            <Menu.Item key="/tables/create" icon={<PlusOutlined />}>
              <Link to="/tables/create">新建表结构</Link>
            </Menu.Item>
            <Menu.Item key="/datasources" icon={<DatabaseOutlined />}>
              <Link to="/datasources">数据源管理</Link>
            </Menu.Item>
            <Menu.Item key="/import" icon={<UploadOutlined />}>
              <Link to="/import">数据导入与血缘配置</Link>
            </Menu.Item>
            <Menu.Item key="/lineage" icon={<LineChartOutlined />}>
              <Link to="/lineage">血缘关系分析</Link>
            </Menu.Item>
            <Menu.Item key="/settings" icon={<SettingOutlined />}>
              <Link to="/settings">系统设置</Link>
            </Menu.Item>
          </Menu>
        </Sider>
        <Layout className="app-content-layout">
          <Content className="app-content">
            <Routes>
              <Route path="/" element={<TableBrowsePage />} />
              <Route path="/tables" element={<TableBrowsePage />} />
              <Route path="/tables/create" element={<TableCreatePage />} />
              <Route path="/table/:id" element={<TableDetailPage />} />
              <Route path="/datasources" element={<DataSourcePage />} />
              <Route path="/import" element={<ImportPage />} />
              <Route path="/lineage" element={<LineagePage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Routes>
          </Content>
        </Layout>
      </Layout>
    </Layout>
  )
}

export default App;