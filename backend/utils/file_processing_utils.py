import pandas as pd
import json
from typing import Dict, Any, List, Optional
from datetime import datetime


def validate_excel_sheet_structure(df: pd.DataFrame, required_columns: List[str], sheet_name: str) -> tuple[bool, str]:
    """
    验证Excel表格结构是否符合要求
    
    Args:
        df: 要验证的DataFrame
        required_columns: 必需的列名列表
        sheet_name: 表格名称，用于错误提示
    
    Returns:
        (is_valid, error_message): 验证结果和错误信息
    """
    missing_columns = [col for col in required_columns if col not in df.columns]
    
    if missing_columns:
        return False, f"表格 '{sheet_name}' 缺少必需的列: {', '.join(missing_columns)}"
    
    return True, ""


def convert_json_to_excel_template(data_structure: Dict[str, Any], output_path: str) -> None:
    """
    将JSON数据结构转换为Excel模板文件
    
    Args:
        data_structure: JSON数据结构
        output_path: 输出Excel文件路径
    """
    with pd.ExcelWriter(output_path, engine='xlsxwriter') as writer:
        for sheet_name, data in data_structure.items():
            if data:
                df = pd.DataFrame(data)
                df.to_excel(writer, sheet_name=sheet_name, index=False)


def generate_example_excel_structure() -> Dict[str, List[Dict[str, Any]]]:
    """
    生成示例Excel文件结构，包含所有必需的字段
    
    Returns:
        示例数据结构，可用于生成Excel模板
    """
    return {
        "data_sources": [
            {
                "name": "示例数据源1",
                "description": "Oracle数据库示例",
                "source_type": "ORACLE",
                "connection_string": "",
                "schema_name": "SCOTT",
                "is_active": True
            },
            {
                "name": "示例数据源2",
                "description": "Elasticsearch示例",
                "source_type": "ELASTICSEARCH",
                "connection_string": "",
                "schema_name": "logstash",
                "is_active": True
            }
        ],
        "tables": [
            {
                "data_source_name": "示例数据源1",
                "name": "EMP",
                "description": "员工表",
                "table_type": "TABLE",
                "row_count": 14,
                "created_at": "2023-01-01",
                "updated_at": "2023-01-01"
            },
            {
                "data_source_name": "示例数据源2",
                "name": "employee_logs",
                "description": "员工操作日志",
                "table_type": "INDEX",
                "row_count": 10000,
                "created_at": "2023-01-01",
                "updated_at": "2023-01-01"
            }
        ],
        "columns": [
            {
                "data_source_name": "示例数据源1",
                "table_name": "EMP",
                "name": "EMPNO",
                "data_type": "NUMBER",
                "description": "员工编号",
                "is_primary_key": True,
                "is_nullable": False,
                "column_order": 1,
                "length": 4
            },
            {
                "data_source_name": "示例数据源1",
                "table_name": "EMP",
                "name": "ENAME",
                "data_type": "VARCHAR2",
                "description": "员工姓名",
                "is_primary_key": False,
                "is_nullable": False,
                "column_order": 2,
                "length": 10
            }
        ],
        "lineages": [
            {
                "source_db_name": "示例数据源1",
                "source_table_name": "EMP",
                "source_column_name": "ENAME",
                "target_db_name": "示例数据源2",
                "target_table_name": "employee_logs",
                "target_column_name": "employee_name",
                "description": "员工姓名同步",
                "lineage_type": "TRANSFORMATION",
                "transformation_logic": "ENAME -> employee_name"
            }
        ]
    }


def normalize_data_types(data: Any) -> Any:
    """
    标准化数据类型，处理不同数据源间的数据类型差异
    
    Args:
        data: 需要标准化的数据
    
    Returns:
        标准化后的数据
    """
    if isinstance(data, pd.Series):
        return data.map(normalize_data_types)
    
    if isinstance(data, dict):
        return {key: normalize_data_types(value) for key, value in data.items()}
    
    if isinstance(data, list):
        return [normalize_data_types(item) for item in data]
    
    # 处理日期时间类型
    if isinstance(data, pd.Timestamp):
        return data.to_pydatetime()
    
    # 处理numpy类型
    if hasattr(data, 'dtype'):
        if str(data.dtype).startswith('datetime64'):
            return pd.to_datetime(data).to_pydatetime()
        elif str(data.dtype).startswith('int'):
            return int(data)
        elif str(data.dtype).startswith('float'):
            return float(data)
        elif str(data.dtype).startswith('bool'):
            return bool(data)
    
    # 处理空值
    if pd.isna(data):
        return None
    
    return data


def validate_json_structure(data: Dict[str, Any]) -> tuple[bool, str]:
    """
    验证JSON数据结构是否符合要求
    
    Args:
        data: JSON数据
    
    Returns:
        (is_valid, error_message): 验证结果和错误信息
    """
    required_sections = ["data_sources", "tables", "columns", "lineages"]
    
    # 检查必需的部分是否存在
    for section in required_sections:
        if section not in data:
            return False, f"缺少必需的部分: {section}"
    
    # 检查数据类型
    for section in required_sections:
        if not isinstance(data[section], list):
            return False, f"部分 '{section}' 必须是数组格式"
    
    return True, ""


def sanitize_input_string(s: Any) -> str:
    """
    清理输入字符串，处理None值和转义特殊字符
    
    Args:
        s: 输入值
    
    Returns:
        清理后的字符串
    """
    if s is None:
        return ""
    elif isinstance(s, str):
        # 移除多余的空白字符和特殊字符
        return ' '.join(s.strip().split())
    else:
        return str(s)


def extract_relationships(data: Dict[str, Any]) -> Dict[str, List[Dict[str, Any]]]:
    """
    从完整数据中提取关系信息，用于血缘分析
    
    Args:
        data: 完整的元数据
    
    Returns:
        关系信息
    """
    relationships = {
        "table_relationships": [],
        "column_relationships": []
    }
    
    # 提取表关系
    for lineage in data.get("lineages", []):
        if "source_table_name" in lineage and "target_table_name" in lineage:
            table_relationship = {
                "source_db": lineage.get("source_db_name"),
                "source_table": lineage["source_table_name"],
                "target_db": lineage.get("target_db_name"),
                "target_table": lineage["target_table_name"],
                "description": lineage.get("description", ""),
                "lineage_type": lineage.get("lineage_type", "TRANSFORMATION")
            }
            relationships["table_relationships"].append(table_relationship)
        
        # 提取列关系
        if ("source_column_name" in lineage and "target_column_name" in lineage and
            "source_table_name" in lineage and "target_table_name" in lineage):
            column_relationship = {
                "source_db": lineage.get("source_db_name"),
                "source_table": lineage["source_table_name"],
                "source_column": lineage["source_column_name"],
                "target_db": lineage.get("target_db_name"),
                "target_table": lineage["target_table_name"],
                "target_column": lineage["target_column_name"],
                "transformation_logic": lineage.get("transformation_logic", "")
            }
            relationships["column_relationships"].append(column_relationship)
    
    return relationships
