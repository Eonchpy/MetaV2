import React, { useState, useEffect } from 'react';
import { Card, Button, Tabs, Row, Col, message } from 'antd';
import { UploadOutlined, TableOutlined, DatabaseOutlined, EditOutlined, LineChartOutlined } from '@ant-design/icons';

// 导入组件
import TableStructureImport from '../components/TableStructureImport';
import TableLineageImport from '../components/TableLineageImport';
import ColumnLineageImport from '../components/ColumnLineageImport';

const { TabPane } = Tabs;

const ImportPage = () => {
  // 导入模态框状态
  const [showTableStructureImport, setShowTableStructureImport] = useState(false);
  const [showTableLineageImport, setShowTableLineageImport] = useState(false);
  const [showColumnLineageImport, setShowColumnLineageImport] = useState(false);

  // 处理导入成功
  const handleImportSuccess = (result) => {
    if (result) {
      message.success('导入成功');
    }
  };

  return (
    <Card className="page-card">
      <div className="page-header">
        <h2>数据导入</h2>
        <p style={{ color: '#666', margin: 0 }}>
          导入表结构信息和血缘关系数据，支持Excel和JSON格式
        </p>
      </div>

      <Row gutter={[16, 16]}>
        <Col span={8}>
          <Card
            title="表结构及字段信息导入"
            extra={<DatabaseOutlined style={{ fontSize: '24px', color: '#1890ff' }} />}
            style={{ height: 200, display: 'flex', flexDirection: 'column' }}
          >
            <p style={{ marginBottom: '16px', color: '#666' }}>
              导入表结构及其包含的字段信息，支持Excel和JSON格式
            </p>
            <Button
              type="primary"
              size="large"
              onClick={() => setShowTableStructureImport(true)}
              style={{ marginTop: 'auto' }}
            >
              开始导入
            </Button>
          </Card>
        </Col>

        <Col span={8}>
          <Card
            title="表血缘关系信息导入"
            extra={<TableOutlined style={{ fontSize: '24px', color: '#52c41a' }} />}
            style={{ height: 200, display: 'flex', flexDirection: 'column' }}
          >
            <p style={{ marginBottom: '16px', color: '#666' }}>
              导入表之间的血缘关系，系统将自动验证源表和目标表是否存在
            </p>
            <Button
              type="primary"
              size="large"
              onClick={() => setShowTableLineageImport(true)}
              style={{ marginTop: 'auto' }}
            >
              开始导入
            </Button>
          </Card>
        </Col>

        <Col span={8}>
          <Card
            title="字段血缘关系信息导入"
            extra={<LineChartOutlined style={{ fontSize: '24px', color: '#fa8c16' }} />}
            style={{ height: 200, display: 'flex', flexDirection: 'column' }}
          >
            <p style={{ marginBottom: '16px', color: '#666' }}>
              导入字段之间的血缘关系，系统将自动验证相关字段和表是否存在
            </p>
            <Button
              type="primary"
              size="large"
              onClick={() => setShowColumnLineageImport(true)}
              style={{ marginTop: 'auto' }}
            >
              开始导入
            </Button>
          </Card>
        </Col>
      </Row>

      {/* 表结构导入模态框 */}
      <TableStructureImport
        visible={showTableStructureImport}
        onCancel={() => setShowTableStructureImport(false)}
        onSuccess={handleImportSuccess}
      />

      {/* 表血缘导入模态框 */}
      <TableLineageImport
        visible={showTableLineageImport}
        onCancel={() => setShowTableLineageImport(false)}
        onSuccess={handleImportSuccess}
      />

      {/* 字段血缘导入模态框 */}
      <ColumnLineageImport
        visible={showColumnLineageImport}
        onCancel={() => setShowColumnLineageImport(false)}
        onSuccess={handleImportSuccess}
      />
    </Card>
  );
};

export default ImportPage;