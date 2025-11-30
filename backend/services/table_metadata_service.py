from typing import List, Optional
from sqlalchemy.orm import Session, joinedload
from models import TableMetadata
from models.schemas import TableMetadataCreate, TableMetadataUpdate

class TableMetadataService:
    """表元数据服务类，提供表元数据管理的业务逻辑"""
    
    @staticmethod
    def create(db: Session, table_metadata: TableMetadataCreate) -> TableMetadata:
        """创建新表元数据，包括关联的列数据"""
        import logging
        logger = logging.getLogger(__name__)
        
        logger.info(f"开始创建表元数据: {table_metadata.name}")
        logger.info(f"收到的创建数据: {table_metadata.model_dump()}")
        
        # 检查同名表是否已存在于同一数据源
        existing = db.query(TableMetadata).filter(
            TableMetadata.name == table_metadata.name,
            TableMetadata.data_source_id == table_metadata.data_source_id,
            TableMetadata.schema_name == table_metadata.schema_name
        ).first()
        if existing:
            logger.error(f"表已存在: {table_metadata.name}")
            raise ValueError(f"表 '{table_metadata.name}' 已存在于该数据源")
        
        # 分离表数据和列数据
        table_data = table_metadata.model_dump()
        columns = table_data.pop('columns', [])
        
        logger.info(f"处理后的表数据: {table_data}")
        logger.info(f"处理后的列数据: {columns}")
        
        # 创建新表元数据
        db_table = TableMetadata(**table_data)
        db.add(db_table)
        db.commit()
        db.refresh(db_table)
        
        logger.info(f"表创建成功，table_id={db_table.id}")
        
        # 添加列数据
        from models import ColumnMetadata
        for column_data in columns:
            # 确保is_primary_key是整数类型
            if isinstance(column_data.get('is_primary_key'), bool):
                column_data['is_primary_key'] = 1 if column_data['is_primary_key'] else 0
                logger.info(f"转换is_primary_key为整数: {column_data['is_primary_key']}")
            
            # 创建新列
            logger.info(f"创建新列: {column_data['name']}")
            db_column = ColumnMetadata(
                table_id=db_table.id,
                **column_data
            )
            db.add(db_column)
            logger.info(f"添加列到数据库: {column_data['name']}")
        
        db.commit()
        db.refresh(db_table)
        logger.info(f"表创建完成，table_id={db_table.id}")
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
            # 在表名和描述中搜索关键词
            query = query.filter(
                (TableMetadata.name.ilike(f'%{keyword}%')) |
                (TableMetadata.description.ilike(f'%{keyword}%') if TableMetadata.description else False)
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
        """根据名称和数据源获取表元数据，支持大小写不敏感匹配"""
        from sqlalchemy import func
        query = db.query(TableMetadata).filter(
            func.lower(TableMetadata.name) == func.lower(name),
            TableMetadata.data_source_id == data_source_id
        )
        if schema_name is not None:
            query = query.filter(func.lower(TableMetadata.schema_name) == func.lower(schema_name))
        return query.first()
    
    @staticmethod
    def update(db: Session, table_id: int, table_update: TableMetadataUpdate) -> Optional[TableMetadata]:
        """更新表元数据，包括关联的列数据"""
        import logging
        logger = logging.getLogger(__name__)
        
        logger.info(f"开始更新表元数据，table_id={table_id}")
        logger.info(f"收到的更新数据: {table_update.model_dump()}")
        
        db_table = db.query(TableMetadata).options(joinedload(TableMetadata.columns)).filter(TableMetadata.id == table_id).first()
        if not db_table:
            logger.error(f"表不存在，table_id={table_id}")
            return None
        
        # 更新基本字段
        update_data = table_update.model_dump(exclude_unset=True)
        logger.info(f"处理后的更新数据: {update_data}")
        
        # 处理列数据
        if 'columns' in update_data:
            logger.info(f"开始处理列数据，共{len(update_data['columns'])}列")
            
            columns = update_data.pop('columns')
            from models import ColumnMetadata, ColumnLineageRelation
            
            # 获取现有列的ID映射
            existing_columns = {column.id: column for column in db_table.columns}
            
            # 1. 处理所有提交的列
            for i, column_data in enumerate(columns):
                logger.info(f"处理第{i+1}列数据: {column_data}")
                
                # 确保is_primary_key是整数类型
                if isinstance(column_data.get('is_primary_key'), bool):
                    column_data['is_primary_key'] = 1 if column_data['is_primary_key'] else 0
                    logger.info(f"转换is_primary_key为整数: {column_data['is_primary_key']}")
                
                if 'id' in column_data and column_data['id'] is not None and column_data['id'] in existing_columns:
                    # 情况1：这是一个现有列，需要更新
                    existing_column = existing_columns[column_data['id']]
                    
                    # 更新列属性
                    for field, value in column_data.items():
                        if field != 'id':  # 不更新ID
                            setattr(existing_column, field, value)
                    
                    logger.info(f"更新现有列: {existing_column.name}, id={existing_column.id}")
                    # 从现有列映射中移除，剩下的就是需要删除的列
                    del existing_columns[column_data['id']]
                else:
                    # 情况2：这是一个新增列，需要添加
                    logger.info(f"创建新列: {column_data['name']}")
                    new_column = ColumnMetadata(
                        table_id=table_id,
                        **column_data
                    )
                    db.add(new_column)
                    logger.info(f"添加列到数据库: {column_data['name']}")
            
            # 2. 删除不再存在的列（existing_columns中剩下的列）
            for column_id, column in existing_columns.items():
                logger.info(f"检查列是否有血缘关系: {column.name}, id={column.id}")
                
                # 检查该列是否有血缘关系关联
                source_relations_count = db.query(ColumnLineageRelation).filter(ColumnLineageRelation.source_column_id == column_id).count()
                target_relations_count = db.query(ColumnLineageRelation).filter(ColumnLineageRelation.target_column_id == column_id).count()
                
                if source_relations_count > 0 or target_relations_count > 0:
                    # 该列有血缘关系关联，不允许删除
                    logger.error(f"列 {column.name} 有血缘关系关联，无法删除")
                    raise ValueError(f"列 '{column.name}' 存在血缘关系，无法删除")
                
                # 该列没有血缘关系关联，可以删除
                logger.info(f"删除不再存在的列: {column.name}, id={column.id}")
                db.delete(column)
        
        # 更新剩余的基本字段
        logger.info(f"更新基本字段: {update_data}")
        for field, value in update_data.items():
            logger.info(f"更新字段 {field}: {value}")
            setattr(db_table, field, value)
        
        logger.info("提交数据库事务")
        db.commit()
        logger.info("刷新数据库对象")
        db.refresh(db_table)
        logger.info(f"表更新完成，table_id={table_id}")
        return db_table
    
    @staticmethod
    def delete(db: Session, table_id: int) -> bool:
        """删除表元数据"""
        db_table = db.query(TableMetadata).filter(TableMetadata.id == table_id).first()
        if not db_table:
            return False
        
        # 检查是否有关联的血缘关系
        # 1. 检查是否作为目标表参与血缘关系
        if db_table.target_relationships:
            raise ValueError("无法删除，该表作为目标表参与血缘关系")
        
        # 2. 检查是否作为源表参与血缘关系
        from models import LineageRelation
        source_relations = db.query(LineageRelation).all()
        for relation in source_relations:
            if isinstance(relation.source_table_ids, list) and table_id in relation.source_table_ids:
                raise ValueError("无法删除，该表作为源表参与血缘关系")
        
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