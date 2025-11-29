import sys
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from models import Base, ColumnLineageRelation, ColumnMetadata, TableMetadata
import json

# 数据库配置
import os
# 获取当前目录
current_dir = os.path.dirname(os.path.abspath(__file__))
# 构建数据库路径
DATABASE_URL = f"sqlite:///{os.path.join(current_dir, 'data', 'metadata.db')}"
print(f"使用数据库路径: {DATABASE_URL}")

# 创建数据库引擎
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})

# 创建会话
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def check_column_lineage_data():
    """检查字段血缘关系数据"""
    db = SessionLocal()
    try:
        print("=== 检查字段血缘关系数据 ===")
        
        # 查询所有列级血缘关系
        column_lineages = db.query(ColumnLineageRelation).all()
        print(f"总共有 {len(column_lineages)} 条字段血缘关系记录")
        
        if not column_lineages:
            print("数据库中没有字段血缘关系记录")
            return
        
        # 打印每条记录的详细信息
        for i, lineage in enumerate(column_lineages, 1):
            print(f"\n--- 记录 {i} ---")
            print(f"ID: {lineage.id}")
            print(f"表级血缘关系ID: {lineage.lineage_relation_id}")
            print(f"源列ID: {lineage.source_column_id}")
            print(f"目标列ID: {lineage.target_column_id}")
            print(f"转换详情: {lineage.transformation_details}")
            print(f"创建时间: {lineage.created_at}")
            
            # 查询源列和目标列的信息
            source_column = db.query(ColumnMetadata).filter(ColumnMetadata.id == lineage.source_column_id).first()
            target_column = db.query(ColumnMetadata).filter(ColumnMetadata.id == lineage.target_column_id).first()
            
            if source_column:
                source_table = db.query(TableMetadata).filter(TableMetadata.id == source_column.table_id).first()
                print(f"源列信息: {source_column.name} (表: {source_table.name if source_table else '未知'})")
            else:
                print("源列不存在")
            
            if target_column:
                target_table = db.query(TableMetadata).filter(TableMetadata.id == target_column.table_id).first()
                print(f"目标列信息: {target_column.name} (表: {target_table.name if target_table else '未知'})")
            else:
                print("目标列不存在")
                
        # 使用SQL直接查询以确保获取完整数据
        print("\n=== 使用SQL直接查询 ===")
        with engine.connect() as conn:
            result = conn.execute(text("""
                SELECT 
                    clr.id, 
                    clr.lineage_relation_id, 
                    clr.source_column_id, 
                    clr.target_column_id, 
                    clr.transformation_details, 
                    clr.created_at,
                    sc.name as source_column_name,
                    sc.table_id as source_table_id,
                    st.name as source_table_name,
                    tc.name as target_column_name,
                    tc.table_id as target_table_id,
                    tt.name as target_table_name
                FROM 
                    column_lineage_relations clr
                LEFT JOIN 
                    column_metadata sc ON clr.source_column_id = sc.id
                LEFT JOIN 
                    table_metadata st ON sc.table_id = st.id
                LEFT JOIN 
                    column_metadata tc ON clr.target_column_id = tc.id
                LEFT JOIN 
                    table_metadata tt ON tc.table_id = tt.id
            """))
            
            rows = result.fetchall()
            print(f"SQL查询返回 {len(rows)} 条记录")
            
            # 打印前3条记录的详细信息
            for i, row in enumerate(rows[:3], 1):
                print(f"\nSQL记录 {i}:")
                print(f"源表: {row.source_table_name}, 源字段: {row.source_column_name}")
                print(f"目标表: {row.target_table_name}, 目标字段: {row.target_column_name}")
                print(f"转换详情: {row.transformation_details}")
                print(f"创建时间: {row.created_at}")
                
    except Exception as e:
        print(f"查询数据库时出错: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    check_column_lineage_data()