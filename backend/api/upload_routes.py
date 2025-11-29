from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from typing import List, Dict, Any
import pandas as pd
import json
import io

from models.schemas import (
    DataSourceBase, DataSourceCreate, DataSourceUpdate, DataSourceResponse,
    TableMetadataBase, TableMetadataCreate, TableMetadataUpdate, TableMetadataResponse,
    ColumnMetadataBase, ColumnMetadataCreate, ColumnMetadataUpdate, ColumnMetadataResponse,
    LineageRelationCreate, LineageRelationUpdate,
    ColumnLineageRelationCreate, ColumnLineageRelationUpdate
)
from services.data_source_service import DataSourceService
from services.table_metadata_service import TableMetadataService
from services.column_metadata_service import ColumnMetadataService
from services.lineage_service import LineageService
from models import get_db
from sqlalchemy.orm import Session

router = APIRouter(prefix="/upload", tags=["file-upload"])

# 实例化服务类
data_source_service = DataSourceService()
table_metadata_service = TableMetadataService()
column_metadata_service = ColumnMetadataService()
lineage_service = LineageService()

@router.post("/excel", response_model=Dict[str, Any])
async def upload_excel_file(file: UploadFile = File(...), db: Session = Depends(get_db)):
    """
    上传Excel文件，解析表结构和血缘关系数据
    
    Excel文件格式要求：
    - 第一个Sheet: 数据源信息 (data_sources)
    - 第二个Sheet: 表元数据信息 (tables)
    - 第三个Sheet: 列元数据信息 (columns)
    - 第四个Sheet: 血缘关系信息 (lineages)
    """
    if not file.filename.endswith(('.xlsx', '.xls')):
        raise HTTPException(status_code=400, detail="只支持Excel文件格式(.xlsx, .xls)")
    
    try:
        # 读取上传的Excel文件
        contents = await file.read()
        excel_data = pd.ExcelFile(io.BytesIO(contents))
        
        # 处理结果统计
        result = {
            "data_sources": {"created": 0, "updated": 0},
            "tables": {"created": 0, "updated": 0},
            "columns": {"created": 0, "updated": 0},
            "lineages": {"created": 0, "updated": 0}
        }
        
        # 处理数据源信息
        if "data_sources" in excel_data.sheet_names:
            data_sources_df = pd.read_excel(excel_data, "data_sources")
            for _, row in data_sources_df.iterrows():
                source_data = {
                    "name": row.get("name"),
                    "description": row.get("description", ""),
                    "source_type": row.get("source_type"),
                    "connection_string": row.get("connection_string", ""),
                    "schema_name": row.get("schema_name", ""),
                    "is_active": row.get("is_active", True)
                }
                
                # 检查数据源是否已存在
                existing_source = data_source_service.get_by_name(db, source_data["name"])
                if existing_source:
                    # 更新现有数据源 - 确保使用正确的Pydantic模型
                    try:
                        from models.schemas import DataSourceUpdate
                        data_source_update = DataSourceUpdate(**source_data)
                        data_source_service.update(db, existing_source.id, data_source_update)
                        result["data_sources"]["updated"] += 1
                    except Exception as e:
                        raise HTTPException(status_code=400, detail=f"更新数据源时出错: {str(e)}")
                else:
                    # 创建新数据源
                    try:
                        # 确保传入的是正确的Pydantic模型对象
                        data_source_create = DataSourceCreate(**source_data)
                        data_source_service.create(db, data_source_create)
                        result["data_sources"]["created"] += 1
                    except Exception as e:
                        raise HTTPException(status_code=400, detail=f"创建数据源时出错: {str(e)}")
        
        # 处理表元数据信息
        if "tables" in excel_data.sheet_names:
            tables_df = pd.read_excel(excel_data, "tables")
            for _, row in tables_df.iterrows():
                # 获取数据源
                source = data_source_service.get_by_name(db, row.get("data_source_name"))
                if not source:
                    continue
                
                table_data = {
                    "data_source_id": source.id,
                    "name": row.get("name"),
                    "description": row.get("description", ""),
                    "table_type": row.get("table_type", "TABLE"),
                    "row_count": row.get("row_count", 0),
                    "created_at": row.get("created_at"),
                    "updated_at": row.get("updated_at")
                }
                
                # 检查表是否已存在
                existing_table = table_metadata_service.get_by_name_and_source(
                    db, table_data["name"], source.id
                )
                if existing_table:
                    # 更新现有表
                    table_metadata_service.update(db, existing_table.id, table_data)
                    result["tables"]["updated"] += 1
                else:
                    # 创建新表
                    table_metadata_service.create(db, TableMetadataCreate(**table_data))
                    result["tables"]["created"] += 1
        
        # 处理列元数据信息
        if "columns" in excel_data.sheet_names:
            columns_df = pd.read_excel(excel_data, "columns")
            for _, row in columns_df.iterrows():
                # 获取数据源和表
                source = data_source_service.get_by_name(db, row.get("data_source_name"))
                if not source:
                    continue
                
                table = table_metadata_service.get_by_name_and_source(
                    db, row.get("table_name"), source.id
                )
                if not table:
                    continue
                
                column_data = {
                    "table_id": table.id,
                    "name": row.get("name"),
                    "data_type": row.get("data_type"),
                    "description": row.get("description", ""),
                    "is_primary_key": row.get("is_primary_key", False),
                    "is_nullable": row.get("is_nullable", True),
                    "column_order": row.get("column_order", 0),
                    "length": row.get("length")
                }
                
                # 检查列是否已存在
                existing_column = column_metadata_service.get_by_name_and_table(
                    db, column_data["name"], table.id
                )
                if existing_column:
                    # 更新现有列
                    column_metadata_service.update(db, existing_column.id, column_data)
                    result["columns"]["updated"] += 1
                else:
                    # 创建新列
                    column_metadata_service.create(db, ColumnMetadataCreate(**column_data))
                    result["columns"]["created"] += 1
        
        # 处理血缘关系信息
        if "lineages" in excel_data.sheet_names:
            lineages_df = pd.read_excel(excel_data, "lineages")
            for _, row in lineages_df.iterrows():
                # 获取源表和目标表
                source_db = data_source_service.get_by_name(db, row.get("source_db_name"))
                target_db = data_source_service.get_by_name(db, row.get("target_db_name"))
                if not source_db or not target_db:
                    continue
                
                source_table = table_metadata_service.get_by_name_and_source(
                    db, row.get("source_table_name"), source_db.id
                )
                target_table = table_metadata_service.get_by_name_and_source(
                    db, row.get("target_table_name"), target_db.id
                )
                if not source_table or not target_table:
                    continue
                
                # 构建血缘关系数据
                lineage_data = {
                    "source_table_id": source_table.id,
                    "target_table_id": target_table.id,
                    "description": row.get("description", ""),
                    "lineage_type": row.get("lineage_type", "TRANSFORMATION"),
                    "transformation_logic": row.get("transformation_logic", "")
                }
                
                # 如果有列级血缘关系，获取源列和目标列
                if pd.notna(row.get("source_column_name")) and pd.notna(row.get("target_column_name")):
                    source_column = column_metadata_service.get_by_name_and_table(
                        db, row.get("source_column_name"), source_table.id
                    )
                    target_column = column_metadata_service.get_by_name_and_table(
                        db, row.get("target_column_name"), target_table.id
                    )
                    
                    if source_column and target_column:
                        lineage_data["source_column_id"] = source_column.id
                        lineage_data["target_column_id"] = target_column.id
                
                # 对于表级血缘关系，使用LineageRelationCreate
                lineage_create = LineageRelationCreate(
                    source_table_id=lineage_data["source_table_id"],
                    target_table_id=lineage_data["target_table_id"],
                    relation_type=lineage_data.get("lineage_type", "TRANSFORMATION"),
                    description=lineage_data.get("description", ""),
                    relation_details={"transformation_logic": lineage_data.get("transformation_logic", "")}
                )
                
                # 检查表级血缘关系是否已存在
                existing_lineage = lineage_service.get_table_lineages_by_source(db, source_table.id)
                existing_lineage = next((l for l in existing_lineage if l.target_table_id == target_table.id), None)
                
                if existing_lineage:
                    # 更新现有表级血缘关系
                    lineage_update = LineageRelationUpdate(
                        relation_type=lineage_data.get("lineage_type", "TRANSFORMATION"),
                        description=lineage_data.get("description", ""),
                        relation_details={"transformation_logic": lineage_data.get("transformation_logic", "")}
                    )
                    lineage_service.update_table_lineage(db, existing_lineage.id, lineage_update)
                    result["lineages"]["updated"] += 1
                else:
                    # 创建新表级血缘关系
                    created_lineage = lineage_service.create_table_lineage(db, lineage_create)
                    result["lineages"]["created"] += 1
                    
                    # 如果有列级血缘关系，创建列级血缘关系
                    if lineage_data.get("source_column_id") and lineage_data.get("target_column_id"):
                        column_lineage_create = ColumnLineageRelationCreate(
                            lineage_relation_id=created_lineage.id,
                            source_column_id=lineage_data["source_column_id"],
                            target_column_id=lineage_data["target_column_id"]
                        )
                        lineage_service.create_column_lineage(db, column_lineage_create)
        
        return {
            "status": "success",
            "message": "Excel文件上传并解析成功",
            "result": result
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"处理Excel文件时出错: {str(e)}")

