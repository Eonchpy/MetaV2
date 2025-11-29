import React, { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, Select, message, Space, Card, Checkbox, Alert } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, ExclamationCircleOutlined, UploadOutlined } from '@ant-design/icons';
import { dataSourceApi } from '../services/api';
import UploadFileModal from '../components/UploadFileModal';

const { Option } = Select;
const { confirm } = Modal;

const DataSourcePage = () => {
  const [dataSources, setDataSources] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [currentDataSource, setCurrentDataSource] = useState(null);
  const [createForm] = Form.useForm();
  const [editForm] = Form.useForm();
  const [isUploadModalVisible, setIsUploadModalVisible] = useState(false);
  const [cascadeChecked, setCascadeChecked] = useState(false);
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
  const [deleteDataSourceId, setDeleteDataSourceId] = useState(null);

  // 获取所有数据源
  const fetchDataSources = async () => {
    try {
      setLoading(true);
      const response = await dataSourceApi.getAll();
      setDataSources(response);
    } catch (error) {
      message.error('获取数据源列表失败');
      console.error('获取数据源列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDataSources();
  }, []);

  // 打开创建模态框
  const showCreateModal = () => {
    createForm.resetFields();
    setIsCreateModalVisible(true);
  };

  // 打开编辑模态框
  const showEditModal = (dataSource) => {
    setCurrentDataSource(dataSource);
    editForm.setFieldsValue({
      name: dataSource.name,
      type: dataSource.type,
      description: dataSource.description,
      connectionConfig: JSON.stringify(dataSource.connection_config, null, 2)
    });
    setIsEditModalVisible(true);
  };

  // 打开上传模态框
  const showUploadModal = () => {
    setIsUploadModalVisible(true);
  };

  // 处理创建数据源
  const handleCreate = async (values) => {
    try {
      setLoading(true);
      // 解析连接配置JSON
      const connectionConfig = JSON.parse(values.connectionConfig);
      
      const newDataSource = {
        name: values.name,
        type: values.type,
        connection_config: connectionConfig,
        description: values.description
      };
      
      await dataSourceApi.create(newDataSource);
      message.success('创建数据源成功');
      setIsCreateModalVisible(false);
      fetchDataSources();
    } catch (error) {
      if (error.response?.data?.detail) {
        message.error(error.response.data.detail);
      } else if (error instanceof SyntaxError) {
        message.error('连接配置格式错误，请检查JSON格式');
      } else {
        message.error('创建数据源失败');
      }
    } finally {
      setLoading(false);
    }
  };

  // 处理更新数据源
  const handleUpdate = async (values) => {
    try {
      setLoading(true);
      // 解析连接配置JSON
      const connectionConfig = JSON.parse(values.connectionConfig);
      
      const updatedDataSource = {
        name: values.name,
        type: values.type,
        connection_config: connectionConfig,
        description: values.description
      };
      
      await dataSourceApi.update(currentDataSource.id, updatedDataSource);
      message.success('更新数据源成功');
      setIsEditModalVisible(false);
      fetchDataSources();
    } catch (error) {
      if (error.response?.data?.detail) {
        message.error(error.response.data.detail);
      } else if (error instanceof SyntaxError) {
        message.error('连接配置格式错误，请检查JSON格式');
      } else {
        message.error('更新数据源失败');
      }
    } finally {
      setLoading(false);
    }
  };

  // 处理删除数据源
  const handleDelete = (id) => {
    setDeleteDataSourceId(id);
    setCascadeChecked(false); // 重置为默认未勾选状态
    setIsDeleteModalVisible(true);
  };

  // 确认删除
  const confirmDelete = async () => {
    try {
      setLoading(true);
      // 添加cascade查询参数
      await dataSourceApi.delete(deleteDataSourceId, { params: { cascade: cascadeChecked } });
      message.success('删除数据源成功');
      fetchDataSources();
      setIsDeleteModalVisible(false);
    } catch (error) {
      if (error.response?.data?.detail) {
        message.error(error.response.data.detail);
      } else {
        message.error('删除数据源失败');
      }
    } finally {
      setLoading(false);
    }
  };

  // 处理文件上传成功
  const handleUploadSuccess = () => {
    setIsUploadModalVisible(false);
    message.success('文件上传成功');
    fetchDataSources();
  };

  // 表格列配置
  const columns = [
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name'
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      render: (type) => {
        const typeMap = {
          'oracle': 'Oracle',
          'elasticsearch': 'Elasticsearch',
          'mongodb': 'MongoDB'
        };
        return typeMap[type] || type;
      }
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (time) => new Date(time).toLocaleString()
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Space size="middle">
          <Button type="link" icon={<EditOutlined />} onClick={() => showEditModal(record)}>
            编辑
          </Button>
          <Button type="link" danger icon={<DeleteOutlined />} onClick={() => handleDelete(record.id)}>
            删除
          </Button>
        </Space>
      )
    }
  ];

  return (
    <Card className="page-card">
      <div className="page-header">
        <h2>数据源管理</h2>
        <Space>
          <Button type="primary" icon={<PlusOutlined />} onClick={showCreateModal}>
            创建数据源
          </Button>
          <Button icon={<UploadOutlined />} onClick={showUploadModal}>
            批量导入
          </Button>
        </Space>
      </div>
      
      <Table 
        columns={columns} 
        dataSource={dataSources} 
        rowKey="id" 
        loading={loading}
        pagination={{ pageSize: 10 }}
      />

      {/* 删除确认模态框 */}
      <Modal
        title="确定要删除这个数据源吗？"
        open={isDeleteModalVisible}
        icon={<ExclamationCircleOutlined />}
        onOk={confirmDelete}
        onCancel={() => setIsDeleteModalVisible(false)}
        okText="确定删除"
        okType="danger"
        cancelText="取消"
      >
        <div>
          <p>删除此数据源将导致其所有数据被移除。</p>
          {cascadeChecked && (
            <Alert message="警告" description="级联删除将同时删除所有关联的表元数据和列元数据，此操作不可恢复！" type="warning" showIcon />
          )}
          <Space direction="vertical" style={{ marginTop: 16 }}>
            <Checkbox
              checked={cascadeChecked}
              onChange={(e) => setCascadeChecked(e.target.checked)}
            >
              级联删除关联的表元数据
            </Checkbox>
            <p style={{ color: '#999', fontSize: '12px', margin: 0 }}>勾选此项可强制删除包含表的数据源</p>
          </Space>
        </div>
      </Modal>

      {/* 创建数据源模态框 */}
      <Modal
        title="创建数据源"
        open={isCreateModalVisible}
        onCancel={() => setIsCreateModalVisible(false)}
        footer={null}
      >
        <Form
          form={createForm}
          layout="vertical"
          onFinish={handleCreate}
        >
          <Form.Item
            label="名称"
            name="name"
            rules={[{ required: true, message: '请输入数据源名称' }]}
          >
            <Input placeholder="请输入数据源名称" />
          </Form.Item>
          
          <Form.Item
            label="类型"
            name="type"
            rules={[{ required: true, message: '请选择数据源类型' }]}
          >
            <Select placeholder="请选择数据源类型">
              <Option value="oracle">Oracle</Option>
              <Option value="elasticsearch">Elasticsearch</Option>
              <Option value="mongodb">MongoDB</Option>
            </Select>
          </Form.Item>
          
          <Form.Item
            label="连接配置（JSON格式）"
            name="connectionConfig"
            rules={[{ required: true, message: '请输入连接配置' }]}
          >
            <Input.TextArea rows={4} placeholder="请输入JSON格式的连接配置" />
          </Form.Item>
          
          <Form.Item
            label="描述"
            name="description"
          >
            <Input.TextArea rows={2} placeholder="请输入数据源描述" />
          </Form.Item>
          
          <Form.Item className="modal-footer">
            <Button onClick={() => setIsCreateModalVisible(false)}>取消</Button>
            <Button type="primary" htmlType="submit" loading={loading}>确定</Button>
          </Form.Item>
        </Form>
      </Modal>

      {/* 编辑数据源模态框 */}
      <Modal
        title="编辑数据源"
        open={isEditModalVisible}
        onCancel={() => setIsEditModalVisible(false)}
        footer={null}
      >
        <Form
          form={editForm}
          layout="vertical"
          onFinish={handleUpdate}
        >
          <Form.Item
            label="名称"
            name="name"
            rules={[{ required: true, message: '请输入数据源名称' }]}
          >
            <Input placeholder="请输入数据源名称" />
          </Form.Item>
          
          <Form.Item
            label="类型"
            name="type"
            rules={[{ required: true, message: '请选择数据源类型' }]}
          >
            <Select placeholder="请选择数据源类型">
              <Option value="oracle">Oracle</Option>
              <Option value="elasticsearch">Elasticsearch</Option>
              <Option value="mongodb">MongoDB</Option>
            </Select>
          </Form.Item>
          
          <Form.Item
            label="连接配置（JSON格式）"
            name="connectionConfig"
            rules={[{ required: true, message: '请输入连接配置' }]}
          >
            <Input.TextArea rows={4} placeholder="请输入JSON格式的连接配置" />
          </Form.Item>
          
          <Form.Item
            label="描述"
            name="description"
          >
            <Input.TextArea rows={2} placeholder="请输入数据源描述" />
          </Form.Item>
          
          <Form.Item className="modal-footer">
            <Button onClick={() => setIsEditModalVisible(false)}>取消</Button>
            <Button type="primary" htmlType="submit" loading={loading}>确定</Button>
          </Form.Item>
        </Form>
      </Modal>

      {/* 文件上传模态框 */}
      <UploadFileModal
        visible={isUploadModalVisible}
        onCancel={() => setIsUploadModalVisible(false)}
        onSuccess={handleUploadSuccess}
      />
    </Card>
  );
};

export default DataSourcePage;