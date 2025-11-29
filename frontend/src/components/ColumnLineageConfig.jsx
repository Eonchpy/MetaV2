import React, { useState, useEffect } from 'react';
import { Modal, Form, Select, Button, message, Table, Tag, Space, Input, Row, Col, Spin } from 'antd';
import { SaveOutlined, ReloadOutlined } from '@ant-design/icons';
import { tableMetadataApi, columnMetadataApi, lineageApi } from '../services/api';

const { Option } = Select;
const { TextArea } = Input;

const ColumnLineageConfig = ({ visible, onCancel, onSuccess, forceRefresh, tableRelation: propTableRelation }) => {
  const [form] = Form.useForm();
  const [tables, setTables] = useState([]);
  const [sourceColumns, setSourceColumns] = useState([]);
  const [targetColumns, setTargetColumns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [lineageRelations, setLineageRelations] = useState([]);
  const [selectedSourceTable, setSelectedSourceTable] = useState(null);
  const [selectedTargetTable, setSelectedTargetTable] = useState(null);
  const [checkingRelation, setCheckingRelation] = useState(false);
  const [tableRelation, setTableRelation] = useState(propTableRelation || null);

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
      setSelectedSourceTable(null);
      setSelectedTargetTable(null);
      setSourceColumns([]);
      setTargetColumns([]);
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
      // 由于使用了axios拦截器，响应已经是response.data，直接使用即可
      // 确保是数组格式并过滤可能的无效数据
      const tableData = Array.isArray(response) ? response : [];
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

  // 加载已有的字段血缘关系
  const loadExistingRelations = async () => {
    try {
      let params = { limit: 1000 };
      // 如果有表级血缘关系，则只加载该关系下的字段血缘
      if (tableRelation) {
        params.lineage_relation_id = tableRelation.id;
      }
      const response = await lineageApi.getAllColumnRelations(params);
      // 确保数据格式正确处理
      const relations = response || [];
      console.log('获取到的字段血缘关系数据:', relations);
      setLineageRelations(relations);
    } catch (error) {
      console.error('加载字段血缘关系失败:', error);
      message.error('加载已有的字段血缘关系失败');
    }
  };
  
  // 检查并获取表级血缘关系
  const checkTableRelation = async (sourceTableId, targetTableId) => {
    if (!sourceTableId || !targetTableId) return false;
    
    setCheckingRelation(true);
    try {
      // 先尝试通过targetTableId查找
      let relations = await lineageApi.getAllTableRelations({ target_table_id: targetTableId });
      
      // 确保relations是数组格式
      relations = Array.isArray(relations) ? relations : [];
      
      // 查找包含指定源表和目标表的关系
      const foundRelation = relations.find(relation => 
        relation && 
        relation.target_table_id === targetTableId && 
        Array.isArray(relation.source_table_ids) && 
        relation.source_table_ids.includes(sourceTableId)
      );
      
      if (foundRelation) {
        setTableRelation(foundRelation);
        message.success('找到已配置的表级血缘关系');
        return true;
      } else {
        setTableRelation(null);
        return false;
      }
    } catch (error) {
      console.error('检查表级血缘关系失败:', error);
      message.error('检查表级血缘关系失败');
      setTableRelation(null);
      return false;
    } finally {
      setCheckingRelation(false);
    }
  };

  // 加载源表的列
  const loadSourceColumns = async (tableId) => {
    if (!tableId) {
      setSourceColumns([]);
      return;
    }
    try {
      console.log('正在加载源表列，表ID:', tableId);
      const response = await columnMetadataApi.getByTable(tableId);
      // 创建独立的数据副本，避免引用共享问题
      const columnsData = response ? [...response] : [];
      console.log('源表列数据:', columnsData.length, '个字段');
      setSourceColumns(columnsData);
      form.resetFields(['source_column']);
    } catch (error) {
      console.error('加载源表列失败:', error);
      message.error('加载源表列失败');
      setSourceColumns([]);
    }
  };

  // 加载目标表的列
  const loadTargetColumns = async (tableId) => {
    if (!tableId) {
      setTargetColumns([]);
      return;
    }
    try {
      console.log('正在加载目标表列，表ID:', tableId);
      const response = await columnMetadataApi.getByTable(tableId);
      // 创建独立的数据副本，避免引用共享问题
      const columnsData = response ? [...response] : [];
      console.log('目标表列数据:', columnsData.length, '个字段');
      setTargetColumns(columnsData);
      form.resetFields(['target_column']);
    } catch (error) {
      console.error('加载目标表列失败:', error);
      message.error('加载目标表列失败');
      setTargetColumns([]);
    }
  };

  // 处理源表选择
  const handleSourceTableChange = async (value) => {
    setSelectedSourceTable(value);
    loadSourceColumns(value);
    
    // 当同时有源表和目标表时，自动检查表级血缘关系
    if (value && selectedTargetTable) {
      await checkTableRelation(value, selectedTargetTable);
    } else {
      setTableRelation(null);
    }
  };

  // 处理目标表选择
  const handleTargetTableChange = async (value) => {
    setSelectedTargetTable(value);
    loadTargetColumns(value);
    
    // 当同时有源表和目标表时，自动检查表级血缘关系
    if (selectedSourceTable && value) {
      await checkTableRelation(selectedSourceTable, value);
    } else {
      setTableRelation(null);
    }
  };

  // 检查是否已存在相同的字段血缘关系
  const checkExistingRelation = (sourceColumnId, targetColumnId) => {
    return lineageRelations.some(relation => 
      relation.source_column_id === sourceColumnId &&
      relation.target_column_id === targetColumnId
    );
  };

  // 保存字段血缘关系
  const handleSaveRelation = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);
      
      // 确保有tableRelation
      let finalTableRelation = tableRelation;
      if (!finalTableRelation) {
        // 尝试从表单中获取表ID并再次检查表级血缘关系
        const sourceTableId = values.source_table;
        const targetTableId = values.target_table;
        
        const hasRelation = await checkTableRelation(sourceTableId, targetTableId);
        
        if (!hasRelation) {
          message.error('请先创建表级血缘关系，再配置字段血缘');
          return;
        }
        finalTableRelation = tableRelation; // 更新后的tableRelation
      }
      
      // 构建请求数据，确保包含表级血缘关系ID和正确的类型
      const relationData = {
        lineage_relation_id: finalTableRelation.id,
        source_column_id: values.source_column,
        target_column_id: values.target_column,
        transformation_details: values.transformation_rule ? { rule: values.transformation_rule } : {}
      };
      
      // 检查是否已存在相同的血缘关系
      if (checkExistingRelation(values.source_column, values.target_column)) {
        message.error('该字段血缘关系已存在');
        return;
      }
      
      // 调用API保存
      await lineageApi.createColumnRelation(relationData);
      message.success('字段血缘关系保存成功');
      
      // 刷新列表
      loadExistingRelations();
      
      // 重置表单
      form.resetFields(['source_column', 'target_column', 'transformation_rule']);
      
      // 调用成功回调
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error('保存字段血缘关系失败:', error);
      console.error('错误详情:', error.response ? error.response.data : '无响应数据');
      if (typeof relationData !== 'undefined') {
        console.error('请求数据:', relationData);
      }
      message.error(`保存字段血缘关系失败: ${error.response?.data?.detail || error.message || '未知错误'}`);
    } finally {
      setSaving(false);
    }
  };

  // 获取表名
  const getTableName = (tableId) => {
    if (!tableId) return '未知表';
    const table = tables.find(t => t.id === tableId);
    return table ? table.name : '未知表';
  };

  // 获取字段信息
  const getColumnInfo = (columnId, isSource) => {
    if (!columnId) return '未知字段';
    const columns = isSource ? sourceColumns : targetColumns;
    const column = columns.find(c => c.id === columnId);
    if (column) {
      return `${column.name} (${column.data_type})`;
    }
    return '未知字段';
  };

  // 表格列定义
  const columns = [
    {
      title: '源表',
      dataIndex: 'source_table_name',
      key: 'source_table',
      render: (name, record) => (
        <Tag color="blue">
          {/* 优先使用API直接返回的表名，其次使用本地查找 */}
          {name && name !== '未知' ? name : getTableName(record.source_table_id || record.source_column?.table?.id)}
        </Tag>
      )
    },
    {
      title: '源字段',
      dataIndex: ['source_column', 'name'],
      key: 'source_column',
      render: (name, record) => (
        <div>
          <Tag color="blue">
            {/* 优先使用API直接返回的字段名 */}
            {name && name !== '--' ? name : 
              (record.source_column_id ? getColumnInfo(record.source_column_id, true) : 
               (record.source_column?.id ? getColumnInfo(record.source_column.id, true) : '未知字段'))}
          </Tag>
          <Tag color="default">{record.source_column?.data_type || '--'}</Tag>
        </div>
      )
    },
    {
      title: '转换规则',
      dataIndex: 'transformation_rule',
      key: 'transformation_rule',
      ellipsis: true,
      render: (rule, record) => {
        if (rule && rule !== '--') return rule;
        
        // 回退到处理transformation_details
        const details = record.transformation_details;
        if (!details) return '--';
        try {
          const parsed = typeof details === 'string' ? JSON.parse(details) : details;
          return parsed.rule || parsed.description || '--';
        } catch (e) {
          return details;
        }
      }
    },
    {
      title: '目标表',
      dataIndex: 'target_table_name',
      key: 'target_table',
      render: (name, record) => (
        <Tag color="green">
          {/* 优先使用API直接返回的表名，其次使用本地查找 */}
          {name && name !== '未知' ? name : getTableName(record.target_table_id || record.target_column?.table?.id)}
        </Tag>
      )
    },
    {
      title: '目标字段',
      dataIndex: ['target_column', 'name'],
      key: 'target_column',
      render: (name, record) => (
        <div>
          <Tag color="green">
            {/* 优先使用API直接返回的字段名 */}
            {name && name !== '--' ? name : 
              (record.target_column_id ? getColumnInfo(record.target_column_id, false) : 
               (record.target_column?.id ? getColumnInfo(record.target_column.id, false) : '未知字段'))}
          </Tag>
          <Tag color="default">{record.target_column?.data_type || '--'}</Tag>
        </div>
      )
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (createdAt) => {
        if (!createdAt) return '--';
        try {
          // 确保时间格式正确解析
          const date = new Date(createdAt);
          if (isNaN(date.getTime())) {
            return '--';
          }
          return date.toLocaleString();
        } catch (e) {
          console.error('时间格式化错误:', e);
          return '--';
        }
      }
    }
  ];

  return (
    <Modal
      title="配置字段血缘关系"
      open={visible}
      width={1000}
      onCancel={onCancel}
      footer={null}
    >
      <div style={{ marginBottom: '24px' }}>
        <h3 style={{ marginBottom: '16px' }}>创建新的字段血缘关系</h3>
        <Form form={form} layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="选择源表"
                name="source_table"
                rules={[{ required: true, message: '请选择源表' }]}
              >
                <Select
                  placeholder="请选择源表"
                  style={{ width: '100%' }}
                  loading={loading}
                  value={selectedSourceTable}
                  onChange={handleSourceTableChange}
                >
                  {tables.map(table => (
                    <Option key={table.id} value={table.id}>
                      {table.name}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
              
              <Form.Item
                label="选择源字段"
                name="source_column"
                rules={[{ required: true, message: '请选择源字段' }]}
              >
                <Select
                  placeholder="请选择源字段"
                  style={{ width: '100%' }}
                  disabled={!selectedSourceTable}
                >
                  {sourceColumns.map(column => (
                    <Option key={column.id} value={column.id}>
                      {column.name} ({column.data_type})
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            
            <Col span={12}>
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
              
              {/* 显示表级血缘关系状态 */}
              <div style={{ marginBottom: '16px', padding: '8px', border: '1px solid #d9d9d9', borderRadius: '4px' }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <span style={{ fontWeight: 'bold', marginRight: '8px' }}>表级血缘关系状态：</span>
                  {checkingRelation ? (
                    <Spin size="small" tip="正在检查..." />
                  ) : tableRelation ? (
                    <span style={{ color: '#52c41a' }}>✓ 已找到表级血缘关系</span>
                  ) : (
                    <span style={{ color: '#faad14' }}>尚未找到表级血缘关系</span>
                  )}
                </div>
                {tableRelation && (
                  <div style={{ marginTop: '4px', fontSize: '12px', color: '#8c8c8c' }}>
                    关系ID: {tableRelation.id}, 类型: {tableRelation.relation_type || 'N/A'}
                  </div>
                )}
              </div>
              
              <Form.Item
                label="选择目标字段"
                name="target_column"
                rules={[{ required: true, message: '请选择目标字段' }]}
              >
                <Select
                  placeholder="请选择目标字段"
                  style={{ width: '100%' }}
                  disabled={!selectedTargetTable}
                >
                  {targetColumns.map(column => (
                    <Option key={column.id} value={column.id}>
                      {column.name} ({column.data_type})
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>
          
          <Form.Item
            label="转换规则（可选）"
            name="transformation_rule"
            tooltip="描述源字段到目标字段的转换逻辑"
          >
            <Input placeholder="例如：CAST(column_name AS VARCHAR(100))" />
          </Form.Item>
          
          <Form.Item
            label="描述（可选）"
            name="description"
          >
            <TextArea rows={2} placeholder="请输入字段血缘关系描述" />
          </Form.Item>
          
          <Form.Item>
            <Space>
              <Button
                type="primary"
                icon={<SaveOutlined />}
                onClick={handleSaveRelation}
                loading={saving}
                disabled={saving || !selectedSourceTable || !selectedTargetTable}
              >
                保存血缘关系
              </Button>
              <Button
                icon={<ReloadOutlined />}
                onClick={() => {
                  loadTables();
                  loadExistingRelations();
                }}
              >
                刷新数据
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </div>
      
      <div>
        <h3 style={{ marginBottom: '16px' }}>已配置的字段血缘关系</h3>
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

export default ColumnLineageConfig;