@router.post("/table-structure/excel", response_model=Dict[str, Any])
async def upload_table_structure_excel(file: UploadFile = File(...), db: Session = Depends(get_db)):
    """
    上传Excel文件，解析表结构和字段信息
    
    Excel文件格式要求：
    - 第一个Sheet: 数据源信息 (data_sources)
    - 第二个Sheet: 表元数据信息 (tables)
    - 第三个Sheet: 列元数据信息 (columns)
    """
    if not file.filename.endswith(('.xlsx', '.xls')):
        raise HTTPException(status_code=400, detail="只支持Excel文件格式(.xlsx, .xls)")
    
    try:
        # 读取上传的Excel文件
        contents = await file.read()
        excel_data = pd.ExcelFile(io.BytesIO(contents))
        
        # 处理结果统计
        result = {
            "data_sources": {"created": 0, "updated": 0},
            "tables": {"created": 0, "updated": 0},
            "columns": {"created": 0, "updated": 0}
        }
        
        # 处理数据源信息
        if "data_sources" in excel_data.sheet_names:
            data_sources_df = pd.read_excel(excel_data, "data_sources")
            for _, row in data_sources_df.iterrows():
                source_data = {
                    "name": row.get("name"),
                    "description": row.get("description", ""),
                    "type": row.get("type"),
                    "connection_config": row.get("connection_config", {})
                }
                
                # 检查数据源是否已存在
                existing_source = data_source_service.get_by_name(db, source_data["name"])
                if existing_source:
                    # 更新现有数据源
                    data_source_update = DataSourceUpdate(**source_data)
                    data_source_service.update(db, existing_source.id, data_source_update)
                    result["data_sources"]["updated"] += 1
                else:
                    # 创建新数据源
                    data_source_create = DataSourceCreate(**source_data)
                    data_source_service.create(db, data_source_create)
                    result["data_sources"]["created"] += 1
        
        # 处理表元数据信息
        if "tables" in excel_data.sheet_names:
            tables_df = pd.read_excel(excel_data, "tables")
            for _, row in tables_df.iterrows():
                # 获取数据源
                source = data_source_service.get_by_name(db, row.get("data_source_name"))
                if not source:
                    continue
                
                table_data = {
                    "data_source_id": source.id,
                    "name": row.get("name"),
                    "schema_name": row.get("schema_name"),
                    "description": row.get("description", ""),
                    "properties": row.get("properties", {})
                }
                
                # 检查表是否已存在
                existing_table = table_metadata_service.get_by_name_and_source(
                    db, table_data["name"], source.id
                )
                if existing_table:
                    # 更新现有表
                    table_metadata_service.update(db, existing_table.id, table_data)
                    result["tables"]["updated"] += 1
                else:
                    # 创建新表
                    table_metadata_service.create(db, TableMetadataCreate(**table_data))
                    result["tables"]["created"] += 1
        
        # 处理列元数据信息
        if "columns" in excel_data.sheet_names:
            columns_df = pd.read_excel(excel_data, "columns")
            for _, row in columns_df.iterrows():
                # 获取数据源和表
                source = data_source_service.get_by_name(db, row.get("data_source_name"))
                if not source:
                    continue
                
                table = table_metadata_service.get_by_name_and_source(
                    db, row.get("table_name"), source.id
                )
                if not table:
                    continue
                
                column_data = {
                    "table_id": table.id,
                    "name": row.get("name"),
                    "data_type": row.get("data_type"),
                    "description": row.get("description", ""),
                    "is_primary_key": row.get("is_primary_key", False),
                    "properties": row.get("properties", {})
                }
                
                # 检查列是否已存在
                existing_column = column_metadata_service.get_by_name_and_table(
                    db, column_data["name"], table.id
                )
                if existing_column:
                    # 更新现有列
                    column_metadata_service.update(db, existing_column.id, column_data)
                    result["columns"]["updated"] += 1
                else:
                    # 创建新列
                    column_metadata_service.create(db, ColumnMetadataCreate(**column_data))
                    result["columns"]["created"] += 1
        
        return {
            "status": "success",
            "message": "表结构Excel文件上传并解析成功",
            "result": result
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"处理表结构Excel文件时出错: {str(e)}")

