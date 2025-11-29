from sqlalchemy import create_engine, Column, Integer, String, ForeignKey, Text, Enum, JSON, DateTime
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from datetime import datetime
import enum

# 创建基类
Base = declarative_base()

# 数据源类型枚举
class DataSourceType(str, enum.Enum):
    ORACLE = "oracle"
    ELASTICSEARCH = "elasticsearch"
    MONGODB = "mongodb"

# 数据源模型
class DataSource(Base):
    __tablename__ = "data_sources"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False)
    type = Column(Enum(DataSourceType), nullable=False)
    connection_config = Column(JSON, nullable=False)  # 存储连接配置
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # 关系
    tables = relationship("TableMetadata", back_populates="data_source")

# 表元数据模型
class TableMetadata(Base):
    __tablename__ = "table_metadata"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    data_source_id = Column(Integer, ForeignKey("data_sources.id", ondelete="CASCADE"), nullable=False)
    schema_name = Column(String(100), nullable=True)  # 数据库模式/索引名
    description = Column(Text, nullable=True)
    properties = Column(JSON, nullable=True)  # 存储其他表属性
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # 关系
    data_source = relationship("DataSource", back_populates="tables")
    columns = relationship("ColumnMetadata", back_populates="table")
    # 血缘关系 - 作为源表（由于支持多源表，这个关系不再直接可用，而是通过查询实现）
    # source_relationships = relationship(
    #     "LineageRelation",
    #     foreign_keys="LineageRelation.source_table_id",
    #     back_populates="source_table"
    # )
    # 血缘关系 - 作为目标表
    target_relationships = relationship(
        "LineageRelation",
        foreign_keys="LineageRelation.target_table_id",
        back_populates="target_table"
    )

# 列元数据模型
class ColumnMetadata(Base):
    __tablename__ = "column_metadata"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    table_id = Column(Integer, ForeignKey("table_metadata.id", ondelete="CASCADE"), nullable=False)
    data_type = Column(String(50), nullable=False)
    description = Column(Text, nullable=True)
    is_primary_key = Column(Integer, default=0)
    properties = Column(JSON, nullable=True)  # 存储其他列属性
    
    # 关系
    table = relationship("TableMetadata", back_populates="columns")
    # 列级血缘关系 - 作为源列
    source_column_relationships = relationship(
        "ColumnLineageRelation",
        foreign_keys="ColumnLineageRelation.source_column_id",
        back_populates="source_column"
    )
    # 列级血缘关系 - 作为目标列
    target_column_relationships = relationship(
        "ColumnLineageRelation",
        foreign_keys="ColumnLineageRelation.target_column_id",
        back_populates="target_column"
    )

# 表级血缘关系模型
class LineageRelation(Base):
    __tablename__ = "lineage_relations"
    
    id = Column(Integer, primary_key=True, index=True)
    source_table_ids = Column(JSON, nullable=False)  # 使用JSON类型存储多个源表ID
    target_table_id = Column(Integer, ForeignKey("table_metadata.id", ondelete="CASCADE"), nullable=False)
    relation_type = Column(String(50), nullable=False, default="TRANSFORMATION")  # 如：ETL, IMPORT, EXPORT 等
    description = Column(Text, nullable=True)
    relation_details = Column(JSON, nullable=True)  # 存储关系详情
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # 关系
    target_table = relationship("TableMetadata", foreign_keys=[target_table_id], back_populates="target_relationships")
    column_relations = relationship("ColumnLineageRelation", back_populates="lineage_relation", cascade="all, delete-orphan")
    # 由于支持多源表，不再有单一的source_table关系


# 列级血缘关系模型
class ColumnLineageRelation(Base):
    __tablename__ = "column_lineage_relations"
    
    id = Column(Integer, primary_key=True, index=True)
    lineage_relation_id = Column(Integer, ForeignKey("lineage_relations.id", ondelete="CASCADE"), nullable=False)
    source_column_id = Column(Integer, ForeignKey("column_metadata.id", ondelete="CASCADE"), nullable=False)
    target_column_id = Column(Integer, ForeignKey("column_metadata.id", ondelete="CASCADE"), nullable=False)
    transformation_details = Column(JSON, nullable=True)  # 存储转换细节
    
    # 关系
    lineage_relation = relationship("LineageRelation", back_populates="column_relations")
    source_column = relationship("ColumnMetadata", foreign_keys=[source_column_id], back_populates="source_column_relationships")
    target_column = relationship("ColumnMetadata", foreign_keys=[target_column_id], back_populates="target_column_relationships")

# 创建数据库会话
engine = None
session_local = None

def init_db(database_url: str):
    """初始化数据库连接"""
    global engine, session_local
    engine = create_engine(database_url)
    session_local = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    
    # 创建所有表
    Base.metadata.create_all(bind=engine)

def get_db():
    """获取数据库会话"""
    db = session_local()
    try:
        yield db
    finally:
        db.close()