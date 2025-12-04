// DAG布局配置
export const dagreLayoutConfig = {
  name: 'dagre',
  rankDir: 'LR', // 布局方向：左（上游）→ 中（当前表）→ 右（下游）
  rankSep: 200, // 层级间距
  nodeSep: 150, // 节点间距
  ranker: 'longest-path', // 排序算法
  edgesep: 20, // 边间距
  marginx: 50, // 左右边距
  marginy: 50, // 上下边距
  animate: true, // 启用动画
  animateDuration: 500, // 动画持续时间
  fit: true // 自动适应容器
};

export default dagreLayoutConfig;