@router.post("/table-structure/json", response_model=Dict[str, Any])
async def upload_table_structure_json(file: UploadFile = File(...), db: Session = Depends(get_db)):
    """
    上传JSON文件，解析表结构和字段信息
    
    JSON文件格式要求:
    {
        "data_sources": [...],
        "tables": [...],
        "columns": [...]
    }
    """
    if not file.filename.endswith('.json'):
        raise HTTPException(status_code=400, detail="只支持JSON文件格式(.json)")
    
    try:
        # 读取上传的JSON文件
        contents = await file.read()
        data = json.loads(contents)
        
        # 处理结果统计
        result = {
            "data_sources": {"created": 0, "updated": 0},
            "tables": {"created": 0, "updated": 0},
            "columns": {"created": 0, "updated": 0}
        }
        
        # 处理数据源信息
        if "data_sources" in data:
            for source_data in data["data_sources"]:
                # 检查数据源是否已存在
                existing_source = data_source_service.get_by_name(db, source_data["name"])
                if existing_source:
                    # 更新现有数据源
                    data_source_update = DataSourceUpdate(**source_data)
                    data_source_service.update(db, existing_source.id, data_source_update)
                    result["data_sources"]["updated"] += 1
                else:
                    # 创建新数据源
                    data_source_create = DataSourceCreate(**source_data)
                    data_source_service.create(db, data_source_create)
                    result["data_sources"]["created"] += 1
        
        # 处理表元数据信息
        if "tables" in data:
            for table_data in data["tables"]:
                # 检查数据源是否存在
                source_id = table_data.get("data_source_id")
                source_name = table_data.get("data_source_name")
                
                if not source_id and source_name:
                    source = data_source_service.get_by_name(db, source_name)
                    if source:
                        table_data["data_source_id"] = source.id
                    else:
                        continue
                
                # 检查表是否已存在
                existing_table = table_metadata_service.get_by_id(db, table_data.get("id"))
                if existing_table:
                    # 更新现有表
                    table_update = TableMetadataUpdate(**table_data)
                    table_metadata_service.update(db, existing_table.id, table_update)
                    result["tables"]["updated"] += 1
                else:
                    # 创建新表
                    table_metadata_service.create(db, TableMetadataCreate(**table_data))
                    result["tables"]["created"] += 1
        
        # 处理列元数据信息
        if "columns" in data:
            for column_data in data["columns"]:
                # 检查表是否存在
                table_id = column_data.get("table_id")
                table_name = column_data.get("table_name")
                source_name = column_data.get("data_source_name")
                
                if not table_id and table_name and source_name:
                    source = data_source_service.get_by_name(db, source_name)
                    if source:
                        table = table_metadata_service.get_by_name_and_source(db, table_name, source.id)
                        if table:
                            column_data["table_id"] = table.id
                        else:
                            continue
                    else:
                        continue
                
                # 检查列是否已存在
                existing_column = column_metadata_service.get_by_id(db, column_data.get("id"))
                if existing_column:
                    # 更新现有列
                    column_update = ColumnMetadataUpdate(**column_data)
                    column_metadata_service.update(db, existing_column.id, column_update)
                    result["columns"]["updated"] += 1
                else:
                    # 创建新列
                    column_metadata_service.create(db, ColumnMetadataCreate(**column_data))
                    result["columns"]["created"] += 1
        
        return {
            "status": "success",
            "message": "表结构JSON文件上传并解析成功",
            "result": result
        }
        
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="JSON文件格式错误，无法解析")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"处理表结构JSON文件时出错: {str(e)}")

