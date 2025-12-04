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
          <span>{node.label}</span>
          <Tag color={typeInfo.color}>{typeInfo.text}</Tag>
        </Space>
      }
      placement="right"
      onClose={onClose}
      visible={visible}
      width={450}
      footer={
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button onClick={onClose}>
            关闭
          </Button>
          {onDeleteLineage && (
            <Button 
              type="primary" 
              danger 
              onClick={() => onDeleteLineage(node.id)}
              icon={<DeleteOutlined />}
              style={{ marginLeft: 8 }}
            >
              删除血缘关系
            </Button>
          )}
        </div>
      }
    >
      <Descriptions column={1} bordered>
        <Descriptions.Item label="名称">
          <Text strong>{node.label}</Text>
        </Descriptions.Item>
        
        <Descriptions.Item label="类型">
          <Tag color={typeInfo.color} style={{ margin: 0 }}>
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
            <Text code style={{ backgroundColor: '#f5f5f5', padding: '2px 6px', borderRadius: '3px' }}>
              {node.sampleData}
            </Text>
          ) : (
            '-'
          )}
        </Descriptions.Item>
      </Descriptions>

      <Divider orientation="left">
        <Title level={5} style={{ margin: 0 }}>
          <Space>
            <ArrowLeftOutlined />
            <span>上游列表</span>
          </Space>
        </Title>
      </Divider>
      
      {upstreamList.length > 0 ? (
        <List
          size="small"
          dataSource={upstreamList}
          renderItem={(item) => (
            <List.Item>
              <Tag color="blue">{item}</Tag>
            </List.Item>
          )}
        />
      ) : (
        <Text type="secondary">无上游节点</Text>
      )}

      <Divider orientation="left" style={{ marginTop: 24 }}>
        <Title level={5} style={{ margin: 0 }}>
          <Space>
            <ArrowRightOutlined />
            <span>下游列表</span>
          </Space>
        </Title>
      </Divider>
      
      {downstreamList.length > 0 ? (
        <List
          size="small"
          dataSource={downstreamList}
          renderItem={(item) => (
            <List.Item>
              <Tag color="green">{item}</Tag>
            </List.Item>
          )}
        />
      ) : (
        <Text type="secondary">无下游节点</Text>
      )}
      
      {/* 扩展区域 - 可根据需要添加更多字段 */}
      {Object.keys(node).some(key => !['id', 'label', 'type', 'schema', 'description', 'sampleData', 'isCurrent'].includes(key)) && (
        <>
          <Divider orientation="left" style={{ marginTop: 24 }}>
            <Title level={5} style={{ margin: 0 }}>扩展信息</Title>
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