from typing import List, Optional
from sqlalchemy.orm import Session
from models import DataSource, DataSourceType
from models.schemas import DataSourceCreate, DataSourceUpdate

class DataSourceService:
    """数据源服务类，提供数据源管理的业务逻辑"""
    
    @staticmethod
    def create(db: Session, data_source: DataSourceCreate) -> DataSource:
        """创建新数据源"""
        # 检查数据源名称是否已存在
        existing = db.query(DataSource).filter(DataSource.name == data_source.name).first()
        if existing:
            raise ValueError(f"数据源名称 '{data_source.name}' 已存在")
        
        # 创建新数据源
        db_data_source = DataSource(**data_source.model_dump())
        db.add(db_data_source)
        db.commit()
        db.refresh(db_data_source)
        return db_data_source
    
    @staticmethod
    def get_all(db: Session, skip: int = 0, limit: int = 100) -> List[DataSource]:
        """获取所有数据源"""
        return db.query(DataSource).offset(skip).limit(limit).all()
    
    @staticmethod
    def get_by_id(db: Session, data_source_id: int) -> Optional[DataSource]:
        """根据ID获取数据源"""
        return db.query(DataSource).filter(DataSource.id == data_source_id).first()
    
    @staticmethod
    def get_by_name(db: Session, name: str) -> Optional[DataSource]:
        """根据名称获取数据源"""
        return db.query(DataSource).filter(DataSource.name == name).first()
    
    @staticmethod
    def get_by_type(db: Session, data_source_type: DataSourceType) -> List[DataSource]:
        """根据类型获取数据源"""
        return db.query(DataSource).filter(DataSource.type == data_source_type).all()
    
    @staticmethod
    def update(db: Session, data_source_id: int, data_source_update: DataSourceUpdate) -> Optional[DataSource]:
        """更新数据源信息"""
        db_data_source = db.query(DataSource).filter(DataSource.id == data_source_id).first()
        if not db_data_source:
            return None
        
        # 更新字段
        update_data = data_source_update.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(db_data_source, field, value)
        
        db.commit()
        db.refresh(db_data_source)
        return db_data_source
    
    @staticmethod
    def delete(db: Session, data_source_id: int, cascade: bool = False) -> dict:
        """
        删除数据源
        
        Args:
            db: 数据库会话
            data_source_id: 数据源ID
            cascade: 是否级联删除关联的表元数据
            
        Returns:
            dict: 包含删除结果的字典
                - success: 是否删除成功
                - message: 操作消息
                - deleted_tables_count: 删除的表数量（如果级联删除）
                
        Raises:
            ValueError: 当无法删除且不进行级联删除时
        """
        db_data_source = db.query(DataSource).filter(DataSource.id == data_source_id).first()
        if not db_data_source:
            return {"success": False, "message": "数据源不存在"}
        
        deleted_tables_count = 0
        # 如果有关联的表元数据
        if db_data_source.tables:
            if cascade:
                # 完整的级联删除逻辑
                deleted_tables_count = len(db_data_source.tables)
                # 逐个表进行级联删除
                for table in list(db_data_source.tables):
                    # 先删除表关联的列元数据
                    if hasattr(table, 'columns'):
                        for column in list(table.columns):
                            db.delete(column)
                    # 删除表关联的血缘关系数据
                    # 导入LineageRelation模型
                    from models import LineageRelation
                    # 删除所有引用此表的血缘关系记录
                    lineage_relations = db.query(LineageRelation).filter(
                        (LineageRelation.source_table_id == table.id) | 
                        (LineageRelation.target_table_id == table.id)
                    ).all()
                    for relation in lineage_relations:
                        db.delete(relation)
                    # 再删除表元数据
                    db.delete(table)
            else:
                # 不进行级联删除，抛出更友好的错误
                table_names = [table.name for table in db_data_source.tables[:5]]  # 只显示前5个表名
                if len(db_data_source.tables) > 5:
                    table_names.append(f"等共{len(db_data_source.tables)}个表")
                table_names_str = ", ".join(table_names)
                raise ValueError(f"无法删除，该数据源下存在表元数据：{table_names_str}。如需删除，请使用级联删除选项。")
        
        db.delete(db_data_source)
        db.commit()
        
        result = {"success": True, "message": "数据源删除成功"}
        if cascade and deleted_tables_count > 0:
            result["deleted_tables_count"] = deleted_tables_count
            result["message"] += f"，同时删除了{deleted_tables_count}个关联的表元数据"
        
        return result