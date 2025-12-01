import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, Tabs, Select, Button, Input, message, Spin, Modal, Form, Table, AutoComplete, Radio } from 'antd';
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
  // 为每个标签页创建独立的选中表状态
  const [selectedTables, setSelectedTables] = useState({
    table: null,
    column: null
  });
  const [selectedColumn, setSelectedColumn] = useState(null);
  const [tableColumns, setTableColumns] = useState([]);
  // 为每个标签页创建独立的graphData状态，保存切换前的结果
  const [graphData, setGraphData] = useState({
    table: null,
    column: null
  });
  const [activeTab, setActiveTab] = useState('table');
  const [isDetailModalVisible, setIsDetailModalVisible] = useState(false);
  const [currentRelation, setCurrentRelation] = useState(null);
  const [tableLineageList, setTableLineageList] = useState([]);
  const [columnLineageList, setColumnLineageList] = useState([]);
  const [form] = Form.useForm();
  
  // 血缘图深度和方向控制
  const [depth, setDepth] = useState(2); // 默认深度为2
  const [direction, setDirection] = useState("both"); // 默认方向为both
  const [columnDepth, setColumnDepth] = useState(2); // 列级血缘默认深度为2
  const [columnDirection, setColumnDirection] = useState("both"); // 列级血缘默认方向为both
  
  // 搜索相关状态，每个标签页独立
  const [searchValues, setSearchValues] = useState({
    table: '',
    column: ''
  });
  const [searchResults, setSearchResults] = useState({
    table: [],
    column: []
  });
  const [searchLoading, setSearchLoading] = useState(false);
  const searchTimeoutRef = useRef(null);
  
  // 获取当前标签页的状态
  const currentSearchValue = searchValues[activeTab] || '';
  const currentSearchResults = searchResults[activeTab] || [];
  const currentSelectedTable = selectedTables[activeTab] || null;
  const currentGraphData = graphData[activeTab] || null;
  
  // 为表级和列级血缘分别创建独立的图表引用
  const tableChartRef = useRef(null);
  const columnChartRef = useRef(null);
  const tableChartInstance = useRef(null);
  const columnChartInstance = useRef(null);
  
  // 防抖搜索函数
  const debounceSearch = useCallback((keyword) => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    return new Promise((resolve) => {
      searchTimeoutRef.current = setTimeout(async () => {
        if (keyword.trim()) {
          try {
            setSearchLoading(true);
            // 调用API搜索表
            const response = await tableMetadataApi.getAll({ keyword: keyword.trim(), limit: 20 });
            const tableList = Array.isArray(response) ? response : (response.data || []);
            resolve(tableList);
          } catch (error) {
            console.error('搜索表失败:', error);
            resolve([]);
          } finally {
            setSearchLoading(false);
          }
        } else {
          resolve([]);
        }
      }, 300);
    });
  }, []);
  
  // 处理搜索值变化
  const handleSearchChange = async (value) => {
    // 捕获当前标签页，避免异步操作完成后标签页已切换导致结果存储错误
    const currentTab = activeTab;
    
    setSearchValues(prev => ({
      ...prev,
      [currentTab]: value
    }));
    const results = await debounceSearch(value);
    setSearchResults(prev => ({
      ...prev,
      [currentTab]: results
    }));
  };
  
  // 处理表选择
  const handleTableSelect = (value) => {
    setSearchValues(prev => ({
      ...prev,
      [activeTab]: value.name
    }));
    setSelectedTables(prev => ({
      ...prev,
      [activeTab]: value
    }));
    setSelectedColumn(null);
    setTableColumns([]);
    
    if (value) {
      fetchTableColumns(value.id);
      if (activeTab === 'table') {
        fetchTableLineageGraph(value.id);
      }
    }
  };

  // 获取所有表
  const fetchTables = async () => {
    try {
      setLoading(true);
      const response = await tableMetadataApi.getAll({ page: 1, page_size: 1000 });
      console.log('表数据响应:', response);
      // 假设响应是一个列表，如果是分页对象则取items或data
      let tableList = Array.isArray(response) ? response : (response.items || response.data || []);
      
      console.log('处理后的表列表:', tableList);
      setTables(tableList);
    } catch (error) {
      console.error('获取表列表错误:', error);
      message.error('获取表列表失败');
      // 错误时设置为空数组
      setTables([]);
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
      
      // 处理API响应，支持两种格式：直接返回表对象或包含data字段的对象
      const tableData = response.data || response;
      console.log('处理后的表数据:', tableData);
      
      let columns = [];
      if (tableData && tableData.columns && Array.isArray(tableData.columns)) {
        columns = tableData.columns;
        console.log('成功获取到列数据，数量:', columns.length);
        // 打印前几列数据进行调试
        console.log('列数据示例:', columns.slice(0, 3));
      } else {
        console.log('未获取到列数据');
        columns = [];
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
      // 错误时设置为空数组
      setTableColumns([]);
    } finally {
      setLoading(false);
    }
  };

  // 获取表级血缘关系图数据
  const fetchTableLineageGraph = async (tableId) => {
    console.log('===== fetchTableLineageGraph 开始 =====');
    console.log(`获取表ID: ${tableId} 的血缘关系图数据，深度: ${depth}，方向: ${direction}`);
    
    try {
      setLoading(true);
      console.log('调用lineageApi.getTableLineageGraph');
      const response = await lineageApi.getTableLineageGraph(tableId, { depth, direction });
      
      // 处理API响应，支持两种格式：直接返回图数据或包含data字段的对象
      const tableGraphData = response.data || response;
      
      console.log('获取表级血缘数据成功，响应数据:', {
        nodesCount: tableGraphData?.nodes?.length || 0,
        edgesCount: tableGraphData?.edges?.length || 0
      });
      
      console.log('设置graphData状态');
      setGraphData(prev => ({
        ...prev,
        table: tableGraphData
      }));
      
      // 不再直接调用renderGraph，由监听graphData的useEffect统一处理
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
    console.log('开始获取列级血缘关系图数据，columnId:', columnId, '深度:', columnDepth, '方向:', columnDirection);
    try {
      setLoading(true);
      console.log('调用lineageApi.getColumnLineageGraph');
      // 使用封装的API调用，传递depth和direction参数
      const response = await lineageApi.getColumnLineageGraph(columnId, { depth: columnDepth, direction: columnDirection });
      
      // 处理API响应，支持两种格式：直接返回图数据或包含data字段的对象
      const columnGraphData = response.data || response;
      console.log('成功获取列级血缘关系图数据:', columnGraphData);
      setGraphData(prev => ({
        ...prev,
        column: columnGraphData
      }));
      // 不再直接调用renderGraph，由监听graphData的useEffect统一处理
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
      console.log('获取表级血缘关系列表响应:', response);
      setTableLineageList(Array.isArray(response) ? response : response.data || []);
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
      setColumnLineageList(Array.isArray(response) ? response : response.data || []);
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
      id: `${node.type}_${node.id}`,  // 添加类型前缀，确保节点id唯一
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

    const links = data.edges?.map(link => {
      // 根据边的类型确定source和target的节点类型
      let sourceId, targetId;
      if (link.type === 'table_column_relation') {
        // 表和列的连接边：source是表节点，target是列节点
        sourceId = `table_${link.source}`;
        targetId = `column_${link.target}`;
      } else if (link.type === 'column_lineage') {
        // 列级血缘关系边：source和target都是列节点
        sourceId = `column_${link.source}`;
        targetId = `column_${link.target}`;
      } else {
        // 其他类型的边：默认都是表节点
        sourceId = `table_${link.source}`;
        targetId = `table_${link.target}`;
      }
      
      return {
        source: sourceId,
        target: targetId,
        value: link.relation_type,
        label: {
          show: true,
          formatter: link.relation_type,
          position: 'middle'
        }
      };
    }) || [];
    
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
            show: true,
            fontSize: 12
          },
          edgeSymbol: ['none', 'arrow'],
          edgeSymbolSize: 10,
          data: nodes,
          links: links,
          categories: categories,
          emphasis: {
            focus: 'self',
            itemStyle: {
              opacity: 1
            },
            lineStyle: {
              width: 4
            }
          },
          blur: {
            itemStyle: {
              opacity: 0.3
            },
            lineStyle: {
              opacity: 0.3
            }
          },
          lineStyle: {
            opacity: 1,
            width: 1.5,
            curveness: 0.3,
            color: '#333'
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

  // 处理表选择变化（兼容旧的Select组件，用于列级视图的表选择）
  const handleTableChange = (tableId) => {
    console.log('===== handleTableChange 开始 =====');
    console.log('选择的表ID:', tableId);
    
    const table = tables.find(t => t.id === tableId);
    console.log('找到的表:', table ? {id: table.id, name: table.name} : '未找到');
    
    setSelectedTables(prev => ({
      ...prev,
      [activeTab]: table
    }));
    console.log('已更新selectedTables状态');
    
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
    console.log('切换前selectedTables状态:', selectedTables);
    console.log('切换前graphData状态:', graphData);
    console.log('当前tables列表长度:', tables.length);
    
    setActiveTab(tab);
    console.log('已切换标签页，graphData状态保持不变');
    
    if (tab === 'table') {
      console.log('切换到表级血缘视图');
      fetchTableLineageList();
      
      // 不需要重新获取数据，直接使用已保存的graphData
      if (graphData.table) {
        console.log('使用已保存的表级血缘数据，调用renderGraph渲染图表');
        renderGraph(graphData.table);
      } else if (selectedTables.table) {
        console.log(`已选中表: ${selectedTables.table.id} - ${selectedTables.table.name}，但没有保存的graphData，调用fetchTableLineageGraph获取数据`);
        fetchTableLineageGraph(selectedTables.table.id);
      } else {
        console.log('未选中表，等待用户选择');
      }
    } else if (tab === 'column') {
      console.log('切换到列级血缘视图');
      fetchColumnLineageList();
      
      // 不需要重新获取数据，直接使用已保存的graphData
      if (graphData.column) {
        console.log('使用已保存的列级血缘数据，调用renderGraph渲染图表');
        renderGraph(graphData.column);
      } else if (selectedTables.column && selectedColumn) {
        console.log(`已选中表和列，但没有保存的graphData，调用fetchColumnLineageGraph获取数据`);
        fetchColumnLineageGraph(selectedColumn.id);
      } else if (selectedTables.column) {
        console.log(`已选中表: ${selectedTables.column.id} - ${selectedTables.column.name}，调用fetchTableColumns获取列信息`);
        fetchTableColumns(selectedTables.column.id);
      } else {
        console.log('未选中表，等待用户选择');
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
    console.log('graphData状态变化:', graphData);
    
    // 有数据就重新渲染图表
    if (currentGraphData) {
      console.log('当前标签页的graphData已更新，重新渲染图表');
      renderGraph(currentGraphData);
    }
  }, [graphData, activeTab]);
  
  // 监听activeTab变化，确保在切换标签页后重新渲染正确的图表
  useEffect(() => {
    console.log('标签页切换，准备重新渲染对应图表');
    // 延迟一小段时间，确保DOM元素已经渲染
    const timer = setTimeout(() => {
      if (currentGraphData) {
        renderGraph(currentGraphData);
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [activeTab]);
  
  // 监听activeTab变化，确保搜索结果与当前搜索值匹配
  useEffect(() => {
    // 如果当前标签页的搜索值不为空，但搜索结果为空，自动触发搜索
    if (currentSearchValue && currentSearchResults.length === 0) {
      handleSearchChange(currentSearchValue);
    }
    // 如果当前标签页的搜索值为空，清空搜索结果
    if (!currentSearchValue && currentSearchResults.length > 0) {
      setSearchResults(prev => ({
        ...prev,
        [activeTab]: []
      }));
    }
  }, [activeTab]);
  
  // 监听depth和direction变化，重新获取血缘图数据
  useEffect(() => {
    if (selectedTables.table) {
      fetchTableLineageGraph(selectedTables.table.id);
    }
  }, [depth, direction]);
  
  // 监听columnDepth和columnDirection变化，重新获取列级血缘数据
  useEffect(() => {
    if (selectedColumn) {
      fetchColumnLineageGraph(selectedColumn.id);
    }
  }, [columnDepth, columnDirection]);
  
  // 监听selectedTables变化
  useEffect(() => {
    console.log('===== selectedTables变化监听 =====');
    console.log('selectedTables状态:', selectedTables);
  }, [selectedTables]);

  // 表级血缘关系表格列
  const tableLineageColumns = [
    {
      title: '源表',
      dataIndex: 'source_tables',
      key: 'source_tables',
      render: (sourceTables) => {
        if (!Array.isArray(sourceTables)) return '--';
        return sourceTables.map(table => table.name).join(', ');
      }
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
      title: '转换规则',
      dataIndex: 'transformation_details',
      key: 'transformation_details',
      ellipsis: true,
      render: (details) => {
        if (!details) return '--';
        try {
          const parsedDetails = typeof details === 'string' ? JSON.parse(details) : details;
          // 尝试获取转换规则，如果没有则返回JSON字符串
          if (parsedDetails && typeof parsedDetails === 'object') {
            // 优先返回转换规则，如果没有则返回描述或类型
            return parsedDetails.rule || parsedDetails.description || parsedDetails.type || JSON.stringify(parsedDetails, null, 2);
          }
          return details;
        } catch (e) {
          console.error('解析转换规则失败:', e);
          return details;
        }
      }
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
          <div className="lineage-controls" style={{ display: 'flex', alignItems: 'center' }}>
            <AutoComplete
              placeholder="输入表名搜索"
              style={{ width: 300 }}
              onSearch={handleSearchChange}
              onSelect={(value, option) => {
                handleTableSelect(option);
              }}
              options={currentSearchResults.map(table => ({
                value: table.name,
                label: `${table.name} (${table.schema_name || '默认模式'})`,
                ...table
              }))}
              loading={searchLoading}
              value={currentSearchValue}
            >
              <Input.Search
                placeholder="输入表名搜索"
                enterButton={<SearchOutlined />}
                size="middle"
                value={currentSearchValue}
                onChange={(e) => handleSearchChange(e.target.value)}
                allowClear
              />
            </AutoComplete>
            
            {/* 深度控制 */}
            <Select
              placeholder="选择深度"
              style={{ width: 120, marginLeft: 10 }}
              value={depth}
              onChange={setDepth}
            >
              {[1, 2, 3, 4, 5].map(d => (
                <Option key={d} value={d}>{d}</Option>
              ))}
            </Select>
            
            {/* 方向控制 */}
            <Radio.Group
              style={{ marginLeft: 10 }}
              value={direction}
              onChange={e => setDirection(e.target.value)}
            >
              <Radio.Button value="upstream">上游</Radio.Button>
              <Radio.Button value="downstream">下游</Radio.Button>
              <Radio.Button value="both">双向</Radio.Button>
            </Radio.Group>
          </div>
          
          <div className="lineage-chart-container">
            {loading ? (
              <Spin tip="加载中..." style={{ marginTop: '100px' }} />
            ) : graphData.table ? (
              <div ref={tableChartRef} style={{ width: '100%', height: '600px' }} />
            ) : (
              <div className="empty-state">请选择一个表查看血缘关系</div>
            )}
          </div>
        </TabPane>
        
        <TabPane tab="列级血缘" key="column">
          <div className="lineage-controls" style={{ display: 'flex', alignItems: 'center' }}>
              <AutoComplete
                placeholder="输入表名搜索"
                style={{ width: 300, marginRight: 10 }}
                onSearch={handleSearchChange}
                onSelect={(value, option) => {
                  handleTableSelect(option);
                }}
                options={currentSearchResults.map(table => ({
                  value: table.name,
                  label: `${table.name} (${table.schema_name || '默认模式'})`,
                  ...table
                }))}
                loading={searchLoading}
                value={currentSearchValue}
              >
                <Input.Search
                  placeholder="输入表名搜索"
                  enterButton={<SearchOutlined />}
                  size="middle"
                  value={currentSearchValue}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  allowClear
                />
              </AutoComplete>
              
              <Select
                placeholder="选择列"
                style={{ width: 300, marginRight: 10 }}
                onChange={handleColumnChange}
                loading={loading}
                allowClear
                disabled={!currentSelectedTable}
                value={selectedColumn?.id}
                size="middle"
              >
              {tableColumns.map(column => (
                <Option key={column.id} value={column.id}>
                  {column.name} ({column.data_type})
                </Option>
              ))}
            </Select>
            
            {/* 列级血缘深度控制 */}
            <Select
              placeholder="选择深度"
              style={{ width: 120, marginRight: 10 }}
              value={columnDepth}
              onChange={setColumnDepth}
            >
              {[1, 2, 3, 4, 5].map(d => (
                <Option key={d} value={d}>{d}</Option>
              ))}
            </Select>
            
            {/* 列级血缘方向控制 */}
            <Radio.Group
              style={{ marginRight: 10 }}
              value={columnDirection}
              onChange={e => setColumnDirection(e.target.value)}
            >
              <Radio.Button value="upstream">上游</Radio.Button>
              <Radio.Button value="downstream">下游</Radio.Button>
              <Radio.Button value="both">双向</Radio.Button>
            </Radio.Group>
          </div>
          
          <div className="lineage-chart-container">
            {loading ? (
              <Spin tip="加载中..." style={{ marginTop: '100px' }} />
            ) : graphData.column ? (
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
