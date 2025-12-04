// DAG布局配置
export const dagreLayoutConfig = {
  name: 'dagre',
  rankDir: 'LR', // 布局方向：左（上游）→ 中（当前表）→ 右（下游）
  nodeSep: 120, // 同级节点间距（垂直间距）
  rankSep: 200, // 层级间距（水平间距）
  edgeSep: 50, // 边之间的间距
  ranker: 'network-simplex', // 布局算法：'network-simplex', 'tight-tree', 'longest-path'
  align: 'DL', // 对齐方式：UL(左上), UR(右上), DL(左下), DR(右下)
  acyclicer: 'greedy', // 如何处理循环：'greedy'
  marginx: 80, // 左右边距
  marginy: 80, // 上下边距
  padding: 40, // 额外的内边距
  animate: true, // 启用动画
  animationDuration: 600, // 动画持续时间（毫秒）
  animationEasing: 'ease-out', // 动画缓动函数
  fit: true, // 自动适应容器
  avoidOverlap: true, // 避免节点重叠
  nodeDimensionsIncludeLabels: true // 节点尺寸包含标签
};

export default dagreLayoutConfig;