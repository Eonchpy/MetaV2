import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Table, Spin, Tag, Space, Button, Tooltip, Badge, Tabs, Empty } from 'antd';
import { DatabaseOutlined, CloudServerOutlined, ArrowLeftOutlined, DownloadOutlined, ReloadOutlined, LinkOutlined, CodeOutlined, InfoCircleOutlined, CalendarOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { tableMetadataApi, columnMetadataApi, lineageApi } from '../services/api';
import './TablePages.css';

const { TabPane } = Tabs;

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
      oracle: { icon: <DatabaseOutlined />, color: 'orange', text: 'Oracle' },
      mysql: { icon: <DatabaseOutlined />, color: 'blue', text: 'MySQL' },
      postgresql: { icon: <DatabaseOutlined />, color: 'green', text: 'PostgreSQL' },
      es: { icon: <CloudServerOutlined />, color: 'purple', text: 'Elasticsearch' },
      mongo: { icon: <CloudServerOutlined />, color: 'red', text: 'MongoDB' }
    };
    // 添加空值检查，防止dbType为undefined时调用toLowerCase()报错
    const dbTypeStr = dbType && typeof dbType === 'string' ? dbType.toLowerCase() : '';
    return typeMap[dbTypeStr] || { icon: <DatabaseOutlined />, color: 'default', text: dbType || '未知数据库' };
  };

  // 获取字段约束类型对应的标签
  const getConstraintTag = (constraints) => {
    if (!constraints) return null;
    
    const constraintTags = [];
    if (constraints.primaryKey) {
      constraintTags.push(<Tag color="red" key="pk">PK</Tag>);
    }
    if (constraints.foreignKey) {
      constraintTags.push(<Tag color="blue" key="fk">FK</Tag>);
    }
    if (constraints.notNull) {
      constraintTags.push(<Tag color="orange" key="nn">NOT NULL</Tag>);
    }
    if (constraints.unique) {
      constraintTags.push(<Tag color="green" key="uq">UNIQUE</Tag>);
    }
    
    return constraintTags.length > 0 ? constraintTags : null;
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
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <Spin size="large" tip="加载表信息中..." />
      </div>
    );
  }

  if (!tableInfo) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <Empty description="表不存在或已被删除" />
        <Button type="primary" icon={<ArrowLeftOutlined />} onClick={handleBack} style={{ marginTop: '20px' }}>
          返回列表
        </Button>
      </div>
    );
  }

  const { icon: dbIcon, color: dbColor, text: dbText } = getDatabaseInfo(tableInfo.database_type);
  const dbType = (tableInfo.database_type || '').toLowerCase();
  
  return (
    <div className="table-detail-container">
      {loading.table && (
        <div className="loading-container">
          <Spin size="large" tip="加载表信息中..." />
        </div>
      )}
      
      {!loading.table && tableInfo && (
        <>
          <div className="table-header">
            <div className="button-group">
              <Space size="middle">
                <Button icon={<ArrowLeftOutlined />} onClick={handleBack}>返回列表</Button>
                <Button type="primary" icon={<ReloadOutlined />} onClick={handleRefresh} loading={loading.table || loading.columns || loading.lineage}>
                  刷新数据
                </Button>
                <Button icon={<DownloadOutlined />} onClick={handleExport} disabled={columns.length === 0}>
                  导出表结构
                </Button>
              </Space>
            </div>
            
            <Card className="info-card" ref={cardRef}>
              <div className="table-title-section">
                <Space align="center">
                  {dbIcon}
                  <h1 className="table-name">{tableInfo.name}</h1>
                  <Badge color={dbColor} text={dbText} />
                </Space>
              </div>
              
              <div className="table-meta-info">
                <div className="meta-item">
                  <InfoCircleOutlined style={{ fontSize: '14px' }} />
                  <span className="meta-label">描述：</span>
                  <span>{tableInfo.description || '无描述'}</span>
                </div>
                
                {dbType === 'oracle' ? (
                  <div className="meta-item">
                    <DatabaseOutlined style={{ fontSize: '14px' }} />
                    <span className="meta-label">所属库：</span>
                    <span>{tableInfo.data_source?.name || '未知'}</span>
                  </div>
                ) : (
                  <div className="meta-item">
                    <CloudServerOutlined style={{ fontSize: '14px' }} />
                    <span className="meta-label">所属服务器：</span>
                    <span>{tableInfo.data_source?.name || '未知'}</span>
                  </div>
                )}
                
                <div className="meta-item">
                  <CalendarOutlined style={{ fontSize: '14px' }} />
                  <span className="meta-label">创建时间：</span>
                  <span>{tableInfo.created_at ? new Date(tableInfo.created_at).toLocaleString() : '未知'}</span>
                </div>
                
                <div className="meta-item">
                  <ClockCircleOutlined style={{ fontSize: '14px' }} />
                  <span className="meta-label">更新时间：</span>
                  <span>{tableInfo.updated_at ? new Date(tableInfo.updated_at).toLocaleString() : '未知'}</span>
                </div>
              </div>
            </Card>
          </div>
          
          <Tabs activeKey={activeTab} onChange={setActiveTab} className="table-tabs">
            {/* 表结构标签页 */}
            <TabPane tab={<span><CodeOutlined /> 表结构</span>} key="structure">
              <Card className="content-card">
                <div className="info-card-header">
                  <h2 className="info-card-title">表结构</h2>
                </div>
                <div className="info-card-content">
                  <Spin spinning={loading.columns}>
                    <Table
                      className="structure-table"
                      columns={structureColumns}
                      dataSource={columns}
                      rowKey="id"
                      pagination={{
                        pageSize: 50,
                        total: columns.length,
                        showSizeChanger: true,
                        pageSizeOptions: ['10', '20', '50', '100', '200']
                      }}
                      scroll={{ x: 'max-content' }}
                      size="middle"
                      locale={{
                        emptyText: (
                          <div className="empty-state">
                            <InfoCircleOutlined className="empty-state-icon" />
                            <p>暂无字段信息</p>
                          </div>
                        )
                      }}
                      rowClassName="table-row-hover"
                    />
                  </Spin>
                </div>
              </Card>
            </TabPane>

            {/* 血缘关系标签页 */}
            <TabPane tab={<span><LinkOutlined /> 血缘关系</span>} key="lineage">
              <Card className="content-card">
                <div className="info-card-header">
                  <h2 className="info-card-title">血缘关系</h2>
                </div>
                <div className="info-card-content">
                  <Spin spinning={loading.lineage}>
                    {/* 上游依赖 */}
                    <div className="lineage-section">
                      <div 
                        className="lineage-header" 
                        onClick={() => toggleLineageExpansion('upstream')}
                      >
                        <Badge color="blue" text="上游依赖表" style={{ flex: 1 }} />
                        <ArrowLeftOutlined rotate={expandedLineage.upstream ? 0 : -90} />
                      </div>
                      {expandedLineage.upstream && renderLineageTable(lineageData.upstream, '上游')}
                    </div>

                    {/* 下游引用 */}
                    <div className="lineage-section">
                      <div 
                        className="lineage-header" 
                        onClick={() => toggleLineageExpansion('downstream')}
                      >
                        <Badge color="green" text="下游引用表" style={{ flex: 1 }} />
                        <ArrowLeftOutlined rotate={expandedLineage.downstream ? 180 : -90} />
                      </div>
                      {expandedLineage.downstream && renderLineageTable(lineageData.downstream, '下游')}
                    </div>
                  </Spin>
                </div>
              </Card>
            </TabPane>
          </Tabs>
        </>
      )}
      
      {!loading.table && !tableInfo && (
        <div className="empty-state">
          <InfoCircleOutlined className="empty-state-icon" />
          <p>未找到表信息</p>
          <p>表ID可能无效或已被删除</p>
          <Button type="primary" icon={<ArrowLeftOutlined />} onClick={handleBack} style={{ marginTop: '16px' }}>
            返回列表
          </Button>
        </div>
      )}
    </div>
  );
};

export default TableDetailPage;