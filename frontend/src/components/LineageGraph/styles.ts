// Cytoscape样式配置
export const cytoscapeStyles = [
  // 基础样式
  {
    selector: 'core',
    style: {
      'selection-box-color': 'rgba(59, 130, 246, 0.2)',
      'selection-box-border-color': 'rgba(59, 130, 246, 0.6)',
      'selection-box-opacity': 0.2
    }
  },
  
  // 所有节点样式
  {
    selector: 'node',
    style: {
      'font-family': '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      'font-size': '13px',
      'font-weight': 500,
      'color': '#1F2937',
      'text-valign': 'center',
      'text-halign': 'center',
      'width': 'label',
      'height': 'label',
      'padding': '6px 12px',
      'border-width': 1,
      'border-radius': '12px',
      'box-shadow': '0 1px 3px rgba(0, 0, 0, 0.05), 0 1px 2px rgba(0, 0, 0, 0.1)',
      'transition-property': 'background-color, border-color, color, width, height, transform',
      'transition-duration': '0.3s',
      'transition-timing-function': 'ease-in-out'
    }
  },
  
  // 表节点样式
  {
    selector: 'node[type="table"]',
    style: {
      'background-color': 'rgba(59, 130, 246, 0.12)',
      'border-color': 'rgba(59, 130, 246, 0.6)',
      'shape': 'rectangle',
      'border-radius': '12px'
    }
  },
  
  // 列节点样式
  {
    selector: 'node[type="column"]',
    style: {
      'background-color': 'rgba(16, 185, 129, 0.12)',
      'border-color': 'rgba(16, 185, 129, 0.6)',
      'shape': 'roundrectangle',
      'border-radius': '6px'
    }
  },
  
  // 当前节点高亮
  {
    selector: 'node[isCurrent="true"]',
    style: {
      'background-color': '#2563EB',
      'border-color': '#2563EB',
      'color': '#ffffff',
      'font-weight': 'bold',
      'border-width': 1,
      'box-shadow': '0 4px 12px rgba(37, 99, 235, 0.4)'
    }
  },
  
  // 节点悬停效果
  {
    selector: 'node:selected',
    style: {
      'background-color': '#2563EB',
      'border-color': '#2563EB',
      'color': '#ffffff',
      'font-weight': 'bold',
      'z-index': 9999
    }
  },
  
  {
    selector: 'node:hover',
    style: {
      'transform': 'scale(1.03)',
      'z-index': 9999,
      'cursor': 'pointer'
    }
  },
  
  // 所有边样式
  {
    selector: 'edge',
    style: {
      'width': 1.5,
      'line-color': 'rgba(59, 130, 246, 0.45)',
      'target-arrow-color': 'rgba(59, 130, 246, 0.45)',
      'target-arrow-shape': 'triangle',
      'arrow-scale': 0.8,
      'curve-style': 'bezier',
      'label': 'data(relation)',
      'font-size': '11px',
      'color': '#6B7280',
      'text-background-color': '#FFFFFF',
      'text-background-opacity': 0.8,
      'text-background-padding': '2px',
      'text-background-shape': 'roundrectangle',
      'text-rotation': 'autorotate',
      'visibility': 'hidden' // 默认隐藏边标签
    }
  },
  
  // 边悬停效果
  {
    selector: 'edge:hover',
    style: {
      'width': 2,
      'line-color': 'rgba(59, 130, 246, 0.8)',
      'target-arrow-color': 'rgba(59, 130, 246, 0.8)',
      'z-index': 9999,
      'visibility': 'visible' // hover时显示边标签
    }
  },
  
  // 选中边样式
  {
    selector: 'edge:selected',
    style: {
      'width': 2,
      'line-color': 'rgba(59, 130, 246, 0.8)',
      'target-arrow-color': 'rgba(59, 130, 246, 0.8)',
      'z-index': 9999,
      'visibility': 'visible'
    }
  },
  
  // 悬停节点时高亮连通边
  {
    selector: 'node:hover ~ edge',
    style: {
      'line-color': 'rgba(59, 130, 246, 0.6)',
      'target-arrow-color': 'rgba(59, 130, 246, 0.6)',
      'width': 2,
      'visibility': 'visible'
    }
  },
  
  {
    selector: 'node:hover ~ node',
    style: {
      'opacity': 0.7
    }
  }
];

export default cytoscapeStyles;