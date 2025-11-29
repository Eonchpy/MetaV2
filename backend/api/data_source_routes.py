from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Optional
from sqlalchemy.orm import Session

from models.schemas import (
    DataSourceBase, DataSourceCreate, DataSourceUpdate, DataSourceResponse
)
from services.data_source_service import DataSourceService
from models import get_db

router = APIRouter(prefix="/data-sources", tags=["data-sources"])

# 实例化服务类
data_source_service = DataSourceService()

@router.post("", response_model=DataSourceResponse)
async def create_data_source(
    data_source: DataSourceCreate,
    db: Session = Depends(get_db)
):
    """
    创建新的数据源
    """
    try:
        created = data_source_service.create(db, data_source)
        return created
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("", response_model=List[DataSourceResponse])
async def get_data_sources(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db)
):
    """
    获取数据源列表，支持分页
    """
    data_sources = data_source_service.get_all(db, skip=skip, limit=limit)
    return data_sources

@router.get("/{data_source_id}", response_model=DataSourceResponse)
async def get_data_source(
    data_source_id: int,
    db: Session = Depends(get_db)
):
    """
    获取单个数据源详情
    """
    data_source = data_source_service.get_by_id(db, data_source_id)
    if not data_source:
        raise HTTPException(status_code=404, detail="数据源不存在")
    return data_source

@router.get("/by-name/{name}", response_model=DataSourceResponse)
async def get_data_source_by_name(
    name: str,
    db: Session = Depends(get_db)
):
    """
    根据名称获取数据源
    """
    data_source = data_source_service.get_by_name(db, name)
    if not data_source:
        raise HTTPException(status_code=404, detail="数据源不存在")
    return data_source

@router.put("/{data_source_id}", response_model=DataSourceResponse)
async def update_data_source(
    data_source_id: int,
    data_source_update: DataSourceUpdate,
    db: Session = Depends(get_db)
):
    """
    更新数据源信息
    """
    existing = data_source_service.get_by_id(db, data_source_id)
    if not existing:
        raise HTTPException(status_code=404, detail="数据源不存在")
    
    try:
        updated = data_source_service.update(db, data_source_id, data_source_update)
        return updated
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.delete("/{data_source_id}", response_model=dict)
async def delete_data_source(
    data_source_id: int,
    cascade: bool = Query(True, description="是否级联删除关联的表元数据，默认自动删除包含表的数据源"),
    db: Session = Depends(get_db)
):
    """
    删除数据源
    
    Args:
        data_source_id: 数据源ID
        cascade: 是否级联删除关联的表元数据
            - 默认值: False
            - 设置为True时，将同时删除该数据源下的所有表元数据
            
    Returns:
        dict: 包含删除结果的字典
            - success: 是否删除成功
            - message: 操作消息
            - deleted_tables_count: 当cascade=true时，返回删除的表数量
    """
    try:
        # 确保cascade参数正确传递给service层
        print(f"接收到的cascade参数值: {cascade}")
        result = data_source_service.delete(db, data_source_id, cascade)
        
        if not result["success"]:
            raise HTTPException(status_code=404, detail=result["message"])
        
        return result
    except ValueError as e:
        # 处理service层抛出的友好错误信息
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        print(f"删除数据源异常: {str(e)}")
        raise HTTPException(status_code=500, detail=f"删除数据源失败：{str(e)}")