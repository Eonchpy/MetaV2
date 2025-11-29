from fastapi import APIRouter

# 创建主API路由器
router = APIRouter()

# 导入并注册各个模块的路由
from .upload_routes import router as upload_router
from .data_source_routes import router as data_source_router
from .table_metadata_routes import router as table_metadata_router
from .column_metadata_routes import router as column_metadata_router
from .lineage_routes import router as lineage_router
from .config_routes import router as config_router

# 注册各个路由
router.include_router(upload_router)
router.include_router(data_source_router)
router.include_router(table_metadata_router)
router.include_router(column_metadata_router)
router.include_router(lineage_router)
router.include_router(config_router)

@router.get("/health")
def health_check():
    """健康检查接口"""
    return {"status": "healthy"}