from typing import List, Dict, Any, Optional
import cx_Oracle
from elasticsearch import Elasticsearch
from pymongo import MongoClient
import logging
from core.connection_factory import ConnectionFactory

logger = logging.getLogger(__name__)

class MetadataExtractor:
    """元数据提取器类，负责从不同类型的数据源提取元数据信息"""
    
    @staticmethod
    def extract_metadata(data_source_type: str, connection_params: Dict[str, Any]) -> Dict[str, Any]:
        """
        根据数据源类型提取元数据
        
        Args:
            data_source_type: 数据源类型
            connection_params: 连接参数
            
        Returns:
            包含元数据信息的字典
        """
        try:
            # 获取连接
            connection = ConnectionFactory.get_connection(data_source_type, connection_params)
            
            # 根据数据源类型调用不同的提取方法
            if data_source_type.upper() == "ORACLE":
                return MetadataExtractor._extract_oracle_metadata(connection)
            elif data_source_type.upper() == "ELASTICSEARCH":
                return MetadataExtractor._extract_elasticsearch_metadata(connection)
            elif data_source_type.upper() == "MONGODB":
                return MetadataExtractor._extract_mongodb_metadata(connection)
            else:
                raise ValueError(f"不支持的数据源类型: {data_source_type}")
        except Exception as e:
            logger.error(f"提取元数据失败: {e}")
            raise
    
    @staticmethod
    def _extract_oracle_metadata(connection: cx_Oracle.Connection) -> Dict[str, Any]:
        """
        提取Oracle数据库的元数据
        
        Returns:
            包含表和列信息的字典
        """
        metadata = {
            "tables": []
        }
        
        try:
            cursor = connection.cursor()
            
            # 获取用户可访问的表
            query = """
            SELECT owner, table_name, tablespace_name, num_rows, last_analyzed
            FROM all_tables
            WHERE owner NOT IN ('SYS', 'SYSTEM', 'CTXSYS', 'DBSNMP', 'EXFSYS', 
                               'MDSYS', 'MGMT_VIEW', 'OLAPSYS', 'OWBSYS', 
                               'ORDPLUGINS', 'ORDSYS', 'OUTLN', 'SI_INFORMTN_SCHEMA', 
                               'WMSYS', 'XDB', 'APEX_040200', 'APEX_PUBLIC_USER', 
                               'DIP', 'FLOWS_FILES', 'ORACLE_OCM', 'XS$NULL')
            ORDER BY owner, table_name
            """
            cursor.execute(query)
            tables = cursor.fetchall()
            
            for owner, table_name, tablespace_name, num_rows, last_analyzed in tables:
                # 构建表信息
                table_info = {
                    "schema": owner,
                    "name": table_name,
                    "tablespace": tablespace_name,
                    "row_count": num_rows,
                    "last_analyzed": last_analyzed,
                    "columns": [],
                    "primary_keys": []
                }
                
                # 获取表的列信息
                column_query = """
                SELECT column_name, data_type, data_length, data_precision, 
                       data_scale, nullable, column_id, comments
                FROM all_col_comments cc
                JOIN all_tab_columns tc ON cc.owner = tc.owner AND cc.table_name = tc.table_name AND cc.column_name = tc.column_name
                WHERE cc.owner = :owner AND cc.table_name = :table_name
                ORDER BY tc.column_id
                """
                cursor.execute(column_query, owner=owner, table_name=table_name)
                columns = cursor.fetchall()
                
                for col_name, data_type, data_length, data_precision, 
                    data_scale, nullable, column_id, comments in columns:
                    # 构建列信息
                    column_info = {
                        "name": col_name,
                        "type": data_type,
                        "length": data_length,
                        "precision": data_precision,
                        "scale": data_scale,
                        "nullable": nullable == 'Y',
                        "position": column_id,
                        "description": comments
                    }
                    table_info["columns"].append(column_info)
                
                # 获取表的主键信息
                pk_query = """
                SELECT cols.column_name
                FROM all_constraints cons,
                     all_cons_columns cols
                WHERE cons.owner = :owner
                  AND cons.constraint_type = 'P'
                  AND cons.constraint_name = cols.constraint_name
                  AND cons.owner = cols.owner
                  AND cons.table_name = :table_name
                ORDER BY cols.position
                """
                cursor.execute(pk_query, owner=owner, table_name=table_name)
                primary_keys = cursor.fetchall()
                
                for pk in primary_keys:
                    table_info["primary_keys"].append(pk[0])
                
                # 添加表信息到结果
                metadata["tables"].append(table_info)
            
            cursor.close()
            return metadata
        except Exception as e:
            logger.error(f"提取Oracle元数据失败: {e}")
            raise
    
    @staticmethod
    def _extract_elasticsearch_metadata(connection: Elasticsearch) -> Dict[str, Any]:
        """
        提取Elasticsearch的元数据
        
        Returns:
            包含索引和字段信息的字典
        """
        metadata = {
            "tables": []
        }
        
        try:
            # 获取所有索引
            indices = connection.indices.get_alias("*")
            
            for index_name in indices:
                # 跳过系统索引
                if index_name.startswith("."):
                    continue
                
                # 获取索引的映射信息
                mapping = connection.indices.get_mapping(index=index_name)
                index_mapping = mapping[index_name]["mappings"]
                
                # 构建表信息
                table_info = {
                    "schema": "elasticsearch",
                    "name": index_name,
                    "columns": [],
                    "primary_keys": ["_id"]  # Elasticsearch默认使用_id作为唯一标识符
                }
                
                # 分析映射，提取字段信息
                def parse_properties(properties: Dict[str, Any], prefix: str = ""):
                    fields = []
                    for field_name, field_props in properties.items():
                        full_field_name = f"{prefix}.{field_name}" if prefix else field_name
                        
                        # 如果有properties字段，说明是对象类型，递归解析
                        if "properties" in field_props:
                            fields.extend(parse_properties(field_props["properties"], full_field_name))
                        else:
                            # 基本字段
                            field_info = {
                                "name": full_field_name,
                                "type": field_props.get("type", "object"),
                                "description": field_props.get("description", ""),
                                "nullable": True  # Elasticsearch字段都可以为null
                            }
                            
                            # 添加字段的其他属性
                            if "format" in field_props:
                                field_info["format"] = field_props["format"]
                            if "analyzer" in field_props:
                                field_info["analyzer"] = field_props["analyzer"]
                            
                            fields.append(field_info)
                    return fields
                
                # 提取字段信息
                if "properties" in index_mapping:
                    table_info["columns"] = parse_properties(index_mapping["properties"])
                
                # 获取索引统计信息
                stats = connection.indices.stats(index=index_name)
                if "primaries" in stats[index_name]:
                    doc_count = stats[index_name]["primaries"].get("docs", {}).get("count", 0)
                    table_info["row_count"] = doc_count
                
                # 添加表信息到结果
                metadata["tables"].append(table_info)
            
            return metadata
        except Exception as e:
            logger.error(f"提取Elasticsearch元数据失败: {e}")
            raise
    
    @staticmethod
    def _extract_mongodb_metadata(connection: MongoClient) -> Dict[str, Any]:
        """
        提取MongoDB的元数据
        
        Returns:
            包含集合和字段信息的字典
        """
        metadata = {
            "tables": []
        }
        
        try:
            # 获取所有数据库
            db_names = connection.list_database_names()
            
            for db_name in db_names:
                # 跳过系统数据库
                if db_name in ['admin', 'config', 'local']:
                    continue
                
                db = connection[db_name]
                # 获取数据库中的所有集合
                collection_names = db.list_collection_names()
                
                for collection_name in collection_names:
                    # 跳过系统集合
                    if collection_name.startswith('system.'):
                        continue
                    
                    collection = db[collection_name]
                    
                    # 构建表信息
                    table_info = {
                        "schema": db_name,
                        "name": collection_name,
                        "columns": [],
                        "primary_keys": ["_id"]  # MongoDB默认使用_id作为唯一标识符
                    }
                    
                    # 获取集合的文档数量
                    table_info["row_count"] = collection.count_documents({})
                    
                    # 尝试提取字段信息（通过分析少量文档）
                    sample_docs = collection.find().limit(10)  # 分析前10个文档
                    field_types = {}
                    
                    for doc in sample_docs:
                        # 递归分析文档结构
                        def analyze_doc_structure(doc: Dict[str, Any], prefix: str = ""):
                            for key, value in doc.items():
                                full_key = f"{prefix}.{key}" if prefix else key
                                
                                if isinstance(value, dict):
                                    # 嵌套文档，递归分析
                                    analyze_doc_structure(value, full_key)
                                elif isinstance(value, list) and value and isinstance(value[0], dict):
                                    # 数组中的对象，只分析第一个元素的结构
                                    field_types[full_key] = "array<object>"
                                    # 递归分析数组元素
                                    analyze_doc_structure(value[0], f"{full_key}[*]")
                                else:
                                    # 基本类型字段
                                    field_type = type(value).__name__ if value is not None else "null"
                                    if full_key not in field_types:
                                        field_types[full_key] = field_type
                                    elif field_types[full_key] != field_type:
                                        # 如果字段类型不一致，标记为混合类型
                                        field_types[full_key] = "mixed"
                        
                        analyze_doc_structure(doc)
                    
                    # 构建列信息
                    for field_name, field_type in sorted(field_types.items()):
                        # 转换Python类型为更通用的类型名称
                        if field_type == "str":
                            db_type = "string"
                        elif field_type == "int" or field_type == "float":
                            db_type = "number"
                        elif field_type == "bool":
                            db_type = "boolean"
                        elif field_type == "datetime.datetime":
                            db_type = "date"
                        elif field_type.startswith("array"):
                            db_type = field_type
                        else:
                            db_type = "object"
                        
                        column_info = {
                            "name": field_name,
                            "type": db_type,
                            "nullable": True,  # MongoDB字段都可以为null
                            "description": f"字段类型: {field_type}"
                        }
                        table_info["columns"].append(column_info)
                    
                    # 添加表信息到结果
                    metadata["tables"].append(table_info)
            
            return metadata
        except Exception as e:
            logger.error(f"提取MongoDB元数据失败: {e}")
            raise