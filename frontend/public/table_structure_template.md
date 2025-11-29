# 表结构导入模板说明

## 支持的导入格式
表结构导入组件支持两种导入格式：**Excel** 和 **JSON**。

## 1. Excel模板格式
Excel文件需要包含三个Sheet，分别对应数据源、表和列的信息：

### Sheet 1: data_sources（数据源信息）
| 字段名 | 示例值 | 说明 |
|--------|--------|------|
| name | 示例数据源 | 数据源名称 |
| description | 这是一个示例数据源 | 数据源描述 |
| type | mysql | 数据源类型 |
| connection_config | {"host": "localhost", "port": 3306, "database": "example_db", "username": "root", "password": "password"} | 连接配置（JSON格式） |

### Sheet 2: tables（表元数据信息）
| 字段名 | 示例值 | 说明 |
|--------|--------|------|
| data_source_name | 示例数据源 | 数据源名称 |
| name | users | 表名 |
| schema_name | public | 模式名称 |
| description | 用户信息表 | 表描述 |
| properties | {"engine": "InnoDB", "charset": "utf8mb4"} | 表属性（JSON格式） |

### Sheet 3: columns（列元数据信息）
| 字段名 | 示例值 | 说明 |
|--------|--------|------|
| data_source_name | 示例数据源 | 数据源名称 |
| table_name | users | 表名 |
| name | id | 列名 |
| data_type | int | 数据类型 |
| description | 用户ID | 列描述 |
| is_primary_key | TRUE | 是否为主键 |
| properties | {"auto_increment": true, "length": 11} | 列属性（JSON格式） |

## 2. JSON模板格式
JSON文件需要包含三个顶层数组：data_sources、tables和columns。

### 示例JSON文件
```json
{
  "data_sources": [
    {
      "name": "示例数据源",
      "description": "这是一个示例数据源",
      "type": "mysql",
      "connection_config": {
        "host": "localhost",
        "port": 3306,
        "database": "example_db",
        "username": "root",
        "password": "password"
      }
    }
  ],
  "tables": [
    {
      "data_source_name": "示例数据源",
      "name": "users",
      "schema_name": "public",
      "description": "用户信息表",
      "properties": {
        "engine": "InnoDB",
        "charset": "utf8mb4"
      }
    },
    {
      "data_source_name": "示例数据源",
      "name": "products",
      "schema_name": "public",
      "description": "产品信息表",
      "properties": {
        "engine": "InnoDB",
        "charset": "utf8mb4"
      }
    }
  ],
  "columns": [
    {
      "data_source_name": "示例数据源",
      "table_name": "users",
      "name": "id",
      "data_type": "int",
      "description": "用户ID",
      "is_primary_key": true,
      "properties": {
        "auto_increment": true,
        "length": 11
      }
    },
    {
      "data_source_name": "示例数据源",
      "table_name": "users",
      "name": "username",
      "data_type": "varchar",
      "description": "用户名",
      "is_primary_key": false,
      "properties": {
        "length": 50,
        "not_null": true
      }
    },
    {
      "data_source_name": "示例数据源",
      "table_name": "products",
      "name": "id",
      "data_type": "int",
      "description": "产品ID",
      "is_primary_key": true,
      "properties": {
        "auto_increment": true,
        "length": 11
      }
    },
    {
      "data_source_name": "示例数据源",
      "table_name": "products",
      "name": "name",
      "data_type": "varchar",
      "description": "产品名称",
      "is_primary_key": false,
      "properties": {
        "length": 100,
        "not_null": true
      }
    }
  ]
}
```

## 3. 模板文件位置

### JSON模板
- 路径：`/table_structure_template.json`
- 访问链接：http://localhost:3001/table_structure_template.json

### Excel模板说明
由于无法直接提供Excel文件，您可以根据上述说明创建Excel文件，包含三个Sheet：
1. `data_sources` - 数据源信息
2. `tables` - 表元数据信息
3. `columns` - 列元数据信息

## 4. 导入注意事项

1. **必填字段**：
   - data_sources: name, type
   - tables: data_source_name, name, schema_name
   - columns: data_source_name, table_name, name, data_type

2. **数据类型**：
   - is_primary_key: 布尔值（TRUE/FALSE）
   - connection_config, properties: JSON格式字符串

3. **文件大小限制**：
   - Excel文件：50MB
   - JSON文件：20MB

4. **导入流程**：
   - 登录系统，进入"数据导入与血缘配置"页面
   - 点击"表结构及字段信息导入"卡片
   - 拖拽或选择文件（Excel或JSON）
   - 点击"开始导入"按钮
   - 等待导入完成，查看导入结果

5. **增量导入**：
   - 支持增量导入，可以只导入部分数据
   - 已存在的记录会被更新，不存在的记录会被创建

## 5. 示例数据说明

### 数据源示例
- 名称：示例数据源
- 类型：mysql
- 连接配置：包含数据库连接信息

### 表示例
1. **users表**：用户信息表
   - 包含id、username、email、created_at等字段
   - id为主键，自增长

2. **products表**：产品信息表
   - 包含id、name、price、description等字段
   - id为主键，自增长

### 列示例
- **id**：整数类型，主键，自增长
- **username**：字符串类型，用户名
- **email**：字符串类型，用户邮箱
- **created_at**：日期时间类型，创建时间
- **name**：字符串类型，产品名称
- **price**： decimal类型，产品价格
- **description**：文本类型，产品描述

## 6. 常见问题

### Q: 导入失败怎么办？
A: 查看导入结果中的错误信息，根据提示修改文件后重新导入。

### Q: 如何获取已存在的数据源名称？
A: 可以在"数据源管理"页面查看已存在的数据源名称。

### Q: 支持哪些数据源类型？
A: 支持mysql、postgresql、oracle、sqlserver、hive、presto、clickhouse、mongo等常见数据库类型。

### Q: 导入后如何查看结果？
A: 导入完成后，系统会显示导入结果统计，包括成功和失败的数量。您可以在"表浏览"页面查看导入的表结构。

## 7. 联系我们

如果您在使用过程中遇到问题，请联系系统管理员或技术支持。
