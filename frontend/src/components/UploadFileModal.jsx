import React, { useState } from 'react';
import { Modal, Upload, Button, message, Tabs } from 'antd';
import { InboxOutlined } from '@ant-design/icons';
import { uploadApi } from '../services/api';

const { TabPane } = Tabs;
const { Dragger } = Upload;

const UploadFileModal = ({ visible, onCancel, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('excel');
  const [uploading, setUploading] = useState(false);

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
      const result = await uploadApi.uploadExcel(file);
      
      // 显示上传结果统计
      message.success('Excel文件上传成功！');
      showUploadStats(result);
      
      if (onSuccess) {
        onSuccess(result);
      }
    } catch (error) {
      console.error('Excel文件上传失败:', error);
      if (error.response?.data?.detail) {
        message.error(error.response.data.detail);
      } else {
        message.error('Excel文件上传失败，请重试');
      }
    } finally {
      setUploading(false);
    }
  };

  // 处理JSON文件上传
  const handleJsonUpload = async (file) => {
    try {
      setUploading(true);
      const result = await uploadApi.uploadJson(file);
      
      // 显示上传结果统计
      message.success('JSON文件上传成功！');
      showUploadStats(result);
      
      if (onSuccess) {
        onSuccess(result);
      }
    } catch (error) {
      console.error('JSON文件上传失败:', error);
      if (error.response?.data?.detail) {
        message.error(error.response.data.detail);
      } else {
        message.error('JSON文件上传失败，请重试');
      }
    } finally {
      setUploading(false);
    }
  };

  // 显示上传结果统计
  const showUploadStats = (result) => {
    let statsMessage = '';
    
    if (result.data_sources) {
      statsMessage += `数据源: 创建 ${result.data_sources.created || 0}, 更新 ${result.data_sources.updated || 0}\n`;
    }
    
    if (result.tables) {
      statsMessage += `表: 创建 ${result.tables.created || 0}, 更新 ${result.tables.updated || 0}\n`;
    }
    
    if (result.columns) {
      statsMessage += `列: 创建 ${result.columns.created || 0}, 更新 ${result.columns.updated || 0}\n`;
    }
    
    if (result.lineage_relations) {
      statsMessage += `血缘关系: 创建 ${result.lineage_relations.created || 0}\n`;
    }
    
    if (statsMessage) {
      Modal.info({
        title: '上传结果统计',
        content: statsMessage
      });
    }
  };

  return (
    <Modal
      title="批量导入数据"
      open={visible}
      onCancel={onCancel}
      footer={null}
      width={600}
    >
      <Tabs 
        activeKey={activeTab} 
        onChange={setActiveTab}
        tabBarExtraContent={
          <div className="upload-tips">
            <p>支持上传Excel或JSON格式文件</p>
            <p>Excel需包含数据源、表结构和血缘关系工作表</p>
            <p>JSON需符合指定格式规范</p>
          </div>
        }
      >
        <TabPane tab="Excel文件" key="excel">
          <Dragger {...excelUploadProps}>
            <p className="ant-upload-drag-icon">
              <InboxOutlined />
            </p>
            <p className="ant-upload-text">点击或拖拽Excel文件到此区域上传</p>
            <p className="ant-upload-hint">
              支持单个Excel文件上传，文件大小不超过50MB
            </p>
            <Button type="primary" loading={uploading} disabled={uploading}>
              {uploading ? '上传中...' : '选择文件'}
            </Button>
          </Dragger>
        </TabPane>
        
        <TabPane tab="JSON文件" key="json">
          <Dragger {...jsonUploadProps}>
            <p className="ant-upload-drag-icon">
              <InboxOutlined />
            </p>
            <p className="ant-upload-text">点击或拖拽JSON文件到此区域上传</p>
            <p className="ant-upload-hint">
              支持单个JSON文件上传，文件大小不超过20MB
            </p>
            <Button type="primary" loading={uploading} disabled={uploading}>
              {uploading ? '上传中...' : '选择文件'}
            </Button>
          </Dragger>
        </TabPane>
      </Tabs>
    </Modal>
  );
};

export default UploadFileModal;