import React, { useEffect, useRef, useState, useCallback, useImperativeHandle, forwardRef } from 'react';
import cytoscape from 'cytoscape';
import dagre from 'cytoscape-dagre';
import navigator from 'cytoscape-navigator';
import dagreLayoutConfig from './layout';
import cytoscapeStyles from './styles';
import './navigator.css';

// 注册dagre布局插件和导航器插件
cytoscape.use(dagre);
cytoscape.use(navigator);

const LineageGraph = forwardRef(({
  data,
  onNodeClick,
  currentNodeId,
  height = '800px',
  showNavigator = true
}, ref) => {
  const cyContainerRef = useRef(null);
  const navContainerRef = useRef(null);
  const cyRef = useRef(null);
  const navRef = useRef(null);
  const [isLoading, setIsLoading] = useState(false);

  // 暴露导出方法给父组件
  useImperativeHandle(ref, () => ({
    exportPNG: () => {
      const cy = cyRef.current;
      if (!cy) return;

      const png64 = cy.png({
        output: 'blob',
        bg: '#ffffff',
        full: true,
        scale: 2
      });

      const url = URL.createObjectURL(png64);
      const link = document.createElement('a');
      link.download = `lineage-graph-${Date.now()}.png`;
      link.href = url;
      link.click();
      URL.revokeObjectURL(url);
    },

    exportJPG: () => {
      const cy = cyRef.current;
      if (!cy) return;

      const jpg64 = cy.jpg({
        output: 'blob',
        bg: '#ffffff',
        full: true,
        scale: 2,
        quality: 0.95
      });

      const url = URL.createObjectURL(jpg64);
      const link = document.createElement('a');
      link.download = `lineage-graph-${Date.now()}.jpg`;
      link.href = url;
      link.click();
      URL.revokeObjectURL(url);
    },

    exportSVG: () => {
      const cy = cyRef.current;
      if (!cy) return;

      // 获取SVG字符串
      const svgStr = cy.svg({ scale: 1, full: true, bg: '#ffffff' });
      const blob = new Blob([svgStr], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = `lineage-graph-${Date.now()}.svg`;
      link.href = url;
      link.click();
      URL.revokeObjectURL(url);
    },

    zoomIn: () => {
      const cy = cyRef.current;
      if (cy) {
        cy.zoom({ level: cy.zoom() * 1.2 });
      }
    },

    zoomOut: () => {
      const cy = cyRef.current;
      if (cy) {
        cy.zoom({ level: cy.zoom() * 0.8 });
      }
    },

    fit: () => {
      const cy = cyRef.current;
      if (cy) {
        cy.fit(50);
      }
    },

    reset: () => {
      const cy = cyRef.current;
      if (cy) {
        cy.zoom({ level: 1 });
        cy.pan({ x: 0, y: 0 });
        cy.fit(50);
      }
    }
  }));

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

    // 初始化导航器（minimap）
    if (showNavigator && navContainerRef.current) {
      try {
        const nav = cy.navigator({
          container: navContainerRef.current,
          viewLiveFramerate: 0, // 实时更新帧率设为0，仅在停止时更新
          thumbnailEventFramerate: 30, // 缩略图事件帧率
          thumbnailLiveFramerate: false, // 禁用实时缩略图更新
          dblClickDelay: 200,
          removeCustomContainer: false,
          rerenderDelay: 100
        });
        navRef.current = nav;
        console.log('导航器初始化成功');

        // 初始渲染后等待一下再刷新导航器
        setTimeout(() => {
          cy.resize();
          cy.fit();
        }, 100);
      } catch (error) {
        console.error('导航器初始化失败:', error);
      }
    }

    setIsLoading(false);
  }, [showNavigator]);

  const resizeAndFit = useCallback(() => {
    const cy = cyRef.current;
    if (!cy) return;
    cy.resize();
    cy.fit(50);
    if (navRef.current) {
      cy.trigger('resize');
    }
  }, []);

  // 更新图谱数据
  const updateGraphData = useCallback(() => {
    const cy = cyRef.current;
    if (!cy) {
      console.log('跳过图谱更新：cy实例不存在');
      return;
    }

    if (!data || !data.nodes || data.nodes.length === 0) {
      console.log('跳过图谱更新：数据为空');
      // 清空图谱
      cy.elements().remove();
      setIsLoading(false);
      return;
    }

    console.log('开始更新图谱数据，节点数:', data.nodes.length, '边数:', data.edges?.length || 0);
    setIsLoading(true);

    try {
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
      const processedEdges = (data.edges || []).map(edge => ({
        data: edge
      }));

      // 添加元素到图谱
      cy.add([...processedNodes, ...processedEdges]);

      // 应用布局（先订阅事件，避免错过同步完成的布局事件导致加载遮罩停留）
      const layout = cy.layout(dagreLayoutConfig);

      const handleLayoutStop = () => {
        console.log('布局完成');
        resizeAndFit();
        setIsLoading(false);
      };

      layout.on('layoutstop', handleLayoutStop);
      layout.run();

      // 双保险：如果布局事件未触发也要清理加载状态
      setTimeout(() => {
        resizeAndFit();
        setIsLoading(false);
      }, 800);
    } catch (error) {
      console.error('更新图谱数据时出错:', error);
      setIsLoading(false);
    }
  }, [data, currentNodeId, resizeAndFit]);

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
      event.target.animate({
        style: {
          'z-index': 9999
        }
      }, {
        duration: 200
      });
    });

    cy.on('mouseout', 'node', (event) => {
      event.target.animate({
        style: {
          'z-index': 1
        }
      }, {
        duration: 200
      });
    });
  }, [onNodeClick]);

  // 初始化图谱
  useEffect(() => {
    initializeCytoscape();
    return () => {
      // 清理Navigator实例
      if (navRef.current) {
        navRef.current = null;
      }
      // 清理Cytoscape实例
      if (cyRef.current) {
        cyRef.current.destroy();
        cyRef.current = null;
      }
    };
  }, [initializeCytoscape]);

  // 更新数据
  useEffect(() => {
    console.log('=== 更新数据 useEffect 触发 ===');
    console.log('cy实例存在:', !!cyRef.current);
    console.log('data存在:', !!data);
    console.log('data内容:', data);

    if (!cyRef.current) {
      console.log('cy实例未初始化，等待初始化');
      return;
    }

    if (!data) {
      console.log('没有数据');
      return;
    }

    console.log('✅ 更新图谱');
    updateGraphData();
  }, [data, currentNodeId, updateGraphData]);

  // 设置事件监听
  useEffect(() => {
    if (cyRef.current) {
      setupEventListeners();
    }
  }, [setupEventListeners]);

  // 容器尺寸变化时重新适配，解决在隐藏/显示的 tab 中渲染为空白的问题
  useEffect(() => {
    if (!cyContainerRef.current || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(() => {
      resizeAndFit();
    });
    observer.observe(cyContainerRef.current);
    return () => observer.disconnect();
  }, [resizeAndFit]);

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
            color: '#3B82F6'
          }}
        >
          加载中...
        </div>
      )}

      {/* Cytoscape容器 */}
      <div
        ref={cyContainerRef}
        style={{
          width: '100%',
          height: '100%',
          backgroundColor: '#f8f9fa',
          border: '1px solid #e0e0e0',
          borderRadius: '4px',
          overflow: 'hidden'
        }}
      />

      {/* 导航器（Minimap）容器 - 只在节点数 > 8 时显示 */}
      {showNavigator && data?.nodes?.length > 8 && (
        <div
          ref={navContainerRef}
          className="cytoscape-navigator"
          style={{
            position: 'absolute',
            bottom: '20px',
            right: '20px',
            width: '200px',
            height: '150px',
            border: '2px solid #3B82F6',
            borderRadius: '6px',
            backgroundColor: '#fff',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            overflow: 'hidden',
            zIndex: 999
          }}
        />
      )}
    </div>
  );
});

export default LineageGraph;
