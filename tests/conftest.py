import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from backend.app import app
from backend.models import Base, get_db

# 创建测试数据库引擎
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False}
)

# 创建测试会话工厂
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# 重写依赖函数，使用测试数据库
def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()

# 应用依赖覆盖
app.dependency_overrides[get_db] = override_get_db

@pytest.fixture
def client():
    # 创建测试数据库表
    Base.metadata.create_all(bind=engine)
    
    # 创建测试客户端
    with TestClient(app) as c:
        yield c
    
    # 测试结束后清理数据库表
    Base.metadata.drop_all(bind=engine)