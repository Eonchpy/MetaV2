from typing import List, Optional
from sqlalchemy.orm import Session
from models import ColumnMetadata
from models.schemas import ColumnMetadataCreate, ColumnMetadataUpdate

class ColumnMetadataService:
    """列元数据服务类，提供列元数据管理的业务逻辑"""
    
    @staticmethod
    def create(db: Session, column_metadata: ColumnMetadataCreate) -> ColumnMetadata:
        """创建新列元数据"""
        # 检查同名列是否已存在于同一表
        existing = db.query(ColumnMetadata).filter(
            ColumnMetadata.name == column_metadata.name,
            ColumnMetadata.table_id == column_metadata.table_id
        ).first()
        if existing:
            raise ValueError(f"列 '{column_metadata.name}' 已存在于该表")
        
        # 创建新列元数据
        db_column = ColumnMetadata(**column_metadata.model_dump())
        db.add(db_column)
        db.commit()
        db.refresh(db_column)
        return db_column
    
    @staticmethod
    def get_all(db: Session, skip: int = 0, limit: int = 100) -> List[ColumnMetadata]:
        """获取所有列元数据"""
        return db.query(ColumnMetadata).offset(skip).limit(limit).all()
    
    @staticmethod
    def get_by_id(db: Session, column_id: int) -> Optional[ColumnMetadata]:
        """根据ID获取列元数据"""
        return db.query(ColumnMetadata).filter(ColumnMetadata.id == column_id).first()
    
    @staticmethod
    def get_by_table(db: Session, table_id: int) -> List[ColumnMetadata]:
        """根据表ID获取所有列元数据"""
        return db.query(ColumnMetadata).filter(ColumnMetadata.table_id == table_id).all()
    
    @staticmethod
    def get_by_name_and_table(db: Session, name: str, table_id: int) -> Optional[ColumnMetadata]:
        """根据名称和表ID获取列元数据，支持大小写不敏感匹配"""
        from sqlalchemy import func
        return db.query(ColumnMetadata).filter(
            func.lower(ColumnMetadata.name) == func.lower(name),
            ColumnMetadata.table_id == table_id
        ).first()
    
    @staticmethod
    def update(db: Session, column_id: int, column_update: ColumnMetadataUpdate) -> Optional[ColumnMetadata]:
        """更新列元数据"""
        db_column = db.query(ColumnMetadata).filter(ColumnMetadata.id == column_id).first()
        if not db_column:
            return None
        
        # 更新字段
        update_data = column_update.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(db_column, field, value)
        
        db.commit()
        db.refresh(db_column)
        return db_column
    
    @staticmethod
    def delete(db: Session, column_id: int) -> bool:
        """删除列元数据"""
        db_column = db.query(ColumnMetadata).filter(ColumnMetadata.id == column_id).first()
        if not db_column:
            return False
        
        # 检查是否有关联的列级血缘关系
        if db_column.source_column_relationships or db_column.target_column_relationships:
            raise ValueError("无法删除，该列参与列级血缘关系")
        
        db.delete(db_column)
        db.commit()
        return True
    
    @staticmethod
    def batch_create(db: Session, columns: List[ColumnMetadataCreate]) -> List[ColumnMetadata]:
        """批量创建列元数据"""
        created_columns = []
        for column in columns:
            # 检查是否已存在
            existing = db.query(ColumnMetadata).filter(
                ColumnMetadata.name == column.name,
                ColumnMetadata.table_id == column.table_id
            ).first()
            
            if not existing:
                db_column = ColumnMetadata(**column.model_dump())
                db.add(db_column)
                created_columns.append(db_column)
        
        db.commit()
        # 刷新以获取ID等自动生成的字段
        for column in created_columns:
            db.refresh(column)
        
        return created_columns
    
    @staticmethod
    def get_primary_keys(db: Session, table_id: int) -> List[ColumnMetadata]:
        """获取表的主键列"""
        return db.query(ColumnMetadata).filter(
            ColumnMetadata.table_id == table_id,
            ColumnMetadata.is_primary_key == 1
        ).all()