@router.post("/table-lineage/excel", response_model=Dict[str, Any])
async def upload_table_lineage_excel(file: UploadFile = File(...), db: Session = Depends(get_db)):
    """
    上传Excel文件，解析表血缘关系信息
    
    Excel文件格式要求：
    - Sheet名称: lineages
    - 必要字段: source_db_name, source_table_name, target_db_name, target_table_name
    """
    if not file.filename.endswith(('.xlsx', '.xls')):
        raise HTTPException(status_code=400, detail="只支持Excel文件格式(.xlsx, .xls)")
    
    try:
        # 读取上传的Excel文件
        contents = await file.read()
        excel_data = pd.ExcelFile(io.BytesIO(contents))
        
        # 处理结果统计
        result = {
            "lineages": {"created": 0, "updated": 0},
            "validation_errors": []
        }
        
        # 处理血缘关系信息
        if "lineages" in excel_data.sheet_names:
            lineages_df = pd.read_excel(excel_data, "lineages")
            for _, row in lineages_df.iterrows():
                try:
                    # 获取源表和目标表
                    source_db = data_source_service.get_by_name(db, row.get("source_db_name"))
                    target_db = data_source_service.get_by_name(db, row.get("target_db_name"))
                    
                    if not source_db:
                        result["validation_errors"].append(f"源数据库不存在: {row.get('source_db_name')}")
                        continue
                    if not target_db:
                        result["validation_errors"].append(f"目标数据库不存在: {row.get('target_db_name')}")
                        continue
                    
                    source_table = table_metadata_service.get_by_name_and_source(
                        db, row.get("source_table_name"), source_db.id
                    )
                    target_table = table_metadata_service.get_by_name_and_source(
                        db, row.get("target_table_name"), target_db.id
                    )
                    
                    if not source_table:
                        result["validation_errors"].append(
                            f"源表不存在: {row.get('source_table_name')} 于数据库 {row.get('source_db_name')}"
                        )
                        continue
                    if not target_table:
                        result["validation_errors"].append(
                            f"目标表不存在: {row.get('target_table_name')} 于数据库 {row.get('target_db_name')}"
                        )
                        continue
                    
                    # 构建血缘关系数据
                    lineage_data = {
                        "source_table_id": source_table.id,
                        "target_table_id": target_table.id,
                        "description": row.get("description", ""),
                        "relation_type": row.get("relation_type", "TRANSFORMATION"),
                        "relation_details": {"transformation_logic": row.get("transformation_logic", "")}
                    }
                    
                    # 对于表级血缘关系，使用LineageRelationCreate
                    lineage_create = LineageRelationCreate(
                        source_table_id=lineage_data["source_table_id"],
                        target_table_id=lineage_data["target_table_id"],
                        relation_type=lineage_data.get("relation_type", "TRANSFORMATION"),
                        description=lineage_data.get("description", ""),
                        relation_details=lineage_data.get("relation_details", {})
                    )
                    
                    # 检查表级血缘关系是否已存在
                    existing_lineage = lineage_service.get_table_lineages_by_source(db, source_table.id)
                    existing_lineage = next((l for l in existing_lineage if l.target_table_id == target_table.id), None)
                    
                    if existing_lineage:
                        # 更新现有表级血缘关系
                        lineage_update = LineageRelationUpdate(
                            relation_type=lineage_data.get("relation_type", "TRANSFORMATION"),
                            description=lineage_data.get("description", ""),
                            relation_details=lineage_data.get("relation_details", {})
                        )
                        lineage_service.update_table_lineage(db, existing_lineage.id, lineage_update)
                        result["lineages"]["updated"] += 1
                    else:
                        # 创建新表级血缘关系
                        lineage_service.create_table_lineage(db, lineage_create)
                        result["lineages"]["created"] += 1
                except Exception as e:
                    result["validation_errors"].append(f"处理血缘关系时出错: {str(e)}")
        
        return {
            "status": "success" if not result["validation_errors"] else "partial_success",
            "message": "表血缘关系Excel文件上传并解析" + ("成功" if not result["validation_errors"] else "，但有验证错误"),
            "result": result
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"处理表血缘关系Excel文件时出错: {str(e)}")

