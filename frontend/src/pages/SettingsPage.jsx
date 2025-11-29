import React, { useState } from 'react';
import { Card, Tabs, Form, Input, Button, message, Switch, Select } from 'antd';
import { SettingOutlined, DatabaseOutlined, AlertOutlined } from '@ant-design/icons';

const { TabPane } = Tabs;
const { Option } = Select;

const SettingsPage = () => {
  const [loading, setLoading] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [generalForm] = Form.useForm();
  const [databaseForm] = Form.useForm();
  const [alertsForm] = Form.useForm();

  // 初始化表单数据
  React.useEffect(() => {
    setIsMounted(true);
    
    // 确保组件挂载后再设置表单值
    if (isMounted) {
      // 这里应该从API获取配置，但现在使用模拟数据
      generalForm.setFieldsValue({
        appName: '元数据管理系统',
        debugMode: true,
        language: 'zh-CN'
      });

      databaseForm.setFieldsValue({
        dbUrl: 'sqlite:///../metadata.db',
        dbPoolSize: 10,
        dbMaxOverflow: 20
      });

      alertsForm.setFieldsValue({
        enableEmailAlerts: false,
        emailServer: '',
        emailPort: 587,
        emailUser: '',
        emailPassword: '',
        alertLevel: 'warning'
      });
    }
  }, [generalForm, databaseForm, alertsForm, isMounted]);

  // 保存通用设置
  const handleSaveGeneralSettings = async (values) => {
    try {
      setLoading(true);
      // 模拟API调用
      await new Promise(resolve => setTimeout(resolve, 1000));
      message.success('通用设置保存成功');
    } catch (error) {
      message.error('保存失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  // 保存数据库设置
  const handleSaveDatabaseSettings = async (values) => {
    try {
      setLoading(true);
      // 模拟API调用
      await new Promise(resolve => setTimeout(resolve, 1000));
      message.success('数据库设置保存成功');
    } catch (error) {
      message.error('保存失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  // 保存告警设置
  const handleSaveAlertsSettings = async (values) => {
    try {
      setLoading(true);
      // 模拟API调用
      await new Promise(resolve => setTimeout(resolve, 1000));
      message.success('告警设置保存成功');
    } catch (error) {
      message.error('保存失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="page-card">
      <div className="page-header">
        <h2>系统设置</h2>
      </div>
      
      <Tabs defaultActiveKey="general">
        <TabPane tab={<span><SettingOutlined /> 通用设置</span>} key="general">
          <Form
            form={generalForm}
            layout="vertical"
            onFinish={handleSaveGeneralSettings}
          >
            <Form.Item
              label="应用名称"
              name="appName"
              rules={[{ required: true, message: '请输入应用名称' }]}
            >
              <Input placeholder="请输入应用名称" />
            </Form.Item>
            
            <Form.Item
              label="调试模式"
              name="debugMode"
              valuePropName="checked"
            >
              <Switch checkedChildren="开启" unCheckedChildren="关闭" />
            </Form.Item>
            
            <Form.Item
              label="语言设置"
              name="language"
              rules={[{ required: true, message: '请选择语言' }]}
            >
              <Select placeholder="请选择语言">
                <Option value="zh-CN">简体中文</Option>
                <Option value="en-US">English</Option>
              </Select>
            </Form.Item>
            
            <Form.Item className="settings-footer">
              <Button type="primary" htmlType="submit" loading={loading}>
                保存设置
              </Button>
            </Form.Item>
          </Form>
        </TabPane>
        
        <TabPane tab={<span><DatabaseOutlined /> 数据库设置</span>} key="database">
          <Form
            form={databaseForm}
            layout="vertical"
            onFinish={handleSaveDatabaseSettings}
          >
            <Form.Item
              label="数据库连接URL"
              name="dbUrl"
              rules={[{ required: true, message: '请输入数据库连接URL' }]}
            >
              <Input placeholder="请输入数据库连接URL" />
              <div className="form-tip">格式: sqlite:///metadata.db 或 postgresql://user:pass@localhost/dbname</div>
            </Form.Item>
            
            <Form.Item
              label="连接池大小"
              name="dbPoolSize"
              rules={[{ required: true, type: 'number', min: 1, max: 100 }]}
            >
              <Input type="number" placeholder="请输入连接池大小" />
            </Form.Item>
            
            <Form.Item
              label="最大溢出连接数"
              name="dbMaxOverflow"
              rules={[{ required: true, type: 'number', min: 0, max: 200 }]}
            >
              <Input type="number" placeholder="请输入最大溢出连接数" />
            </Form.Item>
            
            <Form.Item className="settings-footer">
              <Button type="primary" htmlType="submit" loading={loading}>
                保存设置
              </Button>
              <Button style={{ marginLeft: 10 }}>
                测试连接
              </Button>
            </Form.Item>
          </Form>
        </TabPane>
        
        <TabPane tab={<span><AlertOutlined /> 告警设置</span>} key="alerts">
          <Form
            form={alertsForm}
            layout="vertical"
            onFinish={handleSaveAlertsSettings}
          >
            <Form.Item
              label="启用邮件告警"
              name="enableEmailAlerts"
              valuePropName="checked"
            >
              <Switch checkedChildren="开启" unCheckedChildren="关闭" />
            </Form.Item>
            
            <Form.Item
              label="邮件服务器"
              name="emailServer"
              rules={[
                {
                  required: ({ getFieldValue }) => getFieldValue('enableEmailAlerts'),
                  message: '请输入邮件服务器地址'
                }
              ]}
            >
              <Input placeholder="请输入邮件服务器地址" />
            </Form.Item>
            
            <Form.Item
              label="邮件服务器端口"
              name="emailPort"
              rules={[
                {
                  required: ({ getFieldValue }) => getFieldValue('enableEmailAlerts'),
                  message: '请输入邮件服务器端口'
                },
                { type: 'number', min: 1, max: 65535 }
              ]}
            >
              <Input type="number" placeholder="请输入邮件服务器端口" />
            </Form.Item>
            
            <Form.Item
              label="邮箱用户名"
              name="emailUser"
              rules={[
                {
                  required: ({ getFieldValue }) => getFieldValue('enableEmailAlerts'),
                  message: '请输入邮箱用户名'
                }
              ]}
            >
              <Input placeholder="请输入邮箱用户名" />
            </Form.Item>
            
            <Form.Item
              label="邮箱密码"
              name="emailPassword"
              rules={[
                {
                  required: ({ getFieldValue }) => getFieldValue('enableEmailAlerts'),
                  message: '请输入邮箱密码'
                }
              ]}
            >
              <Input.Password placeholder="请输入邮箱密码" />
            </Form.Item>
            
            <Form.Item
              label="告警级别"
              name="alertLevel"
              rules={[{ required: true, message: '请选择告警级别' }]}
            >
              <Select placeholder="请选择告警级别">
                <Option value="info">信息</Option>
                <Option value="warning">警告</Option>
                <Option value="error">错误</Option>
                <Option value="critical">严重</Option>
              </Select>
            </Form.Item>
            
            <Form.Item className="settings-footer">
              <Button type="primary" htmlType="submit" loading={loading}>
                保存设置
              </Button>
              <Button style={{ marginLeft: 10 }}>
                发送测试邮件
              </Button>
            </Form.Item>
          </Form>
        </TabPane>
      </Tabs>
    </Card>
  );
};

export default SettingsPage;