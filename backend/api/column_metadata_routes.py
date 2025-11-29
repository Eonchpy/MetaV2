from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Optional
from sqlalchemy.orm import Session

from models.schemas import (
    ColumnMetadataBase, ColumnMetadataCreate, ColumnMetadataUpdate, ColumnMetadataResponse
)
from services.column_metadata_service import ColumnMetadataService
from models import get_db

router = APIRouter(prefix="/columns", tags=["column-metadata"])

# 实例化服务类
column_metadata_service = ColumnMetadataService()

@router.post("", response_model=ColumnMetadataResponse)
async def create_column(
    column: ColumnMetadataCreate,
    db: Session = Depends(get_db)
):
    """
    创建新的列元数据
    """
    try:
        created = column_metadata_service.create(db, column)
        return created
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("", response_model=List[ColumnMetadataResponse])
async def get_columns(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    table_id: Optional[int] = Query(None, description="按表筛选"),
    db: Session = Depends(get_db)
):
    """
    获取列元数据列表，支持分页和按表筛选
    """
    if table_id:
        columns = column_metadata_service.get_by_table(db, table_id)
        return columns[skip:skip+limit]
    else:
        columns = column_metadata_service.get_all(db, skip=skip, limit=limit)
        return columns

@router.get("/{column_id}", response_model=ColumnMetadataResponse)
async def get_column(
    column_id: int,
    db: Session = Depends(get_db)
):
    """
    获取单个列元数据详情
    """
    column = column_metadata_service.get_by_id(db, column_id)
    if not column:
        raise HTTPException(status_code=404, detail="列不存在")
    return column

@router.get("/by-name/{name}", response_model=ColumnMetadataResponse)
async def get_column_by_name(
    name: str,
    table_id: int = Query(..., description="表ID"),
    db: Session = Depends(get_db)
):
    """
    根据名称和表获取列元数据
    """
    column = column_metadata_service.get_by_name_and_table(db, name, table_id)
    if not column:
        raise HTTPException(status_code=404, detail="列不存在")
    return column

@router.put("/{column_id}", response_model=ColumnMetadataResponse)
async def update_column(
    column_id: int,
    column_update: ColumnMetadataUpdate,
    db: Session = Depends(get_db)
):
    """
    更新列元数据信息
    """
    existing = column_metadata_service.get_by_id(db, column_id)
    if not existing:
        raise HTTPException(status_code=404, detail="列不存在")
    
    try:
        updated = column_metadata_service.update(db, column_id, column_update)
        return updated
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.delete("/{column_id}", response_model=dict)
async def delete_column(
    column_id: int,
    db: Session = Depends(get_db)
):
    """
    删除列元数据
    """
    existing = column_metadata_service.get_by_id(db, column_id)
    if not existing:
        raise HTTPException(status_code=404, detail="列不存在")
    
    column_metadata_service.delete(db, column_id)
    return {"message": "列删除成功"}

@router.post("/batch", response_model=dict)
async def create_batch_columns(
    columns: List[ColumnMetadataCreate],
    db: Session = Depends(get_db)
):
    """
    批量创建列元数据
    """
    try:
        created_columns = column_metadata_service.batch_create(db, columns)
        return {"message": f"成功创建 {len(created_columns)} 个列"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))