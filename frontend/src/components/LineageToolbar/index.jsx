import React from 'react';
import { Button, Radio, Space, Tooltip, Dropdown } from 'antd';
import {
  FullscreenOutlined,
  ZoomInOutlined,
  ZoomOutOutlined,
  ReloadOutlined,
  TableOutlined,
  DatabaseOutlined,
  DownloadOutlined,
  FileImageOutlined
} from '@ant-design/icons';

const LineageToolbar = ({
  lineageLevel,
  onLevelChange,
  onZoomIn,
  onZoomOut,
  onFit,
  onReset,
  onExportPNG,
  onExportJPG,
  onExportSVG,
  disabled = false,
  showLevelSwitch = true, // 控制是否显示层级切换按钮
  showUpstreamDependencies = false,
  onUpstreamDependenciesChange = null,
  showTableNodes = true, // 是否显示表节点
  onShowTableNodesChange = null
}) => {
  // 导出菜单项
  const exportMenuItems = [
    {
      key: 'png',
      label: 'PNG 图片',
      icon: <FileImageOutlined />,
      onClick: onExportPNG
    },
    {
      key: 'jpg',
      label: 'JPG 图片',
      icon: <FileImageOutlined />,
      onClick: onExportJPG
    },
    {
      key: 'svg',
      label: 'SVG 矢量图',
      icon: <FileImageOutlined />,
      onClick: onExportSVG
    }
  ];

  return (
    <div
      style={{
        padding: '12px 16px',
        backgroundColor: '#fff',
        borderRadius: '4px',
        border: '1px solid #e0e0e0',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.09)',
        marginBottom: '16px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '12px'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
        {/* 血缘层级切换 - 仅在showLevelSwitch为true时显示 */}
        {showLevelSwitch && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '14px', fontWeight: '500', color: '#333' }}>血缘层级：</span>
            <Radio.Group
              value={lineageLevel}
              onChange={(e) => onLevelChange(e.target.value)}
              buttonStyle="solid"
              disabled={disabled}
            >
              <Radio.Button value="table">
                <TableOutlined style={{ marginRight: '4px' }} />
                表级
              </Radio.Button>
              <Radio.Button value="column">
                <DatabaseOutlined style={{ marginRight: '4px' }} />
                字段级
              </Radio.Button>
            </Radio.Group>
          </div>
        )}

        {/* 上游表其他下游依赖选项 - 仅在表级血缘且有对应回调时显示 */}
        {showUpstreamDependencies !== null && onUpstreamDependenciesChange && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '14px', fontWeight: '500', color: '#333' }}>扩展显示：</span>
            <Radio.Group
              value={showUpstreamDependencies}
              onChange={(e) => onUpstreamDependenciesChange(e.target.value)}
              buttonStyle="solid"
              disabled={disabled}
            >
              <Radio.Button value={false}>
                直接血缘
              </Radio.Button>
              <Radio.Button value={true}>
                显示上游其他依赖
              </Radio.Button>
            </Radio.Group>
          </div>
        )}

        {/* 显示表节点选项 - 仅在列级血缘且有对应回调时显示 */}
        {onShowTableNodesChange && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '14px', fontWeight: '500', color: '#333' }}>节点显示：</span>
            <Radio.Group
              value={showTableNodes}
              onChange={(e) => onShowTableNodesChange(e.target.value)}
              buttonStyle="solid"
              disabled={disabled}
            >
              <Radio.Button value={true}>
                显示表节点
              </Radio.Button>
              <Radio.Button value={false}>
                仅列节点
              </Radio.Button>
            </Radio.Group>
          </div>
        )}
      </div>

      <Space size="middle">
        <Tooltip title="放大">
          <Button
            type="default"
            icon={<ZoomInOutlined />}
            onClick={onZoomIn}
            disabled={disabled}
          />
        </Tooltip>

        <Tooltip title="缩小">
          <Button
            type="default"
            icon={<ZoomOutOutlined />}
            onClick={onZoomOut}
            disabled={disabled}
          />
        </Tooltip>

        <Tooltip title="适配屏幕">
          <Button
            type="default"
            icon={<FullscreenOutlined />}
            onClick={onFit}
            disabled={disabled}
          />
        </Tooltip>

        <Tooltip title="重置视图">
          <Button
            type="default"
            icon={<ReloadOutlined />}
            onClick={onReset}
            disabled={disabled}
          />
        </Tooltip>

        <Tooltip title="导出图片">
          <Dropdown
            menu={{ items: exportMenuItems }}
            placement="bottomRight"
            disabled={disabled}
          >
            <Button
              type="primary"
              icon={<DownloadOutlined />}
            >
              导出
            </Button>
          </Dropdown>
        </Tooltip>
      </Space>
    </div>
  );
};

export default LineageToolbar;