@router.post("/table-lineage/json", response_model=Dict[str, Any])
async def upload_table_lineage_json(file: UploadFile = File(...), db: Session = Depends(get_db)):
    """
    上传JSON文件，解析表血缘关系信息
    
    JSON文件格式要求:
    {
        "lineages": [
            {
                "source_db_name": "...",
                "source_table_name": "...",
                "target_db_name": "...",
                "target_table_name": "...",
                "relation_type": "...",
                "description": "..."
            }
        ]
    }
    """
    if not file.filename.endswith('.json'):
        raise HTTPException(status_code=400, detail="只支持JSON文件格式(.json)")
    
    try:
        # 读取上传的JSON文件
        contents = await file.read()
        data = json.loads(contents)
        
        # 处理结果统计
        result = {
            "lineages": {"created": 0, "updated": 0},
            "validation_errors": []
        }
        
        # 处理血缘关系信息
        if "lineages" in data:
            for lineage_data in data["lineages"]:
                try:
                    # 检查必要字段
                    if not lineage_data.get("source_db_name") or not lineage_data.get("source_table_name") or \
                       not lineage_data.get("target_db_name") or not lineage_data.get("target_table_name"):
                        result["validation_errors"].append("血缘关系数据缺少必要字段")
                        continue
                    
                    # 获取源表和目标表
                    source_db = data_source_service.get_by_name(db, lineage_data["source_db_name"])
                    target_db = data_source_service.get_by_name(db, lineage_data["target_db_name"])
                    
                    if not source_db:
                        result["validation_errors"].append(f"源数据库不存在: {lineage_data['source_db_name']}")
                        continue
                    if not target_db:
                        result["validation_errors"].append(f"目标数据库不存在: {lineage_data['target_db_name']}")
                        continue
                    
                    source_table = table_metadata_service.get_by_name_and_source(
                        db, lineage_data["source_table_name"], source_db.id
                    )
                    target_table = table_metadata_service.get_by_name_and_source(
                        db, lineage_data["target_table_name"], target_db.id
                    )
                    
                    if not source_table:
                        result["validation_errors"].append(
                            f"源表不存在: {lineage_data['source_table_name']} 于数据库 {lineage_data['source_db_name']}"
                        )
                        continue
                    if not target_table:
                        result["validation_errors"].append(
                            f"目标表不存在: {lineage_data['target_table_name']} 于数据库 {lineage_data['target_db_name']}"
                        )
                        continue
                    
                    # 对于表级血缘关系，使用LineageRelationCreate
                    lineage_create = LineageRelationCreate(
                        source_table_id=source_table.id,
                        target_table_id=target_table.id,
                        relation_type=lineage_data.get("relation_type", "TRANSFORMATION"),
                        description=lineage_data.get("description", ""),
                        relation_details=lineage_data.get("relation_details", {})
                    )
                    
                    # 检查表级血缘关系是否已存在
                    existing_lineage = lineage_service.get_table_lineages_by_source(db, source_table.id)
                    existing_lineage = next((l for l in existing_lineage if l.target_table_id == target_table.id), None)
                    
                    if existing_lineage:
                        # 更新现有表级血缘关系
                        lineage_update = LineageRelationUpdate(
                            relation_type=lineage_data.get("relation_type", "TRANSFORMATION"),
                            description=lineage_data.get("description", ""),
                            relation_details=lineage_data.get("relation_details", {})
                        )
                        lineage_service.update_table_lineage(db, existing_lineage.id, lineage_update)
                        result["lineages"]["updated"] += 1
                    else:
                        # 创建新表级血缘关系
                        lineage_service.create_table_lineage(db, lineage_create)
                        result["lineages"]["created"] += 1
                except Exception as e:
                    result["validation_errors"].append(f"处理血缘关系时出错: {str(e)}")
        
        return {
            "status": "success" if not result["validation_errors"] else "partial_success",
            "message": "表血缘关系JSON文件上传并解析" + ("成功" if not result["validation_errors"] else "，但有验证错误"),
            "result": result
        }
        
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="JSON文件格式错误，无法解析")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"处理表血缘关系JSON文件时出错: {str(e)}")

