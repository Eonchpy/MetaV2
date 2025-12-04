import { Button, Radio, Space, Tooltip } from 'antd';

import { 
  ZoomInOutlined, 
  ZoomOutOutlined, 
  FullscreenOutlined, 
  ReloadOutlined,
  TableOutlined,
  DatabaseOutlined
} from '@ant-design/icons';


// LineageToolbarProps
// {
//   lineageLevel: 'table' | 'column';
//   onLevelChange: (level: 'table' | 'column') => void;
//   onZoomIn: () => void;
//   onZoomOut: () => void;
//   onFit: () => void;
//   onReset: () => void;
//   disabled?: boolean;
// }

const LineageToolbar = ({
  lineageLevel,
  onLevelChange,
  onZoomIn,
  onZoomOut,
  onFit,
  onReset,
  disabled = false
}) => {
  return (
    <div 
      style={{
        padding: '12px 16px',
        backgroundColor: '#fff',
        borderRadius: '8px',
        border: '1px solid #E2E8F0',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06)',
        marginBottom: '16px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '8px'
      }}
    >
      {/* 血缘层级切换 */}
      <Space size="middle">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '14px', fontWeight: '500', color: '#374151' }}>血缘层级：</span>
          <Radio.Group
            value={lineageLevel}
            onChange={(e) => onLevelChange(e.target.value)}
            buttonStyle="solid"
            disabled={disabled}
            style={{
              borderRadius: '6px',
              overflow: 'hidden'
            }}
          >
            <Radio.Button 
              value="table" 
              style={{
                borderRadius: '4px 0 0 4px',
                border: `1px solid #E5E7EB`,
                '&:hover': {
                  borderColor: '#3B82F6',
                  color: '#3B82F6'
                }
              }}
            >
              <TableOutlined style={{ marginRight: '4px' }} />
              表级
            </Radio.Button>
            <Radio.Button 
              value="column" 
              style={{
                borderRadius: '0 4px 4px 0',
                border: `1px solid #E5E7EB`,
                '&:hover': {
                  borderColor: '#3B82F6',
                  color: '#3B82F6'
                }
              }}
            >
              <DatabaseOutlined style={{ marginRight: '4px' }} />
              字段级
            </Radio.Button>
          </Radio.Group>
        </div>
      </Space>

      {/* 操作按钮 */}
      <Space size="middle" style={{ display: 'flex', gap: '8px' }}>
        {/* 放大 */}
        <Tooltip title="放大">
          <Button
            type="default"
            icon={<ZoomInOutlined />}
            onClick={onZoomIn}
            disabled={disabled}
            style={{
              borderRadius: '8px',
              border: '1px solid #E5E7EB',
              backgroundColor: '#F9FAFB',
              color: '#374151',
              width: '36px',
              height: '36px',
              padding: '0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              '&:hover': {
                backgroundColor: '#EBF5FF',
                borderColor: '#93C5FD',
                color: '#3B82F6'
              },
              '&:active': {
                backgroundColor: '#DBEAFE',
                borderColor: '#60A5FA',
                color: '#2563EB'
              }
            }}
          />
        </Tooltip>

        {/* 缩小 */}
        <Tooltip title="缩小">
          <Button
            type="default"
            icon={<ZoomOutOutlined />}
            onClick={onZoomOut}
            disabled={disabled}
            style={{
              borderRadius: '8px',
              border: '1px solid #E5E7EB',
              backgroundColor: '#F9FAFB',
              color: '#374151',
              width: '36px',
              height: '36px',
              padding: '0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              '&:hover': {
                backgroundColor: '#EBF5FF',
                borderColor: '#93C5FD',
                color: '#3B82F6'
              },
              '&:active': {
                backgroundColor: '#DBEAFE',
                borderColor: '#60A5FA',
                color: '#2563EB'
              }
            }}
          />
        </Tooltip>

        {/* 适配屏幕 */}
        <Tooltip title="适配屏幕">
          <Button
            type="default"
            icon={<FullscreenOutlined />}
            onClick={onFit}
            disabled={disabled}
            style={{
              borderRadius: '8px',
              border: '1px solid #E5E7EB',
              backgroundColor: '#F9FAFB',
              color: '#374151',
              width: '36px',
              height: '36px',
              padding: '0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              '&:hover': {
                backgroundColor: '#EBF5FF',
                borderColor: '#93C5FD',
                color: '#3B82F6'
              },
              '&:active': {
                backgroundColor: '#DBEAFE',
                borderColor: '#60A5FA',
                color: '#2563EB'
              }
            }}
          />
        </Tooltip>

        {/* 重置视图 */}
        <Tooltip title="重置视图">
          <Button
            type="default"
            icon={<ReloadOutlined />}
            onClick={onReset}
            disabled={disabled}
            style={{
              borderRadius: '8px',
              border: '1px solid #E5E7EB',
              backgroundColor: '#F9FAFB',
              color: '#374151',
              width: '36px',
              height: '36px',
              padding: '0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              '&:hover': {
                backgroundColor: '#EBF5FF',
                borderColor: '#93C5FD',
                color: '#3B82F6'
              },
              '&:active': {
                backgroundColor: '#DBEAFE',
                borderColor: '#60A5FA',
                color: '#2563EB'
              }
            }}
          />
        </Tooltip>
      </Space>
    </div>
  );
};

export default LineageToolbar;