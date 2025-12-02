import React, { useState, useEffect } from 'react';
import { Modal, Upload, Button, message, Tabs, Result, Collapse } from 'antd';
import { InboxOutlined, FileExcelOutlined, FileTextOutlined, AlertOutlined } from '@ant-design/icons';
import { uploadApi } from '../services/api';

const { TabPane } = Tabs;
const { Dragger } = Upload;
const { Panel } = Collapse;

const TableLineageImport = ({ visible, onCancel, onSuccess }) => {
  const [uploading, setUploading] = useState(false);
  const [activeTab, setActiveTab] = useState('excel');
  const [importResult, setImportResult] = useState(null);
  const [errorDetail, setErrorDetail] = useState(null);
  const [validationErrors, setValidationErrors] = useState([]);

  // 重置导入结果
  const resetImportResult = () => {
    setImportResult(null);
    setErrorDetail(null);
    setValidationErrors([]);
  };

  // 当模态框显示/隐藏时重置结果
  useEffect(() => {
    if (visible) {
      resetImportResult();
    }
  }, [visible]);

  // 显示上传统计信息
  const showUploadStats = (result) => {
    // 转换后端返回的数据格式为前端组件期望的格式
    let formattedResult = {
      total: 0,
      success: 0,
      failed: 0,
      lineages_created: 0,
      failed_reasons: [],
      validation_errors: []
    };
    
    // 处理后端返回的不同格式
    if (result.result) {
      // 后端返回的格式：{ status, message, result: { lineages, validation_errors, error_count, success_count } }
      formattedResult.total = (result.result.success_count || 0) + (result.result.error_count || 0);
      formattedResult.success = result.result.success_count || 0;
      formattedResult.failed = result.result.error_count || 0;
      formattedResult.lineages_created = result.result.lineages?.created || 0;
      formattedResult.validation_errors = result.result.validation_errors || [];
      
      // 处理failed_reasons，将validation_errors作为failed_reasons
      if (result.result.validation_errors && result.result.validation_errors.length > 0) {
        formattedResult.failed_reasons = result.result.validation_errors;
      }
      
      // 添加消息
      formattedResult.message = result.message || '';
    } else {
      // 直接使用返回的结果（旧格式兼容）
      formattedResult = {
        ...formattedResult,
        ...result
      };
    }
    
    setImportResult(formattedResult);
    setErrorDetail(null);
    
    // 处理验证错误
    if (formattedResult.validation_errors && formattedResult.validation_errors.length > 0) {
      setValidationErrors(formattedResult.validation_errors);
    }
  };

  // 显示错误详情
  const showErrorDetail = (error) => {
    setErrorDetail(error);
    setImportResult(null);
    setValidationErrors([]);
  };

  // Excel上传配置
  const excelUploadProps = {
    name: 'file',
    multiple: false,
    showUploadList: false,
    beforeUpload: (file) => {
      // 检查文件类型
      const isExcel = file.type === 'application/vnd.ms-excel' || 
                      file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      if (!isExcel) {
        message.error('只支持上传Excel文件！');
        return Upload.LIST_IGNORE;
      }
      
      // 检查文件大小
      const isLessThan20MB = file.size / 1024 / 1024 < 20;
      if (!isLessThan20MB) {
        message.error('文件大小不能超过20MB！');
        return Upload.LIST_IGNORE;
      }
      
      // 自动上传
      handleExcelUpload(file);
      return false; // 阻止默认上传
    },
    customRequest: () => {}
  };

  // JSON上传配置
  const jsonUploadProps = {
    name: 'file',
    multiple: false,
    showUploadList: false,
    beforeUpload: (file) => {
      // 检查文件类型
      const isJSON = file.type === 'application/json' || file.name.endsWith('.json');
      if (!isJSON) {
        message.error('只支持上传JSON文件！');
        return Upload.LIST_IGNORE;
      }
      
      // 检查文件大小
      const isLessThan10MB = file.size / 1024 / 1024 < 10;
      if (!isLessThan10MB) {
        message.error('文件大小不能超过10MB！');
        return Upload.LIST_IGNORE;
      }
      
      // 自动上传
      handleJsonUpload(file);
      return false; // 阻止默认上传
    },
    customRequest: () => {}
  };

  // 处理Excel文件上传
  const handleExcelUpload = async (file) => {
    try {
      setUploading(true);
      const result = await uploadApi.uploadTableLineageExcel(file);
      
      // 显示上传结果统计
      showUploadStats(result);
      
      if (onSuccess) {
        onSuccess(result);
      }
    } catch (error) {
      console.error('表血缘关系Excel文件上传失败:', error);
      if (error.response?.data?.detail) {
        showErrorDetail(error.response.data.detail);
        message.error('导入失败，请查看错误详情');
      } else {
        message.error('表血缘关系Excel文件上传失败，请重试');
      }
    } finally {
      setUploading(false);
    }
  };

  // 处理JSON文件上传
  const handleJsonUpload = async (file) => {
    try {
      setUploading(true);
      const result = await uploadApi.uploadTableLineageJson(file);
      
      // 显示上传结果统计
      showUploadStats(result);
      
      if (onSuccess) {
        onSuccess(result);
      }
    } catch (error) {
      console.error('表血缘关系JSON文件上传失败:', error);
      if (error.response?.data?.detail) {
        showErrorDetail(error.response.data.detail);
        message.error('导入失败，请查看错误详情');
      } else {
        message.error('表血缘关系JSON文件上传失败，请重试');
      }
    } finally {
      setUploading(false);
    }
  };

  // 渲染验证错误信息
  const renderValidationErrors = () => {
    if (!validationErrors || validationErrors.length === 0) return null;

    return (
      <div style={{ marginBottom: '16px' }}>
        <AlertOutlined style={{ color: '#faad14' }} />
        <span style={{ color: '#faad14', marginLeft: '8px' }}>存在验证警告：</span>
        <Collapse defaultActiveKey={[validationErrors.slice(0, 3).map((_, index) => index.toString())]}>
          {validationErrors.map((error, index) => (
            <Panel header={`验证错误 ${index + 1}`} key={index.toString()}>
              <pre style={{ whiteSpace: 'pre-wrap', margin: 0, backgroundColor: '#fff7e6', padding: '8px', borderRadius: '4px' }}>
                {error}
              </pre>
            </Panel>
          ))}
        </Collapse>
      </div>
    );
  };

  // 渲染导入结果
  const renderImportResult = () => {
    if (!importResult && !errorDetail) return null;

    // 处理全部失败的情况
    if (importResult && importResult.total > 0 && importResult.success === 0) {
      return (
        <Result
          status="error"
          title="全部导入失败"
          subTitle={`共处理 ${importResult.total || 0} 条表血缘关系，全部失败`}
          extra={
            <div>
              {importResult.failed_reasons && importResult.failed_reasons.length > 0 && (
                <div style={{ marginBottom: '16px' }}>
                  <AlertOutlined style={{ color: '#f5222d' }} /> 
                  <span style={{ color: '#f5222d', marginLeft: '8px', fontWeight: 'bold' }}>失败原因：</span>
                  <Collapse 
                    defaultActiveKey={importResult.failed_reasons.length <= 5 ? 
                      importResult.failed_reasons.map((_, index) => index.toString()) : 
                      ['0', '1', '2']}
                  >
                    {importResult.failed_reasons.map((reason, index) => (
                      <Panel header={`失败项 ${index + 1}`} key={index.toString()}>
                        <pre style={{ 
                          whiteSpace: 'pre-wrap', 
                          margin: 0, 
                          backgroundColor: '#fff2f0', 
                          padding: '12px', 
                          borderRadius: '4px',
                          border: '1px solid #ffccc7'
                        }}>
                          {reason}
                        </pre>
                      </Panel>
                    ))}
                  </Collapse>
                </div>
              )}
              {importResult.message && (
                <div style={{ backgroundColor: '#fff2f0', padding: '16px', borderRadius: '4px', border: '1px solid #ffccc7' }}>
                  <p style={{ color: '#f5222d', fontWeight: 'bold' }}>系统消息：</p>
                  <p>{importResult.message}</p>
                </div>
              )}
            </div>
          }
        />
      );
    }

    // 处理部分成功的情况
    if (importResult && importResult.failed > 0) {
      return (
        <div>
          {renderValidationErrors()}
          <Result
            status="warning"
            title="部分导入成功"
            subTitle={`共处理 ${importResult.total || 0} 条表血缘关系，成功 ${importResult.success || 0} 条，失败 ${importResult.failed || 0} 条`}
            extra={
              <div>
                <div style={{ 
                  backgroundColor: '#f6ffed', 
                  padding: '16px', 
                  borderRadius: '4px', 
                  marginBottom: '16px',
                  border: '1px solid #b7eb8f'
                }}>
                  <p style={{ color: '#52c41a', fontWeight: 'bold', marginBottom: '8px' }}>成功信息：</p>
                  <p>成功创建的表血缘关系数: {importResult.lineages_created || 0}</p>
                  {importResult.message && <p>系统消息: {importResult.message}</p>}
                </div>
                
                {importResult.failed_reasons && importResult.failed_reasons.length > 0 && (
                  <div>
                    <AlertOutlined style={{ color: '#faad14' }} /> 
                    <span style={{ color: '#faad14', marginLeft: '8px', fontWeight: 'bold' }}>失败原因：</span>
                    <Collapse 
                      defaultActiveKey={importResult.failed_reasons.length <= 5 ? 
                        importResult.failed_reasons.map((_, index) => index.toString()) : 
                        ['0', '1', '2']}
                    >
                      {importResult.failed_reasons.map((reason, index) => (
                        <Panel header={`失败项 ${index + 1}`} key={index.toString()}>
                          <pre style={{ 
                            whiteSpace: 'pre-wrap', 
                            margin: 0, 
                            backgroundColor: '#fff7e6', 
                            padding: '12px', 
                            borderRadius: '4px',
                            border: '1px solid #ffe7ba'
                          }}>
                            {reason}
                          </pre>
                        </Panel>
                      ))}
                    </Collapse>
                  </div>
                )}
              </div>
            }
          />
        </div>
      );
    }

    // 处理全部成功的情况
    if (errorDetail) {
      return (
        <Result
          status="error"
          title="导入失败"
          subTitle="请检查以下错误："
          extra={
            <div style={{ 
              backgroundColor: '#fff2f0', 
              padding: '16px', 
              borderRadius: '4px', 
              whiteSpace: 'pre-wrap',
              border: '1px solid #ffccc7'
            }}>
              {errorDetail}
            </div>
          }
        />
      );
    }

    // 处理全部成功且无验证错误的情况
    return (
      <div>
        {renderValidationErrors()}
        <Result
          status="success"
          title="全部导入成功"
          subTitle={`共处理 ${importResult.total || 0} 条表血缘关系，全部成功导入`}
          extra={
            <div style={{ 
              backgroundColor: '#f6ffed', 
              padding: '16px', 
              borderRadius: '4px',
              border: '1px solid #b7eb8f'
            }}>
              <p style={{ color: '#52c41a', fontWeight: 'bold', marginBottom: '8px' }}>成功信息：</p>
              <p>成功创建的表血缘关系数: {importResult.lineages_created || 0}</p>
              {importResult.message && <p>系统消息: {importResult.message}</p>}
            </div>
          }
        />
      </div>
    );
  };

  return (
    <Modal
      title="导入表血缘关系信息"
      open={visible}
      width={800}
      onCancel={onCancel}
      footer={[
        <Button key="cancel" onClick={onCancel}>
          关闭
        </Button>,
        <Button key="restart" type="primary" onClick={resetImportResult}>
          重新导入
        </Button>
      ]}
    >
      {!importResult && !errorDetail ? (
        <>
          <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: '#e6f7ff', borderRadius: '4px' }}>
            <AlertOutlined style={{ color: '#1890ff' }} />
            <span style={{ marginLeft: '8px', color: '#1890ff' }}>
              注意：导入前系统将自动验证源表和目标表是否已存在于系统中。请确保相关表结构已先导入。
            </span>
          </div>
          
          <Tabs activeKey={activeTab} onChange={setActiveTab}>
            <TabPane tab={<span><FileExcelOutlined /> Excel文件导入</span>} key="excel">
              <Dragger {...excelUploadProps}>
                <p className="ant-upload-drag-icon">
                  <InboxOutlined />
                </p>
                <p className="ant-upload-text">点击或拖拽Excel文件到此区域上传</p>
                <p className="ant-upload-hint">
                  支持 .xlsx, .xls 格式文件，文件大小不超过20MB
                </p>
              </Dragger>
            </TabPane>
            <TabPane tab={<span><FileTextOutlined /> JSON文件导入</span>} key="json">
              <Dragger {...jsonUploadProps}>
                <p className="ant-upload-drag-icon">
                  <InboxOutlined />
                </p>
                <p className="ant-upload-text">点击或拖拽JSON文件到此区域上传</p>
                <p className="ant-upload-hint">
                  支持 .json 格式文件，文件大小不超过10MB
                </p>
              </Dragger>
            </TabPane>
          </Tabs>
        </>
      ) : (
        renderImportResult()
      )}
    </Modal>
  );
};

export default TableLineageImport;