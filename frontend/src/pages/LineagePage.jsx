import React, { useState, useEffect, useRef } from 'react';
import { Card, Tabs, Select, Button, Input, message, Spin, Modal, Form, Table } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import * as echarts from 'echarts';
import axios from 'axios';
import { tableMetadataApi, lineageApi } from '../services/api';

const { TabPane } = Tabs;
const { Option } = Select;
const { TextArea } = Input;

const LineagePage = () => {
  const [loading, setLoading] = useState(false);
  const [tables, setTables] = useState([]);
  const [selectedTable, setSelectedTable] = useState(null);
  const [selectedColumn, setSelectedColumn] = useState(null);
  const [tableColumns, setTableColumns] = useState([]);
  const [graphData, setGraphData] = useState(null);
  const [activeTab, setActiveTab] = useState('table');
  const [isDetailModalVisible, setIsDetailModalVisible] = useState(false);
  const [currentRelation, setCurrentRelation] = useState(null);
  const [tableLineageList, setTableLineageList] = useState([]);
  const [columnLineageList, setColumnLineageList] = useState([]);
  const [form] = Form.useForm();
  
  // 为表级和列级血缘分别创建独立的图表引用
  const tableChartRef = useRef(null);
  const columnChartRef = useRef(null);
  const tableChartInstance = useRef(null);
  const columnChartInstance = useRef(null);

  // 获取所有表
  const fetchTables = async () => {
    try {
      setLoading(true);
      const response = await tableMetadataApi.getAll({ page: 1, page_size: 1000 });
      console.log('表数据响应:', response);
      // 假设响应是一个列表，如果是分页对象则取items
      let tableList = Array.isArray(response) ? response : response.items || [];
      
      // 如果没有表数据，添加默认表作为兜底
      if (tableList.length === 0) {
        console.log('没有获取到表数据，使用默认表');
        tableList = [
          { id: 1, name: 'dw_customer_order', schema_name: '默认模式' },
          { id: 2, name: 'order_detail', schema_name: '默认模式' },
          { id: 3, name: 'customer_info', schema_name: '默认模式' }
        ];
      }
      
      console.log('处理后的表列表:', tableList);
      setTables(tableList);
    } catch (error) {
      console.error('获取表列表错误:', error);
      message.error('获取表列表失败');
      // 错误时也添加默认表
      setTables([
        { id: 1, name: 'dw_customer_order', schema_name: '默认模式' },
        { id: 2, name: 'order_detail', schema_name: '默认模式' },
        { id: 3, name: 'customer_info', schema_name: '默认模式' }
      ]);
    } finally {
      setLoading(false);
    }
  };

  // 获取表的所有列
  const fetchTableColumns = async (tableId) => {
    try {
      setLoading(true);
      console.log('开始获取表ID为', tableId, '的列信息');
      const response = await tableMetadataApi.getById(tableId);
      console.log('获取列信息响应:', response);
      
      let columns = [];
      if (response && response.columns && Array.isArray(response.columns)) {
        columns = response.columns;
        console.log('成功获取到列数据，数量:', columns.length);
        // 打印前几列数据进行调试
        console.log('列数据示例:', columns.slice(0, 3));
      } else {
        console.log('未获取到列数据，使用默认列');
        // 如果没有列数据，添加默认列作为兜底
        columns = [
          { id: 1, name: 'id', data_type: 'int' },
          { id: 2, name: 'name', data_type: 'string' },
          { id: 3, name: 'created_at', data_type: 'datetime' }
        ];
      }
      
      setTableColumns(columns);
      
      // 如果当前是列级血缘标签页且有列数据，自动选择第一个列
      if (activeTab === 'column' && columns.length > 0) {
        const firstColumn = columns[0];
        console.log('自动选择第一个列:', firstColumn.id, firstColumn.name);
        setSelectedColumn(firstColumn);
        // 异步调用，避免在状态更新期间执行
        setTimeout(() => {
          fetchColumnLineageGraph(firstColumn.id);
        }, 0);
      } else if (activeTab === 'column') {
        console.log('没有列数据可选择');
      }
    } catch (error) {
      console.error('获取列列表错误:', error);
      message.error('获取列列表失败');
      // 错误时也添加默认列
      const defaultColumns = [
        { id: 1, name: 'id', data_type: 'int' },
        { id: 2, name: 'name', data_type: 'string' },
        { id: 3, name: 'created_at', data_type: 'datetime' }
      ];
      setTableColumns(defaultColumns);
      
      // 错误时也尝试使用默认列
      if (activeTab === 'column') {
        setSelectedColumn(defaultColumns[0]);
        setTimeout(() => {
          fetchColumnLineageGraph(defaultColumns[0].id);
        }, 0);
      }
    } finally {
      setLoading(false);
    }
  };

  // 获取表级血缘关系图数据
  const fetchTableLineageGraph = async (tableId) => {
    console.log('===== fetchTableLineageGraph 开始 =====');
    console.log(`获取表ID: ${tableId} 的血缘关系图数据`);
    
    try {
      setLoading(true);
      console.log('调用lineageApi.getTableLineageGraph');
      const response = await lineageApi.getTableLineageGraph(tableId);
      
      console.log('获取表级血缘数据成功，响应数据:', {
        nodesCount: response?.nodes?.length || 0,
        edgesCount: response?.edges?.length || 0
      });
      
      console.log('设置graphData状态');
      setGraphData(response);
      
      console.log('调用renderGraph渲染图表');
      renderGraph(response);
    } catch (error) {
      console.error('获取表级血缘关系失败:', error);
      console.error('错误详情:', error.response?.data || error.message);
      message.error('获取表级血缘关系失败');
    } finally {
      console.log('设置loading为false');
      setLoading(false);
    }
    console.log('===== fetchTableLineageGraph 结束 =====');
  };

  // 获取列级血缘关系图数据
  const fetchColumnLineageGraph = async (columnId) => {
    console.log('开始获取列级血缘关系图数据，columnId:', columnId);
    try {
      setLoading(true);
      console.log('调用lineageApi.getColumnLineageGraph');
      // 直接调用axios，确保使用正确的API路径
      const response = await axios.get(`http://localhost:8000/api/lineages/column/graph/${columnId}`);
      console.log('成功获取列级血缘关系图数据:', response.data);
      setGraphData(response.data);
      renderGraph(response.data);
    } catch (error) {
      console.error('获取列级血缘关系错误:', error);
      console.error('错误详情:', error.response?.data || error.message);
      message.error('获取列级血缘关系失败');
    } finally {
      setLoading(false);
    }
  };

  // 获取表级血缘关系列表
  const fetchTableLineageList = async () => {
    try {
      setLoading(true);
      const response = await lineageApi.getAllTableRelations({ page: 1, page_size: 100 });
      setTableLineageList(Array.isArray(response) ? response : response.items || []);
    } catch (error) {
      message.error('获取表级血缘关系列表失败');
    } finally {
      setLoading(false);
    }
  };

  // 获取列级血缘关系列表
  const fetchColumnLineageList = async () => {
    try {
      setLoading(true);
      const response = await lineageApi.getAllColumnRelations({ page: 1, page_size: 100 });
      setColumnLineageList(Array.isArray(response) ? response : response.items || []);
    } catch (error) {
      message.error('获取列级血缘关系列表失败');
    } finally {
      setLoading(false);
    }
  };

  // 渲染血缘关系图
  const renderGraph = (data) => {
    console.log('===== renderGraph 开始 =====');
    console.log('data参数存在性:', !!data);
    console.log('当前activeTab:', activeTab);
    
    // 根据当前标签页选择对应的图表引用
    const currentChartRef = activeTab === 'table' ? tableChartRef : columnChartRef;
    const currentChartInstance = activeTab === 'table' ? tableChartInstance : columnChartInstance;
    
    console.log('当前图表ref存在性:', !!currentChartRef.current);
    console.log('当前图表实例状态:', currentChartInstance.current ? '已初始化' : '未初始化');
    
    if (!data) {
      console.warn('renderGraph: 数据为空，不执行渲染');
      return;
    }
    
    if (!currentChartRef.current) {
      console.warn('renderGraph: 图表ref为空，不执行渲染');
      return;
    }

    // 确保每次渲染前先清空并重新初始化图表
    if (currentChartInstance.current) {
      console.log('销毁现有ECharts实例');
      currentChartInstance.current.dispose();
      currentChartInstance.current = null;
    }
    
    console.log('创建新的ECharts实例');
    try {
      currentChartInstance.current = echarts.init(currentChartRef.current);
      console.log('ECharts实例创建成功');
    } catch (error) {
      console.error('创建ECharts实例失败:', error);
      return;
    }
    
    // 监听窗口大小变化，调整图表大小
    console.log('添加窗口大小变化监听器');
    window.addEventListener('resize', () => {
      if (currentChartInstance.current) {
        console.log('执行图表大小调整');
        currentChartInstance.current.resize();
      }
    });

    // 转换数据为ECharts格式
    console.log('开始转换数据为ECharts格式');
    console.log('原始数据nodes数量:', data.nodes?.length || 0);
    console.log('原始数据edges数量:', data.edges?.length || 0);
    
    const nodes = data.nodes?.map(node => ({
      id: node.id,
      name: node.name,
      category: node.type === 'table' ? 0 : 1,
      symbolSize: node.type === 'table' ? 40 : 30,
      itemStyle: {
        color: node.type === 'table' ? '#1890ff' : '#52c41a'
      },
      label: {
        show: true,
        formatter: '{b}',
        position: 'top'
      }
    })) || [];

    const links = data.edges?.map(link => ({
      source: link.source,
      target: link.target,
      value: link.relation_type,
      label: {
        show: true,
        formatter: link.relation_type,
        position: 'middle'
      },
      lineStyle: {
        width: 2,
        curveness: 0.3
      }
    })) || [];
    
    console.log('转换完成，nodes数量:', nodes.length, 'links数量:', links.length);

    const categories = [
      { name: '表' },
      { name: '列' }
    ];

    const option = {
      tooltip: {
        trigger: 'item'
      },
      legend: [
        {
          data: categories.map(c => c.name)
        }
      ],
      animationDurationUpdate: 1500,
      animationEasingUpdate: 'quinticInOut',
      series: [
        {
          type: 'graph',
          layout: 'force',
          force: {
            repulsion: 300,
            gravity: 0.1,
            edgeLength: [80, 150]
          },
          roam: true,
          label: {
            show: true,
            formatter: '{b}'
          },
          edgeLabel: {
            fontSize: 12
          },
          data: nodes,
          links: links,
          categories: categories,
          emphasis: {
            focus: 'adjacency',
            lineStyle: {
              width: 4
            }
          },
          lineStyle: {
            opacity: 0.9,
            width: 2,
            curveness: 0
          },
          itemStyle: {
            borderWidth: 2
          }
        }
      ]
    };

    try {
      console.log('设置ECharts配置项');
      currentChartInstance.current.setOption(option);
      console.log('图表配置项设置成功，图表渲染完成');
    } catch (error) {
      console.error('设置图表配置项失败:', error);
    }
    console.log('===== renderGraph 结束 =====');
  };

  // 处理表选择变化
  const handleTableChange = (tableId) => {
    console.log('===== handleTableChange 开始 =====');
    console.log('选择的表ID:', tableId);
    
    const table = tables.find(t => t.id === tableId);
    console.log('找到的表:', table ? {id: table.id, name: table.name} : '未找到');
    
    setSelectedTable(table);
    console.log('已更新selectedTable状态');
    
    setSelectedColumn(null);
    setTableColumns([]);
    console.log('已重置selectedColumn和tableColumns');
    
    if (table) {
      console.log(`获取表${table.id}的列信息`);
      fetchTableColumns(tableId);
      
      if (activeTab === 'table') {
        console.log('当前为表级视图，获取血缘关系图数据');
        fetchTableLineageGraph(tableId);
      }
    } else {
      console.log('未找到对应表，不执行后续操作');
    }
    console.log('===== handleTableChange 结束 =====');
  };

  // 处理列选择变化
  const handleColumnChange = (columnId) => {
    const column = tableColumns.find(c => c.id === columnId);
    setSelectedColumn(column);
    
    if (column) {
      fetchColumnLineageGraph(columnId);
    }
  };

  // 处理标签页切换
  const handleTabChange = (tab) => {
    console.log('===== 视图切换开始 =====');
    console.log('当前activeTab:', activeTab, '切换到:', tab);
    console.log('切换前selectedTable状态:', selectedTable ? {id: selectedTable.id, name: selectedTable.name} : 'undefined');
    console.log('切换前graphData状态:', graphData ? '有数据' : 'null');
    console.log('当前tables列表长度:', tables.length);
    
    setActiveTab(tab);
    setGraphData(null);
    console.log('已重置graphData为null');
    
    if (tab === 'table') {
      console.log('切换到表级血缘视图');
      fetchTableLineageList();
      
      if (!selectedTable) {
        console.log('未选中表，检查是否有表列表');
        if (tables.length > 0) {
          console.log(`自动选择第一个表: ${tables[0].id} - ${tables[0].name}`);
          setSelectedTable(tables[0]);
          console.log('立即调用fetchTableLineageGraph获取血缘数据');
          fetchTableLineageGraph(tables[0].id);
        } else {
          console.log('警告: tables列表为空，无法自动选择表');
        }
      } else {
        console.log(`已选中表: ${selectedTable.id} - ${selectedTable.name}，调用fetchTableLineageGraph`);
        fetchTableLineageGraph(selectedTable.id);
      }
    } else if (tab === 'column') {
      console.log('切换到列级血缘视图');
      fetchColumnLineageList();
      
      if (!selectedTable) {
        console.log('未选中表，检查是否有表列表');
        if (tables.length > 0) {
          console.log(`自动选择第一个表: ${tables[0].id} - ${tables[0].name}`);
          setSelectedTable(tables[0]);
          console.log('调用fetchTableColumns获取列信息');
          fetchTableColumns(tables[0].id);
        } else {
          console.log('警告: tables列表为空，无法自动选择表');
        }
      } else {
        console.log(`保持已选中表: ${selectedTable.id} - ${selectedTable.name}，调用fetchTableColumns`);
        fetchTableColumns(selectedTable.id);
      }
    } else if (tab === 'list') {
      console.log('切换到血缘关系列表视图');
      fetchTableLineageList();
      fetchColumnLineageList();
    }
    console.log('===== 视图切换结束 =====');
  };

  // 查看血缘关系详情
  const showRelationDetail = (relation) => {
    setCurrentRelation(relation);
    form.setFieldsValue({
      relationType: relation.relation_type,
      description: relation.description,
      details: JSON.stringify(relation.transformation_details || {}, null, 2)
    });
    setIsDetailModalVisible(true);
  };

  // 初始化
  useEffect(() => {
    console.log('===== 组件初始化开始 =====');
    console.log('开始获取初始化数据');
    fetchTables();
    fetchTableLineageList();
    fetchColumnLineageList();
    console.log('初始化数据获取函数调用完成');
    
    return () => {
      console.log('===== 组件清理开始 =====');
      // 清理ECharts实例
      if (tableChartInstance.current) {
        console.log('清理表级ECharts实例');
        tableChartInstance.current.dispose();
        tableChartInstance.current = null;
      }
      if (columnChartInstance.current) {
        console.log('清理列级ECharts实例');
        columnChartInstance.current.dispose();
        columnChartInstance.current = null;
      }
      console.log('===== 组件清理结束 =====');
    };
  }, []);
  
  // 监听graphData变化，确保图表正确渲染
  useEffect(() => {
    console.log('===== graphData变化监听 =====');
    console.log('graphData状态变化:', graphData ? `包含${graphData.nodes?.length || 0}个节点` : 'null');
    
    // 有数据就重新渲染图表
    if (graphData) {
      console.log('graphData已更新，重新渲染图表');
      renderGraph(graphData);
    }
  }, [graphData]);
  
  // 监听activeTab变化，确保在切换标签页后重新渲染正确的图表
  useEffect(() => {
    console.log('标签页切换，准备重新渲染对应图表');
    // 延迟一小段时间，确保DOM元素已经渲染
    const timer = setTimeout(() => {
      if (graphData) {
        renderGraph(graphData);
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [activeTab]);
  
  // 监听selectedTable变化
  useEffect(() => {
    console.log('===== selectedTable变化监听 =====');
    console.log('selectedTable状态:', selectedTable ? {id: selectedTable.id, name: selectedTable.name} : 'undefined');
  }, [selectedTable]);

  // 表级血缘关系表格列
  const tableLineageColumns = [
    {
      title: '源表',
      dataIndex: ['source_table', 'name'],
      key: 'source_table_name'
    },
    {
      title: '目标表',
      dataIndex: ['target_table', 'name'],
      key: 'target_table_name'
    },
    {
      title: '关系类型',
      dataIndex: 'relation_type',
      key: 'relation_type'
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Button type="link" onClick={() => showRelationDetail(record)}>
          查看详情
        </Button>
      )
    }
  ];

  // 列级血缘关系表格列
  const columnLineageColumns = [
    {
      title: '源表',
      dataIndex: ['source_column', 'table', 'name'],
      key: 'source_table_name'
    },
    {
      title: '源列',
      dataIndex: ['source_column', 'name'],
      key: 'source_column_name'
    },
    {
      title: '目标表',
      dataIndex: ['target_column', 'table', 'name'],
      key: 'target_table_name'
    },
    {
      title: '目标列',
      dataIndex: ['target_column', 'name'],
      key: 'target_column_name'
    },
    {
      title: '关系类型',
      dataIndex: 'relation_type',
      key: 'relation_type'
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Button type="link" onClick={() => showRelationDetail(record)}>
          查看详情
        </Button>
      )
    }
  ];

  return (
    <Card className="page-card">
      <div className="page-header">
        <h2>血缘关系分析</h2>
      </div>
      
      <Tabs activeKey={activeTab} onChange={handleTabChange}>
        <TabPane tab="表级血缘" key="table">
          <div className="lineage-controls">
            <Select
              placeholder="选择表"
              style={{ width: 300 }}
              onChange={handleTableChange}
              loading={loading}
              allowClear
            >
              {tables.map(table => (
                <Option key={table.id} value={table.id}>
                  {table.name} ({table.schema_name || '默认模式'})
                </Option>
              ))}
            </Select>
          </div>
          
          <div className="lineage-chart-container">
            {loading ? (
              <Spin tip="加载中..." style={{ marginTop: '100px' }} />
            ) : graphData ? (
              <div ref={tableChartRef} style={{ width: '100%', height: '600px' }} />
            ) : (
              <div className="empty-state">请选择一个表查看血缘关系</div>
            )}
          </div>
        </TabPane>
        
        <TabPane tab="列级血缘" key="column">
          <div className="lineage-controls">
            <Select
              placeholder="选择表"
              style={{ width: 300, marginRight: 10 }}
              onChange={handleTableChange}
              loading={loading}
              allowClear
              value={selectedTable?.id}
            >
              {tables.map(table => (
                <Option key={table.id} value={table.id}>
                  {table.name} ({table.schema_name || '默认模式'})
                </Option>
              ))}
            </Select>
            
            <Select
              placeholder="选择列"
              style={{ width: 300 }}
              onChange={handleColumnChange}
              loading={loading}
              allowClear
              disabled={!selectedTable}
              value={selectedColumn?.id}
            >
              {tableColumns.map(column => (
                <Option key={column.id} value={column.id}>
                  {column.name} ({column.data_type})
                </Option>
              ))}
            </Select>
          </div>
          
          <div className="lineage-chart-container">
            {loading ? (
              <Spin tip="加载中..." style={{ marginTop: '100px' }} />
            ) : graphData ? (
              <div ref={columnChartRef} style={{ width: '100%', height: '600px' }} />
            ) : (
              <div className="empty-state">请选择表和列查看血缘关系</div>
            )}
          </div>
        </TabPane>
        
        <TabPane tab="血缘关系列表" key="list">
          <Tabs defaultActiveKey="table">
            <TabPane tab="表级血缘列表" key="table">
              <Table
                columns={tableLineageColumns}
                dataSource={tableLineageList}
                rowKey="id"
                loading={loading}
                pagination={{ pageSize: 10 }}
              />
            </TabPane>
            <TabPane tab="列级血缘列表" key="column">
              <Table
                columns={columnLineageColumns}
                dataSource={columnLineageList}
                rowKey="id"
                loading={loading}
                pagination={{ pageSize: 10 }}
              />
            </TabPane>
          </Tabs>
        </TabPane>
      </Tabs>

      {/* 血缘关系详情模态框 */}
      <Modal
        title="血缘关系详情"
        open={isDetailModalVisible}
        onCancel={() => setIsDetailModalVisible(false)}
        footer={null}
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item label="关系类型" name="relationType">
            <Input disabled />
          </Form.Item>
          <Form.Item label="描述" name="description">
            <TextArea rows={4} disabled />
          </Form.Item>
          <Form.Item label="详细信息" name="details">
            <TextArea rows={6} disabled />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
};

export default LineagePage;