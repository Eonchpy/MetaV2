from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
import logging
from models import DataSource, TableMetadata, ColumnMetadata
from core.metadata_extractor import MetadataExtractor
from models.schemas import DataSourceCreate, TableMetadataCreate, ColumnMetadataCreate

logger = logging.getLogger(__name__)

class MetadataImportService:
    """元数据导入服务类，负责将提取的元数据导入到数据模型中"""
    
    @staticmethod
    def import_metadata_from_source(db: Session, data_source_id: int) -> Dict[str, Any]:
        """
        从指定数据源导入元数据
        
        Args:
            db: 数据库会话
            data_source_id: 数据源ID
            
        Returns:
            导入结果统计信息
        """
        # 获取数据源信息
        data_source = db.query(DataSource).filter(DataSource.id == data_source_id).first()
        if not data_source:
            raise ValueError(f"数据源ID {data_source_id} 不存在")
        
        try:
            # 提取元数据
            logger.info(f"开始从数据源 {data_source.name} 提取元数据...")
            metadata = MetadataExtractor.extract_metadata(
                data_source.type,
                data_source.connection_params
            )
            
            # 导入元数据
            logger.info(f"开始导入元数据到数据库...")
            result = MetadataImportService._import_metadata_to_db(
                db, 
                data_source_id, 
                metadata
            )
            
            logger.info(f"元数据导入完成。导入表: {result['tables_imported']}, 导入列: {result['columns_imported']}")
            return result
        except Exception as e:
            logger.error(f"导入元数据失败: {e}")
            raise
    
    @staticmethod
    def _import_metadata_to_db(db: Session, data_source_id: int, metadata: Dict[str, Any]) -> Dict[str, Any]:
        """
        将元数据导入到数据库
        
        Args:
            db: 数据库会话
            data_source_id: 数据源ID
            metadata: 从数据源提取的元数据
            
        Returns:
            导入结果统计
        """
        # 初始化统计信息
        stats = {
            "tables_imported": 0,
            "tables_updated": 0,
            "tables_skipped": 0,
            "columns_imported": 0,
            "columns_updated": 0,
            "columns_deleted": 0
        }
        
        # 获取数据源的所有现有表
        existing_tables = {table.name: table for table in 
                          db.query(TableMetadata).filter(TableMetadata.data_source_id == data_source_id).all()}
        
        # 处理每个表
        for table_info in metadata.get("tables", []):
            table_name = table_info["name"]
            schema_name = table_info.get("schema", "")
            
            # 构建表的唯一标识
            table_identifier = f"{schema_name}.{table_name}" if schema_name else table_name
            
            try:
                # 检查表是否已存在
                if table_name in existing_tables:
                    # 更新现有表
                    existing_table = existing_tables[table_name]
                    stats["tables_updated"] += 1
                    
                    # 更新表信息
                    existing_table.row_count = table_info.get("row_count", 0)
                    existing_table.schema = schema_name
                    existing_table.last_analyzed = table_info.get("last_analyzed")
                    
                    # 更新列信息
                    col_stats = MetadataImportService._update_table_columns(
                        db, 
                        existing_table.id, 
                        table_info.get("columns", []),
                        table_info.get("primary_keys", [])
                    )
                    
                    # 累加列统计信息
                    stats["columns_imported"] += col_stats["imported"]
                    stats["columns_updated"] += col_stats["updated"]
                    stats["columns_deleted"] += col_stats["deleted"]
                    
                    # 从现有表字典中移除，剩下的就是需要删除的表
                    del existing_tables[table_name]
                else:
                    # 创建新表
                    stats["tables_imported"] += 1
                    
                    # 准备表创建数据
                    table_create = TableMetadataCreate(
                        name=table_name,
                        data_source_id=data_source_id,
                        schema=schema_name,
                        row_count=table_info.get("row_count", 0),
                        last_analyzed=table_info.get("last_analyzed")
                    )
                    
                    # 创建表
                    new_table = TableMetadata(**table_create.model_dump())
                    db.add(new_table)
                    db.flush()  # 获取表ID
                    
                    # 创建列
                    primary_keys = set(table_info.get("primary_keys", []))
                    for column_info in table_info.get("columns", []):
                        # 检查是否为主键
                        is_primary_key = column_info["name"] in primary_keys
                        
                        # 准备列创建数据
                        column_create = ColumnMetadataCreate(
                            name=column_info["name"],
                            table_id=new_table.id,
                            type=column_info["type"],
                            length=column_info.get("length"),
                            precision=column_info.get("precision"),
                            scale=column_info.get("scale"),
                            nullable=column_info.get("nullable", True),
                            position=column_info.get("position"),
                            description=column_info.get("description", ""),
                            is_primary_key=is_primary_key
                        )
                        
                        # 创建列
                        new_column = ColumnMetadata(**column_create.model_dump())
                        db.add(new_column)
                        stats["columns_imported"] += 1
            except Exception as e:
                logger.error(f"处理表 {table_identifier} 时出错: {e}")
                stats["tables_skipped"] += 1
                continue
        
        # 删除不再存在的表及其关联的列
        for table_name, table in existing_tables.items():
            logger.info(f"删除不存在的表: {table_name}")
            
            # 删除表关联的所有列
            db.query(ColumnMetadata).filter(ColumnMetadata.table_id == table.id).delete()
            
            # 删除表
            db.delete(table)
        
        # 提交事务
        db.commit()
        
        return stats
    
    @staticmethod
    def _update_table_columns(db: Session, table_id: int, columns_info: List[Dict[str, Any]], 
                             primary_keys: List[str]) -> Dict[str, int]:
        """
        更新表的列信息
        
        Args:
            db: 数据库会话
            table_id: 表ID
            columns_info: 列信息列表
            primary_keys: 主键列名列表
            
        Returns:
            列操作统计
        """
        # 初始化统计信息
        stats = {
            "imported": 0,
            "updated": 0,
            "deleted": 0
        }
        
        # 转换主键列表为集合，便于快速查找
        primary_keys_set = set(primary_keys)
        
        # 获取表的所有现有列
        existing_columns = {column.name: column for column in 
                           db.query(ColumnMetadata).filter(ColumnMetadata.table_id == table_id).all()}
        
        # 处理每一列
        for column_info in columns_info:
            column_name = column_info["name"]
            
            try:
                # 检查列是否已存在
                if column_name in existing_columns:
                    # 更新现有列
                    existing_column = existing_columns[column_name]
                    stats["updated"] += 1
                    
                    # 更新列信息
                    existing_column.type = column_info["type"]
                    existing_column.length = column_info.get("length")
                    existing_column.precision = column_info.get("precision")
                    existing_column.scale = column_info.get("scale")
                    existing_column.nullable = column_info.get("nullable", True)
                    existing_column.position = column_info.get("position")
                    existing_column.description = column_info.get("description", "")
                    existing_column.is_primary_key = column_name in primary_keys_set
                    
                    # 从现有列字典中移除，剩下的就是需要删除的列
                    del existing_columns[column_name]
                else:
                    # 创建新列
                    stats["imported"] += 1
                    
                    # 准备列创建数据
                    column_create = ColumnMetadataCreate(
                        name=column_name,
                        table_id=table_id,
                        type=column_info["type"],
                        length=column_info.get("length"),
                        precision=column_info.get("precision"),
                        scale=column_info.get("scale"),
                        nullable=column_info.get("nullable", True),
                        position=column_info.get("position"),
                        description=column_info.get("description", ""),
                        is_primary_key=column_name in primary_keys_set
                    )
                    
                    # 创建列
                    new_column = ColumnMetadata(**column_create.model_dump())
                    db.add(new_column)
            except Exception as e:
                logger.error(f"处理列 {column_name} 时出错: {e}")
                continue
        
        # 删除不再存在的列
        for column_name, column in existing_columns.items():
            logger.info(f"删除不存在的列: {column_name}")
            db.delete(column)
            stats["deleted"] += 1
        
        return stats
    
    @staticmethod
    def validate_connection(data_source_type: str, connection_params: Dict[str, Any]) -> Dict[str, Any]:
        """
        验证数据源连接是否有效
        
        Args:
            data_source_type: 数据源类型
            connection_params: 连接参数
            
        Returns:
            连接验证结果
        """
        try:
            # 尝试提取一小部分元数据来验证连接
            logger.info(f"验证 {data_source_type} 数据源连接...")
            
            # 提取元数据（这会验证连接）
            metadata = MetadataExtractor.extract_metadata(data_source_type, connection_params)
            
            # 返回验证结果
            return {
                "valid": True,
                "message": "连接成功",
                "tables_count": len(metadata.get("tables", []))
            }
        except Exception as e:
            logger.error(f"连接验证失败: {e}")
            return {
                "valid": False,
                "message": str(e),
                "tables_count": 0
            }