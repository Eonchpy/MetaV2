# 字段血缘关系导入模板说明

## 支持的导入格式
字段血缘关系导入支持 **JSON** 格式。

## JSON模板格式
JSON文件需要包含一个顶层数组 `column_lineages`，用于存储所有字段血缘关系。

## 示例JSON文件
```json
{
  "column_lineages": [
    {
      "source_db_name": "example_db",
      "source_table_name": "users",
      "source_column_name": "id",
      "target_db_name": "example_db",
      "target_table_name": "orders",
      "target_column_name": "user_id",
      "relation_type": "FOREIGN_KEY",
      "description": "订单表的user_id字段关联到用户表的id字段",
      "transformation_details": {
        "logic": "直接关联",
        "is_primary_key": true
      }
    }
  ]
}
```

## 字段说明

| 字段名 | 类型 | 说明 | 是否必填 | 默认值 |
|--------|------|------|----------|--------|
| source_db_name | 字符串 | 源数据库名称 | 是 | - |
| source_table_name | 字符串 | 源表名称 | 是 | - |
| source_column_name | 字符串 | 源字段名称 | 是 | - |
| target_db_name | 字符串 | 目标数据库名称 | 是 | - |
| target_table_name | 字符串 | 目标表名称 | 是 | - |
| target_column_name | 字符串 | 目标字段名称 | 是 | - |
| relation_type | 字符串 | 关系类型 | 否 | TRANSFORMATION |
| description | 字符串 | 描述信息 | 否 | - |
| transformation_details | JSON对象 | 转换详情 | 否 | {} |

## 关系类型说明

| 关系类型 | 说明 |
|----------|------|
| FOREIGN_KEY | 外键关系 |
| TRANSFORMATION | 转换关系 |
| AGGREGATION | 聚合关系 |
| JOIN | 连接关系 |
| FILTER | 过滤关系 |
| SORT | 排序关系 |
| DISTINCT | 去重关系 |
| GROUP_BY | 分组关系 |
| WINDOW | 窗口函数关系 |
| OTHER | 其他关系 |

## 转换详情说明

`transformation_details` 是一个JSON对象，用于存储字段转换的详细信息，包含以下可选字段：

| 字段名 | 类型 | 说明 |
|--------|------|------|
| logic | 字符串 | 转换逻辑描述 |
| expression | 字符串 | 转换表达式 |
| group_by | 数组 | 分组字段 |
| order_by | 数组 | 排序字段 |
| window_function | 字符串 | 窗口函数 |
| filter_condition | 字符串 | 过滤条件 |
| is_primary_key | 布尔值 | 是否为主键 |
| is_unique | 布尔值 | 是否唯一 |
| is_not_null | 布尔值 | 是否非空 |

## 模板文件位置

### JSON模板
- 路径：`/column_lineage_template.json`
- 访问链接：http://localhost:3001/column_lineage_template.json

## 导入注意事项

1. **必填字段**：
   - `source_db_name`：源数据库名称
   - `source_table_name`：源表名称
   - `source_column_name`：源字段名称
   - `target_db_name`：目标数据库名称
   - `target_table_name`：目标表名称
   - `target_column_name`：目标字段名称

2. **数据类型**：
   - transformation_details：JSON格式对象

3. **文件大小限制**：
   - JSON文件：20MB

4. **导入流程**：
   - 登录系统，进入"数据导入与血缘配置"页面
   - 点击"字段血缘导入"卡片
   - 拖拽或选择JSON文件
   - 点击"开始导入"按钮
   - 等待导入完成，查看导入结果

5. **前置条件**：
   - 源表和目标表必须已经存在于系统中
   - 源字段和目标字段必须已经存在于系统中
   - 建议先导入表结构，再导入字段血缘关系

6. **增量导入**：
   - 支持增量导入，可以只导入部分字段血缘关系
   - 已存在的记录会被更新，不存在的记录会被创建

## 示例数据说明

### 数据源示例
- 名称：example_db
- 类型：mysql

### 表和字段示例

1. **users表**：用户信息表
   - 字段：id, first_name, last_name, email, created_at
   - id为主键

2. **products表**：产品信息表
   - 字段：id, name, price, description, created_at
   - id为主键

3. **orders表**：订单表
   - 字段：id, user_id, product_id, quantity, price, order_date, created_at
   - id为主键
   - user_id为外键，关联users表的id
   - product_id为外键，关联products表的id

4. **order_details表**：订单详情表
   - 字段：id, order_id, product_id, quantity, price, created_at
   - id为主键
   - order_id为外键，关联orders表的id
   - product_id为外键，关联products表的id

5. **order_summary表**：订单汇总表
   - 字段：id, order_date, total_quantity, total_amount, created_at
   - id为主键

6. **user_profiles表**：用户资料表
   - 字段：id, user_id, first_name, last_name, email, created_at
   - id为主键
   - user_id为外键，关联users表的id

7. **product_catalog表**：产品目录表
   - 字段：id, product_id, product_name, price, created_at
   - id为主键
   - product_id为外键，关联products表的id

### 字段血缘关系示例

1. **外键关系**：
   - 源：users.id
   - 目标：orders.user_id
   - 关系类型：FOREIGN_KEY

2. **转换关系**：
   - 源：orders.quantity
   - 目标：order_details.quantity
   - 关系类型：TRANSFORMATION
   - 转换逻辑：直接复制

3. **聚合关系**：
   - 源：orders.quantity
   - 目标：order_summary.total_quantity
   - 关系类型：AGGREGATION
   - 转换逻辑：聚合计算，total_quantity = SUM(source.quantity)，按order_date分组

## 常见问题

### Q: 导入失败怎么办？
A: 查看导入结果中的错误信息，根据提示修改文件后重新导入。常见错误包括：
   - 源表或目标表不存在
   - 源字段或目标字段不存在
   - 必填字段缺失
   - JSON格式错误

### Q: 如何获取已存在的表和字段信息？
A: 可以在"表浏览"页面查看已存在的表和字段信息。

### Q: 支持哪些关系类型？
A: 支持FOREIGN_KEY、TRANSFORMATION、AGGREGATION、JOIN、FILTER、SORT、DISTINCT、GROUP_BY、WINDOW、OTHER等关系类型。

### Q: 导入后如何查看结果？
A: 导入完成后，系统会显示导入结果统计，包括成功和失败的数量。您可以在"血缘关系分析"页面查看导入的字段血缘关系。

## 联系我们

如果您在使用过程中遇到问题，请联系系统管理员或技术支持。