@router.post("/column-lineage/excel", response_model=Dict[str, Any])
async def upload_column_lineage_excel(file: UploadFile = File(...), db: Session = Depends(get_db)):
    """
    上传Excel文件，解析字段血缘关系信息
    
    Excel文件格式要求：
    - Sheet名称: column_lineages
    - 必要字段: source_db_name, source_table_name, source_column_name, target_db_name, target_table_name, target_column_name
    """
    if not file.filename.endswith(('.xlsx', '.xls')):
        raise HTTPException(status_code=400, detail="只支持Excel文件格式(.xlsx, .xls)")
    
    try:
        # 读取上传的Excel文件
        contents = await file.read()
        excel_data = pd.ExcelFile(io.BytesIO(contents))
        
        # 处理结果统计
        result = {
            "column_lineages": {"created": 0},
            "validation_errors": []
        }
        
        # 处理字段血缘关系信息
        if "column_lineages" in excel_data.sheet_names:
            lineages_df = pd.read_excel(excel_data, "column_lineages")
            for _, row in lineages_df.iterrows():
                try:
                    # 获取源数据库和目标数据库
                    source_db = data_source_service.get_by_name(db, row.get("source_db_name"))
                    target_db = data_source_service.get_by_name(db, row.get("target_db_name"))
                    
                    if not source_db:
                        result["validation_errors"].append(f"源数据库不存在: {row.get('source_db_name')}")
                        continue
                    if not target_db:
                        result["validation_errors"].append(f"目标数据库不存在: {row.get('target_db_name')}")
                        continue
                    
                    # 获取源表和目标表
                    source_table = table_metadata_service.get_by_name_and_source(
                        db, row.get("source_table_name"), source_db.id
                    )
                    target_table = table_metadata_service.get_by_name_and_source(
                        db, row.get("target_table_name"), target_db.id
                    )
                    
                    if not source_table:
                        result["validation_errors"].append(
                            f"源表不存在: {row.get('source_table_name')} 于数据库 {row.get('source_db_name')}"
                        )
                        continue
                    if not target_table:
                        result["validation_errors"].append(
                            f"目标表不存在: {row.get('target_table_name')} 于数据库 {row.get('target_db_name')}"
                        )
                        continue
                    
                    # 获取源列和目标列
                    source_column = column_metadata_service.get_by_name_and_table(
                        db, row.get("source_column_name"), source_table.id
                    )
                    target_column = column_metadata_service.get_by_name_and_table(
                        db, row.get("target_column_name"), target_table.id
                    )
                    
                    if not source_column:
                        result["validation_errors"].append(
                            f"源字段不存在: {row.get('source_column_name')} 于表 {row.get('source_table_name')}"
                        )
                        continue
                    if not target_column:
                        result["validation_errors"].append(
                            f"目标字段不存在: {row.get('target_column_name')} 于表 {row.get('target_table_name')}"
                        )
                        continue
                    
                    # 检查表级血缘关系是否已存在，如果不存在则创建
                    existing_lineage = lineage_service.get_table_lineages_by_source(db, source_table.id)
                    table_lineage = next((l for l in existing_lineage if l.target_table_id == target_table.id), None)
                    
                    if not table_lineage:
                        # 创建表级血缘关系
                        lineage_create = LineageRelationCreate(
                            source_table_id=source_table.id,
                            target_table_id=target_table.id,
                            relation_type=row.get("relation_type", "TRANSFORMATION"),
                            description=row.get("description", ""),
                            relation_details={}
                        )
                        table_lineage = lineage_service.create_table_lineage(db, lineage_create)
                    
                    # 创建列级血缘关系
                    column_lineage_create = ColumnLineageRelationCreate(
                        lineage_relation_id=table_lineage.id,
                        source_column_id=source_column.id,
                        target_column_id=target_column.id,
                        transformation_details={"logic": row.get("transformation_logic", "")}
                    )
                    lineage_service.create_column_lineage(db, column_lineage_create)
                    result["column_lineages"]["created"] += 1
                except Exception as e:
                    result["validation_errors"].append(f"处理字段血缘关系时出错: {str(e)}")
        
        return {
            "status": "success" if not result["validation_errors"] else "partial_success",
            "message": "字段血缘关系Excel文件上传并解析" + ("成功" if not result["validation_errors"] else "，但有验证错误"),
            "result": result
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"处理字段血缘关系Excel文件时出错: {str(e)}")

