import React from 'react';
import { Drawer, Descriptions, List, Tag, Button, Space, Typography, Divider } from 'antd';
import { TableOutlined, DatabaseOutlined, ArrowRightOutlined, ArrowLeftOutlined, DeleteOutlined } from '@ant-design/icons';


const { Title, Text } = Typography;

const LineageDrawer = ({
  visible,
  node,
  upstreamList = [],
  downstreamList = [],
  onClose,
  onDeleteLineage
}) => {
  if (!node) return null;

  // 根据节点类型获取图标和颜色
  const getNodeTypeInfo = () => {
    if (node.type === 'table') {
      return {
        icon: <TableOutlined />,
        color: '#3B82F6',
        text: '表'
      };
    } else {
      return {
        icon: <DatabaseOutlined />,
        color: '#10B981',
        text: '字段'
      };
    }
  };

  const typeInfo = getNodeTypeInfo();

  return (
    <Drawer
      title={
        <Space size="middle">
          {typeInfo.icon}
          <span style={{ fontSize: '16px', fontWeight: '600', color: '#1F2937' }}>{node.label}</span>
          <Tag 
            color={typeInfo.color} 
            style={{ 
              fontSize: '12px',
              fontWeight: '500'
            }}
          >
            {typeInfo.text}
          </Tag>
        </Space>
      }
      placement="right"
      onClose={onClose}
      visible={visible}
      width={450}
      footer={
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
          <Button 
            onClick={onClose}
            style={{
              borderRadius: '6px',
              border: '1px solid #E5E7EB',
              backgroundColor: '#F9FAFB',
              color: '#374151'
            }}
          >
            关闭
          </Button>
          {onDeleteLineage && (
            <Button 
              type="primary" 
              danger 
              onClick={() => onDeleteLineage(node.id)}
              icon={<DeleteOutlined />}
              style={{ 
                borderRadius: '6px',
                marginLeft: 8
              }}
            >
              删除血缘关系
            </Button>
          )}
        </div>
      }
      style={{
        borderRadius: '8px 0 0 8px'
      }}
    >
      <Descriptions 
        column={1} 
        bordered 
        style={{
          marginBottom: '24px',
          borderRadius: '8px',
          overflow: 'hidden',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06)'
        }}
        title={
          <Text strong style={{ fontSize: '14px', color: '#374151' }}>基本信息</Text>
        }
      >
        <Descriptions.Item label="名称">
          <Text strong>{node.label}</Text>
        </Descriptions.Item>
        
        <Descriptions.Item label="类型">
          <Tag color={typeInfo.color} style={{ margin: 0, fontSize: '12px' }}>
            {typeInfo.text}
          </Tag>
        </Descriptions.Item>
        
        <Descriptions.Item label="所属模式">
          {node.schema || '-'} 
        </Descriptions.Item>
        
        <Descriptions.Item label="描述">
          {node.description || '-'} 
        </Descriptions.Item>
        
        <Descriptions.Item label="示例数据">
          {node.sampleData ? (
            <Text code style={{ 
              backgroundColor: '#F3F4F6', 
              padding: '2px 6px', 
              borderRadius: '3px',
              fontSize: '12px'
            }}>
              {node.sampleData}
            </Text>
          ) : (
            '-'
          )}
        </Descriptions.Item>
      </Descriptions>

      {/* 上游表列表 */}
      <div style={{ marginBottom: '24px' }}>
        <Divider orientation="left">
          <Title level={5} style={{ margin: 0, fontSize: '14px', fontWeight: '600', color: '#374151' }}>
            <Space size="small">
              <ArrowLeftOutlined style={{ fontSize: '12px' }} />
              <span>上游{typeInfo.text}列表</span>
            </Space>
          </Title>
        </Divider>
        
        {upstreamList.length > 0 ? (
          <List
            size="small"
            dataSource={upstreamList}
            renderItem={(item) => (
              <List.Item
                style={{
                  borderRadius: '6px',
                  marginBottom: '4px',
                  backgroundColor: '#F9FAFB',
                  border: '1px solid #E5E7EB'
                }}
              >
                <Tag color="blue" style={{ fontSize: '12px', margin: 0 }}>{item}</Tag>
              </List.Item>
            )}
            style={{ maxHeight: '200px', overflowY: 'auto' }}
          />
        ) : (
          <Text type="secondary" style={{ fontSize: '13px' }}>无上游{typeInfo.text}</Text>
        )}
      </div>

      {/* 下游表列表 */}
      <div>
        <Divider orientation="left">
          <Title level={5} style={{ margin: 0, fontSize: '14px', fontWeight: '600', color: '#374151' }}>
            <Space size="small">
              <ArrowRightOutlined style={{ fontSize: '12px' }} />
              <span>下游{typeInfo.text}列表</span>
            </Space>
          </Title>
        </Divider>
        
        {downstreamList.length > 0 ? (
          <List
            size="small"
            dataSource={downstreamList}
            renderItem={(item) => (
              <List.Item
                style={{
                  borderRadius: '6px',
                  marginBottom: '4px',
                  backgroundColor: '#F9FAFB',
                  border: '1px solid #E5E7EB'
                }}
              >
                <Tag color="green" style={{ fontSize: '12px', margin: 0 }}>{item}</Tag>
              </List.Item>
            )}
            style={{ maxHeight: '200px', overflowY: 'auto' }}
          />
        ) : (
          <Text type="secondary" style={{ fontSize: '13px' }}>无下游{typeInfo.text}</Text>
        )}
      </div>
      
      {/* 扩展区域 - 可根据需要添加更多字段 */}
      {Object.keys(node).some(key => !['id', 'label', 'type', 'schema', 'description', 'sampleData', 'isCurrent'].includes(key)) && (
        <>
          <Divider orientation="left" style={{ marginTop: '24px' }}>
            <Title level={5} style={{ margin: 0, fontSize: '14px', fontWeight: '600', color: '#374151' }}>扩展信息</Title>
          </Divider>
          <Descriptions column={1}>
            {Object.entries(node).map(([key, value]) => {
              if (['id', 'label', 'type', 'schema', 'description', 'sampleData', 'isCurrent'].includes(key)) {
                return null;
              }
              return (
                <Descriptions.Item key={key} label={key}>
                  {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                </Descriptions.Item>
              );
            })}
          </Descriptions>
        </>
      )}
    </Drawer>
  );
};

export default LineageDrawer;