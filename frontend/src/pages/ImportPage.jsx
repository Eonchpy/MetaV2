import React, { useState, useEffect } from 'react';
import { Card, Button, Tabs, Row, Col, message } from 'antd';
import { UploadOutlined, TableOutlined, DatabaseOutlined, EditOutlined, LineChartOutlined } from '@ant-design/icons';

// 导入组件
import TableStructureImport from '../components/TableStructureImport';
import TableLineageImport from '../components/TableLineageImport';
import ColumnLineageImport from '../components/ColumnLineageImport';
import TableLineageConfig from '../components/TableLineageConfig';
import ColumnLineageConfig from '../components/ColumnLineageConfig';

const { TabPane } = Tabs;

const ImportPage = () => {
  // 导入模态框状态
  const [showTableStructureImport, setShowTableStructureImport] = useState(false);
  const [showTableLineageImport, setShowTableLineageImport] = useState(false);
  const [showColumnLineageImport, setShowColumnLineageImport] = useState(false);
  const [showTableLineageConfig, setShowTableLineageConfig] = useState(false);
  const [showColumnLineageConfig, setShowColumnLineageConfig] = useState(false);
  
  // 刷新标志，用于强制重新加载表数据
  const [forceRefreshLineage, setForceRefreshLineage] = useState(false);

  // 处理导入成功
  const handleImportSuccess = (result) => {
    // 当表结构导入成功时，强制刷新血缘配置模态框的表数据
    if (result) {
      // 设置刷新标志，用于强制重新加载表数据
      setForceRefreshLineage(prev => !prev);
    }
  };

  // 处理配置成功
  const handleConfigSuccess = () => {
    message.success('配置保存成功');
  };

  return (
    <Card className="page-card">
      <div className="page-header">
        <h2>数据导入与血缘配置</h2>
      </div>
      
      <Tabs defaultActiveKey="import">
        <TabPane tab={<span><UploadOutlined /> 数据导入</span>} key="import">
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
        </TabPane>
        
        <TabPane tab={<span><EditOutlined /> 血缘配置</span>} key="config">
          <Row gutter={[16, 16]}>
            <Col span={12}>
              <Card
                title="表血缘关系配置"
                extra={<TableOutlined style={{ fontSize: '24px', color: '#1890ff' }} />}
                style={{ height: 250, display: 'flex', flexDirection: 'column' }}
              >
                <p style={{ marginBottom: '16px', color: '#666' }}>
                  通过可视化界面手动配置表之间的血缘关系，支持多选源表
                </p>
                <Button
                  type="primary"
                  size="large"
                  onClick={() => setShowTableLineageConfig(true)}
                  style={{ marginTop: 'auto' }}
                >
                  配置表血缘
                </Button>
              </Card>
            </Col>
            
            <Col span={12}>
              <Card
                title="字段血缘关系配置"
                extra={<LineChartOutlined style={{ fontSize: '24px', color: '#52c41a' }} />}
                style={{ height: 250, display: 'flex', flexDirection: 'column' }}
              >
                <p style={{ marginBottom: '16px', color: '#666' }}>
                  通过可视化界面手动配置字段之间的血缘关系，支持转换规则定义
                </p>
                <Button
                  type="primary"
                  size="large"
                  onClick={() => setShowColumnLineageConfig(true)}
                  style={{ marginTop: 'auto' }}
                >
                  配置字段血缘
                </Button>
              </Card>
            </Col>
          </Row>
        </TabPane>
      </Tabs>

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

      {/* 表血缘配置模态框 */}
      <TableLineageConfig
        visible={showTableLineageConfig}
        onCancel={() => setShowTableLineageConfig(false)}
        onSuccess={handleConfigSuccess}
        forceRefresh={forceRefreshLineage}
      />

      {/* 字段血缘配置模态框 */}
      <ColumnLineageConfig
        visible={showColumnLineageConfig}
        onCancel={() => setShowColumnLineageConfig(false)}
        onSuccess={handleConfigSuccess}
        forceRefresh={forceRefreshLineage}
      />
    </Card>
  );
};

export default ImportPage;