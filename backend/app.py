from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import logging

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)

from config.settings import settings
from api import router as api_router
from models import init_db

# 初始化数据库连接
init_db(settings.metadata_db_url)

# 创建FastAPI应用实例
app = FastAPI(
    title="元数据管理系统API",
    description="跨数据源(Oracle、ES、MongoDB)的元数据和血缘关系管理系统",
    version="1.0.0"
)

# 配置CORS中间件，允许前端访问
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 生产环境应该配置具体的前端域名
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 注册API路由
app.include_router(api_router, prefix="/api")

@app.get("/")
def read_root():
    """根路径，返回API基本信息"""
    return {
        "message": "元数据管理系统API",
        "version": "1.0.0",
        "docs": "/docs"
    }

if __name__ == "__main__":
    uvicorn.run(
        "app:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )