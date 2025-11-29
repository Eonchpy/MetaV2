import React, { useState } from 'react';
import { Modal, Upload, Button, message, Tabs, Result } from 'antd';
import { InboxOutlined, FileExcelOutlined, FileTextOutlined } from '@ant-design/icons';
import { uploadApi } from '../services/api';

const { TabPane } = Tabs;
const { Dragger } = Upload;

const TableStructureImport = ({ visible, onCancel, onSuccess }) => {
  const [uploading, setUploading] = useState(false);
  const [activeTab, setActiveTab] = useState('excel');
  const [importResult, setImportResult] = useState(null);
  const [errorDetail, setErrorDetail] = useState(null);

  // 重置导入结果
  const resetImportResult = () => {
    setImportResult(null);
    setErrorDetail(null);
  };

  // 当模态框显示/隐藏时重置结果
  React.useEffect(() => {
    if (visible) {
      resetImportResult();
    }
  }, [visible]);

  // 显示上传统计信息
  const showUploadStats = (result) => {
    setImportResult(result);
    setErrorDetail(null);
  };

  // 显示错误详情
  const showErrorDetail = (error) => {
    setErrorDetail(error);
    setImportResult(null);
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
      const isLessThan50MB = file.size / 1024 / 1024 < 50;
      if (!isLessThan50MB) {
        message.error('文件大小不能超过50MB！');
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
      const isLessThan20MB = file.size / 1024 / 1024 < 20;
      if (!isLessThan20MB) {
        message.error('文件大小不能超过20MB！');
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
      const result = await uploadApi.uploadTableStructureExcel(file);
      
      // 显示上传结果统计
      message.success('表结构Excel文件上传成功！');
      showUploadStats(result);
      
      if (onSuccess) {
        onSuccess(result);
      }
    } catch (error) {
      console.error('表结构Excel文件上传失败:', error);
      if (error.response?.data?.detail) {
        showErrorDetail(error.response.data.detail);
        message.error('导入失败，请查看错误详情');
      } else {
        message.error('表结构Excel文件上传失败，请重试');
      }
    } finally {
      setUploading(false);
    }
  };

  // 处理JSON文件上传
  const handleJsonUpload = async (file) => {
    try {
      setUploading(true);
      const result = await uploadApi.uploadTableStructureJson(file);
      
      // 显示上传结果统计
      message.success('表结构JSON文件上传成功！');
      showUploadStats(result);
      
      if (onSuccess) {
        onSuccess(result);
      }
    } catch (error) {
      console.error('表结构JSON文件上传失败:', error);
      if (error.response?.data?.detail) {
        showErrorDetail(error.response.data.detail);
        message.error('导入失败，请查看错误详情');
      } else {
        message.error('表结构JSON文件上传失败，请重试');
      }
    } finally {
      setUploading(false);
    }
  };

  // 渲染导入结果
  const renderImportResult = () => {
    if (!importResult && !errorDetail) return null;

    if (errorDetail) {
      return (
        <Result
          status="error"
          title="导入失败"
          subTitle="请检查以下错误："
          extra={
            <div style={{ backgroundColor: '#f5f5f5', padding: '16px', borderRadius: '4px', whiteSpace: 'pre-wrap' }}>
              {errorDetail}
            </div>
          }
        />
      );
    }

    return (
      <Result
        status="success"
        title="导入成功"
        subTitle={`共处理 ${importResult.total || 0} 个表，成功 ${importResult.success || 0} 个，失败 ${importResult.failed || 0} 个`}
        extra={
          <div style={{ backgroundColor: '#f0f9ff', padding: '16px', borderRadius: '4px' }}>
            <p>成功导入的表数量: {importResult.tables_created || 0}</p>
            <p>成功导入的字段数量: {importResult.columns_created || 0}</p>
            {importResult.message && <p>消息: {importResult.message}</p>}
          </div>
        }
      />
    );
  };

  return (
    <Modal
      title="导入表结构及字段信息"
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
        <Tabs activeKey={activeTab} onChange={setActiveTab}>
          <TabPane tab={<span><FileExcelOutlined /> Excel文件导入</span>} key="excel">
            <Dragger {...excelUploadProps}>
              <p className="ant-upload-drag-icon">
                <InboxOutlined />
              </p>
              <p className="ant-upload-text">点击或拖拽Excel文件到此区域上传</p>
              <p className="ant-upload-hint">
                支持 .xlsx, .xls 格式文件，文件大小不超过50MB
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
                支持 .json 格式文件，文件大小不超过20MB
              </p>
            </Dragger>
          </TabPane>
        </Tabs>
      ) : (
        renderImportResult()
      )}
    </Modal>
  );
};

export default TableStructureImport;