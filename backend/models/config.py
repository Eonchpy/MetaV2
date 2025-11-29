from sqlalchemy import Column, Integer, String, Boolean, Text, Enum
from sqlalchemy.ext.declarative import declarative_base
import enum

Base = declarative_base()

class ConfigType(str, enum.Enum):
    """配置类型枚举"""
    GENERAL = "general"
    DATABASE = "database"
    ALERTS = "alerts"

class SystemConfig(Base):
    """系统配置表模型"""
    __tablename__ = "system_config"
    
    id = Column(Integer, primary_key=True, index=True)
    config_type = Column(Enum(ConfigType), nullable=False, unique=True)
    config_key = Column(String(100), nullable=False)
    config_value = Column(Text, nullable=False)
    description = Column(String(255))
    is_encrypted = Column(Boolean, default=False)
    created_at = Column(Text, nullable=False)  # 简化处理，使用文本存储时间
    updated_at = Column(Text, nullable=False)  # 简化处理，使用文本存储时间
    
    def __repr__(self):
        return f"<SystemConfig(type='{self.config_type}', key='{self.config_key}')>"