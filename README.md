# 元数据管理系统 (MetaV2)

一个功能完善?的元数据管理系统，支持数据源管理、元数据提取、血缘关系分析和可视化等功能。

## 功能特性

- **数据源管理**：支持多种数据库类型的连接管理（Oracle、MongoDB、Elasticsearch等）
- **元数据导入/导出**：支持Excel和JSON格式的批量导入导出
- **血缘关系分析**：表级和列级血缘关系的可视化展示
- **系统配置管理**：灵活的配置项设置，包括通用设置、数据库设置和告警设置
- **现代化前端界面**：基于React和Ant Design的响应式界面

## 技术栈

### 后端
- Python 3.12
- FastAPI
- SQLAlchemy
- Pydantic V2
- NetworkX (用于血缘关系分析)

### 前端
- React 18
- Ant Design 5
- React Router 6
- ECharts (用于数据可视化)
- Axios (HTTP客户端)

## 快速开始

### 环境准备

1. 安装Python 3.12
2. 安装Node.js 16+

### 后端设置

1. 安装Python依赖：
```bash
pip install -r requirements.txt
```

2. 启动后端服务：
```bash
cd backend
python app.py
```

后端服务将运行在 http://localhost:8000

### 前端设置

1. 安装前端依赖：
```bash
cd frontend
npm install
```

2. 启动前端开发服务器：
```bash
npm run dev
```

前端服务将运行在 http://localhost:3000

## API文档

启动后端服务后，可以访问以下地址查看自动生成的API文档：
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## 主要API端点

### 数据源管理
- `GET /api/data-sources` - 获取数据源列表
- `POST /api/data-sources` - 创建新数据源
- `GET /api/data-sources/{id}` - 获取单个数据源详情
- `PUT /api/data-sources/{id}` - 更新数据源
- `DELETE /api/data-sources/{id}` - 删除数据源

### 元数据管理
- `GET /api/tables` - 获取表元数据列表
- `GET /api/columns` - 获取列元数据列表

### 血缘关系
- `GET /api/lineage/graph` - 获取血缘关系图数据
- `POST /api/lineage` - 创建血缘关系

### 文件导入
- `POST /api/upload/excel` - 上传Excel文件
- `POST /api/upload/json` - 上传JSON文件

### 系统配置
- `GET /api/config` - 获取所有配置
- `PUT /api/config/general` - 更新通用配置
- `PUT /api/config/database` - 更新数据库配置
- `PUT /api/config/alerts` - 更新告警配置

## 项目结构

```
MetaV2/
├── backend/            # 后端代码
│   ├── api/            # API路由
│   ├── config/         # 配置文件
│   ├── core/           # 核心功能模块
│   ├── models/         # 数据模型
│   ├── services/       # 业务逻辑服务
│   └── utils/          # 工具函数
├── frontend/           # 前端代码
│   ├── public/         # 静态资源
│   └── src/            # 源代码
│       ├── components/ # 组件
│       ├── pages/      # 页面
│       ├── services/   # API服务
│       └── utils/      # 工具函数
├── tests/              # 测试代码
└── requirements.txt    # Python依赖
```

## 数据模型

### 数据源 (DataSource)
- 包含连接信息、描述等

### 表元数据 (TableMetadata)
- 包含表名、架构、描述等

### 列元数据 (ColumnMetadata)
- 包含列名、数据类型、是否主键等

### 血缘关系 (LineageRelation)
- 包含源表、目标表、关系类型等

### 列血缘关系 (ColumnLineageRelation)
- 包含源列、目标列、转换逻辑等

## 许可证

[MIT License](LICENSE)

## 贡献

欢迎提交Issue和Pull Request！
