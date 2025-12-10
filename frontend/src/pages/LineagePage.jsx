import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, Tabs, Select, Button, Input, message, Spin, AutoComplete, Radio } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import axios from 'axios';
import { tableMetadataApi, lineageApi } from '../services/api';
import LineageGraph from '../components/LineageGraph';
import LineageToolbar from '../components/LineageToolbar';
import LineageDrawer from '../components/LineageDrawer';

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

  // LineageGraph组件的ref，用于调用其导出和视图控制方法
  const lineageGraphRef = useRef(null);

  // 血缘图深度和方向控制
  const [depth, setDepth] = useState(2); // 默认深度为2
  const [direction, setDirection] = useState("both"); // 默认方向为both
  const [columnDepth, setColumnDepth] = useState(2); // 列级血缘默认深度为2
  const [columnDirection, setColumnDirection] = useState("both"); // 列级血缘默认方向为both

  // 上游表其他下游依赖显示控制
  const [showUpstreamDependencies, setShowUpstreamDependencies] = useState(false);

  // 列级血缘中显示表节点的控制
  const [showTableNodes, setShowTableNodes] = useState(true); // 默认显示表节点

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

  // 添加标志位防止重复获取数据
  const isFetchingRef = useRef({
    table: false,
    column: false
  });

  // 获取当前标签页的状态
  const currentSearchValue = searchValues[activeTab] || '';
  const currentSearchResults = searchResults[activeTab] || [];
  const currentSelectedTable = selectedTables[activeTab] || null;
  const currentGraphData = graphData[activeTab] || null;

  // Cytoscape相关状态
  const [selectedNode, setSelectedNode] = useState(null);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [currentLineageLevel, setCurrentLineageLevel] = useState(activeTab);
  const [upstreamList, setUpstreamList] = useState([]);
  const [downstreamList, setDownstreamList] = useState([]);

  // 当前节点ID（用于高亮显示）
  const getCurrentNodeId = () => {
    if (activeTab === 'table' && currentSelectedTable) {
      return currentSelectedTable.id;
    }
    if (activeTab === 'column' && selectedColumn) {
      return selectedColumn.id;
    }
    return undefined;
  };

  // Cytoscape操作函数 - 使用ref调用LineageGraph的方法
  const handleZoomIn = () => {
    lineageGraphRef.current?.zoomIn();
  };

  const handleZoomOut = () => {
    lineageGraphRef.current?.zoomOut();
  };

  const handleFit = () => {
    lineageGraphRef.current?.fit();
  };

  const handleReset = () => {
    lineageGraphRef.current?.reset();
  };

  // 导出功能
  const handleExportPNG = () => {
    lineageGraphRef.current?.exportPNG();
    message.success('PNG图片导出成功');
  };

  const handleExportJPG = () => {
    lineageGraphRef.current?.exportJPG();
    message.success('JPG图片导出成功');
  };

  const handleExportSVG = () => {
    lineageGraphRef.current?.exportSVG();
    message.success('SVG矢量图导出成功');
  };
  
  // 节点点击事件处理
  const handleNodeClick = (node) => {
    setSelectedNode(node);
    
    // 计算上下游节点
    if (currentGraphData) {
      // 计算上游节点
      const upstreamNodes = currentGraphData.edges
        .filter(edge => edge.target === node.id)
        .map(edge => edge.source);
      
      // 计算下游节点
      const downstreamNodes = currentGraphData.edges
        .filter(edge => edge.source === node.id)
        .map(edge => edge.target);
      
      // 获取节点名称
      const nodeMap = new Map(currentGraphData.nodes.map(n => [n.id, n.label]));
      setUpstreamList(upstreamNodes.map(id => nodeMap.get(id) || id));
      setDownstreamList(downstreamNodes.map(id => nodeMap.get(id) || id));
    }
    
    setDrawerVisible(true);
  };
  
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

  // 处理上游依赖显示选项变化
  const handleUpstreamDependenciesChange = (value) => {
    setShowUpstreamDependencies(value);
    // 如果当前已选择表，重新获取血缘数据
    if (selectedTables.table) {
      fetchTableLineageGraph(selectedTables.table.id);
    }
  };

  // 处理列级血缘中表节点显示选项变化
  const handleShowTableNodesChange = (value) => {
    setShowTableNodes(value);
    // 如果当前已选择列，重新获取列级血缘数据
    if (selectedColumn) {
      fetchColumnLineageGraph(selectedColumn.id);
    }
  };

  // 获取表级血缘关系图数据
  const fetchTableLineageGraph = async (tableId) => {
    try {
      isFetchingRef.current.table = true;
      setLoading(true);

      // 构建请求参数，包含上游依赖选项
      const params = {
        depth,
        direction,
        include_upstream_dependencies: showUpstreamDependencies  // 明确传递布尔值
      };

      const response = await lineageApi.getTableLineageGraph(tableId, params);

      // 处理API响应，支持两种格式：直接返回图数据或包含data字段的对象
      const tableGraphData = response.data || response;

      setGraphData(prev => ({
        ...prev,
        table: tableGraphData
      }));

      // 不再直接调用renderGraph，由监听graphData的useEffect统一处理
    } catch (error) {
      console.error('❌ [ERROR] 获取表级血缘关系失败:', error);
      message.error('获取表级血缘关系失败');
    } finally {
      setLoading(false);
      isFetchingRef.current.table = false;
    }
  };

  // 获取列级血缘关系图数据
  const fetchColumnLineageGraph = async (columnId) => {
    try {
      isFetchingRef.current.column = true;
      setLoading(true);

      // 使用封装的API调用，传递depth、direction和showTableNodes参数
      const response = await lineageApi.getColumnLineageGraph(columnId, {
        depth: columnDepth,
        direction: columnDirection,
        show_table_nodes: showTableNodes  // 添加显示表节点参数
      });

      // 处理API响应，支持两种格式：直接返回图数据或包含data字段的对象
      const columnGraphData = response.data || response;
      setGraphData(prev => ({
        ...prev,
        column: columnGraphData
      }));
    } catch (error) {
      message.error('获取列级血缘关系失败');
    } finally {
      setLoading(false);
      isFetchingRef.current.column = false;
    }
  };

  
  // 转换数据格式以适配Cytoscape
  const transformGraphData = (data) => {
    console.log('transformGraphData 被调用，输入数据:', data);

    if (!data || !data.nodes || !data.edges) {
      console.log('transformGraphData: 数据无效，返回空数据');
      return { nodes: [], edges: [] };
    }

    // 转换节点数据
    const nodes = data.nodes.map(node => ({
      id: node.id,
      label: node.name || node.label,
      type: node.type === 'table' ? 'table' : 'column',
      ...node
    }));

    // 转换边数据
    const edges = data.edges.map(edge => ({
      source: edge.source,
      target: edge.target,
      relation: edge.relation_type || edge.relation || 'direct',
      ...edge
    }));

    console.log('transformGraphData: 转换后的数据', { nodeCount: nodes.length, edgeCount: edges.length, nodes, edges });
    return { nodes, edges };
  };
  const tableGraphData = graphData.table ? transformGraphData(graphData.table) : null;
  const columnGraphData = graphData.column ? transformGraphData(graphData.column) : null;

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
      // 不需要重新获取数据，直接使用已保存的graphData
      if (selectedTables.table && !graphData.table) {
        console.log(`已选中表: ${selectedTables.table.id} - ${selectedTables.table.name}，但没有保存的graphData，调用fetchTableLineageGraph获取数据`);
        fetchTableLineageGraph(selectedTables.table.id);
      }
    } else if (tab === 'column') {
      console.log('切换到列级血缘视图');
      // 不需要重新获取数据，直接使用已保存的graphData
      if (selectedTables.column && selectedColumn && !graphData.column) {
        console.log(`已选中表和列，但没有保存的graphData，调用fetchColumnLineageGraph获取数据`);
        fetchColumnLineageGraph(selectedColumn.id);
      } else if (selectedTables.column) {
        console.log(`已选中表: ${selectedTables.column.id} - ${selectedTables.column.name}，调用fetchTableColumns获取列信息`);
        fetchTableColumns(selectedTables.column.id);
      }
    }
    console.log('===== 视图切换结束 =====');
  };

  
  // 初始化
  useEffect(() => {
    console.log('===== 组件初始化开始 =====');
    console.log('开始获取初始化数据');
    fetchTables();
    console.log('初始化数据获取函数调用完成');

    return () => {
      console.log('===== 组件清理开始 =====');
      // 清理Cytoscape相关状态
      setSelectedNode(null);
      setDrawerVisible(false);
      console.log('===== 组件清理结束 =====');
    };
  }, []);

  // 移除了重复的监听血缘层级变化的useEffect，避免重复渲染
  // 数据获取逻辑已由handleTabChange和depth/direction的useEffect处理

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
    // 只在表级血缘tab且已选表时才获取
    if (activeTab === 'table' && selectedTables.table) {
      fetchTableLineageGraph(selectedTables.table.id);
    }
  }, [depth, direction, showUpstreamDependencies]);

  // 监听columnDepth、columnDirection和showTableNodes变化，重新获取列级血缘数据
  useEffect(() => {
    // 只在列级血缘tab且已选列时才获取
    if (activeTab === 'column' && selectedColumn) {
      fetchColumnLineageGraph(selectedColumn.id);
    }
  }, [columnDepth, columnDirection, showTableNodes]);
  
  // 监听selectedTables变化
  useEffect(() => {
    console.log('===== selectedTables变化监听 =====');
    console.log('selectedTables状态:', selectedTables);
  }, [selectedTables]);

  
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
          
          {/* Cytoscape组件 */}
          {tableGraphData?.nodes?.length ? (
            <LineageToolbar
              lineageLevel={currentLineageLevel}
              onLevelChange={setCurrentLineageLevel}
              onZoomIn={handleZoomIn}
              onZoomOut={handleZoomOut}
              onFit={handleFit}
              onReset={handleReset}
              onExportPNG={handleExportPNG}
              onExportJPG={handleExportJPG}
              onExportSVG={handleExportSVG}
              disabled={loading}
              showLevelSwitch={false} // 表级血缘页面不显示层级切换按钮
              showUpstreamDependencies={showUpstreamDependencies}
              onUpstreamDependenciesChange={handleUpstreamDependenciesChange}
            />
          ) : null}

          <div className="lineage-chart-container">
            {loading ? (
              <Spin tip="加载中..." style={{ marginTop: '100px' }} />
            ) : tableGraphData ? (
              tableGraphData.nodes?.length ? (
                <LineageGraph
                  ref={lineageGraphRef}
                  data={tableGraphData}
                  onNodeClick={handleNodeClick}
                  currentNodeId={getCurrentNodeId()}
                  height="700px"
                  showNavigator={true}
                />
              ) : (
                <div className="empty-state">当前表暂无血缘关系数据</div>
              )
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
          
          {/* Cytoscape组件 */}
          {columnGraphData?.nodes?.length ? (
            <LineageToolbar
              lineageLevel={currentLineageLevel}
              onLevelChange={setCurrentLineageLevel}
              onZoomIn={handleZoomIn}
              onZoomOut={handleZoomOut}
              onFit={handleFit}
              onReset={handleReset}
              onExportPNG={handleExportPNG}
              onExportJPG={handleExportJPG}
              onExportSVG={handleExportSVG}
              disabled={loading}
              showLevelSwitch={false} // 列级血缘页面不显示层级切换按钮
              showUpstreamDependencies={false} // 列级血缘页面不显示上游依赖选项
              onUpstreamDependenciesChange={null}
              showTableNodes={showTableNodes} // 传递显示表节点状态
              onShowTableNodesChange={handleShowTableNodesChange} // 传递处理函数
            />
          ) : null}

          <div className="lineage-chart-container">
            {loading ? (
              <Spin tip="加载中..." style={{ marginTop: '100px' }} />
            ) : columnGraphData ? (
              columnGraphData.nodes?.length ? (
                <LineageGraph
                  ref={lineageGraphRef}
                  data={columnGraphData}
                  onNodeClick={handleNodeClick}
                  currentNodeId={getCurrentNodeId()}
                  height="700px"
                  showNavigator={true}
                />
              ) : (
                <div className="empty-state">当前列暂无血缘关系数据</div>
              )
            ) : (
              <div className="empty-state">请选择表和列查看血缘关系</div>
            )}
          </div>
        </TabPane>
      </Tabs>
      
      {/* Cytoscape节点详情抽屉 */}
      <LineageDrawer
        visible={drawerVisible}
        node={selectedNode}
        upstreamList={upstreamList}
        downstreamList={downstreamList}
        onClose={() => setDrawerVisible(false)}
        onDeleteLineage={(nodeId) => {
          // 后续版本实现删除血缘关系功能
          message.info(`删除血缘关系功能待实现：${nodeId}`);
          setDrawerVisible(false);
        }}
      />
    </Card>
  );
};

export default LineagePage;
