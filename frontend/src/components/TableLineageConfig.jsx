import React, { useState, useEffect } from 'react';
import { Modal, Form, Select, Button, message, Table, Tag, Space, Input, Popconfirm } from 'antd';
import { PlusOutlined, DeleteOutlined, SaveOutlined } from '@ant-design/icons';
import { tableMetadataApi, lineageApi } from '../services/api';

const { Option } = Select;

const TableLineageConfig = ({ visible, onCancel, onSuccess, forceRefresh }) => {
  const [form] = Form.useForm();
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [lineageRelations, setLineageRelations] = useState([]);
  const [selectedSourceTables, setSelectedSourceTables] = useState([]);
  const [selectedTargetTable, setSelectedTargetTable] = useState(null);

  // 加载所有表数据
  useEffect(() => {
    if (visible) {
      // 强制重新加载表数据
      setTables([]);
      loadTables();
      loadExistingRelations();
    }
  }, [visible, forceRefresh]); // 添加forceRefresh作为依赖，当它变化时重新加载数据

  // 重置表单和状态
  useEffect(() => {
    if (!visible) {
      form.resetFields();
      setSelectedSourceTables([]);
      setSelectedTargetTable(null);
      // 清除表数据状态，确保下次打开时重新加载
      setTables([]);
    }
  }, [visible, form]);

  // 加载所有表
  const loadTables = async () => {
    try {
      setLoading(true);
      // 添加时间戳避免缓存问题
      const response = await tableMetadataApi.getAll({ limit: 1000, _t: Date.now() });
      // 处理API响应，支持两种格式：直接返回数组或包含data字段的对象
      const tableData = Array.isArray(response) ? response : (response.data || []);
      // 只保留有效且存在的表
      const validTables = tableData.filter(table => table && table.id && table.name);
      setTables(validTables);
    } catch (error) {
      console.error('加载表数据失败:', error);
      message.error('加载表数据失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  // 加载已有的血缘关系
  const loadExistingRelations = async () => {
    try {
      const response = await lineageApi.getAllTableRelations({ limit: 1000 });
      // 处理API响应，支持两种格式：直接返回数组或包含data字段的对象
      const relationData = Array.isArray(response) ? response : (response.data || []);
      // 过滤掉无效的血缘关系记录
      const validRelations = relationData.filter(relation => 
        relation && relation.id && relation.target_table_id && Array.isArray(relation.source_table_ids)
      );
      setLineageRelations(validRelations);
      console.log('成功加载血缘关系:', validRelations);
    } catch (error) {
      console.error('加载血缘关系失败:', error);
      message.error('加载已有的血缘关系失败');
    }
  };

  // 处理源表选择
  const handleSourceTablesChange = (values) => {
    setSelectedSourceTables(values);
  };

  // 处理目标表选择
  const handleTargetTableChange = (value) => {
    setSelectedTargetTable(value);
  };

  // 检查是否已存在相同的血缘关系
  const checkExistingRelation = (sourceTables, targetTable) => {
    return lineageRelations.some(relation => 
      relation.target_table_id === targetTable &&
      JSON.stringify(relation.source_table_ids.sort()) === JSON.stringify(sourceTables.sort())
    );
  };

  // 保存表血缘关系
  const handleSaveRelation = async () => {
    try {
      if (!selectedSourceTables || selectedSourceTables.length === 0) {
        message.error('请至少选择一个源表');
        return;
      }

      if (!selectedTargetTable) {
        message.error('请选择目标表');
        return;
      }

      // 检查是否已存在
      if (checkExistingRelation(selectedSourceTables, selectedTargetTable)) {
        message.error('该血缘关系已存在');
        return;
      }

      setSaving(true);
      
      // 创建血缘关系
      const relationData = {
        source_table_ids: selectedSourceTables,
        target_table_id: selectedTargetTable,
        description: form.getFieldValue('description') || ''
      };

      await lineageApi.createTableRelation(relationData);
      
      message.success('表血缘关系创建成功');
      
      // 重新加载血缘关系和表数据
      await loadExistingRelations();
      await loadTables();
      
      // 清空表单
      form.resetFields(['description']);
      setSelectedSourceTables([]);
      setSelectedTargetTable(null);
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error('保存表血缘关系失败:', error);
      message.error('保存失败，请重试');
    } finally {
      setSaving(false);
    }
  };

  // 删除表血缘关系
  const handleDeleteRelation = async (relationId, targetTableId) => {
    try {
      setSaving(true);
      
      // 前置校验：检查是否存在列级血缘关系
      const columnRelationsResponse = await lineageApi.getAllColumnRelations({ lineage_relation_id: relationId });
      const columnRelations = Array.isArray(columnRelationsResponse) ? columnRelationsResponse : (columnRelationsResponse.data || []);
      
      if (columnRelations.length > 0) {
        // 存在列级血缘关系，获取所有相关列名
        const columnNames = [...new Set(columnRelations.map(relation => {
          return relation.source_column?.name || relation.target_column?.name || '未知列';
        }))];
        
        message.error(`存在列级血缘不允许删除，相关列：${columnNames.join(', ')}`);
        return;
      }
      
      // 不存在列级血缘关系，可以删除
      await lineageApi.deleteTableRelation(relationId);
      message.success('表血缘关系删除成功');
      
      // 重新加载血缘关系和表数据
      await loadExistingRelations();
      await loadTables();
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error('删除表血缘关系失败:', error);
      message.error(`删除失败：${error.response?.data?.detail || error.message || '未知错误'}`);
    } finally {
      setSaving(false);
    }
  };

  // 获取表名
  const getTableName = (tableId) => {
    const table = tables.find(t => t.id === tableId);
    return table ? table.name : '未知表';
  };

  // 表格列定义
  const columns = [
    {
      title: '源表',
      dataIndex: 'source_table_ids',
      key: 'source_tables',
      render: (sourceTableIds) => (
        <Space direction="vertical" style={{ maxWidth: '300px' }}>
          {sourceTableIds.map(tableId => (
            <Tag key={tableId} color="blue">
              {getTableName(tableId)}
            </Tag>
          ))}
        </Space>
      )
    },
    {
      title: '目标表',
      dataIndex: 'target_table_id',
      key: 'target_table',
      render: (targetTableId) => (
        <Tag color="green">{getTableName(targetTableId)}</Tag>
      )
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
      render: (createdAt) => new Date(createdAt).toLocaleString()
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Popconfirm
          title="确定要删除这条表血缘关系吗？"
          onConfirm={() => handleDeleteRelation(record.id, record.target_table_id)}
          okText="确定"
          cancelText="取消"
          placement="topRight"
        >
          <Button
            type="link"
            danger
            icon={<DeleteOutlined />}
            size="small"
          >
            删除
          </Button>
        </Popconfirm>
      )
    }
  ];

  return (
    <Modal
      title="配置表血缘关系"
      open={visible}
      width={900}
      onCancel={onCancel}
      footer={null}
    >
      <div style={{ marginBottom: '24px' }}>
        <h3 style={{ marginBottom: '16px' }}>创建新的表血缘关系</h3>
        <Form form={form} layout="vertical">
          <Form.Item
            label="选择源表（可多选）"
            name="source_tables"
            rules={[{ required: true, message: '请至少选择一个源表' }]}
          >
            <Select
              mode="multiple"
              placeholder="请选择源表"
              style={{ width: '100%' }}
              loading={loading}
              value={selectedSourceTables}
              onChange={handleSourceTablesChange}
            >
              {tables.map(table => (
                <Option key={table.id} value={table.id}>
                  {table.name}
                </Option>
              ))}
            </Select>
          </Form.Item>
          
          <Form.Item
            label="选择目标表"
            name="target_table"
            rules={[{ required: true, message: '请选择目标表' }]}
          >
            <Select
              placeholder="请选择目标表"
              style={{ width: '100%' }}
              loading={loading}
              value={selectedTargetTable}
              onChange={handleTargetTableChange}
            >
              {tables.map(table => (
                <Option key={table.id} value={table.id}>
                  {table.name}
                </Option>
              ))}
            </Select>
          </Form.Item>
          
          <Form.Item
            label="描述（可选）"
            name="description"
          >
            <Input.TextArea rows={3} placeholder="请输入血缘关系描述" />
          </Form.Item>
          
          <Form.Item>
            <Button
              type="primary"
              icon={<SaveOutlined />}
              onClick={handleSaveRelation}
              loading={saving}
              disabled={saving || selectedSourceTables.length === 0 || !selectedTargetTable}
            >
              保存血缘关系
            </Button>
          </Form.Item>
        </Form>
      </div>
      
      <div>
        <h3 style={{ marginBottom: '16px' }}>已配置的表血缘关系</h3>
        <Table
          columns={columns}
          dataSource={lineageRelations}
          rowKey="id"
          pagination={{ pageSize: 5 }}
          scroll={{ y: 300 }}
        />
      </div>
    </Modal>
  );
};

export default TableLineageConfig;