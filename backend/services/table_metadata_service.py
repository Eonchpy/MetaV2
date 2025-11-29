from typing import List, Optional
from sqlalchemy.orm import Session, joinedload
from models import TableMetadata
from models.schemas import TableMetadataCreate, TableMetadataUpdate

class TableMetadataService:
    """表元数据服务类，提供表元数据管理的业务逻辑"""
    
    @staticmethod
    def create(db: Session, table_metadata: TableMetadataCreate) -> TableMetadata:
        """创建新表元数据"""
        # 检查同名表是否已存在于同一数据源
        existing = db.query(TableMetadata).filter(
            TableMetadata.name == table_metadata.name,
            TableMetadata.data_source_id == table_metadata.data_source_id,
            TableMetadata.schema_name == table_metadata.schema_name
        ).first()
        if existing:
            raise ValueError(f"表 '{table_metadata.name}' 已存在于该数据源")
        
        # 创建新表元数据
        db_table = TableMetadata(**table_metadata.model_dump())
        db.add(db_table)
        db.commit()
        db.refresh(db_table)
        return db_table
    
    @staticmethod
    def get_all(db: Session, skip: int = 0, limit: int = 100, keyword: Optional[str] = None, 
                sort_field: Optional[str] = None, sort_order: Optional[str] = 'asc') -> List[TableMetadata]:
        """获取表元数据，支持搜索和排序"""
        # 清除可能的会话缓存，确保获取最新数据
        db.expire_all()
        
        # 构建查询
        query = db.query(TableMetadata)
        
        # 添加搜索条件
        if keyword:
            # 在表名、描述和注释中搜索关键词
            query = query.filter(
                (TableMetadata.name.ilike(f'%{keyword}%')) |
                (TableMetadata.description.ilike(f'%{keyword}%') if TableMetadata.description else False) |
                (TableMetadata.comment.ilike(f'%{keyword}%') if TableMetadata.comment else False)
            )
        
        # 添加排序
        if sort_field and hasattr(TableMetadata, sort_field):
            sort_column = getattr(TableMetadata, sort_field)
            if sort_order.lower() == 'desc':
                query = query.order_by(sort_column.desc())
            else:
                query = query.order_by(sort_column.asc())
        else:
            # 默认按ID排序
            query = query.order_by(TableMetadata.id)
        
        # 添加分页并返回结果
        return query.offset(skip).limit(limit).all()
    
    @staticmethod
    def get_by_id(db: Session, table_id: int) -> Optional[TableMetadata]:
        """根据ID获取表元数据，包含关联的列数据"""
        return db.query(TableMetadata).options(joinedload(TableMetadata.columns)).filter(TableMetadata.id == table_id).first()
    
    @staticmethod
    def get_by_data_source(db: Session, data_source_id: int) -> List[TableMetadata]:
        """根据数据源ID获取表元数据"""
        return db.query(TableMetadata).filter(TableMetadata.data_source_id == data_source_id).all()
    
    @staticmethod
    def get_by_name_and_source(db: Session, name: str, data_source_id: int, schema_name: Optional[str] = None) -> Optional[TableMetadata]:
        """根据名称和数据源获取表元数据"""
        query = db.query(TableMetadata).filter(
            TableMetadata.name == name,
            TableMetadata.data_source_id == data_source_id
        )
        if schema_name is not None:
            query = query.filter(TableMetadata.schema_name == schema_name)
        return query.first()
    
    @staticmethod
    def update(db: Session, table_id: int, table_update: TableMetadataUpdate) -> Optional[TableMetadata]:
        """更新表元数据"""
        db_table = db.query(TableMetadata).filter(TableMetadata.id == table_id).first()
        if not db_table:
            return None
        
        # 更新字段
        update_data = table_update.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(db_table, field, value)
        
        db.commit()
        db.refresh(db_table)
        return db_table
    
    @staticmethod
    def delete(db: Session, table_id: int) -> bool:
        """删除表元数据"""
        db_table = db.query(TableMetadata).filter(TableMetadata.id == table_id).first()
        if not db_table:
            return False
        
        # 检查是否有关联的血缘关系
        if db_table.source_relationships or db_table.target_relationships:
            raise ValueError("无法删除，该表参与血缘关系")
        
        # 检查是否有列元数据
        if db_table.columns:
            # 删除所有关联的列元数据
            for column in db_table.columns:
                db.delete(column)
        
        db.delete(db_table)
        db.commit()
        return True
    
    @staticmethod
    def batch_create(db: Session, tables: List[TableMetadataCreate]) -> List[TableMetadata]:
        """批量创建表元数据"""
        created_tables = []
        for table in tables:
            # 检查是否已存在
            existing = db.query(TableMetadata).filter(
                TableMetadata.name == table.name,
                TableMetadata.data_source_id == table.data_source_id,
                TableMetadata.schema_name == table.schema_name
            ).first()
            
            if not existing:
                db_table = TableMetadata(**table.model_dump())
                db.add(db_table)
                created_tables.append(db_table)
        
        db.commit()
        # 刷新以获取ID等自动生成的字段
        for table in created_tables:
            db.refresh(table)
        
        return created_tables