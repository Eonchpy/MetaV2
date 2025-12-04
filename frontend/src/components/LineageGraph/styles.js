// Cytoscape样式配置
export const cytoscapeStyles = [
  // 基础样式
  {
    selector: 'core',
    style: {
      'selection-box-color': '#3B82F6',
      'selection-box-border-color': '#3B82F6',
      'selection-box-opacity': 0.2
    }
  },

  // 所有节点样式
  {
    selector: 'node',
    style: {
      'label': 'data(label)',
      'font-family': 'Arial, sans-serif',
      'font-size': '14px',
      'font-weight': '600',
      'color': '#ffffff',
      'text-valign': 'center',
      'text-halign': 'center',
      'text-outline-width': 2,
      'text-outline-color': 'rgba(0, 0, 0, 0.4)',
      'width': '140px',
      'height': '70px',
      'text-wrap': 'wrap',
      'text-max-width': '130px',
      'overlay-opacity': 0,
      'overlay-color': '#000',
      'overlay-padding': 10
    }
  },

  // 表节点样式 - 蓝色圆角矩形，带渐变
  {
    selector: 'node[type="table"]',
    style: {
      'background-color': '#3B82F6',
      'background-gradient-stop-colors': '#3B82F6 #2563EB',
      'background-gradient-direction': 'to-bottom',
      'shape': 'roundrectangle',
      'border-width': 3,
      'border-color': '#1E40AF'
    }
  },

  // 字段节点样式 - 绿色圆角矩形，带渐变
  {
    selector: 'node[type="column"]',
    style: {
      'background-color': '#10B981',
      'background-gradient-stop-colors': '#10B981 #059669',
      'background-gradient-direction': 'to-bottom',
      'shape': 'roundrectangle',
      'border-width': 3,
      'border-color': '#047857'
    }
  },

  // 当前节点高亮 - 橙色，带渐变
  {
    selector: 'node[isCurrent="true"]',
    style: {
      'background-color': '#F59E0B',
      'background-gradient-stop-colors': '#F59E0B #D97706',
      'background-gradient-direction': 'to-bottom',
      'border-color': '#B45309',
      'border-width': 4,
      'font-weight': 'bold',
      'font-size': '16px',
      'width': '160px',
      'height': '80px'
    }
  },

  // 节点选中效果
  {
    selector: 'node:selected',
    style: {
      'border-color': '#1E40AF',
      'border-width': 5,
      'overlay-opacity': 0.15,
      'overlay-color': '#3B82F6',
      'overlay-padding': 12
    }
  },

  // 所有边样式 - 使用unbundled-bezier创建优美的曲线
  {
    selector: 'edge',
    style: {
      'width': 3,
      'line-color': '#3B82F6',
      'target-arrow-color': '#3B82F6',
      'target-arrow-shape': 'triangle',
      'arrow-scale': 1.8,
      'curve-style': 'unbundled-bezier',
      'control-point-distances': [40, -40],
      'control-point-weights': [0.25, 0.75],
      'label': 'data(relation)',
      'font-size': '13px',
      'font-weight': '500',
      'color': '#475569',
      'text-background-color': '#FFFFFF',
      'text-background-opacity': 0.95,
      'text-background-padding': '6px',
      'text-background-shape': 'roundrectangle',
      'text-border-width': 1,
      'text-border-color': '#CBD5E1',
      'text-border-opacity': 1,
      'text-rotation': 'autorotate',
      'text-margin-y': -10
    }
  },

  // 选中边样式
  {
    selector: 'edge:selected',
    style: {
      'width': 5,
      'line-color': '#2563EB',
      'target-arrow-color': '#2563EB',
      'color': '#1E40AF',
      'font-weight': 'bold',
      'font-size': '14px',
      'text-background-color': '#EFF6FF'
    }
  }
];

export default cytoscapeStyles;