import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Tag,
  Modal,
  Form,
  Select,
  Input,
  message,
  Drawer,
  Tooltip,
  Popconfirm,
  Alert,
  Row,
  Col,
  Tabs,
  AutoComplete
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  SearchOutlined,
  FilterOutlined,
  DatabaseOutlined,
  TableOutlined,
  FieldNumberOutlined,
  BranchesOutlined,
  UploadOutlined
} from '@ant-design/icons';
import { tableMetadataApi, lineageApi } from '../services/api';

const { Option } = Select;
const { TextArea } = Input;
const { TabPane } = Tabs;

/**
 * 血缘管理页面
 * 整合了血缘配置和血缘关系列表功能
 */
const LineageManagement = () => {
  const [loading, setLoading] = useState(false);
  const [tables, setTables] = useState([]);

  // 表级血缘相关状态
  const [tableLineageList, setTableLineageList] = useState([]);
  const [tableLineageLoading, setTableLineageLoading] = useState(false);
  const [selectedTableRowKeys, setSelectedTableRowKeys] = useState([]);

  // 列级血缘相关状态
  const [columnLineageList, setColumnLineageList] = useState([]);
  const [columnLineageLoading, setColumnLineageLoading] = useState(false);
  const [selectedColumnRowKeys, setSelectedColumnRowKeys] = useState([]);

  // 模态框状态
  const [showTableLineageModal, setShowTableLineageModal] = useState(false);
  const [showColumnLineageModal, setShowColumnLineageModal] = useState(false);
  const [showBatchImportModal, setShowBatchImportModal] = useState(false);
  const [editingTableRelation, setEditingTableRelation] = useState(null);
  const [editingColumnRelation, setEditingColumnRelation] = useState(null);

  // 详情抽屉状态
  const [showDetailDrawer, setShowDetailDrawer] = useState(false);
  const [currentDetail, setCurrentDetail] = useState(null);

  // 搜索状态
  const [searchText, setSearchText] = useState('');
  const [filterType, setFilterType] = useState('all');

  const [tableForm] = Form.useForm();
  const [columnForm] = Form.useForm();

  // 初始化数据
  useEffect(() => {
    fetchTables();
    fetchTableLineageList();
    fetchColumnLineageList();
  }, []);

  // 获取表列表
  const fetchTables = async () => {
    try {
      const response = await tableMetadataApi.getAll({ page: 1, page_size: 1000 });
      const tableList = Array.isArray(response) ? response : (response.items || response.data || []);
      setTables(tableList);
    } catch (error) {
      console.error('获取表列表失败:', error);
      message.error('获取表列表失败');
    }
  };

  // 获取表级血缘关系列表
  const fetchTableLineageList = async () => {
    try {
      setTableLineageLoading(true);
      const response = await lineageApi.getAllTableRelations({ page: 1, page_size: 100 });
      const list = Array.isArray(response) ? response : (response.data || []);
      setTableLineageList(list);
    } catch (error) {
      console.error('获取表级血缘关系列表失败:', error);
      message.error('获取表级血缘关系列表失败');
    } finally {
      setTableLineageLoading(false);
    }
  };

  // 获取列级血缘关系列表
  const fetchColumnLineageList = async () => {
    try {
      setColumnLineageLoading(true);
      const response = await lineageApi.getAllColumnRelations({ page: 1, page_size: 100 });
      const list = Array.isArray(response) ? response : (response.data || []);
      setColumnLineageList(list);
    } catch (error) {
      console.error('获取列级血缘关系列表失败:', error);
      message.error('获取列级血缘关系列表失败');
    } finally {
      setColumnLineageLoading(false);
    }
  };

  // 表级血缘表格列定义
  const tableLineageColumns = [
    {
      title: '源表',
      dataIndex: 'source_tables',
      key: 'source_tables',
      render: (sourceTables) => {
        if (!Array.isArray(sourceTables)) return '--';
        return sourceTables.map(table => table.name).join(', ');
      }
    },
    {
      title: '目标表',
      dataIndex: ['target_table', 'name'],
      key: 'target_table_name'
    },
    {
      title: '关系类型',
      dataIndex: 'relation_type',
      key: 'relation_type',
      render: (type) => (
        <Tag color={type === 'ETL' ? 'blue' : 'green'}>
          {type || '--'}
        </Tag>
      )
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      render: (_, record) => (
        <Space>
          <Tooltip title="查看详情">
            <Button
              type="text"
              icon={<EyeOutlined />}
              onClick={() => showRelationDetail(record)}
            />
          </Tooltip>
          <Tooltip title="编辑">
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => editTableRelation(record)}
            />
          </Tooltip>
          <Tooltip title="删除">
            <Popconfirm
              title="确定删除这个表级血缘关系吗？"
              onConfirm={() => deleteTableRelation(record.id)}
              okText="确定"
              cancelText="取消"
            >
              <Button
                type="text"
                danger
                icon={<DeleteOutlined />}
              />
            </Popconfirm>
          </Tooltip>
        </Space>
      )
    }
  ];

  // 列级血缘表格列定义
  const columnLineageColumns = [
    {
      title: '源表',
      dataIndex: ['source_column', 'table', 'name'],
      key: 'source_table_name'
    },
    {
      title: '源列',
      dataIndex: ['source_column', 'name'],
      key: 'source_column_name'
    },
    {
      title: '目标表',
      dataIndex: ['target_column', 'table', 'name'],
      key: 'target_table_name'
    },
    {
      title: '目标列',
      dataIndex: ['target_column', 'name'],
      key: 'target_column_name'
    },
    {
      title: '转换规则',
      dataIndex: 'transformation_details',
      key: 'transformation_details',
      ellipsis: true,
      render: (details) => {
        if (!details) return '--';
        try {
          const parsedDetails = typeof details === 'string' ? JSON.parse(details) : details;
          return parsedDetails.rule || parsedDetails.description || JSON.stringify(parsedDetails);
        } catch (e) {
          return details;
        }
      }
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      render: (_, record) => (
        <Space>
          <Tooltip title="查看详情">
            <Button
              type="text"
              icon={<EyeOutlined />}
              onClick={() => showRelationDetail(record)}
            />
          </Tooltip>
          <Tooltip title="编辑">
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => editColumnRelation(record)}
            />
          </Tooltip>
          <Tooltip title="删除">
            <Popconfirm
              title="确定删除这个字段血缘关系吗？"
              onConfirm={() => deleteColumnRelation(record.id)}
              okText="确定"
              cancelText="取消"
            >
              <Button
                type="text"
                danger
                icon={<DeleteOutlined />}
              />
            </Popconfirm>
          </Tooltip>
        </Space>
      )
    }
  ];

  // 查看血缘关系详情
  const showRelationDetail = (relation) => {
    setCurrentDetail(relation);
    setShowDetailDrawer(true);
  };

  // 编辑表级血缘关系
  const editTableRelation = (relation) => {
    setEditingTableRelation(relation);
    tableForm.setFieldsValue({
      source_table_ids: relation.source_tables?.map(t => t.id) || [],
      target_table_id: relation.target_table?.id,
      relation_type: relation.relation_type || 'ETL',
      description: relation.description
    });
    setShowTableLineageModal(true);
  };

  // 编辑列级血缘关系
  const editColumnRelation = (relation) => {
    setEditingColumnRelation(relation);
    columnForm.setFieldsValue({
      source_column_id: relation.source_column?.id,
      target_column_id: relation.target_column?.id,
      relation_type: relation.relation_type || 'ETL',
      transformation_details: relation.transformation_details
    });
    setShowColumnLineageModal(true);
  };

  // 删除表级血缘关系
  const deleteTableRelation = async (id) => {
    try {
      await lineageApi.deleteTableRelation(id);
      message.success('删除成功');
      fetchTableLineageList();
    } catch (error) {
      console.error('删除表级血缘关系失败:', error);
      message.error('删除失败');
    }
  };

  // 删除列级血缘关系
  const deleteColumnRelation = async (id) => {
    try {
      await lineageApi.deleteColumnRelation(id);
      message.success('删除成功');
      fetchColumnLineageList();
    } catch (error) {
      console.error('删除列级血缘关系失败:', error);
      message.error('删除失败');
    }
  };

  // 保存表级血缘关系
  const handleSaveTableRelation = async (values) => {
    try {
      setLoading(true);
      const relationData = {
        source_table_ids: values.source_table_ids,
        target_table_id: values.target_table_id,
        relation_type: values.relation_type,
        description: values.description
      };

      if (editingTableRelation) {
        await lineageApi.updateTableRelation(editingTableRelation.id, relationData);
        message.success('更新成功');
      } else {
        await lineageApi.createTableRelation(relationData);
        message.success('创建成功');
      }

      setShowTableLineageModal(false);
      tableForm.resetFields();
      setEditingTableRelation(null);
      fetchTableLineageList();
    } catch (error) {
      console.error('保存表级血缘关系失败:', error);
      message.error('保存失败');
    } finally {
      setLoading(false);
    }
  };

  // 保存列级血缘关系
  const handleSaveColumnRelation = async (values) => {
    try {
      setLoading(true);
      const relationData = {
        source_column_id: values.source_column_id,
        target_column_id: values.target_column_id,
        relation_type: values.relation_type,
        transformation_details: values.transformation_details
      };

      if (editingColumnRelation) {
        await lineageApi.updateColumnRelation(editingColumnRelation.id, relationData);
        message.success('更新成功');
      } else {
        await lineageApi.createColumnRelation(relationData);
        message.success('创建成功');
      }

      setShowColumnLineageModal(false);
      columnForm.resetFields();
      setEditingColumnRelation(null);
      fetchColumnLineageList();
    } catch (error) {
      console.error('保存列级血缘关系失败:', error);
      message.error('保存失败');
    } finally {
      setLoading(false);
    }
  };

  // 批量删除表级血缘
  const handleBatchDeleteTableRelations = async () => {
    if (selectedTableRowKeys.length === 0) {
      message.warning('请选择要删除的项目');
      return;
    }

    try {
      await Promise.all(
        selectedTableRowKeys.map(id => lineageApi.deleteTableRelation(id))
      );
      message.success(`成功删除 ${selectedTableRowKeys.length} 个表级血缘关系`);
      setSelectedTableRowKeys([]);
      fetchTableLineageList();
    } catch (error) {
      console.error('批量删除失败:', error);
      message.error('批量删除失败');
    }
  };

  // 批量删除列级血缘
  const handleBatchDeleteColumnRelations = async () => {
    if (selectedColumnRowKeys.length === 0) {
      message.warning('请选择要删除的项目');
      return;
    }

    try {
      await Promise.all(
        selectedColumnRowKeys.map(id => lineageApi.deleteColumnRelation(id))
      );
      message.success(`成功删除 ${selectedColumnRowKeys.length} 个列级血缘关系`);
      setSelectedColumnRowKeys([]);
      fetchColumnLineageList();
    } catch (error) {
      console.error('批量删除失败:', error);
      message.error('批量删除失败');
    }
  };

  return (
    <Card className="page-card">
      <div className="page-header" style={{ marginBottom: 24 }}>
        <h2>血缘管理</h2>
        <p style={{ color: '#666', margin: 0 }}>
          统一管理表级和字段级的血缘关系配置，支持创建、编辑、删除和批量导入操作
        </p>
      </div>

      <Tabs defaultActiveKey="table">
        <TabPane
          tab={
            <span>
              <TableOutlined />
              表级血缘管理
            </span>
          }
          key="table"
        >
          {/* 工具栏 */}
          <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
            <Space>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => {
                  setEditingTableRelation(null);
                  tableForm.resetFields();
                  setShowTableLineageModal(true);
                }}
              >
                新建表血缘
              </Button>
              <Button
                icon={<UploadOutlined />}
                onClick={() => setShowBatchImportModal(true)}
              >
                批量导入
              </Button>
              {selectedTableRowKeys.length > 0 && (
                <Button
                  danger
                  icon={<DeleteOutlined />}
                  onClick={handleBatchDeleteTableRelations}
                >
                  批量删除 ({selectedTableRowKeys.length})
                </Button>
              )}
            </Space>

            <Space>
              <Input.Search
                placeholder="搜索血缘关系"
                style={{ width: 300 }}
                allowClear
              />
              <Select
                placeholder="关系类型"
                style={{ width: 120 }}
                allowClear
              >
                <Option value="ETL">ETL</Option>
                <Option value="IMPORT">导入</Option>
                <Option value="EXPORT">导出</Option>
              </Select>
            </Space>
          </div>

          <Table
            columns={tableLineageColumns}
            dataSource={tableLineageList}
            rowKey="id"
            loading={tableLineageLoading}
            rowSelection={{
              selectedRowKeys: selectedTableRowKeys,
              onChange: setSelectedTableRowKeys
            }}
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total) => `共 ${total} 条记录`
            }}
          />
        </TabPane>

        <TabPane
          tab={
            <span>
              <FieldNumberOutlined />
              字段血缘管理
            </span>
          }
          key="column"
        >
          {/* 工具栏 */}
          <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
            <Space>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => {
                  setEditingColumnRelation(null);
                  columnForm.resetFields();
                  setShowColumnLineageModal(true);
                }}
              >
                新建字段血缘
              </Button>
              <Button
                icon={<UploadOutlined />}
                onClick={() => setShowBatchImportModal(true)}
              >
                批量导入
              </Button>
              {selectedColumnRowKeys.length > 0 && (
                <Button
                  danger
                  icon={<DeleteOutlined />}
                  onClick={handleBatchDeleteColumnRelations}
                >
                  批量删除 ({selectedColumnRowKeys.length})
                </Button>
              )}
            </Space>

            <Space>
              <Input.Search
                placeholder="搜索血缘关系"
                style={{ width: 300 }}
                allowClear
              />
              <Select
                placeholder="关系类型"
                style={{ width: 120 }}
                allowClear
              >
                <Option value="ETL">ETL</Option>
                <Option value="TRANSFORM">转换</Option>
                <Option value="COPY">复制</Option>
              </Select>
            </Space>
          </div>

          <Table
            columns={columnLineageColumns}
            dataSource={columnLineageList}
            rowKey="id"
            loading={columnLineageLoading}
            rowSelection={{
              selectedRowKeys: selectedColumnRowKeys,
              onChange: setSelectedColumnRowKeys
            }}
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total) => `共 ${total} 条记录`
            }}
          />
        </TabPane>
      </Tabs>

      {/* 表级血缘配置模态框 */}
      <Modal
        title={editingTableRelation ? '编辑表血缘关系' : '新建表血缘关系'}
        open={showTableLineageModal}
        onCancel={() => {
          setShowTableLineageModal(false);
          setEditingTableRelation(null);
          tableForm.resetFields();
        }}
        footer={null}
        width={600}
      >
        <Form
          form={tableForm}
          layout="vertical"
          onFinish={handleSaveTableRelation}
        >
          <Form.Item
            name="source_table_ids"
            label="源表"
            rules={[{ required: true, message: '请选择源表' }]}
          >
            <Select
              mode="multiple"
              placeholder="请选择源表"
              showSearch
              filterOption={(input, option) =>
                option.children.toLowerCase().includes(input.toLowerCase())
              }
            >
              {tables.map(table => (
                <Option key={table.id} value={table.id}>
                  <DatabaseOutlined /> {table.name}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="target_table_id"
            label="目标表"
            rules={[{ required: true, message: '请选择目标表' }]}
          >
            <Select
              placeholder="请选择目标表"
              showSearch
              filterOption={(input, option) =>
                option.children.toLowerCase().includes(input.toLowerCase())
              }
            >
              {tables.map(table => (
                <Option key={table.id} value={table.id}>
                  <TableOutlined /> {table.name}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="relation_type"
            label="关系类型"
            rules={[{ required: true, message: '请选择关系类型' }]}
          >
            <Select placeholder="请选择关系类型">
              <Option value="ETL">ETL</Option>
              <Option value="IMPORT">导入</Option>
              <Option value="EXPORT">导出</Option>
              <Option value="TRANSFORM">转换</Option>
              <Option value="COPY">复制</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="description"
            label="描述"
            rules={[{ required: true, message: '请输入描述' }]}
          >
            <TextArea rows={4} placeholder="请描述血缘关系的业务含义..." />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setShowTableLineageModal(false)}>
                取消
              </Button>
              <Button type="primary" htmlType="submit" loading={loading}>
                {editingTableRelation ? '更新' : '创建'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* 字段血缘配置模态框 */}
      <Modal
        title={editingColumnRelation ? '编辑字段血缘关系' : '新建字段血缘关系'}
        open={showColumnLineageModal}
        onCancel={() => {
          setShowColumnLineageModal(false);
          setEditingColumnRelation(null);
          columnForm.resetFields();
        }}
        footer={null}
        width={600}
      >
        <Form
          form={columnForm}
          layout="vertical"
          onFinish={handleSaveColumnRelation}
        >
          <Form.Item
            name="source_column_id"
            label="源字段"
            rules={[{ required: true, message: '请选择源字段' }]}
          >
            <Select
              placeholder="请选择源字段"
              showSearch
              filterOption={(input, option) =>
                option.children.toLowerCase().includes(input.toLowerCase())
              }
            >
              {tables.map(table =>
                table.columns?.map(column => (
                  <Option key={column.id} value={column.id}>
                    <DatabaseOutlined /> {table.name}.{column.name}
                  </Option>
                ))
              )}
            </Select>
          </Form.Item>

          <Form.Item
            name="target_column_id"
            label="目标字段"
            rules={[{ required: true, message: '请选择目标字段' }]}
          >
            <Select
              placeholder="请选择目标字段"
              showSearch
              filterOption={(input, option) =>
                option.children.toLowerCase().includes(input.toLowerCase())
              }
            >
              {tables.map(table =>
                table.columns?.map(column => (
                  <Option key={column.id} value={column.id}>
                    <TableOutlined /> {table.name}.{column.name}
                  </Option>
                ))
              )}
            </Select>
          </Form.Item>

          <Form.Item
            name="relation_type"
            label="关系类型"
            rules={[{ required: true, message: '请选择关系类型' }]}
          >
            <Select placeholder="请选择关系类型">
              <Option value="ETL">ETL</Option>
              <Option value="TRANSFORM">转换</Option>
              <Option value="COPY">复制</Option>
              <Option value="AGGREGATE">聚合</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="transformation_details"
            label="转换规则"
          >
            <TextArea rows={4} placeholder="请描述字段转换规则..." />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setShowColumnLineageModal(false)}>
                取消
              </Button>
              <Button type="primary" htmlType="submit" loading={loading}>
                {editingColumnRelation ? '更新' : '创建'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* 批量导入模态框 - 简化版 */}
      <Modal
        title="批量导入血缘关系"
        open={showBatchImportModal}
        onCancel={() => setShowBatchImportModal(false)}
        footer={null}
        width={500}
      >
        <Alert
          message="批量导入功能"
          description="请使用原有的数据导入页面进行批量导入操作，这里仅提供统一入口。"
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />

        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <BranchesOutlined style={{ fontSize: 48, color: '#1890ff', marginBottom: 16 }} />
          <p style={{ color: '#666', marginBottom: 16 }}>
            请前往"数据导入"页面使用完整的批量导入功能
          </p>
          <Button type="primary" onClick={() => {
            setShowBatchImportModal(false);
            // 这里可以添加跳转到数据导入页面的逻辑
          }}>
            前往数据导入
          </Button>
        </div>
      </Modal>

      {/* 详情抽屉 */}
      <Drawer
        title="血缘关系详情"
        placement="right"
        width={600}
        open={showDetailDrawer}
        onClose={() => setShowDetailDrawer(false)}
      >
        {currentDetail && (
          <div>
            <div style={{ marginBottom: 24 }}>
              <h4>基本信息</h4>
              <p><strong>关系类型:</strong> {currentDetail.relation_type}</p>
              <p><strong>创建时间:</strong> {currentDetail.created_at}</p>
              <p><strong>更新时间:</strong> {currentDetail.updated_at}</p>
            </div>

            <div style={{ marginBottom: 24 }}>
              <h4>描述</h4>
              <p>{currentDetail.description || '--'}</p>
            </div>

            {currentDetail.transformation_details && (
              <div>
                <h4>转换详情</h4>
                <pre style={{
                  background: '#f5f5f5',
                  padding: 12,
                  borderRadius: 4,
                  overflow: 'auto'
                }}>
                  {typeof currentDetail.transformation_details === 'string'
                    ? currentDetail.transformation_details
                    : JSON.stringify(currentDetail.transformation_details, null, 2)
                  }
                </pre>
              </div>
            )}
          </div>
        )}
      </Drawer>
    </Card>
  );
};

export default LineageManagement;