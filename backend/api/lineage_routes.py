from fastapi import APIRouter, HTTPException, Depends, Query, Request, Body
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
import logging
import json

# 配置日志
logger = logging.getLogger(__name__)

from models import ColumnLineageRelation, LineageRelation
from models.schemas import (
    LineageRelationBase, LineageRelationCreate, LineageRelationUpdate, LineageRelationResponse,
    ColumnLineageRelationBase, ColumnLineageRelationCreate, ColumnLineageRelationUpdate, ColumnLineageRelationResponse,
    LineageGraphResponse
)
from services.lineage_service import LineageService
from models import get_db

router = APIRouter(prefix="/lineages", tags=["lineage"])

# 实例化服务类
lineage_service = LineageService()

# 表级血缘关系接口
@router.post("/table", response_model=LineageRelationResponse)
async def create_table_lineage(
    request_data: dict = Body(...),  # 直接接收原始请求体字典
    db: Session = Depends(get_db)
):
    """
    创建表级血缘关系
    """
    # 首先记录接收到的原始请求数据 - 这一步在任何验证之前执行
    logger.info(f"API接收到创建表级血缘关系请求(原始数据): {request_data}")
    
    try:
        # 检查并添加默认的relation_type字段（如果缺失）
        if 'relation_type' not in request_data or not request_data['relation_type']:
            logger.warning("请求中未包含relation_type字段，将使用默认值'直接关联'")
            request_data['relation_type'] = '直接关联'
        
        # 将字典数据转换为LineageRelationCreate模型
        lineage = LineageRelationCreate(**request_data)
        
        # 记录转换后的模型参数
        logger.info(f"请求数据转换完成: source_table_ids={lineage.source_table_ids}, target_table_id={lineage.target_table_id}, relation_type={lineage.relation_type}, description={lineage.description}")
        
        # 调用服务层创建血缘关系
        logger.info("调用LineageService.create_table_lineage处理请求")
        created = lineage_service.create_table_lineage(db, lineage)
        
        logger.info(f"表级血缘关系创建成功，返回ID: {created.id}")
        return created
    except ValueError as e:
        logger.warning(f"创建表级血缘关系时参数验证失败: {str(e)}")
        raise HTTPException(status_code=422, detail=f"参数验证失败: {str(e)}")
    except Exception as e:
        logger.error(f"创建表级血缘关系时发生错误: {str(e)}", exc_info=True)
        raise HTTPException(status_code=400, detail=f"创建失败: {str(e)}")

@router.get("/table", response_model=List[Dict[str, Any]])
async def get_table_lineages(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    source_table_id: Optional[int] = Query(None, description="按源表筛选"),
    target_table_id: Optional[int] = Query(None, description="按目标表筛选"),
    db: Session = Depends(get_db)
):
    """
    获取表级血缘关系列表
    """
    # 基础查询，关联表信息
    from sqlalchemy import select, and_
    from models import LineageRelation, TableMetadata
    
    if source_table_id:
        lineages = lineage_service.get_table_lineages_by_source(db, source_table_id)
    elif target_table_id:
        lineages = lineage_service.get_table_lineages_by_target(db, target_table_id)
    else:
        lineages = db.scalars(select(LineageRelation)).all()
    
    # 对每个血缘关系进行处理，添加源表和目标表信息
    result = []
    for lineage in lineages:
        # 获取源表信息
        source_tables_info = []
        for src_table_id in lineage.source_table_ids:
            source_table = db.query(TableMetadata).filter(TableMetadata.id == src_table_id).first()
            if source_table:
                source_tables_info.append({
                    "id": source_table.id,
                    "name": source_table.name,
                    "data_source": source_table.data_source.name if source_table.data_source else None
                })
        
        # 获取目标表信息
        target_table = db.query(TableMetadata).filter(TableMetadata.id == lineage.target_table_id).first()
        target_table_info = {
            "id": target_table.id,
            "name": target_table.name,
            "data_source": target_table.data_source.name if target_table.data_source else None
        } if target_table else None
        
        # 构建响应数据
        lineage_data = {
            "id": lineage.id,
            "source_table_ids": lineage.source_table_ids,
            "source_tables": source_tables_info,
            "target_table_id": lineage.target_table_id,
            "target_table": target_table_info,
            "relation_type": lineage.relation_type,
            "description": lineage.description,
            "created_at": lineage.created_at.isoformat() if lineage.created_at else None
        }
        result.append(lineage_data)
    
    # 应用分页
    return result[skip:skip+limit]

@router.get("/table/{lineage_id}", response_model=LineageRelationResponse)
async def get_table_lineage(
    lineage_id: int,
    db: Session = Depends(get_db)
):
    """
    获取单个表级血缘关系详情
    """
    lineage = lineage_service.get_table_lineage_by_id(db, lineage_id)
    if not lineage:
        raise HTTPException(status_code=404, detail="表级血缘关系不存在")
    return lineage

