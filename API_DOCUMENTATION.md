# 元数据管理系统 API 文档

本文档详细描述了元数据管理系统提供的所有API接口，包括数据源管理、元数据查询、血缘关系分析和配置管理等功能。

## 目录

1. [数据源管理](#数据源管理)
2. [元数据查询](#元数据查询)
3. [血缘关系分析](#血缘关系分析)
4. [配置管理](#配置管理)
5. [文件上传](#文件上传)

## 基础信息

- **API前缀**: `/api`
- **响应格式**: JSON
- **错误处理**: 统一返回HTTP状态码和错误信息

## 数据源管理

### 1. 创建数据源

**URL**: `/datasources`
**方法**: `POST`
**描述**: 创建新的数据源连接配置

**请求体**: 
```json
{
  "name": "数据源名称",
  "type": "ORACLE", // 支持的数据库类型
  "connection_config": {
    "host": "数据库主机",
    "port": 1521,
    "service_name": "服务名",
    "username": "用户名",
    "password": "密码"
  },
  "description": "数据源描述"
}
```

**响应**: 
```json
{
  "id": 1,
  "name": "数据源名称",
  "type": "ORACLE",
  "connection_config": {...},
  "description": "数据源描述",
  "created_at": "2024-01-01T00:00:00",
  "updated_at": "2024-01-01T00:00:00"
}
```

### 2. 获取数据源列表

**URL**: `/datasources`
**方法**: `GET`
**描述**: 获取所有数据源配置

**响应**: 
```json
[
  {
    "id": 1,
    "name": "数据源1",
    "type": "ORACLE",
    "description": "...",
    "created_at": "..."
  },
  ...
]
```

### 3. 获取单个数据源

**URL**: `/datasources/{id}`
**方法**: `GET`
**描述**: 根据ID获取数据源详情

**响应**: 
```json
{
  "id": 1,
  "name": "数据源名称",
  "type": "ORACLE",
  "connection_config": {...},
  "description": "数据源描述"
}
```

### 4. 更新数据源

**URL**: `/datasources/{id}`
**方法**: `PUT`
**描述**: 更新数据源配置

**请求体**: 
```json
{
  "name": "新名称",
  "description": "新描述",
  "connection_config": {...}
}
```

**响应**: 
```json
{
  "id": 1,
  "name": "新名称",
  "type": "ORACLE",
  "connection_config": {...},
  "description": "新描述",
  "updated_at": "2024-01-01T00:00:00"
}
```

### 5. 删除数据源

**URL**: `/datasources/{id}`
**方法**: `DELETE`
**描述**: 删除数据源配置

**响应**: 
```json
{
  "message": "数据源删除成功"
}
```

## 元数据查询

### 1. 获取表列表

**URL**: `/metadata/tables/{data_source_id}`
**方法**: `GET`
**描述**: 获取指定数据源的所有表信息

**响应**: 
```json
[
  {
    "table_name": "表名",
    "schema_name": "模式名",
    "description": "表描述",
    "row_count": 1000,
    "created_at": "..."
  },
  ...
]
```

### 2. 获取列信息

**URL**: `/metadata/columns/{data_source_id}/{table_name}`
**方法**: `GET`
**描述**: 获取指定表的列信息

**响应**: 
```json
[
  {
    "column_name": "列名",
    "data_type": "NUMBER",
    "description": "列描述",
    "nullable": true,
    "length": 10
  },
  ...
]
```

## 血缘关系分析

### 1. 获取表级血缘关系

**URL**: `/lineage/table/{table_name}`
**方法**: `GET`
**描述**: 获取指定表的表级血缘关系（包括上游和下游表）

**响应**: 
```json
{
  "nodes": [
    {"id": "表1", "name": "表1", "type": "table"},
    {"id": "表2", "name": "表2", "type": "table"}
  ],
  "links": [
    {"source": "表1", "target": "表2", "type": "data_flow"}
  ]
}
```

### 2. 获取列级血缘关系

**URL**: `/lineage/column/{table_name}/{column_name}`
**方法**: `GET`
**描述**: 获取指定列的列级血缘关系

**响应**: 
```json
{
  "nodes": [
    {"id": "表1.列1", "name": "表1.列1", "type": "column"},
    {"id": "表2.列2", "name": "表2.列2", "type": "column"}
  ],
  "links": [
    {"source": "表1.列1", "target": "表2.列2", "type": "data_flow"}
  ]
}
```

### 3. 获取上游表

**URL**: `/lineage/{table_name}/upstream`
**方法**: `GET`
**描述**: 获取指定表的所有上游表

**响应**: 
```json
[
  {
    "table_name": "上游表1",
    "schema_name": "模式名",
    "relationship_type": "direct"
  },
  ...
]
```

### 4. 获取下游表

**URL**: `/lineage/{table_name}/downstream`
**方法**: `GET`
**描述**: 获取指定表的所有下游表

**响应**: 
```json
[
  {
    "table_name": "下游表1",
    "schema_name": "模式名",
    "relationship_type": "direct"
  },
  ...
]
```

## 配置管理

### 1. 获取所有配置

**URL**: `/configs`
**方法**: `GET`
**描述**: 获取系统所有配置项

**响应**: 
```json
[
  {
    "id": 1,
    "config_type": "GENERAL",
    "config_key": "app_name",
    "config_value": "元数据管理系统"
  },
  ...
]
```

### 2. 按类型获取配置

**URL**: `/configs/{config_type}`
**方法**: `GET`
**描述**: 获取指定类型的配置项

**参数**: 
- `config_type`: 配置类型 (GENERAL, DATABASE, ALERTS)

**响应**: 
```json
[
  {
    "id": 1,
    "config_type": "GENERAL",
    "config_key": "app_name",
    "config_value": "元数据管理系统"
  },
  ...
]
```

### 3. 更新通用配置

**URL**: `/configs/general`
**方法**: `PUT`
**描述**: 更新通用配置项

**请求体**: 
```json
{
  "app_name": "元数据管理系统",
  "debug": true,
  "language": "zh-CN"
}
```

**响应**: 
```json
{
  "status": "success",
  "message": "通用配置更新成功"
}
```

### 4. 更新数据库配置

**URL**: `/configs/database`
**方法**: `PUT`
**描述**: 更新数据库连接配置

**请求体**: 
```json
{
  "db_pool_size": 5,
  "db_max_overflow": 10
}
```

**响应**: 
```json
{
  "status": "success",
  "message": "数据库配置更新成功"
}
```

### 5. 更新告警配置

**URL**: `/configs/alerts`
**方法**: `PUT`
**描述**: 更新告警相关配置

**请求体**: 
```json
{
  "enable_email_alerts": true,
  "smtp_server": "smtp.example.com",
  "smtp_port": 587,
  "smtp_username": "alert@example.com",
  "smtp_password": "password",
  "use_ssl": false,
  "alert_threshold": 100
}
```

**响应**: 
```json
{
  "status": "success",
  "message": "告警配置更新成功"
}
```

### 6. 测试数据库连接

**URL**: `/configs/test-db-connection`
**方法**: `POST`
**描述**: 测试数据库连接是否正常

**请求体**: 
```json
{
  "host": "localhost",
  "port": 3306,
  "username": "test",
  "password": "test",
  "database": "test_db"
}
```

**响应**: 
```json
{
  "status": "success",
  "message": "数据库连接测试成功"
}
```

### 7. 测试邮件连接

**URL**: `/configs/test-email-connection`
**方法**: `POST`
**描述**: 测试邮件服务器连接是否正常

**请求体**: 
```json
{
  "smtp_server": "smtp.example.com",
  "smtp_port": 587,
  "smtp_username": "test@example.com",
  "smtp_password": "password",
  "use_ssl": false
}
```

**响应**: 
```json
{
  "status": "success",
  "message": "邮件服务器连接测试成功"
}
```

## 文件上传

### 1. 上传元数据文件

**URL**: `/upload/metadata`
**方法**: `POST`
**描述**: 上传Excel或JSON格式的元数据文件

**请求体**: `multipart/form-data`
- `file`: 元数据文件 (Excel或JSON格式)
- `data_source_id`: 数据源ID (可选)

**响应**: 
```json
{
  "status": "success",
  "message": "元数据文件上传成功",
  "uploaded_count": 10,
  "failed_count": 0
}
```

### 2. 上传血缘关系文件

**URL**: `/upload/lineage`
**方法**: `POST`
**描述**: 上传Excel或JSON格式的血缘关系文件

**请求体**: `multipart/form-data`
- `file`: 血缘关系文件

**响应**: 
```json
{
  "status": "success",
  "message": "血缘关系文件上传成功",
  "uploaded_count": 5,
  "failed_count": 0
}