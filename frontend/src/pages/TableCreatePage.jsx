import React, { useState, useEffect } from 'react';
import { Form, Input, Select, Button, Table, Space, message, Card, Row, Col, Modal, Divider, Tabs } from 'antd';
import { PlusOutlined, DeleteOutlined, EditOutlined, SaveOutlined, CloseOutlined, SearchOutlined } from '@ant-design/icons';
import { tableMetadataApi, dataSourceApi } from '../services/api';
import './TablePages.css';

const { Option } = Select;
const { TabPane } = Tabs;

const TableCreatePage = () => {
  const [form] = Form.useForm();
  const [fields, setFields] = useState([]);
  const [editingField, setEditingField] = useState(null);
  const [isFieldModalVisible, setIsFieldModalVisible] = useState(false);
  const [fieldForm] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dataSources, setDataSources] = useState([]);
  const [tables, setTables] = useState([]);
  const [selectedTableId, setSelectedTableId] = useState(null);
  const [activeTab, setActiveTab] = useState('create'); // create or edit
  const [searchText, setSearchText] = useState('');
  const [filteredTables, setFilteredTables] = useState([]);
  const [selectedTableData, setSelectedTableData] = useState(null);

  // 字段类型选项
  const fieldTypeOptions = [
    'string', 'int', 'bigint', 'float', 'double', 'decimal', 'datetime', 'date', 'time', 'boolean', 'json'
  ];

  // 加载数据源列表
  useEffect(() => {
    const fetchDataSources = async () => {
      try {
        const response = await dataSourceApi.getAll();
        // 处理不同API返回格式：直接返回数组或包含data属性的对象
        const dataSourcesList = Array.isArray(response) ? response : (response.data || []);
        setDataSources(dataSourcesList);
      } catch (error) {
        message.error('加载数据源失败');
        console.error('加载数据源失败:', error);
      }
    };
    fetchDataSources();
  }, []);

  // 加载所有表数据
  useEffect(() => {
    const fetchTables = async () => {
      try {
        setLoading(true);
        const response = await tableMetadataApi.getAll({ limit: 1000 });
        if (response && response.data) {
          setTables(response.data);
          setFilteredTables(response.data);
        }
      } catch (error) {
        message.error('加载表数据失败');
      } finally {
        setLoading(false);
      }
    };
    fetchTables();
  }, []);

  // 搜索表
  useEffect(() => {
    if (searchText) {
      const filtered = tables.filter(table => 
        table.name.toLowerCase().includes(searchText.toLowerCase()) ||
        table.description?.toLowerCase().includes(searchText.toLowerCase())
      );
      setFilteredTables(filtered);
    } else {
      setFilteredTables(tables);
    }
  }, [searchText, tables]);

  // 选择表进行编辑
  const handleSelectTable = async (tableId) => {
    try {
      setLoading(true);
      const response = await tableMetadataApi.getById(tableId);
      if (response) {
        const tableData = response.data || response;
        // 设置表基本信息
        form.setFieldsValue({
          name: tableData.name,
          schema_name: tableData.schema_name,
          data_source_id: tableData.data_source_id,
          description: tableData.description
        });
        // 设置字段列表
        const tableFields = (tableData.columns || []).map(column => ({
          key: column.id.toString(),
          id: column.id,
          name: column.name,
          data_type: column.data_type,
          is_primary_key: column.is_primary_key,
          description: column.description
        }));
        setFields(tableFields);
        setSelectedTableId(tableId);
        setSelectedTableData(tableData);
        setActiveTab('edit');
        message.success('已加载表信息，可进行编辑');
      }
    } catch (error) {
      message.error('加载表信息失败');
      console.error('加载表信息失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 切换到新建模式
  const handleSwitchToCreate = () => {
    form.resetFields();
    setFields([]);
    setSelectedTableId(null);
    setSelectedTableData(null);
    setActiveTab('create');
    setSearchText('');
  };

  // 标签页切换处理
  const handleTabChange = (key) => {
    setActiveTab(key);
    if (key === 'create') {
      handleSwitchToCreate();
    }
  };

  // 字段表格列定义
  const fieldColumns = [
    {
      title: '字段名',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '数据类型',
      dataIndex: 'data_type',
      key: 'data_type',
    },
    {
      title: '是否主键',
      dataIndex: 'is_primary_key',
      key: 'is_primary_key',
      render: (isPrimaryKey) => (
        <span>{isPrimaryKey ? '是' : '否'}</span>
      )
    },
    {
      title: '字段描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Space size="middle">
          <Button type="link" icon={<EditOutlined />} onClick={() => handleEditField(record)}>
            编辑
          </Button>
          <Button type="link" danger icon={<DeleteOutlined />} onClick={() => handleDeleteField(record.key)}>
            删除
          </Button>
        </Space>
      ),
    },
  ];

  // 打开字段编辑模态框
  const handleEditField = (record) => {
    setEditingField(record);
    fieldForm.setFieldsValue(record);
    setIsFieldModalVisible(true);
  };

  // 打开新增字段模态框
  const handleAddField = () => {
    setEditingField(null);
    fieldForm.resetFields();
    setIsFieldModalVisible(true);
  };

  // 删除字段
  const handleDeleteField = (key) => {
    setFields(fields.filter(field => field.key !== key));
    message.success('字段已删除');
  };

  // 保存字段
  const handleSaveField = async () => {
    try {
      const values = await fieldForm.validateFields();
      
      if (editingField) {
        // 编辑现有字段
        setFields(fields.map(field => 
          field.key === editingField.key ? { ...field, ...values } : field
        ));
        message.success('字段已更新');
      } else {
        // 新增字段
        const newField = {
          ...values,
          key: Date.now().toString()
        };
        setFields([...fields, newField]);
        message.success('字段已添加');
      }
      
      setIsFieldModalVisible(false);
      setEditingField(null);
    } catch (error) {
      message.error('请检查字段填写');
    }
  };

  // 保存表结构
  const handleSaveTable = async () => {
    try {
      const tableValues = await form.validateFields();
      
      if (fields.length === 0) {
        message.error('请至少添加一个字段');
        return;
      }
      
      setSaving(true);
      
      // 构建请求数据
      const tableData = {
        ...tableValues,
        columns: fields.map(field => {
          // 构建列数据，只对已有字段传递id，新增字段不传递id
          const columnData = {
            name: field.name,
            data_type: field.data_type,
            is_primary_key: Boolean(field.is_primary_key), // 确保是布尔值
            description: field.description || ''
          };
          
          // 只有当field.id存在且不是undefined时，才添加id字段
          if (field.id !== undefined) {
            columnData.id = field.id;
          }
          
          return columnData;
        })
      };
      
      console.log('前端保存表数据:', {
        activeTab,
        selectedTableId,
        tableData
      });
      
      let response;
      if (activeTab === 'edit' && selectedTableId) {
        // 更新现有表
        console.log(`前端调用更新表API: tableId=${selectedTableId}, data=${JSON.stringify(tableData)}`);
        response = await tableMetadataApi.update(selectedTableId, tableData);
        console.log('前端更新表API返回:', response);
        message.success('表结构更新成功');
      } else {
        // 创建新表
        console.log(`前端调用创建表API: data=${JSON.stringify(tableData)}`);
        response = await tableMetadataApi.create(tableData);
        console.log('前端创建表API返回:', response);
        message.success('表结构创建成功');
        // 重置表单
        form.resetFields();
        setFields([]);
        setSelectedTableId(null);
        setSelectedTableData(null);
      }
    } catch (error) {
      console.error('前端保存/更新失败:', {
        error,
        errorMessage: error.message,
        errorStack: error.stack,
        errorResponse: error.response
      });
      
      // 处理特定的错误信息
      let errorMsg = activeTab === 'edit' ? '更新失败，请检查填写' : '保存失败，请检查填写';
      
      if (error.response && error.response.data) {
        const errorData = error.response.data;
        if (errorData.detail) {
          // 如果是后端返回的错误信息，直接使用
          errorMsg = errorData.detail;
        }
      }
      
      message.error(errorMsg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="page-card">
      <div className="page-header">
        <h2>表结构配置</h2>
        <Button 
          type="primary" 
          icon={<SaveOutlined />} 
          onClick={handleSaveTable}
          loading={saving}
        >
          {activeTab === 'edit' ? '更新表结构' : '保存表结构'}
        </Button>
      </div>
      
      <Tabs activeKey={activeTab} onChange={handleTabChange} style={{ marginBottom: 24 }}>
        <TabPane tab="创建新表" key="create">
          <Card title="表基本信息" className="table-info-card">
            <Form form={form} layout="vertical">
              <Row gutter={16}>
                <Col span={8}>
                  <Form.Item
                    name="name"
                    label="表名"
                    rules={[{ required: true, message: '请输入表名' }]}
                  >
                    <Input placeholder="请输入表名" />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item
                    name="schema_name"
                    label="所属模式"
                    rules={[{ required: true, message: '请输入所属模式' }]}
                  >
                    <Input placeholder="请输入所属模式" />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item
                    name="data_source_id"
                    label="数据源"
                    rules={[{ required: true, message: '请选择数据源' }]}
                  >
                    <Select placeholder="请选择数据源">
                      {dataSources.map(source => (
                        <Option key={source.id} value={source.id}>{source.name}</Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={16}>
                <Col span={24}>
                  <Form.Item
                    name="description"
                    label="表描述"
                  >
                    <Input.TextArea rows={3} placeholder="请输入表描述" />
                  </Form.Item>
                </Col>
              </Row>
            </Form>
          </Card>
          
          <Divider />
          
          <Card title="字段列表" className="table-fields-card">
            <div style={{ marginBottom: 16 }}>
              <Button type="primary" icon={<PlusOutlined />} onClick={handleAddField}>
                新增字段
              </Button>
            </div>
            
            {fields.length > 0 ? (
              <Table
                columns={fieldColumns}
                dataSource={fields}
                rowKey="key"
                pagination={false}
                bordered
              />
            ) : (
              <div style={{ textAlign: 'center', padding: '40px 0', color: '#999' }}>
                暂无字段，请点击"新增字段"按钮添加
              </div>
            )}
          </Card>
        </TabPane>
        
        <TabPane tab="编辑现有表" key="edit">
          <Card title="选择表进行编辑" className="table-select-card">
            <div style={{ marginBottom: 16 }}>
              <Input.Search
                placeholder="搜索表名或描述"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                style={{ width: 300 }}
              />
            </div>
            {filteredTables.length > 0 ? (
              <Table
                columns={[
                  {
                    title: '表名',
                    dataIndex: 'name',
                    key: 'name',
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
                    render: (_, record) => (
                      <Button type="link" icon={<EditOutlined />} onClick={() => handleSelectTable(record.id)}>
                        编辑
                      </Button>
                    ),
                  },
                ]}
                dataSource={filteredTables}
                rowKey="id"
                pagination={false}
                loading={loading}
              />
            ) : (
              <div style={{ textAlign: 'center', padding: '40px 0', color: '#999' }}>
                暂无表数据
              </div>
            )}
          </Card>
          
          {selectedTableData && (
            <>
              <Divider />
              
              <Card title="表基本信息" className="table-info-card">
                <Form form={form} layout="vertical">
                  <Row gutter={16}>
                    <Col span={8}>
                      <Form.Item
                        name="name"
                        label="表名"
                        rules={[{ required: true, message: '请输入表名' }]}
                      >
                        <Input placeholder="请输入表名" />
                      </Form.Item>
                    </Col>
                    <Col span={8}>
                      <Form.Item
                        name="schema_name"
                        label="所属模式"
                        rules={[{ required: true, message: '请输入所属模式' }]}
                      >
                        <Input placeholder="请输入所属模式" />
                      </Form.Item>
                    </Col>
                    <Col span={8}>
                      <Form.Item
                        name="data_source_id"
                        label="数据源"
                        rules={[{ required: true, message: '请选择数据源' }]}
                      >
                        <Select placeholder="请选择数据源">
                          {dataSources.map(source => (
                            <Option key={source.id} value={source.id}>{source.name}</Option>
                          ))}
                        </Select>
                      </Form.Item>
                    </Col>
                  </Row>
                  <Row gutter={16}>
                    <Col span={24}>
                      <Form.Item
                        name="description"
                        label="表描述"
                      >
                        <Input.TextArea rows={3} placeholder="请输入表描述" />
                      </Form.Item>
                    </Col>
                  </Row>
                </Form>
              </Card>
              
              <Divider />
              
              <Card title="字段列表" className="table-fields-card">
                <div style={{ marginBottom: 16 }}>
                  <Button type="primary" icon={<PlusOutlined />} onClick={handleAddField}>
                    新增字段
                  </Button>
                </div>
                
                {fields.length > 0 ? (
                  <Table
                    columns={fieldColumns}
                    dataSource={fields}
                    rowKey="key"
                    pagination={false}
                    bordered
                  />
                ) : (
                  <div style={{ textAlign: 'center', padding: '40px 0', color: '#999' }}>
                    暂无字段，请点击"新增字段"按钮添加
                  </div>
                )}
              </Card>
            </>
          )}
        </TabPane>
      </Tabs>
      
      {/* 字段编辑模态框 */}
      <Modal
        title={editingField ? '编辑字段' : '新增字段'}
        open={isFieldModalVisible}
        onOk={handleSaveField}
        onCancel={() => setIsFieldModalVisible(false)}
        footer={[
          <Button key="back" onClick={() => setIsFieldModalVisible(false)}>
            取消
          </Button>,
          <Button key="submit" type="primary" onClick={handleSaveField}>
            保存
          </Button>,
        ]}
      >
        <Form form={fieldForm} layout="vertical">
          <Form.Item
            name="name"
            label="字段名"
            rules={[{ required: true, message: '请输入字段名' }]}
          >
            <Input placeholder="请输入字段名" />
          </Form.Item>
          <Form.Item
            name="data_type"
            label="数据类型"
            rules={[{ required: true, message: '请选择数据类型' }]}
          >
            <Select placeholder="请选择数据类型">
              {fieldTypeOptions.map(type => (
                <Option key={type} value={type}>{type}</Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item
            name="is_primary_key"
            label="是否主键"
          >
            <Select placeholder="请选择">
              <Option value={true}>是</Option>
              <Option value={false}>否</Option>
            </Select>
          </Form.Item>
          <Form.Item
            name="description"
            label="字段描述"
          >
            <Input.TextArea rows={3} placeholder="请输入字段描述" />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
};

export default TableCreatePage;