@router.put("/table/{lineage_id}", response_model=LineageRelationResponse)
async def update_table_lineage(
    lineage_id: int,
    lineage_update: LineageRelationUpdate,
    db: Session = Depends(get_db)
):
    """
    更新表级血缘关系
    """
    existing = lineage_service.get_table_lineage_by_id(db, lineage_id)
    if not existing:
        raise HTTPException(status_code=404, detail="表级血缘关系不存在")
    
    try:
        updated = lineage_service.update_table_lineage(db, lineage_id, lineage_update)
        return updated
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.delete("/table/{lineage_id}", response_model=dict)
async def delete_table_lineage(
    lineage_id: int,
    db: Session = Depends(get_db)
):
    """
    删除表级血缘关系
    """
    existing = lineage_service.get_table_lineage_by_id(db, lineage_id)
    if not existing:
        raise HTTPException(status_code=404, detail="表级血缘关系不存在")
    
    lineage_service.delete_table_lineage(db, lineage_id)
    return {"message": "表级血缘关系删除成功"}

# 列级血缘关系接口
@router.post("/column", response_model=ColumnLineageRelationResponse)
async def create_column_lineage(
    column_lineage: ColumnLineageRelationCreate,
    db: Session = Depends(get_db)
):
    """
    创建列级血缘关系
    """
    try:
        created = lineage_service.create_column_lineage(db, column_lineage)
        return created
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/column", response_model=List[Dict[str, Any]])
async def get_column_lineages(
    page: Optional[int] = Query(None, ge=1, description="页码"),
    page_size: Optional[int] = Query(None, ge=1, le=1000, description="每页大小"),
    skip: int = Query(0, ge=0, description="跳过的记录数"),
    limit: int = Query(100, ge=1, le=1000, description="获取的记录数"),
    lineage_relation_id: Optional[int] = Query(None, description="按表级血缘关系筛选"),
    source_column_id: Optional[int] = Query(None, description="按源列筛选"),
    target_column_id: Optional[int] = Query(None, description="按目标列筛选"),
    db: Session = Depends(get_db)
):
    """
    获取列级血缘关系列表，包含源列和目标列的详细信息
    """
    # 优先使用page和page_size参数计算skip和limit
    if page and page_size:
        skip = (page - 1) * page_size
        limit = page_size
    
    from sqlalchemy import select, join
    from models import ColumnLineageRelation, ColumnMetadata, TableMetadata
    
    # 构建查询，关联必要的表
    stmt = select(ColumnLineageRelation).join(
        ColumnMetadata, ColumnLineageRelation.source_column_id == ColumnMetadata.id
    ).join(
        TableMetadata, ColumnMetadata.table_id == TableMetadata.id
    )
    
    # 根据筛选条件构建查询
    if lineage_relation_id:
        stmt = stmt.where(ColumnLineageRelation.lineage_relation_id == lineage_relation_id)
    if source_column_id:
        stmt = stmt.where(ColumnLineageRelation.source_column_id == source_column_id)
    if target_column_id:
        stmt = stmt.where(ColumnLineageRelation.target_column_id == target_column_id)
    
    # 应用分页
    if skip or limit:
        stmt = stmt.offset(skip).limit(limit)
    
    # 执行查询
    column_lineages = db.scalars(stmt).all()
    
    # 处理结果，添加关联数据
    result = []
    for clr in column_lineages:
        # 获取源列信息
        source_column = db.query(ColumnMetadata).filter(
            ColumnMetadata.id == clr.source_column_id
        ).first()
        
        # 获取目标列信息
        target_column = db.query(ColumnMetadata).filter(
            ColumnMetadata.id == clr.target_column_id
        ).first()
        
        # 获取源表信息
        source_table = None
        target_table = None
        if source_column:
            source_table = db.query(TableMetadata).filter(
                TableMetadata.id == source_column.table_id
            ).first()
        if target_column:
            target_table = db.query(TableMetadata).filter(
                TableMetadata.id == target_column.table_id
            ).first()
        
        # 处理transformation_details字段
        relation_type = "未知"
        description = ""
        transformation_rule = ""
        if clr.transformation_details:
            import json
            try:
                details = json.loads(clr.transformation_details)
                relation_type = details.get("relation_type", "未知")
                description = details.get("description", "")
                transformation_rule = details.get("rule", "")
            except:
                pass
        
        # 构建响应数据，确保包含前端所需的所有字段
        lineage_dict = {
            "id": clr.id,
            "lineage_relation_id": clr.lineage_relation_id,
            "source_column_id": clr.source_column_id,
            "target_column_id": clr.target_column_id,
            # 添加前端所需的表ID字段
            "source_table_id": source_column.table_id if source_column else None,
            "target_table_id": target_column.table_id if target_column else None,
            # 源字段信息
            "source_column": {
                "id": source_column.id if source_column else None,
                "name": source_column.name if source_column else "--",
                "data_type": source_column.data_type if source_column else "未知",
                "table": {
                    "id": source_table.id if source_table else None,
                    "name": source_table.name if source_table else "未知表"
                }
            },
            # 目标字段信息
            "target_column": {
                "id": target_column.id if target_column else None,
                "name": target_column.name if target_column else "--",
                "data_type": target_column.data_type if target_column else "未知",
                "table": {
                    "id": target_table.id if target_table else None,
                    "name": target_table.name if target_table else "未知表"
                }
            },
            "relation_type": relation_type,
            "description": description,
            "transformation_rule": transformation_rule,  # 添加转换规则字段
            "transformation_details": clr.transformation_details,
            # 添加创建时间字段，确保前端可以正确解析
            "created_at": clr.created_at.isoformat() if hasattr(clr, 'created_at') and clr.created_at else None
        }
        
        result.append(lineage_dict)
    
    return result

