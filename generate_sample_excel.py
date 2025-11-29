import pandas as pd
import os

# 创建Excel写入器
excel_file = 'sample_new_tables.xlsx'
with pd.ExcelWriter(excel_file, engine='openpyxl') as writer:
    # 1. 数据源信息Sheet
    data_sources_data = {
        'name': ['示例数据源', '另一个数据源'],
        'description': ['用于演示的数据源', '另一个演示数据源'],
        'source_type': ['oracle', 'elasticsearch'],
        'type': ['oracle', 'elasticsearch'],
        'connection_config': [
            '{"host": "localhost", "port": 1521, "service_name": "ORCL", "username": "demo_user", "password": "demo_password"}',
            '{"host": "localhost", "port": 9200, "index": "sample_index", "username": "demo_user", "password": "demo_password"}'
        ]
    }
    data_sources_df = pd.DataFrame(data_sources_data)
    data_sources_df.to_excel(writer, sheet_name='data_sources', index=False)
    
    # 2. 表元数据信息Sheet
    tables_data = {
        'data_source_name': ['示例数据源', '示例数据源', '另一个数据源'],
        'name': ['users', 'products', 'sales_report'],
        'description': ['用户信息表', '产品信息表', '销售报表'],
        'schema_name': ['public', 'public', 'reporting'],
        'properties': [
            '{"table_type": "TABLE", "row_count": 1000}',
            '{"table_type": "TABLE", "row_count": 500}',
            '{"table_type": "VIEW", "row_count": 200}'
        ]
    }
    tables_df = pd.DataFrame(tables_data)
    tables_df.to_excel(writer, sheet_name='tables', index=False)
    
    # 3. 列元数据信息Sheet
    columns_data = {
        'table_name': ['users', 'users', 'users', 'products', 'products', 'products', 'sales_report', 'sales_report', 'sales_report'],
        'data_source_name': ['示例数据源', '示例数据源', '示例数据源', '示例数据源', '示例数据源', '示例数据源', '另一个数据源', '另一个数据源', '另一个数据源'],
        'name': ['id', 'username', 'email', 'product_id', 'product_name', 'price', 'report_id', 'product_name', 'total_sales'],
        'data_type': ['INT', 'VARCHAR(50)', 'VARCHAR(100)', 'INT', 'VARCHAR(200)', 'DECIMAL(10,2)', 'INT', 'VARCHAR(200)', 'DECIMAL(12,2)'],
        'description': ['用户ID', '用户名', '电子邮箱', '产品ID', '产品名称', '产品价格', '报表ID', '产品名称', '总销售额'],
        'is_primary_key': [True, False, False, True, False, False, True, False, False],
        'is_nullable': [False, False, False, False, False, False, False, False, False],
        'properties': ['{}', '{}', '{}', '{}', '{}', '{}', '{}', '{}', '{}']
    }
    columns_df = pd.DataFrame(columns_data)
    columns_df.to_excel(writer, sheet_name='columns', index=False)
    
    # 4. 可选：血缘关系信息Sheet（如果需要上传血缘关系）
    lineages_data = {
        'source_db_name': ['示例数据源', '示例数据源'],
        'source_table_name': ['products', 'products'],
        'source_column_name': ['product_id', 'product_name'],
        'target_db_name': ['另一个数据源', '另一个数据源'],
        'target_table_name': ['sales_report', 'sales_report'],
        'target_column_name': ['report_id', 'product_name'],
        'lineage_type': ['TRANSFORMATION', 'TRANSFORMATION'],
        'description': ['产品ID映射到报表ID', '产品名称直接映射'],
        'transformation_logic': ['直接映射', '直接映射']
    }
    lineages_df = pd.DataFrame(lineages_data)
    lineages_df.to_excel(writer, sheet_name='lineages', index=False)

print(f"Excel示例文件已生成：{os.path.abspath(excel_file)}")
print("\n文件包含以下Sheet：")
print("1. data_sources - 数据源信息")
print("2. tables - 表元数据信息")
print("3. columns - 列元数据信息")
print("4. lineages - 血缘关系信息（可选）")
print("\n使用方法：")
print("1. 通过系统的上传功能上传此Excel文件")
print("2. 访问 /upload/excel 或 /upload/table-structure/excel 端点进行上传")