@router.post("/column-lineage/json", response_model=Dict[str, Any])
async def upload_column_lineage_json(file: UploadFile = File(...), db: Session = Depends(get_db)):
    """
    上传JSON文件，解析字段血缘关系信息
    
    JSON文件格式要求:
    {
        "column_lineages": [
            {
                "source_db_name": "...",
                "source_table_name": "...",
                "source_column_name": "...",
                "target_db_name": "...",
                "target_table_name": "...",
                "target_column_name": "...",
                "transformation_details": {}
            }
        ]
    }
    """
    if not file.filename.endswith('.json'):
        raise HTTPException(status_code=400, detail="只支持JSON文件格式(.json)")
    
    try:
        # 读取上传的JSON文件
        contents = await file.read()
        data = json.loads(contents)
        
        # 处理结果统计
        result = {
            "column_lineages": {"created": 0},
            "validation_errors": []
        }
        
        # 处理字段血缘关系信息
        if "column_lineages" in data:
            for lineage_data in data["column_lineages"]:
                try:
                    # 检查必要字段
                    required_fields = ["source_db_name", "source_table_name", "source_column_name", 
                                      "target_db_name", "target_table_name", "target_column_name"]
                    for field in required_fields:
                        if not lineage_data.get(field):
                            result["validation_errors"].append(f"字段血缘关系数据缺少必要字段: {field}")
                            continue
                    
                    # 获取源数据库和目标数据库
                    source_db = data_source_service.get_by_name(db, lineage_data["source_db_name"])
                    target_db = data_source_service.get_by_name(db, lineage_data["target_db_name"])
                    
                    if not source_db:
                        result["validation_errors"].append(f"源数据库不存在: {lineage_data['source_db_name']}")
                        continue
                    if not target_db:
                        result["validation_errors"].append(f"目标数据库不存在: {lineage_data['target_db_name']}")
                        continue
                    
                    # 获取源表和目标表
                    source_table = table_metadata_service.get_by_name_and_source(
                        db, lineage_data["source_table_name"], source_db.id
                    )
                    target_table = table_metadata_service.get_by_name_and_source(
                        db, lineage_data["target_table_name"], target_db.id
                    )
                    
                    if not source_table:
                        result["validation_errors"].append(
                            f"源表不存在: {lineage_data['source_table_name']} 于数据库 {lineage_data['source_db_name']}"
                        )
                        continue
                    if not target_table:
                        result["validation_errors"].append(
                            f"目标表不存在: {lineage_data['target_table_name']} 于数据库 {lineage_data['target_db_name']}"
                        )
                        continue
                    
                    # 获取源列和目标列
                    source_column = column_metadata_service.get_by_name_and_table(
                        db, lineage_data["source_column_name"], source_table.id
                    )
                    target_column = column_metadata_service.get_by_name_and_table(
                        db, lineage_data["target_column_name"], target_table.id
                    )
                    
                    if not source_column:
                        result["validation_errors"].append(
                            f"源字段不存在: {lineage_data['source_column_name']} 于表 {lineage_data['source_table_name']}"
                        )
                        continue
                    if not target_column:
                        result["validation_errors"].append(
                            f"目标字段不存在: {lineage_data['target_column_name']} 于表 {lineage_data['target_table_name']}"
                        )
                        continue
                    
                    # 检查表级血缘关系是否已存在，如果不存在则创建
                    existing_lineage = lineage_service.get_table_lineages_by_source(db, source_table.id)
                    table_lineage = next((l for l in existing_lineage if l.target_table_id == target_table.id), None)
                    
                    if not table_lineage:
                        # 创建表级血缘关系
                        lineage_create = LineageRelationCreate(
                            source_table_id=source_table.id,
                            target_table_id=target_table.id,
                            relation_type=lineage_data.get("relation_type", "TRANSFORMATION"),
                            description=lineage_data.get("description", ""),
                            relation_details={}
                        )
                        table_lineage = lineage_service.create_table_lineage(db, lineage_create)
                    
                    # 创建列级血缘关系
                    column_lineage_create = ColumnLineageRelationCreate(
                        lineage_relation_id=table_lineage.id,
                        source_column_id=source_column.id,
                        target_column_id=target_column.id,
                        transformation_details=lineage_data.get("transformation_details", {})
                    )
                    lineage_service.create_column_lineage(db, column_lineage_create)
                    result["column_lineages"]["created"] += 1
                except Exception as e:
                    result["validation_errors"].append(f"处理字段血缘关系时出错: {str(e)}")
        
        return {
            "status": "success" if not result["validation_errors"] else "partial_success",
            "message": "字段血缘关系JSON文件上传并解析" + ("成功" if not result["validation_errors"] else "，但有验证错误"),
            "result": result
        }
        
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="JSON文件格式错误，无法解析")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"处理字段血缘关系JSON文件时出错: {str(e)}")
