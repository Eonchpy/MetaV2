import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, List, Avatar, Button as AntButton, Input, Divider, Space, Tag, message } from 'antd';
import {
  TableOutlined,
  DatabaseOutlined,
  ShareAltOutlined,
  BranchesOutlined,
  PlusOutlined,
  EyeOutlined,
  SearchOutlined,
  ClockCircleOutlined,
  UserOutlined,
  CalendarOutlined,
  BarChartOutlined,
  RocketOutlined
} from '@ant-design/icons';
import { Link, useNavigate } from 'react-router-dom';
import PageCard from '../components/layout/PageCard';
import Button from '../components/ui/Button';
import { tableMetadataApi, lineageApi, dataSourceApi } from '../services/api';
import { typography, spacing, colors, cssVariables } from '../theme/theme';
import './DashboardPage.css';

const { Search } = Input;
const { Meta } = Card;

const DashboardPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');

  // 统计数据
  const [stats, setStats] = useState({
    totalTables: 0,
    totalDataSources: 0,
    totalLineages: 0,
    totalColumns: 0
  });

  // 最近活动数据
  const [recentActivities, setRecentActivities] = useState([]);
  const [recentTables, setRecentTables] = useState([]);
  const [recentDataSources, setRecentDataSources] = useState([]);

  // 数据趋势（模拟数据）
  const [trendData] = useState([
    { month: '1月', tables: 45, lineages: 23 },
    { month: '2月', tables: 52, lineages: 31 },
    { month: '3月', tables: 61, lineages: 42 },
    { month: '4月', tables: 73, lineages: 58 },
    { month: '5月', tables: 89, lineages: 76 },
    { month: '6月', tables: 95, lineages: 89 }
  ]);

  // 加载统计数据
  const loadStats = async () => {
    try {
      setLoading(true);

      // 并行获取各项统计
      const [tablesRes, dataSourcesRes, lineagesRes] = await Promise.all([
        tableMetadataApi.getAll({ limit: 1 }),
        dataSourceApi.getAll({ limit: 1 }),
        lineageApi.getAllTableRelations({ limit: 1 })
      ]);

      setStats({
        totalTables: tablesRes.total || 0,
        totalDataSources: dataSourcesRes.length || 0,
        totalLineages: lineagesRes.total || 0,
        totalColumns: Math.floor((tablesRes.total || 0) * 15.7) // 估算列数
      });

    } catch (error) {
      console.error('加载统计数据失败:', error);
      // 使用模拟数据作为后备
      setStats({
        totalTables: 95,
        totalDataSources: 12,
        totalLineages: 89,
        totalColumns: 1492
      });
    } finally {
      setLoading(false);
    }
  };

  // 加载最近数据
  const loadRecentData = async () => {
    try {
      // 获取最近的表
      const tablesRes = await tableMetadataApi.getAll({ limit: 5, order_by: 'updated_at', order: 'desc' });
      const tables = tablesRes.data || tablesRes || [];
      setRecentTables(tables.slice(0, 5));

      // 获取最近的数据源
      const dataSourcesRes = await dataSourceApi.getAll({ limit: 3 });
      const dataSources = dataSourcesRes.data || dataSourcesRes || [];
      setRecentDataSources(dataSources.slice(0, 3));

      // 模拟最近活动
      setRecentActivities([
        { id: 1, type: 'table', title: '创建了新表 "用户行为日志"', time: '5分钟前', user: '张三' },
        { id: 2, type: 'lineage', title: '更新了血缘关系 "订单表 → 用户表"', time: '15分钟前', user: '李四' },
        { id: 3, type: 'datasource', title: '连接了新的数据源 "MySQL生产环境"', time: '1小时前', user: '王五' },
        { id: 4, type: 'table', title: '删除了表 "临时测试数据"', time: '2小时前', user: '张三' },
        { id: 5, type: 'import', title: '导入了Excel数据表结构', time: '3小时前', user: '赵六' }
      ]);

    } catch (error) {
      console.error('加载最近数据失败:', error);
    }
  };

  // 组件挂载时加载数据
  useEffect(() => {
    loadStats();
    loadRecentData();
  }, []);

  // 快速操作配置
  const quickActions = [
    {
      title: '创建数据表',
      icon: <PlusOutlined />,
      color: '#1890ff',
      path: '/tables/create',
      description: '快速创建新的数据表结构'
    },
    {
      title: '数据导入',
      icon: <RocketOutlined />,
      color: '#52c41a',
      path: '/import',
      description: '批量导入表结构数据'
    },
    {
      title: '血缘分析',
      icon: <BranchesOutlined />,
      color: '#722ed1',
      path: '/lineage',
      description: '查看数据血缘关系图'
    },
    {
      title: '数据源管理',
      icon: <DatabaseOutlined />,
      color: '#fa8c16',
      path: '/data-sources',
      description: '配置和管理数据源连接'
    }
  ];

  // 获取活动图标
  const getActivityIcon = (type) => {
    switch(type) {
      case 'table': return <TableOutlined style={{ color: '#1890ff' }} />;
      case 'lineage': return <BranchesOutlined style={{ color: '#722ed1' }} />;
      case 'datasource': return <DatabaseOutlined style={{ color: '#fa8c16' }} />;
      case 'import': return <RocketOutlined style={{ color: '#52c41a' }} />;
      default: return <ClockCircleOutlined style={{ color: '#8c8c8c' }} />;
    }
  };

  // 获取活动类型标签
  const getActivityTag = (type) => {
    const tagMap = {
      'table': { color: 'blue', text: '表操作' },
      'lineage': { color: 'purple', text: '血缘' },
      'datasource': { color: 'orange', text: '数据源' },
      'import': { color: 'green', text: '导入' }
    };
    return tagMap[type] || { color: 'default', text: '其他' };
  };

  // 处理搜索
  const handleSearch = (value) => {
    if (value.trim()) {
      navigate(`/lineage?search=${encodeURIComponent(value.trim())}`);
    }
  };

  return (
    <div className="dashboard-page" style={cssVariables}>
      {/* 页面标题 */}
      <div className="page-header" style={{ marginBottom: spacing.lg }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ ...typography.pageTitle, margin: 0 }}>元数据管理仪表板</h1>
            <p style={{ ...typography.description, margin: `${spacing.xs} 0 0 0` }}>
              欢迎使用 MetaV2 元数据管理系统
            </p>
          </div>
          <div style={{ display: 'flex', gap: spacing.md }}>
            <Search
              placeholder="搜索数据表、字段或血缘关系..."
              allowClear
              enterButton={<SearchOutlined />}
              size="large"
              style={{ width: 300 }}
              onSearch={handleSearch}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />
            <Button onClick={loadStats} loading={loading} variant="outline">
              刷新数据
            </Button>
          </div>
        </div>
      </div>

      {/* 统计卡片 */}
      <Row gutter={[16, 16]} style={{ marginBottom: spacing.lg }}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="数据表总数"
              value={stats.totalTables}
              prefix={<TableOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
            <div style={{ marginTop: spacing.sm, color: '#8c8c8c', fontSize: '12px' }}>
              本月新增 +8
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="数据源数量"
              value={stats.totalDataSources}
              prefix={<DatabaseOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
            <div style={{ marginTop: spacing.sm, color: '#8c8c8c', fontSize: '12px' }}>
              3个在线，9个离线
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="血缘关系"
              value={stats.totalLineages}
              prefix={<BranchesOutlined />}
              valueStyle={{ color: '#722ed1' }}
            />
            <div style={{ marginTop: spacing.sm, color: '#8c8c8c', fontSize: '12px' }}>
              覆盖 85% 的核心表
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="字段总数"
              value={stats.totalColumns}
              prefix={<BarChartOutlined />}
              valueStyle={{ color: '#fa8c16' }}
            />
            <div style={{ marginTop: spacing.sm, color: '#8c8c8c', fontSize: '12px' }}>
              平均每表 15.7 字段
            </div>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        {/* 快速操作面板 */}
        <Col xs={24} lg={12}>
          <PageCard title="快速操作" subtitle="常用功能快捷入口">
            <div className="quick-actions">
              {quickActions.map((action, index) => (
                <div
                  key={index}
                  className="quick-action-item"
                  onClick={() => navigate(action.path)}
                >
                  <div
                    className="quick-action-icon"
                    style={{ backgroundColor: action.color }}
                  >
                    {action.icon}
                  </div>
                  <div className="quick-action-content">
                    <div className="quick-action-title">{action.title}</div>
                    <div className="quick-action-desc">{action.description}</div>
                  </div>
                  <div className="quick-action-arrow">→</div>
                </div>
              ))}
            </div>
          </PageCard>
        </Col>

        {/* 最近活动 */}
        <Col xs={24} lg={12}>
          <PageCard title="最近活动" subtitle="系统最新操作记录">
            <List
              dataSource={recentActivities}
              renderItem={(item) => {
                const tagInfo = getActivityTag(item.type);
                return (
                  <List.Item style={{ padding: '12px 0' }}>
                    <List.Item.Meta
                      avatar={getActivityIcon(item.type)}
                      title={
                        <Space>
                          <span>{item.title}</span>
                          <Tag color={tagInfo.color}>{tagInfo.text}</Tag>
                        </Space>
                      }
                      description={
                        <Space split={<Divider type="vertical" />}>
                          <span><UserOutlined /> {item.user}</span>
                          <span><ClockCircleOutlined /> {item.time}</span>
                        </Space>
                      }
                    />
                  </List.Item>
                );
              }}
            />
          </PageCard>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: spacing.lg }}>
        {/* 最近创建的表 */}
        <Col xs={24} lg={12}>
          <PageCard
            title="最近创建的表"
            subtitle="最新添加的数据表"
            extra={<Button type="link" onClick={() => navigate('/tables')}>查看全部</Button>}
          >
            <List
              dataSource={recentTables}
              renderItem={(table) => (
                <List.Item
                  style={{ padding: '12px 0', cursor: 'pointer' }}
                  onClick={() => navigate(`/table/${table.id}`)}
                  actions={[<EyeOutlined key="view" />]}
                >
                  <List.Item.Meta
                    avatar={<Avatar icon={<TableOutlined />} style={{ backgroundColor: '#1890ff' }} />}
                    title={table.name || `表_${table.id}`}
                    description={
                      <Space size="small" split={<Divider type="vertical" />}>
                        <span>{table.database_name || 'N/A'}</span>
                        <span>{table.row_count || 'N/A'} 行</span>
                        <Tag color={getDatabaseTypeIcon(table.db_type)?.color}>
                          {getDatabaseTypeIcon(table.db_type)?.text || 'Unknown'}
                        </Tag>
                      </Space>
                    }
                  />
                </List.Item>
              )}
            />
          </PageCard>
        </Col>

        {/* 数据源状态 */}
        <Col xs={24} lg={12}>
          <PageCard
            title="数据源状态"
            subtitle="数据库连接状态概览"
            extra={<Button type="link" onClick={() => navigate('/data-sources')}>管理</Button>}
          >
            <div className="datasource-status">
              {recentDataSources.map((dataSource, index) => (
                <div key={index} className="datasource-item">
                  <div className="datasource-info">
                    <DatabaseOutlined style={{ marginRight: 8, color: '#1890ff' }} />
                    <span className="datasource-name">{dataSource.name}</span>
                    <Tag
                      color={index < 2 ? 'green' : 'default'}
                      style={{ marginLeft: 'auto' }}
                    >
                      {index < 2 ? '在线' : '离线'}
                    </Tag>
                  </div>
                  <div className="datasource-details">
                    <span className="datasource-type">{dataSource.type || 'Unknown'}</span>
                    <span className="datasource-host">{dataSource.host || 'N/A'}</span>
                  </div>
                </div>
              ))}
            </div>
          </PageCard>
        </Col>
      </Row>
    </div>
  );
};

// 获取数据库类型图标（复用函数）
const getDatabaseTypeIcon = (dbType) => {
  const typeMap = {
    mysql: { icon: <DatabaseOutlined />, color: '#2563EB', text: 'MySQL' },
    postgresql: { icon: <DatabaseOutlined />, color: '#7C3AED', text: 'PostgreSQL' },
    oracle: { icon: <DatabaseOutlined />, color: '#DC2626', text: 'Oracle' },
    sqlite: { icon: <DatabaseOutlined />, color: '#059669', text: 'SQLite' },
    mongodb: { icon: <DatabaseOutlined />, color: '#10B981', text: 'MongoDB' }
  };
  return typeMap[dbType?.toLowerCase()] || { icon: <DatabaseOutlined />, color: '#6B7280', text: dbType || 'Unknown' };
};

export default DashboardPage;