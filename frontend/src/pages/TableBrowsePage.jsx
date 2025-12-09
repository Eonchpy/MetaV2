import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Table, Empty, Tag, Dropdown, Menu, Space, Checkbox, Tooltip } from 'antd';
import { Link, useNavigate } from 'react-router-dom';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  ArrowPathIcon,
  AdjustmentsHorizontalIcon,
  ServerIcon,
  CloudIcon,
  CalendarIcon,
  ClockIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  EllipsisHorizontalIcon,
} from '@heroicons/react/24/outline';
import { tableMetadataApi } from '../services/api';
import PageCard from '../components/layout/PageCard';
import Button from '../components/ui/Button';
import SearchInput from '../components/ui/SearchInput';
import { typography } from '../theme/theme';
import './TableBrowsePage.css';

const TableBrowsePage = () => {
  const navigate = useNavigate();
  
  // 状态管理
  const [tableData, setTableData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10 });
  const [totalCount, setTotalCount] = useState(0);
  const [sortConfig, setSortConfig] = useState({ field: 'table_name', order: 'asc' });
  const [showColumns, setShowColumns] = useState([
    'id', 'table_name', 'database_name', 'schema_name', 'description', 
    'db_type', 'created_at', 'updated_at'
  ]);
  
  // 状态变量：已选中的行
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  
  // 防抖搜索
  const searchTimeoutRef = useRef(null);
  
  // 数据库类型图标映射
  const getDatabaseTypeIcon = (dbType) => {
    const typeMap = {
      mysql: { icon: <ServerIcon className="w-4 h-4" />, color: '#2563EB', text: 'MySQL' },
      postgresql: { icon: <ServerIcon className="w-4 h-4" />, color: '#7C3AED', text: 'PostgreSQL' },
      oracle: { icon: <ServerIcon className="w-4 h-4" />, color: '#10B981', text: 'Oracle' },
      sqlserver: { icon: <ServerIcon className="w-4 h-4" />, color: '#EF4444', text: 'SQL Server' },
      hive: { icon: <ServerIcon className="w-4 h-4" />, color: '#F59E0B', text: 'Hive' },
      presto: { icon: <ServerIcon className="w-4 h-4" />, color: '#F97316', text: 'Presto' },
      clickhouse: { icon: <ServerIcon className="w-4 h-4" />, color: '#06B6D4', text: 'ClickHouse' },
      mongo: { icon: <CloudIcon className="w-4 h-4" />, color: '#EF4444', text: 'MongoDB' }
    };
    const dbTypeStr = dbType || 'unknown';
    return typeMap[dbTypeStr.toLowerCase()] || { icon: <ServerIcon className="w-4 h-4" />, color: '#6B7280', text: dbTypeStr };
  };

  const hexToRgb = (hex) => {
    const normalized = hex.replace('#', '');
    const chunk = normalized.length === 3
      ? normalized.split('').map(c => c + c).join('')
      : normalized;
    const int = parseInt(chunk, 16);
    return {
      r: (int >> 16) & 255,
      g: (int >> 8) & 255,
      b: int & 255,
    };
  };

  const buildPillStyle = (hexColor, textColor) => {
    const { r, g, b } = hexToRgb(hexColor || '#6B7280');
    return {
      backgroundColor: `rgba(${r}, ${g}, ${b}, 0.08)`,
      color: textColor || hexColor || '#374151',
      borderRadius: '6px',
      padding: '2px 8px',
      fontSize: '12px',
      lineHeight: '20px',
      display: 'inline-flex',
      alignItems: 'center',
      gap: '6px',
      border: 'none'
    };
  };
  
  // 加载表数据
  const loadTableData = async (params = {}) => {
    setLoading(true);
    try {
      const response = await tableMetadataApi.getAll({
        page: params.current || 1,
        page_size: params.pageSize || 10,
        keyword: searchText,
        sort_field: sortConfig.field,
        sort_order: sortConfig.order
      });
      // 处理新的API响应格式
      console.log('API响应数据:', response);
      if (response.data && response.data.length > 0) {
        console.log('第一条记录结构:', response.data[0]);
        console.log('可用字段:', Object.keys(response.data[0]));
      }
      setTableData(response.data || []);
      setTotalCount(response.total || 0);
    } catch (error) {
      console.error('加载表数据失败:', error);
      setTableData([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  };
  
  // 防抖搜索
  const onSearchChange = (value) => {
    setSearchText(value);

    // 清除之前的定时器
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // 设置新的定时器
    searchTimeoutRef.current = setTimeout(() => {
      handleSearch(value);
    }, 500);
  };

  // 处理搜索
  const handleSearch = (value) => {
    setPagination({ ...pagination, current: 1 });
    loadTableData({ current: 1, pageSize: pagination.pageSize });
  };
  
  // 处理分页变化
  const handlePageChange = (page, pageSize) => {
    setPagination({ current: page, pageSize });
    loadTableData({ current: page, pageSize });
  };
  
  // 处理排序
  const handleTableChange = (pagination, filters, sorter) => {
    if (sorter.field && sorter.order) {
      setSortConfig({
        field: sorter.field,
        order: sorter.order === 'ascend' ? 'asc' : 'desc'
      });
    }
    handlePageChange(pagination.current, pagination.pageSize);
  };
  
  // 处理列显示/隐藏
  const handleColumnToggle = (columnKey, checked) => {
    if (checked) {
      setShowColumns([...showColumns, columnKey]);
    } else {
      setShowColumns(showColumns.filter(key => key !== columnKey));
    }
  };
  
  // 刷新数据
  const handleRefresh = () => {
    loadTableData(pagination);
  };
  
  // 处理全选
  const onSelectAllChange = (checked) => {
    if (checked) {
      setSelectedRowKeys(tableData.map(row => row.id));
    } else {
      setSelectedRowKeys([]);
    }
  };
  
  // 处理导出选中
  const handleExportSelected = () => {
    // 导出功能实现
    console.log('导出选中的表:', selectedRowKeys);
  };
  
  // 获取右键菜单
  const getContextMenu = (tableId) => ({
    items: [
      {
        key: 'open',
        label: '在当前标签页打开',
        onClick: () => navigate(`/table/${tableId}`)
      },
      {
        key: 'openNew',
        label: '在新标签页打开',
        onClick: () => window.open(`/table/${tableId}`, '_blank')
      }
    ]
  });
  
  // 列配置
  const columns = [
    {
      title: '表名',
      key: 'table_name',
      sorter: true,
      ellipsis: true,
      width: 250,
      render: (_, record) => {
        const tableName = record.table_name || record.name || record.table || '未知表名';
        return (
          <div className="flex items-center gap-2">
            <Tooltip title={tableName}>
              <Link
                to={`/table/${record.id}`}
                className="text-primary hover:text-primary-hover font-medium transition-colors"
              >
                {tableName}
              </Link>
            </Tooltip>
          </div>
        );
      }
    },
    {
      title: '数据库',
      dataIndex: 'database_name',
      key: 'database_name',
      sorter: true,
      ellipsis: true,
      width: 150,
      render: (text) => (
        <span className="text-secondary">{text || '-'}</span>
      )
    },
    {
      title: '模式',
      dataIndex: 'schema_name',
      key: 'schema_name',
      ellipsis: true,
      width: 120,
      render: (text) => (
        <span className="text-muted text-sm">{text || 'default'}</span>
      )
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
      render: (text) => (
        <Tooltip title={text || '暂无描述'}>
          <span className="text-sm text-secondary">
            {text || '暂无描述'}
          </span>
        </Tooltip>
      )
    },
    {
      title: '数据库类型',
      dataIndex: 'db_type',
      key: 'db_type',
      width: 120,
      render: (dbType) => {
        const { icon, color, text } = getDatabaseTypeIcon(dbType);
        const pillStyle = buildPillStyle(color, color === '#6B7280' ? '#374151' : color);
        return (
          <div className="inline-flex items-center font-medium" style={pillStyle}>
            {icon}
            <span>{text}</span>
          </div>
        );
      }
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      sorter: true,
      width: 120,
      render: (date) => (
        <Tooltip title={new Date(date).toLocaleString()}>
          <div className="flex items-center gap-1 text-sm text-muted">
            <ClockIcon className="w-4 h-4" />
            <span>{new Date(date).toLocaleDateString()}</span>
          </div>
        </Tooltip>
      )
    },
    {
      title: '更新时间',
      dataIndex: 'updated_at',
      key: 'updated_at',
      sorter: true,
      width: 120,
      render: (date) => (
        <Tooltip title={new Date(date).toLocaleString()}>
          <div className="flex items-center gap-1 text-sm text-muted">
            <CalendarIcon className="w-4 h-4" />
            <span>{new Date(date).toLocaleDateString()}</span>
          </div>
        </Tooltip>
      )
    },
    {
      title: '操作',
      key: 'actions',
      width: 80,
      render: (_, record) => (
        <div className="flex items-center gap-1">
          <Tooltip title="查看详情">
            <button
              onClick={() => navigate(`/table/${record.id}`)}
              className="p-1 text-muted hover:text-primary hover:bg-primary-soft rounded transition-colors"
            >
              <EyeIcon className="w-4 h-4" />
            </button>
          </Tooltip>
          <Tooltip title="更多操作">
            <Dropdown
              menu={{
                items: [
                  {
                    key: 'view',
                    label: '查看详情',
                    icon: <EyeIcon className="w-4 h-4" />,
                    onClick: () => navigate(`/table/${record.id}`)
                  },
                  {
                    key: 'edit',
                    label: '编辑',
                    icon: <PencilIcon className="w-4 h-4" />,
                    onClick: () => console.log('Edit table:', record.id)
                  },
                  {
                    type: 'divider'
                  },
                  {
                    key: 'delete',
                    label: '删除',
                    icon: <TrashIcon className="w-4 h-4" />,
                    danger: true,
                    onClick: () => console.log('Delete table:', record.id)
                  }
                ]
              }}
              trigger={['click']}
              placement="bottomRight"
            >
              <button className="p-1 text-muted hover:text-primary hover:bg-primary-soft rounded transition-colors">
                <EllipsisHorizontalIcon className="w-4 h-4" />
              </button>
            </Dropdown>
          </Tooltip>
        </div>
      )
    }
  ];
  
  // 可见列
  const visibleColumns = useMemo(() => {
    return columns.filter(column => showColumns.includes(column.key));
  }, [showColumns, columns]);
  
  // 列筛选菜单
  const columnFilterMenu = {
    items: columns.map(column => ({
      key: column.key,
      label: (
        <Space>
          <Checkbox
            checked={showColumns.includes(column.key)}
            onChange={(e) => handleColumnToggle(column.key, e.target.checked)}
          />
          <span>{column.title}</span>
        </Space>
      )
    }))
  };
  
  // 初始化加载数据
  useEffect(() => {
    loadTableData(pagination);
    
    // 清理函数
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);
  
  return (
    <div style={{ padding: 0 }}>
      {/* Page Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 style={typography.pageTitle} className="mb-1">数据表管理</h1>
          <p className="text-muted text-sm">管理和浏览系统中的所有数据表</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="primary"
            icon={<PlusIcon className="w-4 h-4" />}
            onClick={() => navigate('/tables/create')}
          >
            新建表
          </Button>
          <Button
            variant="ghost"
            icon={<ArrowPathIcon className="w-4 h-4" />}
            onClick={handleRefresh}
            loading={loading}
          >
            刷新
          </Button>
        </div>
      </div>

      {/* Search and Filters Card */}
      <PageCard className="mb-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 flex-1">
            <SearchInput
              value={searchText}
              onChange={onSearchChange}
              placeholder="搜索表名、数据库或描述..."
              size="lg"
              className="flex-1 max-w-md"
            />

            <Dropdown
              menu={{
                items: [
                  {
                    key: 'all',
                    label: (
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={selectedRowKeys.length === tableData.length}
                          indeterminate={selectedRowKeys.length > 0 && selectedRowKeys.length < tableData.length}
                          onChange={onSelectAllChange}
                        />
                        <span>全选所有表</span>
                      </div>
                    )
                  },
                  {
                    key: 'export',
                    label: '导出选中项',
                    disabled: selectedRowKeys.length === 0,
                    onClick: handleExportSelected
                  },
                  {
                    key: 'divider',
                    type: 'divider'
                  },
                  {
                    key: 'columns',
                    label: '列筛选',
                    icon: <AdjustmentsHorizontalIcon className="w-4 h-4" />,
                    children: columns.map(column => ({
                      key: column.key,
                      label: (
                        <div className="flex items-center gap-2">
                          <Checkbox
                            checked={showColumns.includes(column.key)}
                            onChange={(e) => handleColumnToggle(column.key, e.target.checked)}
                          />
                          <span>{column.title}</span>
                        </div>
                      )
                    }))
                  }
                ]
              }}
              trigger={['click']}
              placement="bottomLeft"
            >
              <Button variant="secondary" icon={<AdjustmentsHorizontalIcon className="w-4 h-4" />}>
                筛选
              </Button>
            </Dropdown>
          </div>

          {selectedRowKeys.length > 0 && (
            <div className="flex items-center gap-2 px-3 py-2 bg-primary-soft rounded-md">
              <span className="text-primary text-sm font-medium">
                已选择 {selectedRowKeys.length} 项
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedRowKeys([])}
              >
                清除选择
              </Button>
            </div>
          )}
        </div>
      </PageCard>

      {/* Data Table Card */}
      <PageCard>
        <div className="modern-table-container">
          <Table
            columns={visibleColumns}
            dataSource={tableData}
            rowKey="id"
            loading={loading}
            size="middle"
            pagination={{
              current: pagination.current,
              pageSize: pagination.pageSize,
              total: totalCount,
              onChange: handlePageChange,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total, range) =>
                `显示 ${range[0]}-${range[1]} 条，共 ${total} 条记录`,
              pageSizeOptions: ['10', '20', '50', '100']
            }}
            rowSelection={{
              selectedRowKeys,
              onChange: (newSelectedRowKeys) => setSelectedRowKeys(newSelectedRowKeys),
              columnWidth: 50
            }}
            onChange={handleTableChange}
            scroll={{ x: 'max-content' }}
            className="modern-table"
            rowClassName={(record, index) =>
              index % 2 === 0 ? 'modern-table-row-even' : 'modern-table-row-odd'
            }
            onRow={(record) => ({
              className: 'modern-table-row cursor-pointer hover:bg-gray-50',
              onClick: (e) => {
                // Prevent navigation if clicking on buttons or links
                if (e.target.closest('button, a, .ant-dropdown')) return;
                navigate(`/table/${record.id}`);
              }
            })}
          />
        </div>

        {tableData.length === 0 && !loading && (
          <div className="text-center py-12">
            <ServerIcon className="w-16 h-16 text-muted mx-auto mb-4" />
            <h3 className="text-lg font-medium text-secondary mb-2">暂无数据表</h3>
            <p className="text-muted mb-6">
              {searchText ? '没有找到匹配的数据表，请尝试调整搜索条件' : '系统中还没有任何数据表'}
            </p>
            {!searchText && (
              <Button
                variant="primary"
                icon={<PlusIcon className="w-4 h-4" />}
                onClick={() => navigate('/tables/create')}
              >
                创建第一个数据表
              </Button>
            )}
          </div>
        )}
      </PageCard>
    </div>
  );
};

export default TableBrowsePage;