@router.get("/column/{column_lineage_id}", response_model=ColumnLineageRelationResponse)
async def get_column_lineage(
    column_lineage_id: int,
    db: Session = Depends(get_db)
):
    """
    获取单个列级血缘关系详情
    """
    column_lineage = lineage_service.get_column_lineage_by_id(db, column_lineage_id)
    if not column_lineage:
        raise HTTPException(status_code=404, detail="列级血缘关系不存在")
    return column_lineage

@router.put("/column/{column_lineage_id}", response_model=ColumnLineageRelationResponse)
async def update_column_lineage(
    column_lineage_id: int,
    column_lineage_update: ColumnLineageRelationUpdate,
    db: Session = Depends(get_db)
):
    """
    更新列级血缘关系
    """
    existing = lineage_service.get_column_lineage_by_id(db, column_lineage_id)
    if not existing:
        raise HTTPException(status_code=404, detail="列级血缘关系不存在")
    
    try:
        updated = lineage_service.update_column_lineage(db, column_lineage_id, column_lineage_update)
        return updated
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.delete("/column/{column_lineage_id}", response_model=dict)
async def delete_column_lineage(
    column_lineage_id: int,
    db: Session = Depends(get_db)
):
    """
    删除列级血缘关系
    """
    existing = lineage_service.get_column_lineage_by_id(db, column_lineage_id)
    if not existing:
        raise HTTPException(status_code=404, detail="列级血缘关系不存在")
    
    lineage_service.delete_column_lineage(db, column_lineage_id)
    return {"message": "列级血缘关系删除成功"}

# 血缘关系图可视化接口
@router.get("/graph/table/{table_id}", response_model=Dict[str, Any])
async def get_table_lineage_graph(
    table_id: int,
    depth: int = Query(3, ge=1, le=10, description="血缘关系深度"),
    direction: str = Query("both", regex="^(up|down|upstream|downstream|both)$", description="血缘关系方向: up/upstream(上游), down/downstream(下游), both(双向)"),
    db: Session = Depends(get_db)
):
    """
    获取表级血缘关系图数据
    """
    try:
        graph_data = lineage_service.get_table_lineage_graph(db, table_id, depth, direction)
        return graph_data
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/table/graph/{id}", response_model=LineageGraphResponse)
async def get_table_lineage_graph_alternative(
    id: int,
    depth: int = Query(3, ge=1, le=10, description="血缘关系深度"),
    direction: str = Query("both", regex="^(up|down|upstream|downstream|both)$", description="血缘关系方向: up/upstream(上游), down/downstream(下游), both(双向)"),
    db: Session = Depends(get_db)
):
    """
    获取表级血缘关系图数据的替代端点，包括上下游指定深度的表
    注意：此端点是为了兼容/table/graph/{id}的请求路径
    """
    try:
        graph_data = lineage_service.get_table_lineage_graph(db, id, depth, direction)
        # 直接返回对象，让FastAPI自动处理序列化
        return graph_data
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/graph/column/{column_id}", response_model=Dict[str, Any])
async def get_column_lineage_graph(
    column_id: int,
    depth: int = Query(3, ge=1, le=10, description="血缘关系深度"),
    direction: str = Query("both", regex="^(up|down|upstream|downstream|both)$", description="血缘关系方向: up/upstream(上游), down/downstream(下游), both(双向)"),
    db: Session = Depends(get_db)
):
    """
    获取列级血缘关系图数据
    """
    try:
        graph_data = lineage_service.get_column_lineage_graph(db, column_id, depth, direction)
        return graph_data
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/column/graph/{column_id}", response_model=Dict[str, Any])
async def get_column_lineage_graph_alternative(
    column_id: int,
    depth: int = Query(3, ge=1, le=10, description="血缘关系深度"),
    direction: str = Query("both", regex="^(up|down|upstream|downstream|both)$", description="血缘关系方向: up/upstream(上游), down/downstream(下游), both(双向)"),
    db: Session = Depends(get_db)
):
    """
    获取列级血缘关系图数据的替代端点，兼容前端调用路径
    注意：此端点是为了兼容/lineages/column/graph/{column_id}的请求路径（结合路由器前缀）
    """
    try:
        graph_data = lineage_service.get_column_lineage_graph(db, column_id, depth, direction)
        # 确保返回的是字典格式
        if hasattr(graph_data, 'model_dump'):
            return graph_data.model_dump()
        return graph_data
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))