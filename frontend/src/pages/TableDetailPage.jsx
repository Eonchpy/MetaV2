import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Table, Spin, Tag, Space, Tooltip, Badge, Empty } from 'antd';
import {
  ArrowLeftIcon,
  ArrowDownTrayIcon,
  ArrowPathIcon,
  LinkIcon,
  CodeBracketIcon,
  InformationCircleIcon,
  CalendarIcon,
  ClockIcon,
  ServerIcon,
  CloudIcon,
  TableCellsIcon,
  KeyIcon,
  ShieldCheckIcon,
  ExclamationTriangleIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';
import { tableMetadataApi, columnMetadataApi, lineageApi } from '../services/api';
import PageCard from '../components/layout/PageCard';
import Button from '../components/ui/Button';
import Tabs from '../components/ui/Tabs';
import { typography } from '../theme/theme';
import './TableDetailPage.css';

const TableDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [tableInfo, setTableInfo] = useState(null);
  const [columns, setColumns] = useState([]);
  const [lineageData, setLineageData] = useState({ upstream: [], downstream: [] });
  const [loading, setLoading] = useState({
    table: true,
    columns: true,
    lineage: true
  });
  const [expandedLineage, setExpandedLineage] = useState({ upstream: true, downstream: true });
  const [activeTab, setActiveTab] = useState('structure');
  // 将useRef移到组件顶层，与其他hooks一起声明
  const cardRef = useRef(null);

  // 获取数据库类型对应的图标和颜色
  const getDatabaseInfo = (dbType) => {
    const typeMap = {
      oracle: { icon: <ServerIcon className="w-5 h-5" />, color: '#F59E0B', text: 'Oracle' },
      mysql: { icon: <ServerIcon className="w-5 h-5" />, color: '#2563EB', text: 'MySQL' },
      postgresql: { icon: <ServerIcon className="w-5 h-5" />, color: '#10B981', text: 'PostgreSQL' },
      es: { icon: <CloudIcon className="w-5 h-5" />, color: '#7C3AED', text: 'Elasticsearch' },
      mongo: { icon: <CloudIcon className="w-5 h-5" />, color: '#EF4444', text: 'MongoDB' }
    };
    // 添加空值检查，防止dbType为undefined时调用toLowerCase()报错
    const dbTypeStr = dbType && typeof dbType === 'string' ? dbType.toLowerCase() : '';
    return typeMap[dbTypeStr] || { icon: <ServerIcon className="w-5 h-5" />, color: '#6B7280', text: dbType || '未知数据库' };
  };

  // 获取字段约束类型对应的标签
  const getConstraintTag = (constraints) => {
    if (!constraints) return null;

    const constraintTags = [];
    if (constraints.primaryKey) {
      constraintTags.push(
        <div
          key="pk"
          className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-red-100 text-red-700 border border-red-200"
        >
          <KeyIcon className="w-3 h-3" />
          PK
        </div>
      );
    }
    if (constraints.foreignKey) {
      constraintTags.push(
        <div
          key="fk"
          className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-700 border border-blue-200"
        >
          <LinkIcon className="w-3 h-3" />
          FK
        </div>
      );
    }
    if (constraints.notNull) {
      constraintTags.push(
        <div
          key="nn"
          className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-orange-100 text-orange-700 border border-orange-200"
        >
          <ShieldCheckIcon className="w-3 h-3" />
          NOT NULL
        </div>
      );
    }
    if (constraints.unique) {
      constraintTags.push(
        <div
          key="uq"
          className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-green-100 text-green-700 border border-green-200"
        >
          <ExclamationTriangleIcon className="w-3 h-3" />
          UNIQUE
        </div>
      );
    }

    return constraintTags.length > 0 ? (
      <div className="flex items-center gap-1 flex-wrap">
        {constraintTags}
      </div>
    ) : null;
  };

  // 加载表信息
  const loadTableInfo = useCallback(async () => {
    setLoading(prev => ({ ...prev, table: true }));
    try {
      const response = await tableMetadataApi.getById(id);
      setTableInfo(response);
    } catch (error) {
      console.error('加载表信息失败:', error);
    } finally {
      setLoading(prev => ({ ...prev, table: false }));
    }
  }, [id]);

  // 加载表结构（列信息）
  const loadColumns = useCallback(async () => {
    setLoading(prev => ({ ...prev, columns: true }));
    try {
      // 使用tableMetadataApi.getById获取表信息，包含所有列信息，不受API分页限制
      const response = await tableMetadataApi.getById(id);
      // 确保返回的是表对象，并处理各种可能的响应格式
      const tableData = response.data || response;
      // 从表对象中获取列信息
      let columnData = [];
      if (tableData && tableData.columns) {
        columnData = Array.isArray(tableData.columns) ? tableData.columns : [];
      }
      // 添加索引，并按位置排序（如果有排序信息）
      const sortedColumns = columnData.sort((a, b) => {
        if (a.position !== undefined && b.position !== undefined) {
          return a.position - b.position;
        }
        return 0;
      }).map((col, index) => ({
        ...col,
        index
      }));
      setColumns(sortedColumns);
    } catch (error) {
      console.error('加载表结构失败:', error);
      // 显示错误提示
      setColumns([]);
    } finally {
      setLoading(prev => ({ ...prev, columns: false }));
    }
  }, [id]);

  // 加载血缘关系
  const loadLineageData = useCallback(async () => {
    setLoading(prev => ({ ...prev, lineage: true }));
    try {
      console.log('开始加载血缘关系数据，当前表ID:', id);
      
      // 并行加载上下游血缘关系
      const [upstreamResponse, downstreamResponse] = await Promise.all([
        lineageApi.getAllTableRelations({ target_table_id: id }),
        lineageApi.getAllTableRelations({ source_table_id: id })
      ]);
      
      console.log('上游数据响应:', upstreamResponse);
      console.log('下游数据响应:', downstreamResponse);
      
      // 处理上游血缘数据
      let upstreamData = [];
      if (upstreamResponse) {
        if (Array.isArray(upstreamResponse.data)) {
          upstreamData = upstreamResponse.data;
        } else if (Array.isArray(upstreamResponse)) {
          upstreamData = upstreamResponse;
        }
      }
      console.log('上游数据处理后:', upstreamData);
      
      // 处理下游血缘数据
      let downstreamData = [];
      if (downstreamResponse) {
        if (Array.isArray(downstreamResponse.data)) {
          downstreamData = downstreamResponse.data;
        } else if (Array.isArray(downstreamResponse)) {
          downstreamData = downstreamResponse;
        }
        
        console.log('下游原始数据:', downstreamData);
      }
      
      setLineageData({ upstream: upstreamData, downstream: downstreamData });
    } catch (error) {
      console.error('加载血缘关系失败:', error);
      // 保持数据为空，不影响页面展示
    } finally {
      setLoading(prev => ({ ...prev, lineage: false }));
    }
  }, [id]);

  // 初始加载数据
  useEffect(() => {
    if (id) {
      loadTableInfo();
      loadColumns();
      loadLineageData();
    }
  }, [id, loadTableInfo, loadColumns, loadLineageData]);

  // 刷新数据
  const handleRefresh = () => {
    loadTableInfo();
    loadColumns();
    loadLineageData();
  };

  // 返回上一页
  const handleBack = () => {
    navigate(-1);
  };

  // 导出表结构
  const handleExport = () => {
    if (columns.length === 0) {
      return;
    }
    
    // 简单的CSV导出实现
    const headers = ['字段名称', '数据类型', '长度/精度', '是否可空', '默认值', '描述', '约束'];
    const csvContent = [
      headers.join(','),
      ...columns.map(col => [
        `"${col.name || ''}"`,
        `"${col.data_type || ''}"`,
        `"${col.length || ''}"`,
        col.constraints?.notNull ? '否' : '是',
        `"${col.default_value || ''}"`,
        `"${col.description || ''}"`,
        `"${getConstraintTag(col.constraints)?.map(t => t.props.children).join(',') || ''}"`
      ].join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${tableInfo?.name || 'table'}_structure.csv`;
    link.click();
  };

  // 切换血缘关系展开/折叠
  const toggleLineageExpansion = (type) => {
    setExpandedLineage(prev => ({ ...prev, [type]: !prev[type] }));
  };

  // 跳转到其他表详情
  const handleTableNavigate = (tableId) => {
    navigate(`/table/${tableId}`);
  };

  // 表结构列定义
  const structureColumns = [
    {
      title: '序号',
      dataIndex: 'index',
      key: 'index',
      width: 60,
      render: (text) => text + 1
    },
    {
      title: '字段名称',
      dataIndex: 'name',
      key: 'name',
      ellipsis: true,
      sorter: (a, b) => (a.name || '').localeCompare(b.name || ''),
      render: (text) => (
        <Tooltip title={text}>
          <span style={{ fontWeight: 'bold' }}>{text || '-'}</span>
        </Tooltip>
      )
    },
    {
      title: '数据类型',
      dataIndex: 'data_type',
      key: 'data_type',
      ellipsis: true,
      sorter: (a, b) => (a.data_type || '').localeCompare(b.data_type || ''),
      render: (text) => (
        <Tag color="blue">{text || '-'}</Tag>
      )
    },
    {
      title: '长度/精度',
      dataIndex: 'length',
      key: 'length',
      ellipsis: true
    },
    {
      title: '约束条件',
      key: 'constraints',
      render: (_, record) => {
        const tags = getConstraintTag(record.constraints);
        return tags ? (
          <Space>
            {tags}
          </Space>
        ) : (
          <span>-</span>
        );
      }
    },
    {
      title: '默认值',
      dataIndex: 'default_value',
      key: 'default_value',
      ellipsis: true,
      render: (text) => (
        <Tooltip title={text}>
          <code>{text || '-'}</code>
        </Tooltip>
      )
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
      render: (text) => (
        <Tooltip title={text}>
          <span>{text || '-'}</span>
        </Tooltip>
      )
    }
  ];

  // 渲染血缘关系表
  const renderLineageTable = (data, title) => {
    if (!data || data.length === 0) {
      return <Empty description={`暂无${title}表`} />;
    }

    // 统计不同类型的血缘关系
    const relationTypes = new Set();
    data.forEach(item => {
      if (item.relation_type) {
        relationTypes.add(item.relation_type);
      }
    });

    return (
      <>
        {relationTypes.size > 0 && (
          <div style={{ marginBottom: '16px', fontSize: '14px', color: '#666' }}>
            <strong>关系类型：</strong>
            <Space>
              {Array.from(relationTypes).map(type => (
                <Tag key={type} color="grey">{type}</Tag>
              ))}
            </Space>
          </div>
        )}
        <Table
          columns={[
            {
              title: title === '上游' ? '源表' : '目标表',
              dataIndex: title === '上游' ? 'source_table_ids' : 'target_table_id',
              key: 'table',
              render: (value, record) => {
                if (Array.isArray(value)) {
                  // 处理上游表的source_table_ids数组
                  return (
                    <Space direction="vertical">
                      {value.map(tableId => {
                        // 尝试从多个可能的字段中获取表名
                        let tableName = `表ID:${tableId}`;
                        
                        // 尝试从source_tables数组中查找
                        if (record.source_tables && Array.isArray(record.source_tables)) {
                          const foundTable = record.source_tables.find(t => t.id === tableId);
                          if (foundTable?.name) {
                            tableName = foundTable.name;
                          }
                        }
                        
                        // 尝试直接从记录中获取表名信息（可能的其他字段名）
                        if (tableName.startsWith('表ID:') && record.source_table_name) {
                          tableName = record.source_table_name;
                        }
                        
                        // 尝试其他可能的字段名
                        if (tableName.startsWith('表ID:')) {
                          const possibleFields = ['source_table', 'source', 'table_name', 'name'];
                          for (const field of possibleFields) {
                            if (record[field]) {
                              // 确保只使用字符串类型的值
                              if (typeof record[field] === 'string') {
                                tableName = record[field];
                                break;
                              } else if (typeof record[field] === 'object' && record[field] !== null && record[field].name) {
                                // 如果是对象且有name属性，则使用name属性
                                tableName = record[field].name;
                                break;
                              }
                            }
                          }
                        }
                        
                        return (
                          <Tag
                            key={tableId}
                            color="blue"
                            style={{ cursor: 'pointer', padding: '4px 8px', marginBottom: '4px' }}
                            onClick={() => handleTableNavigate(tableId)}
                          >
                            {tableName}
                          </Tag>
                        );
                      })}
                    </Space>
                  );
                } else if (value) {
                  // 处理下游表的target_table_id
                  // 防御性检查：如果目标表ID等于当前表ID，则不显示
                  if (value === id) {
                    console.log('发现渲染时的自身引用，已跳过:', { value, id });
                    return null; // 不渲染自身引用
                  }
                  
                  // 尝试从多个可能的字段中获取表名
                  let tableName = `表ID:${value}`;
                  
                  // 尝试从target_tables数组或对象中查找
                  if (record.target_tables) {
                    if (Array.isArray(record.target_tables) && record.target_tables.length > 0) {
                      const targetTable = record.target_tables.find(t => t?.id === value) || record.target_tables[0];
                      if (targetTable?.name && targetTable.id !== id) { // 确保不是自身引用
                        tableName = targetTable.name;
                      }
                    } else if (typeof record.target_tables === 'object' && record.target_tables?.id !== id) {
                      if (record.target_tables?.name) {
                        tableName = record.target_tables.name;
                      }
                    }
                  }
                  
                  // 尝试直接从记录中获取表名信息（可能的其他字段名）
                  if (tableName.startsWith('表ID:')) {
                    const possibleFields = ['target_table_name', 'target_table', 'target', 'table_name', 'name'];
                    for (const field of possibleFields) {
                      if (record[field]) {
                        // 确保只使用字符串类型的值
                        if (typeof record[field] === 'string') {
                          tableName = record[field];
                          break;
                        } else if (typeof record[field] === 'object' && record[field] !== null && record[field].name) {
                          // 如果是对象且有name属性，则使用name属性
                          tableName = record[field].name;
                          break;
                        }
                      }
                    }
                  }
                  
                  return (
                    <Tag
                      color="green"
                      style={{ cursor: 'pointer', padding: '4px 8px' }}
                      onClick={() => handleTableNavigate(value)}
                    >
                      {tableName}
                    </Tag>
                  );
                }
                return <span>-</span>;
              }
            },
            {
              title: '关系类型',
              dataIndex: 'relation_type',
              key: 'relation_type',
              render: (text) => text ? (
                <Tag color="purple">{text}</Tag>
              ) : (
                <span>-</span>
              )
            },
            {
              title: '描述',
              dataIndex: 'description',
              key: 'description',
              ellipsis: true,
              render: (text) => (
                <Tooltip title={text}>
                  <span>{text || '-'}</span>
                </Tooltip>
              )
            },
            {
              title: '创建时间',
              dataIndex: 'created_at',
              key: 'created_at',
              sorter: true,
              render: (text) => text ? new Date(text).toLocaleString() : '未知'
            }
          ]}
          dataSource={data}
          rowKey="id"
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '50']
          }}
          size="small"
          className="lineage-table"
          rowClassName={(record) => record.is_direct_relation ? 'direct-relation-row' : ''}
        />
      </>
    );
  };

  if (loading.table) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <Spin size="large" tip="加载表信息中..." />
      </div>
    );
  }

  if (!tableInfo) {
    return (
      <div className="text-center py-16">
        <InformationCircleIcon className="w-16 h-16 text-muted mx-auto mb-4" />
        <h3 className="text-lg font-medium text-secondary mb-2">表不存在或已被删除</h3>
        <p className="text-muted mb-6">该表可能已被删除或ID无效</p>
        <Button
          variant="primary"
          icon={<ArrowLeftIcon className="w-4 h-4" />}
          onClick={handleBack}
        >
          返回列表
        </Button>
      </div>
    );
  }

  const { icon: dbIcon, color: dbColor, text: dbText } = getDatabaseInfo(tableInfo.database_type);
  const dbType = (tableInfo.database_type || '').toLowerCase();

  const tabItems = [
    { key: 'overview', label: '概览' },
    { key: 'structure', label: '表结构' },
    { key: 'lineage', label: '血缘关系' }
  ];

  return (
    <div className="table-detail-page" style={{ padding: 0 }}>
      {/* Page Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            icon={<ArrowLeftIcon className="w-4 h-4" />}
            onClick={handleBack}
          >
            返回
          </Button>
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div
                className="p-2 rounded-lg"
                style={{ backgroundColor: `${dbColor}15`, color: dbColor }}
              >
                {dbIcon}
              </div>
              <h1 style={typography.pageTitle} className="mb-0">
                {tableInfo.name || tableInfo.table_name}
              </h1>
              <div
                className="px-2 py-1 rounded-md text-sm font-medium"
                style={{
                  backgroundColor: `${dbColor}15`,
                  color: dbColor,
                  border: `1px solid ${dbColor}30`
                }}
              >
                {dbText}
              </div>
            </div>
            <p className="text-muted text-sm">
              {tableInfo.description || '暂无描述'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            icon={<ArrowPathIcon className="w-4 h-4" />}
            onClick={handleRefresh}
            loading={loading.table || loading.columns || loading.lineage}
          >
            刷新
          </Button>
          <Button
            variant="secondary"
            icon={<ArrowDownTrayIcon className="w-4 h-4" />}
            onClick={handleExport}
            disabled={columns.length === 0}
          >
            导出结构
          </Button>
        </div>
      </div>

      {/* Table Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <PageCard>
          <div className="flex items-center gap-3">
            <ServerIcon className="w-5 h-5 text-muted" />
            <div>
              <div className="text-sm text-muted mb-1">数据库</div>
              <div className="font-medium">{tableInfo.database_name || '-'}</div>
            </div>
          </div>
        </PageCard>

        <PageCard>
          <div className="flex items-center gap-3">
            <TableCellsIcon className="w-5 h-5 text-muted" />
            <div>
              <div className="text-sm text-muted mb-1">模式</div>
              <div className="font-medium">{tableInfo.schema_name || 'default'}</div>
            </div>
          </div>
        </PageCard>

        <PageCard>
          <div className="flex items-center gap-3">
            <div
              className="w-5 h-5 rounded flex items-center justify-center text-white text-xs font-bold"
              style={{ backgroundColor: dbColor }}
            >
              {columns.length}
            </div>
            <div>
              <div className="text-sm text-muted mb-1">字段数量</div>
              <div className="font-medium">{columns.length} 个字段</div>
            </div>
          </div>
        </PageCard>
      </div>

      {/* Tabs */}
      <Tabs
        items={tabItems}
        activeKey={activeTab}
        onChange={setActiveTab}
        className="mb-6"
      />

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 table-detail-table-wrapper">
          <PageCard title="基本信息">
            <div className="space-y-4">
              <div className="flex justify-between py-2 border-b border-subtle">
                <span className="text-muted">表名</span>
                <span className="font-medium">{tableInfo.name || tableInfo.table_name || '-'}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-subtle">
                <span className="text-muted">数据库类型</span>
                <div
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium"
                  style={{
                    backgroundColor: `${dbColor}15`,
                    color: dbColor,
                    border: `1px solid ${dbColor}30`
                  }}
                >
                  {dbIcon}
                  <span>{dbText}</span>
                </div>
              </div>
              <div className="flex justify-between py-2 border-b border-subtle">
                <span className="text-muted">数据库</span>
                <span className="font-medium">{tableInfo.database_name || '-'}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-subtle">
                <span className="text-muted">模式</span>
                <span className="font-medium">{tableInfo.schema_name || 'default'}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-muted">数据源</span>
                <span className="font-medium">{tableInfo.data_source?.name || '未知'}</span>
              </div>
            </div>
          </PageCard>

          <PageCard title="时间信息">
            <div className="space-y-4">
              <div className="flex justify-between py-2 border-b border-subtle">
                <div className="flex items-center gap-2 text-muted">
                  <CalendarIcon className="w-4 h-4" />
                  创建时间
                </div>
                <span className="font-medium">
                  {tableInfo.created_at ? new Date(tableInfo.created_at).toLocaleString() : '未知'}
                </span>
              </div>
              <div className="flex justify-between py-2">
                <div className="flex items-center gap-2 text-muted">
                  <ClockIcon className="w-4 h-4" />
                  更新时间
                </div>
                <span className="font-medium">
                  {tableInfo.updated_at ? new Date(tableInfo.updated_at).toLocaleString() : '未知'}
                </span>
              </div>
            </div>
          </PageCard>
        </div>
      )}

      {activeTab === 'structure' && (
        <PageCard title="表结构">
          <Spin spinning={loading.columns}>
            <div className="table-detail-table-wrapper">
              <Table
                className="modern-table"
                columns={structureColumns}
                dataSource={columns}
                rowKey="id"
                pagination={{
                  pageSize: 50,
                  total: columns.length,
                  showSizeChanger: true,
                  pageSizeOptions: ['10', '20', '50', '100', '200'],
                  showTotal: (total) => `共 ${total} 个字段`
                }}
                scroll={{ x: '100%' }}
                tableLayout="fixed"
                size="middle"
                locale={{
                  emptyText: (
                    <div className="text-center py-12">
                      <CodeBracketIcon className="w-16 h-16 text-muted mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-secondary mb-2">暂无字段信息</h3>
                      <p className="text-muted">该表还没有字段定义</p>
                    </div>
                  )
                }}
                rowClassName={(record, index) =>
                  index % 2 === 0 ? 'modern-table-row-even' : 'modern-table-row-odd'
                }
              />
            </div>
          </Spin>
        </PageCard>
      )}

      {activeTab === 'lineage' && (
        <div className="space-y-6 table-detail-table-wrapper">
          {/* 上游依赖 */}
          <PageCard
            title={
              <div className="flex items-center gap-2">
                <ChartBarIcon className="w-5 h-5 text-blue-500" />
                上游依赖表
                <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-700 rounded-md text-sm">
                  {lineageData.upstream.length}
                </span>
              </div>
            }
          >
            {renderLineageTable(lineageData.upstream, '上游')}
          </PageCard>

          {/* 下游引用 */}
          <PageCard
            title={
              <div className="flex items-center gap-2">
                <LinkIcon className="w-5 h-5 text-green-500" />
                下游引用表
                <span className="ml-2 px-2 py-1 bg-green-100 text-green-700 rounded-md text-sm">
                  {lineageData.downstream.length}
                </span>
              </div>
            }
          >
            {renderLineageTable(lineageData.downstream, '下游')}
          </PageCard>
        </div>
      )}
    </div>
  );
};

export default TableDetailPage;
