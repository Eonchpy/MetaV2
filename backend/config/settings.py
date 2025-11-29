from pydantic_settings import BaseSettings
from typing import Dict, Optional

class Settings(BaseSettings):
    """应用配置类"""
    # 应用基本配置
    app_name: str = "元数据管理系统"
    debug: bool = True
    language: str = "zh-CN"
    
    # 数据库连接配置
    # 用于存储元数据的数据库，使用SQLite简化部署
    # 使用绝对路径确保数据库文件位置固定
    metadata_db_url: str = "sqlite:///D:/working/PersonalSys/MetaV2/metadata.db"
    
    # 数据库连接池配置
    db_pool_size: int = 10
    db_max_overflow: int = 20
    
    # 数据源连接配置将通过配置文件或API动态管理
    
    # API配置
    api_prefix: str = "/api"
    
    # CORS配置
    cors_origins: list = ["*"]
    
    # 邮件告警配置
    enable_email_alerts: bool = False
    email_server: str = ""
    email_port: int = 587
    email_user: str = ""
    email_password: str = ""
    alert_level: str = "warning"  # info, warning, error, critical
    
    model_config = {
        "env_file": ".env",
        "case_sensitive": False
    }

# 创建全局配置实例
settings = Settings()