import { useEffect, useRef, useState, useCallback } from 'react';

import cytoscape from 'cytoscape';
import dagre from 'cytoscape-dagre';
import dagreLayoutConfig from './utils/layout';
import cytoscapeStyles from './styles';

// 注册dagre布局插件
cytoscape.use(dagre);

const GraphContainer = ({
  data,
  onNodeClick,
  currentNodeId,
  height = '800px'
}) => {
  const cyContainerRef = useRef(null);
  const cyRef = useRef(null);
  const [isLoading, setIsLoading] = useState(false);

  // 初始化Cytoscape实例
  const initializeCytoscape = useCallback(() => {
    if (!cyContainerRef.current) return;

    setIsLoading(true);

    // 创建Cytoscape实例
    const cy = cytoscape({
      container: cyContainerRef.current,
      elements: [],
      style: cytoscapeStyles,
      layout: dagreLayoutConfig,
      zoomingEnabled: true,
      userZoomingEnabled: true,
      panningEnabled: true,
      userPanningEnabled: true,
      autoungrabify: false,
      autolock: false,
      autounselectify: false,
      minZoom: 0.1,
      maxZoom: 4
    });

    // 保存实例引用
    cyRef.current = cy;

    setIsLoading(false);
  }, []);

  // 更新图谱数据
  const updateGraphData = useCallback(() => {
    const cy = cyRef.current;
    if (!cy) return;

    setIsLoading(true);

    // 清空现有元素
    cy.elements().remove();

    // 处理节点数据，添加当前节点标记
    const processedNodes = data.nodes.map(node => ({
      data: {
        ...node,
        isCurrent: currentNodeId === node.id
      }
    }));

    // 处理边数据
    const processedEdges = data.edges.map(edge => ({
      data: edge
    }));

    // 添加元素到图谱
    cy.add([...processedNodes, ...processedEdges]);

    // 应用布局
    cy.layout(dagreLayoutConfig).run();

    setIsLoading(false);
  }, [data, currentNodeId]);

  // 设置事件监听
  const setupEventListeners = useCallback(() => {
    const cy = cyRef.current;
    if (!cy) return;

    // 节点点击事件
    cy.on('tap', 'node', (event) => {
      const node = event.target;
      const nodeData = node.data();
      if (onNodeClick) {
        onNodeClick(nodeData);
      }
    });

    // 背景点击事件 - 取消选中
    cy.on('tap', (event) => {
      if (event.target === cy) {
        cy.elements().unselect();
      }
    });

    // 悬停事件
    cy.on('mouseover', 'node', (event) => {
      const node = event.target;
      
      // 高亮连通节点和边
      highlightConnected(cy, node);
    });

    cy.on('mouseout', 'node', () => {
      // 清除高亮
      clearHighlight(cyRef.current);
    });
  }, [onNodeClick]);

  // 高亮连通节点
  const highlightConnected = (cy, node) => {
    if (!cy) return;
    
    // 清除之前的高亮
    clearHighlight(cy);
    
    // 高亮当前节点
    node.addClass('highlighted');
    
    // 获取所有连通的边
    const connectedEdges = node.connectedEdges();
    connectedEdges.addClass('highlighted');
    
    // 获取所有连通的节点
    const connectedNodes = connectedEdges.connectedNodes();
    connectedNodes.addClass('highlighted');
    
    // 调整样式
    cy.elements().not('.highlighted').style({
      opacity: 0.3
    });
    
    cy.elements('.highlighted').style({
      opacity: 1
    });
  };

  // 清除高亮
  const clearHighlight = (cy) => {
    if (!cy) return;
    
    cy.elements().removeClass('highlighted');
    cy.elements().style({
      opacity: 1
    });
  };

  // Zoom in
  const handleZoomIn = useCallback(() => {
    const cy = cyRef.current;
    if (cy) {
      cy.zoom({ level: cy.zoom() * 1.2 });
    }
  }, []);

  // Zoom out
  const handleZoomOut = useCallback(() => {
    const cy = cyRef.current;
    if (cy) {
      cy.zoom({ level: cy.zoom() * 0.8 });
    }
  }, []);

  // Fit to screen
  const handleFit = useCallback(() => {
    const cy = cyRef.current;
    if (cy) {
      cy.fit(50);
    }
  }, []);

  // Reset view
  const handleReset = useCallback(() => {
    const cy = cyRef.current;
    if (cy) {
      cy.zoom({ level: 1 });
      cy.pan({ x: 0, y: 0 });
      cy.fit(50);
    }
  }, []);

  // 初始化图谱
  useEffect(() => {
    initializeCytoscape();
    return () => {
      // 清理Cytoscape实例
      if (cyRef.current) {
        cyRef.current.destroy();
        cyRef.current = null;
      }
    };
  }, [initializeCytoscape]);

  // 更新数据
  useEffect(() => {
    if (cyRef.current && data) {
      updateGraphData();
    }
  }, [data, updateGraphData]);

  // 设置事件监听
  useEffect(() => {
    if (cyRef.current) {
      setupEventListeners();
    }
  }, [setupEventListeners]);

  return (
    <div style={{ position: 'relative', height }}>
      {/* 加载状态 */}
      {isLoading && (
        <div 
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: 'rgba(255, 255, 255, 0.8)',
            zIndex: 1000,
            fontSize: '16px',
            color: '#3B82F6',
            borderRadius: '8px'
          }}
        >
          加载中...
        </div>
      )}

      {/* Cytoscape容器 - 浅灰背景块，圆角8px，有padding */}
      <div 
        ref={cyContainerRef} 
        style={{
          width: '100%',
          height: '100%',
          backgroundColor: '#F8FAFC',
          borderRadius: '8px',
          padding: '20px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06)',
          border: '1px solid #E2E8F0',
          overflow: 'hidden'
        }}
      />
      
      {/* 暴露方法给父组件 */}
      <div 
        ref={(el) => {
          if (el) {
            el.handleZoomIn = handleZoomIn;
            el.handleZoomOut = handleZoomOut;
            el.handleFit = handleFit;
            el.handleReset = handleReset;
          }
        }}
        style={{ display: 'none' }}
      />
    </div>
  );
};

export default GraphContainer;