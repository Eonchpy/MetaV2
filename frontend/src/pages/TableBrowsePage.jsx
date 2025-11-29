import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Table, Input, Button, Pagination, Empty, Tag, Dropdown, Menu, Space, Checkbox, Tooltip } from 'antd';
import { SearchOutlined, ReloadOutlined, FilterOutlined, DatabaseOutlined, CloudServerOutlined, CalendarOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { Link, useNavigate } from 'react-router-dom';
import { tableMetadataApi } from '../services/api';
import './TablePages.css';

const { Search } = Input;

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
      mysql: { icon: <DatabaseOutlined />, color: 'blue', text: 'MySQL' },
      postgresql: { icon: <DatabaseOutlined />, color: 'purple', text: 'PostgreSQL' },
      oracle: { icon: <DatabaseOutlined />, color: 'green', text: 'Oracle' },
      sqlserver: { icon: <DatabaseOutlined />, color: 'red', text: 'SQL Server' },
      hive: { icon: <DatabaseOutlined />, color: 'yellow', text: 'Hive' },
      presto: { icon: <DatabaseOutlined />, color: 'orange', text: 'Presto' },
      clickhouse: { icon: <DatabaseOutlined />, color: 'cyan', text: 'ClickHouse' },
      mongo: { icon: <CloudServerOutlined />, color: 'red', text: 'MongoDB' }
    };
    const dbTypeStr = dbType || 'unknown';
    return typeMap[dbTypeStr.toLowerCase()] || { icon: <DatabaseOutlined />, color: 'default', text: dbTypeStr };
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
  const onSearchChange = (e) => {
    const value = e.target.value;
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
      render: (_, record) => {
        const tableName = record.table_name || record.name || record.table || '未知表名';
        return (
          <Tooltip title={tableName}>
            <Link to={`/table/${record.id}`} className="table-link">
              {tableName}
            </Link>
          </Tooltip>
        );
      }
    },
    {
      title: '数据库',
      dataIndex: 'database_name',
      key: 'database_name',
      sorter: true,
      ellipsis: true
    },
    {
      title: '模式',
      dataIndex: 'schema_name',
      key: 'schema_name',
      ellipsis: true
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
      render: (text) => (
        <Tooltip title={text || '暂无描述'}>
          <span>{text || '暂无描述'}</span>
        </Tooltip>
      )
    },
    {
      title: '数据库类型',
      dataIndex: 'db_type',
      key: 'db_type',
      render: (dbType) => {
        const { icon, color, text } = getDatabaseTypeIcon(dbType);
        return (
          <Tag icon={icon} color={color}>
            {text}
          </Tag>
        );
      }
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      sorter: true,
      render: (date) => (
        <Tooltip title={new Date(date).toLocaleString()}>
          <span>
            <ClockCircleOutlined className="time-icon" />
            {new Date(date).toLocaleDateString()}
          </span>
        </Tooltip>
      )
    },
    {
      title: '更新时间',
      dataIndex: 'updated_at',
      key: 'updated_at',
      sorter: true,
      render: (date) => (
        <Tooltip title={new Date(date).toLocaleString()}>
          <span>
            <CalendarOutlined className="time-icon" />
            {new Date(date).toLocaleDateString()}
          </span>
        </Tooltip>
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
    <div className="table-browse-page">
      <div className="page-header">
        <h1>表浏览</h1>
        <div className="header-actions">
          <Space.Compact>
              <Input.Search
                placeholder="搜索表名或描述"
                allowClear
                enterButton
                size="middle"
                value={searchText}
                onChange={onSearchChange}
                onSearch={handleSearch}
              />
            </Space.Compact>
          
          <Dropdown menu={columnFilterMenu}>
            <Button icon={<FilterOutlined />}>列筛选</Button>
          </Dropdown>
          
          <Dropdown 
            menu={{
              items: [
                {
                  key: 'all',
                  label: (
                    <Checkbox 
                      checked={selectedRowKeys.length === tableData.length}
                      indeterminate={selectedRowKeys.length > 0 && selectedRowKeys.length < tableData.length}
                      onChange={onSelectAllChange}
                    >
                      全选
                    </Checkbox>
                  )
                },
                {
                  key: 'download',
                  label: '导出选中',
                  disabled: selectedRowKeys.length === 0,
                  onClick: handleExportSelected
                },
                {
                  key: 'refresh',
                  label: '刷新',
                  onClick: handleRefresh
                }
              ]
            }}
            placement="bottomRight"
            trigger={['click']}
          >
            <Button type="primary">批量操作</Button>
          </Dropdown>
          
          <Button 
            icon={<ReloadOutlined />}
            onClick={handleRefresh}
          >
            刷新
          </Button>
        </div>
      </div>
      
      <Table
        columns={visibleColumns}
        dataSource={tableData}
        rowKey="id"
        loading={loading}
        pagination={{
          current: pagination.current,
          pageSize: pagination.pageSize,
          total: totalCount,
          onChange: handlePageChange,
          showSizeChanger: true,
          showTotal: (total) => `共 ${total} 条记录`
        }}
        rowSelection={{
          selectedRowKeys,
          onChange: (newSelectedRowKeys) => setSelectedRowKeys(newSelectedRowKeys)
        }}
        onChange={handleTableChange}
        expandable={{
          expandedRowRender: (record) => (
            <div className="table-row-expand">
              <p><strong>描述：</strong>{record.description || '暂无描述'}</p>
              <p><strong>创建时间：</strong>{new Date(record.created_at).toLocaleString()}</p>
              <p><strong>更新时间：</strong>{new Date(record.updated_at).toLocaleString()}</p>
              <p><strong>所属数据库：</strong>{record.database_name}</p>
              <p><strong>所属模式：</strong>{record.schema_name}</p>
            </div>
          ),
          rowExpandable: (record) => !!record.description
        }}
        onRow={(record) => ({
          onClick: () => navigate(`/table/${record.id}`),
          onContextMenu: (e) => {
            e.preventDefault();
            // 注意：这里只是获取菜单配置，实际的右键菜单需要使用Dropdown组件
          }
        })}
      />
    </div>
  );
};

export default TableBrowsePage;