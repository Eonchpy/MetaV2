from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
from enum import Enum

# 数据源类型枚举
class DataSourceType(str, Enum):
    ORACLE = "oracle"
    ELASTICSEARCH = "elasticsearch"
    MONGODB = "mongodb"

# 数据源基础模型
class DataSourceBase(BaseModel):
    name: str = Field(..., description="数据源名称", max_length=100)
    type: DataSourceType = Field(..., description="数据源类型")
    connection_config: Dict[str, Any] = Field(..., description="连接配置")
    description: Optional[str] = Field(None, description="数据源描述")

# 数据源创建模型
class DataSourceCreate(DataSourceBase):
    pass

# 数据源更新模型
class DataSourceUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=100)
    connection_config: Optional[Dict[str, Any]] = None
    description: Optional[str] = None

# 数据源响应模型
class DataSourceResponse(DataSourceBase):
    id: int = Field(..., description="数据源ID")
    created_at: datetime = Field(..., description="创建时间")
    updated_at: datetime = Field(..., description="更新时间")
    
    model_config = {
        "from_attributes": True
    }

# 表元数据基础模型
class TableMetadataBase(BaseModel):
    name: str = Field(..., description="表名", max_length=200)
    schema_name: Optional[str] = Field(None, description="模式/索引名", max_length=100)
    description: Optional[str] = Field(None, description="表描述")
    properties: Optional[Dict[str, Any]] = Field(None, description="其他属性")
    columns: List[Dict[str, Any]] = Field(default_factory=list, description="表的列数据列表")

# 表元数据创建模型
class TableMetadataCreate(TableMetadataBase):
    data_source_id: int = Field(..., description="数据源ID")

# 表元数据更新模型
class TableMetadataUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=200)
    schema_name: Optional[str] = Field(None, max_length=100)
    description: Optional[str] = None
    properties: Optional[Dict[str, Any]] = None
    columns: Optional[List[Dict[str, Any]]] = Field(None, description="表的列数据列表")

# 列元数据基础模型
class ColumnMetadataBase(BaseModel):
    name: str = Field(..., description="列名", max_length=200)
    data_type: str = Field(..., description="数据类型", max_length=50)
    description: Optional[str] = Field(None, description="列描述")
    is_primary_key: bool = Field(False, description="是否为主键")
    properties: Optional[Dict[str, Any]] = Field(None, description="其他属性")

# 列元数据创建模型
class ColumnMetadataCreate(ColumnMetadataBase):
    table_id: int = Field(..., description="表ID")

# 列元数据更新模型
class ColumnMetadataUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=200)
    data_type: Optional[str] = Field(None, max_length=50)
    description: Optional[str] = None
    is_primary_key: Optional[bool] = None
    properties: Optional[Dict[str, Any]] = None

# 列元数据响应模型
class ColumnMetadataResponse(ColumnMetadataBase):
    id: int = Field(..., description="列ID")
    table_id: int = Field(..., description="表ID")
    
    model_config = {
        "from_attributes": True
    }

# 表元数据响应模型
class TableMetadataResponse(TableMetadataBase):
    id: int = Field(..., description="表ID")
    data_source_id: int = Field(..., description="数据源ID")
    created_at: datetime = Field(..., description="创建时间")
    updated_at: datetime = Field(..., description="更新时间")
    columns: List[ColumnMetadataResponse] = Field(default_factory=list, description="关联的列元数据列表")
    
    model_config = {
        "from_attributes": True
    }

# 表级血缘关系基础模型
class LineageRelationBase(BaseModel):
    source_table_ids: List[int] = Field(..., description="源表ID列表，支持多个源表")
    target_table_id: int = Field(..., description="目标表ID")
    relation_type: str = Field(..., description="关系类型", max_length=50)
    description: Optional[str] = Field(None, description="关系描述")
    relation_details: Optional[Dict[str, Any]] = Field(None, description="关系详情")

# 表级血缘关系创建模型
class LineageRelationCreate(LineageRelationBase):
    pass

# 表级血缘关系更新模型
class LineageRelationUpdate(BaseModel):
    relation_type: Optional[str] = Field(None, max_length=50)
    description: Optional[str] = None
    relation_details: Optional[Dict[str, Any]] = None

# 表级血缘关系响应模型
class LineageRelationResponse(LineageRelationBase):
    id: int = Field(..., description="关系ID")
    created_at: datetime = Field(..., description="创建时间")
    
    model_config = {
        "from_attributes": True
    }

# 列级血缘关系基础模型
class ColumnLineageRelationBase(BaseModel):
    lineage_relation_id: int = Field(..., description="表级血缘关系ID")
    source_column_id: int = Field(..., description="源列ID")
    target_column_id: int = Field(..., description="目标列ID")
    transformation_details: Optional[Dict[str, Any]] = Field(None, description="转换详情")

# 列级血缘关系创建模型
class ColumnLineageRelationCreate(ColumnLineageRelationBase):
    pass

# 列级血缘关系更新模型
class ColumnLineageRelationUpdate(BaseModel):
    transformation_details: Optional[Dict[str, Any]] = None

# 列级血缘关系响应模型
class ColumnLineageRelationResponse(ColumnLineageRelationBase):
    id: int = Field(..., description="关系ID")
    
    model_config = {
        "from_attributes": True
    }

# 血缘关系可视化响应模型
class LineageGraphNode(BaseModel):
    id: int = Field(..., description="节点ID")
    name: str = Field(..., description="节点名称")
    type: str = Field(..., description="节点类型: table或column")
    data_source: Optional[str] = Field(None, description="数据源名称")
    data_source_type: Optional[DataSourceType] = Field(None, description="数据源类型")

class LineageGraphEdge(BaseModel):
    id: int = Field(..., description="边ID")
    source: int = Field(..., description="源节点ID")
    target: int = Field(..., description="目标节点ID")
    type: str = Field(..., description="边类型: table_lineage或column_lineage")
    relation_type: Optional[str] = Field(None, description="关系类型")

class LineageGraphResponse(BaseModel):
    nodes: List[LineageGraphNode] = Field(..., description="图节点列表")
    edges: List[LineageGraphEdge] = Field(..., description="图边列表")

# 数据源连接测试模型
class ConnectionTestRequest(BaseModel):
    type: DataSourceType = Field(..., description="数据源类型")
    connection_config: Dict[str, Any] = Field(..., description="连接配置")

class ConnectionTestResponse(BaseModel):
    success: bool = Field(..., description="连接是否成功")
    message: str = Field(..., description="测试结果消息")

# 血缘关系节点模型（用于上游/下游查询）
class LineageNode(BaseModel):
    id: int = Field(..., description="节点ID")
    name: str = Field(..., description="节点名称")
    table_type: Optional[str] = Field(None, description="表类型")
    data_source: Optional[str] = Field(None, description="数据源名称")
    description: Optional[str] = Field(None, description="节点描述")
    layer: int = Field(..., description="层级深度")
    relation_type: str = Field(..., description="关系类型")
    relation_description: Optional[str] = Field(None, description="关系描述")
    upstream: List[int] = Field(default_factory=list, description="上游节点ID列表")
    downstream: List[int] = Field(default_factory=list, description="下游节点ID列表")