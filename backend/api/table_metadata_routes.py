from fastapi import APIRouter, HTTPException, Depends, Query, Response
from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func
import json

from models.schemas import (
    TableMetadataBase, TableMetadataCreate, TableMetadataUpdate, TableMetadataResponse
)
from services.table_metadata_service import TableMetadataService
from models import get_db, TableMetadata

router = APIRouter(prefix="/tables", tags=["table-metadata"])

# 实例化服务类
table_metadata_service = TableMetadataService()

@router.post("", response_model=TableMetadataResponse)
async def create_table(
    table: TableMetadataCreate,
    db: Session = Depends(get_db)
):
    """
    创建新的表元数据
    """
    try:
        created = table_metadata_service.create(db, table)
        return created
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("", response_model=List[TableMetadataResponse])
async def get_tables(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    data_source_id: Optional[int] = Query(None, description="按数据源筛选"),
    keyword: Optional[str] = Query(None, description="搜索关键词"),
    sort_field: Optional[str] = Query(None, description="排序字段"),
    sort_order: Optional[str] = Query("asc", description="排序顺序: asc 或 desc"),
    db: Session = Depends(get_db)
):
    """
    获取表元数据列表，支持分页、按数据源筛选、搜索和排序
    """
    if data_source_id:
        tables = table_metadata_service.get_by_data_source(db, data_source_id)
        return tables[skip:skip+limit]
    else:
        tables = table_metadata_service.get_all(
            db, 
            skip=skip, 
            limit=limit,
            keyword=keyword,
            sort_field=sort_field,
            sort_order=sort_order
        )
        return tables

@router.get("/{table_id}", response_model=TableMetadataResponse)
async def get_table(
    table_id: int,
    db: Session = Depends(get_db)
):
    """
    获取单个表元数据详情
    """
    table = table_metadata_service.get_by_id(db, table_id)
    if not table:
        raise HTTPException(status_code=404, detail="表不存在")
    return table

@router.get("/by-name/{name}", response_model=TableMetadataResponse)
async def get_table_by_name(
    name: str,
    data_source_id: int = Query(..., description="数据源ID"),
    db: Session = Depends(get_db)
):
    """
    根据名称和数据源获取表元数据
    """
    table = table_metadata_service.get_by_name_and_source(db, name, data_source_id)
    if not table:
        raise HTTPException(status_code=404, detail="表不存在")
    return table

@router.put("/{table_id}", response_model=TableMetadataResponse)
async def update_table(
    table_id: int,
    table_update: TableMetadataUpdate,
    db: Session = Depends(get_db)
):
    """
    更新表元数据信息
    """
    existing = table_metadata_service.get_by_id(db, table_id)
    if not existing:
        raise HTTPException(status_code=404, detail="表不存在")
    
    try:
        updated = table_metadata_service.update(db, table_id, table_update)
        return updated
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.delete("/{table_id}", response_model=dict)
async def delete_table(
    table_id: int,
    db: Session = Depends(get_db)
):
    """
    删除表元数据
    """
    existing = table_metadata_service.get_by_id(db, table_id)
    if not existing:
        raise HTTPException(status_code=404, detail="表不存在")
    
    table_metadata_service.delete(db, table_id)
    return {"message": "表删除成功"}

@router.post("/batch", response_model=dict)
async def create_batch_tables(
    tables: List[TableMetadataCreate],
    db: Session = Depends(get_db)
):
    """
    批量创建表元数据
    """
    try:
        created_tables = table_metadata_service.batch_create(db, tables)
        return {"message": f"成功创建 {len(created_tables)} 个表"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))