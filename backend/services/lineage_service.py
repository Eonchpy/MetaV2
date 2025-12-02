from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session, joinedload
from models import LineageRelation, ColumnLineageRelation, TableMetadata, ColumnMetadata
from models.schemas import (
    LineageRelationCreate, 
    LineageRelationUpdate,
    ColumnLineageRelationCreate,
    ColumnLineageRelationUpdate,
    LineageGraphNode,
    LineageGraphEdge,
    LineageGraphResponse,
    DataSourceType,
    LineageNode
)
import networkx as nx
import logging

# 配置日志
logger = logging.getLogger(__name__)

class LineageService:
    """血缘关系服务类，提供表级和列级血缘关系管理的业务逻辑"""
    
    # 表级血缘关系方法
    @staticmethod
    def create_table_lineage(db: Session, lineage: LineageRelationCreate) -> LineageRelation:
        """创建表级血缘关系"""
        try:
            # 记录传入的参数
            logger.info(f"开始创建表级血缘关系，传入参数: source_table_ids={lineage.source_table_ids}, target_table_id={lineage.target_table_id}, relation_type={lineage.relation_type}, description={lineage.description}")
            
            # 检查源表和目标表是否存在
            logger.info(f"检查源表是否存在，源表ID列表: {lineage.source_table_ids}")
            for source_table_id in lineage.source_table_ids:
                source_table = db.query(TableMetadata).filter(TableMetadata.id == source_table_id).first()
                if not source_table:
                    logger.error(f"源表ID {source_table_id} 不存在")
                    raise ValueError(f"源表ID {source_table_id} 不存在")
                logger.info(f"源表ID {source_table_id} 存在，表名: {source_table.name}")
        
            logger.info(f"检查目标表是否存在，目标表ID: {lineage.target_table_id}")
            target_table = db.query(TableMetadata).filter(TableMetadata.id == lineage.target_table_id).first()
            if not target_table:
                logger.error(f"目标表ID {lineage.target_table_id} 不存在")
                raise ValueError(f"目标表ID {lineage.target_table_id} 不存在")
            logger.info(f"目标表ID {lineage.target_table_id} 存在，表名: {target_table.name}")
        
            # 检查相同的血缘关系是否已存在
            logger.info("检查是否存在重复的血缘关系")
            existing = db.query(LineageRelation).filter(
                LineageRelation.target_table_id == lineage.target_table_id
            ).first()
            
            if existing:
                logger.info(f"找到目标表的现有血缘关系，目标表ID: {lineage.target_table_id}，现有血缘关系ID: {existing.id}")
            else:
                logger.info(f"未找到目标表的现有血缘关系，目标表ID: {lineage.target_table_id}")
        
            # 创建新的表级血缘关系
            logger.info("创建新的表级血缘关系对象")
            lineage_data = lineage.model_dump()
            logger.info(f"血缘关系数据: {lineage_data}")
            db_lineage = LineageRelation(**lineage_data)
            
            logger.info("将血缘关系对象添加到数据库会话")
            db.add(db_lineage)
            
            logger.info("提交数据库事务")
            db.commit()
            
            logger.info("刷新对象以获取数据库生成的ID")
            db.refresh(db_lineage)
            
            logger.info(f"表级血缘关系创建成功，ID: {db_lineage.id}")
            return db_lineage
        
        except Exception as e:
            logger.error(f"创建表级血缘关系时发生错误: {str(e)}", exc_info=True)
            db.rollback()
            raise
    
    @staticmethod
    def get_table_lineage_by_id(db: Session, lineage_id: int) -> Optional[LineageRelation]:
        """根据ID获取表级血缘关系"""
        return db.query(LineageRelation).filter(LineageRelation.id == lineage_id).first()
    
    @staticmethod
    def get_table_lineages_by_source(db: Session, source_table_id: int) -> List[LineageRelation]:
        """获取源表的所有出向血缘关系"""
        # 对于SQLite，我们需要手动筛选，因为它不支持json_contains函数
        all_lineages = db.query(LineageRelation).all()
        result = []
        for lineage in all_lineages:
            # 确保source_table_ids是列表
            if isinstance(lineage.source_table_ids, list) and source_table_id in lineage.source_table_ids:
                result.append(lineage)
        return result
    
    @staticmethod
    def get_table_lineages_by_target(db: Session, target_table_id: int, source_table_ids: List[int] = None) -> List[LineageRelation]:
        """获取目标表的所有入向血缘关系
        
        Args:
            db: 数据库会话
            target_table_id: 目标表ID
            source_table_ids: 可选的源表ID列表，用于筛选特定源表到目标表的血缘关系
            
        Returns:
            符合条件的表级血缘关系列表
        """
        # 先获取目标表的所有血缘关系
        relations = db.query(LineageRelation).filter(
            LineageRelation.target_table_id == target_table_id
        ).all()
        
        # 如果指定了源表ID列表，则使用Python进行筛选
        if source_table_ids:
            result = []
            for relation in relations:
                # 确保source_table_ids是列表
                if isinstance(relation.source_table_ids, list):
                    # 检查是否包含所有指定的源表ID
                    if all(src_id in relation.source_table_ids for src_id in source_table_ids):
                        result.append(relation)
            return result
        
        return relations
    
    @staticmethod
    def get_table_lineage_upstream(db: Session, table_id: int, depth: int = 1) -> List[LineageNode]:
        """获取表的上游血缘关系，包含指定深度"""
        # 验证表是否存在
        table = db.query(TableMetadata).filter(TableMetadata.id == table_id).first()
        if not table:
            raise ValueError(f"表ID {table_id} 不存在")
        
        # 存储已访问的表，避免循环依赖
        visited = set()
        result = []
        
        def dfs(current_id, current_depth):
            if current_depth > depth or current_id in visited:
                return
            
            visited.add(current_id)
            
            # 获取当前表作为目标表的所有血缘关系
            relations = db.query(LineageRelation).filter(
                LineageRelation.target_table_id == current_id
            ).all()
            
            for relation in relations:
                # 处理多个源表
                for source_table_id in relation.source_table_ids:
                    source_table = db.query(TableMetadata).options(
                        joinedload(TableMetadata.data_source)
                    ).filter(TableMetadata.id == source_table_id).first()
                    
                    if source_table:
                        # 创建源表节点
                        source_node = LineageNode(
                            id=source_table.id,
                            name=source_table.name,
                            table_type=source_table.data_source.type if source_table.data_source else None,
                            data_source=source_table.data_source.name if source_table.data_source else None,
                            description=source_table.description,
                            layer=current_depth,
                            relation_type=relation.relation_type,
                            relation_description=relation.description,
                            upstream=[],
                            downstream=[source_table.id]
                        )
                        result.append(source_node)
                        
                        # 递归获取源表的上游
                        dfs(source_table.id, current_depth + 1)
        
        dfs(table_id, 1)
        return result
        
    @staticmethod
    def get_table_lineage_downstream(db: Session, table_id: int, depth: int = 1) -> List[LineageNode]:
        """获取表的下游血缘关系，包含指定深度"""
        # 验证表是否存在
        table = db.query(TableMetadata).filter(TableMetadata.id == table_id).first()
        if not table:
            raise ValueError(f"表ID {table_id} 不存在")
        
        # 存储已访问的表，避免循环依赖
        visited = set()
        result = []
        
        def dfs(current_id, current_depth):
            if current_depth > depth or current_id in visited:
                return
            
            visited.add(current_id)
            
            # 查询所有血缘关系，然后筛选包含当前表ID的记录
            all_relations = db.query(LineageRelation).all()
            relations = [r for r in all_relations if current_id in r.source_table_ids]
            
            for relation in relations:
                # 获取目标表信息
                target_table = db.query(TableMetadata).options(
                    joinedload(TableMetadata.data_source)
                ).filter(TableMetadata.id == relation.target_table_id).first()
                
                if target_table:
                    # 创建目标表节点
                        target_node = LineageNode(
                            id=target_table.id,
                            name=target_table.name,
                            table_type=target_table.data_source.type if target_table.data_source else None,
                            data_source=target_table.data_source.name if target_table.data_source else None,
                            description=target_table.description,
                            layer=current_depth,
                            relation_type=relation.relation_type,
                            relation_description=relation.description,
                            upstream=[current_id],
                            downstream=[]
                        )
                        result.append(target_node)
                    
                    # 递归获取目标表的下游
                        dfs(target_table.id, current_depth + 1)
        
        dfs(table_id, 1)
        return result
    
    @staticmethod
    def update_table_lineage(db: Session, lineage_id: int, lineage_update: LineageRelationUpdate) -> Optional[LineageRelation]:
        """更新表级血缘关系"""
        db_lineage = db.query(LineageRelation).filter(LineageRelation.id == lineage_id).first()
        if not db_lineage:
            return None
        
        # 更新字段
        update_data = lineage_update.model_dump(exclude_unset=True)
        
        # 如果更新源表，需要验证所有源表是否存在
        if 'source_table_ids' in update_data:
            for source_table_id in update_data['source_table_ids']:
                source_table = db.query(TableMetadata).filter(TableMetadata.id == source_table_id).first()
                if not source_table:
                    raise ValueError(f"源表ID {source_table_id} 不存在")
        
        # 如果更新目标表，需要验证目标表是否存在
        if 'target_table_id' in update_data:
            target_table = db.query(TableMetadata).filter(TableMetadata.id == update_data['target_table_id']).first()
            if not target_table:
                raise ValueError(f"目标表ID {update_data['target_table_id']} 不存在")
        
        for field, value in update_data.items():
            setattr(db_lineage, field, value)
        
        db.commit()
        db.refresh(db_lineage)
        return db_lineage
    
    @staticmethod
    def delete_table_lineage(db: Session, lineage_id: int) -> bool:
        """删除表级血缘关系"""
        db_lineage = db.query(LineageRelation).filter(LineageRelation.id == lineage_id).first()
        if not db_lineage:
            return False
        
        # 先删除关联的列级血缘关系
        db.query(ColumnLineageRelation).filter(
            ColumnLineageRelation.lineage_relation_id == lineage_id
        ).delete()
        
        db.delete(db_lineage)
        db.commit()
        return True
    
    # 列级血缘关系方法
    @staticmethod
    def create_column_lineage(db: Session, column_lineage: ColumnLineageRelationCreate) -> ColumnLineageRelation:
        """创建列级血缘关系"""
        # 检查表级血缘关系是否存在
        lineage_relation = db.query(LineageRelation).filter(
            LineageRelation.id == column_lineage.lineage_relation_id
        ).first()
        
        if not lineage_relation:
            raise ValueError(f"表级血缘关系ID {column_lineage.lineage_relation_id} 不存在")
        
        # 检查源列和目标列是否存在
        source_column = db.query(ColumnMetadata).filter(
            ColumnMetadata.id == column_lineage.source_column_id
        ).first()
        target_column = db.query(ColumnMetadata).filter(
            ColumnMetadata.id == column_lineage.target_column_id
        ).first()
        
        if not source_column:
            raise ValueError(f"源列ID {column_lineage.source_column_id} 不存在")
        if not target_column:
            raise ValueError(f"目标列ID {column_lineage.target_column_id} 不存在")
        
        # 检查列是否属于对应的表
        # 确保获取实际的Python值而不是SQLAlchemy表达式
        # 使用对象的字典属性或getattr来获取实际值
        source_table_id_value = getattr(source_column, 'table_id', None)
        # 根据前面的代码，应该是source_table_ids而不是source_table_id
        lineage_source_table_ids = getattr(lineage_relation, 'source_table_ids', [])
        
        # 确保值不为None并且是可比较的类型
        if source_table_id_value is None or not lineage_source_table_ids:
            raise ValueError("表ID信息不完整")
            
        # 检查源表ID是否在源表ID列表中
        if str(source_table_id_value) not in [str(id) for id in lineage_source_table_ids]:
            raise ValueError("源列不属于源表")
        
        target_table_id_value = getattr(target_column, 'table_id', None)
        lineage_target_table_id = getattr(lineage_relation, 'target_table_id', None)
        
        if target_table_id_value is None or lineage_target_table_id is None:
            raise ValueError("表ID信息不完整")
            
        if str(target_table_id_value) != str(lineage_target_table_id):
            raise ValueError("目标列不属于目标表")
        
        # 检查相同的列级血缘关系是否已存在
        existing = db.query(ColumnLineageRelation).filter(
            ColumnLineageRelation.source_column_id == column_lineage.source_column_id,
            ColumnLineageRelation.target_column_id == column_lineage.target_column_id
        ).first()
        
        if existing:
            raise ValueError("该列级血缘关系已存在")
        
        # 创建新的列级血缘关系
        db_column_lineage = ColumnLineageRelation(**column_lineage.model_dump())
        db.add(db_column_lineage)
        db.commit()
        db.refresh(db_column_lineage)
        return db_column_lineage
    
    @staticmethod
    def get_column_lineage_by_id(db: Session, column_lineage_id: int) -> Optional[ColumnLineageRelation]:
        """根据ID获取列级血缘关系"""
        return db.query(ColumnLineageRelation).filter(
            ColumnLineageRelation.id == column_lineage_id
        ).first()
    
    @staticmethod
    def get_column_lineages_by_lineage_relation(db: Session, lineage_relation_id: int) -> List[ColumnLineageRelation]:
        """获取表级血缘关系下的所有列级血缘关系"""
        return db.query(ColumnLineageRelation).filter(
            ColumnLineageRelation.lineage_relation_id == lineage_relation_id
        ).all()
    
    @staticmethod
    def update_column_lineage(db: Session, column_lineage_id: int, column_lineage_update: ColumnLineageRelationUpdate) -> Optional[ColumnLineageRelation]:
        """更新列级血缘关系"""
        db_column_lineage = db.query(ColumnLineageRelation).filter(
            ColumnLineageRelation.id == column_lineage_id
        ).first()
        if not db_column_lineage:
            return None
        
        # 更新字段
        update_data = column_lineage_update.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(db_column_lineage, field, value)
        
        db.commit()
        db.refresh(db_column_lineage)
        return db_column_lineage
    
    @staticmethod
    def delete_column_lineage(db: Session, column_lineage_id: int) -> bool:
        """删除列级血缘关系"""
        db_column_lineage = db.query(ColumnLineageRelation).filter(
            ColumnLineageRelation.id == column_lineage_id
        ).first()
        if not db_column_lineage:
            return False
        
        db.delete(db_column_lineage)
        db.commit()
        return True
    
    # 血缘关系可视化方法
    @staticmethod
    def get_table_lineage_graph(db: Session, table_id: int, depth: int = 2, direction: str = "both") -> dict:
        """获取表的血缘关系图数据，包括上下游指定深度的表
        
        Args:
            db: 数据库会话
            table_id: 起始表ID
            depth: 获取的深度，默认为2
            direction: 方向，可选值："up"/"upstream"（只获取上游）、"down"/"downstream"（只获取下游）、"both"（获取双向），默认为"both"
        
        Returns:
            包含nodes和edges的字典，nodes包含表节点信息，edges包含血缘关系边信息
        """
        # 确保输入参数正确
        if isinstance(table_id, str):
            table_id = int(table_id)
        
        # 统一方向参数格式，将"upstream"转换为"up"，"downstream"转换为"down"
        direction_map = {
            "upstream": "up",
            "downstream": "down",
            "up": "up",
            "down": "down",
            "both": "both"
        }
        direction = direction_map.get(direction.lower(), "both")
        
        # 获取起始表
        start_table = db.query(TableMetadata).filter(TableMetadata.id == table_id).first()
        if not start_table:
            return {"nodes": [], "edges": []}
        
        # 获取所有血缘关系
        all_relations = db.query(LineageRelation).all()
        
        # 将血缘关系转换为字典，便于查询
        # key: (source_id, target_id), value: relation
        relation_dict = {}
        # 源表到目标表的映射
        source_to_targets = {}
        # 目标表到源表的映射
        target_to_sources = {}
        
        for relation in all_relations:
            try:
                # 解析source_table_ids和target_table_id
                source_ids = []
                target_id = None
                
                # 解析source_table_ids
                if hasattr(relation, 'source_table_ids'):
                    src_data = relation.source_table_ids
                    if isinstance(src_data, list):
                        source_ids = [int(src_id) for src_id in src_data if isinstance(src_id, (int, str))]
                    elif isinstance(src_data, str):
                        # 尝试分割字符串
                        if ',' in src_data:
                            source_ids = [int(s.strip()) for s in src_data.split(',') if s.strip().isdigit()]
                        else:
                            source_ids = [int(src_data)] if src_data.isdigit() else []
                
                # 解析target_table_id
                if hasattr(relation, 'target_table_id') and relation.target_table_id:
                    try:
                        target_id = int(relation.target_table_id)
                    except (ValueError, TypeError):
                        continue
                
                if not source_ids or target_id is None:
                    continue
                
                # 构建映射关系
                for src_id in source_ids:
                    # 源表到目标表的映射
                    if src_id not in source_to_targets:
                        source_to_targets[src_id] = []
                    source_to_targets[src_id].append(target_id)
                    
                    # 目标表到源表的映射
                    if target_id not in target_to_sources:
                        target_to_sources[target_id] = []
                    target_to_sources[target_id].append(src_id)
                    
                    # 关系字典
                    relation_dict[(src_id, target_id)] = relation
            except Exception as e:
                logger.error(f"Error processing relation: {e}")
                continue
        
        # 初始化结果
        nodes = []
        edges = []
        node_ids = set()
        edge_keys = set()
        
        # 首先添加起始节点
        nodes.append({
            "id": table_id,
            "name": start_table.name or f"表_{table_id}",
            "type": "table"
        })
        node_ids.add(table_id)
        
        # 递归获取多跳链路
        def get_lineage(current_id, current_depth, visited):
            if current_depth >= depth:
                return
            
            # 标记当前节点为已访问
            visited.add(current_id)
            
            # 获取上游节点（如果方向允许）
            if direction in ["up", "both"] and current_id in target_to_sources:
                for source_id in target_to_sources[current_id]:
                    if source_id not in visited:
                        # 添加源表节点
                        if source_id not in node_ids:
                            src_table = db.query(TableMetadata).filter(TableMetadata.id == source_id).first()
                            if src_table:
                                nodes.append({
                                    "id": source_id,
                                    "name": src_table.name or f"表_{source_id}",
                                    "type": "table"
                                })
                                node_ids.add(source_id)
                        
                        # 添加边
                        edge_key = f"{source_id}_{current_id}_{relation_dict.get((source_id, current_id), '').id if (source_id, current_id) in relation_dict and hasattr(relation_dict[(source_id, current_id)], 'id') else 'unknown'}"
                        if edge_key not in edge_keys:
                            relation = relation_dict.get((source_id, current_id))
                            rel_type = "关联"
                            if relation and hasattr(relation, 'relation_type') and isinstance(relation.relation_type, str):
                                rel_type = relation.relation_type
                            
                            edge = {
                                "id": relation.id if relation and hasattr(relation, 'id') else hash(edge_key),
                                "source": source_id,
                                "target": current_id,
                                "type": "table_lineage",
                                "relation_type": rel_type
                            }
                            edges.append(edge)
                            edge_keys.add(edge_key)
                        
                        # 递归获取上游
                        get_lineage(source_id, current_depth + 1, visited.copy())
            
            # 获取下游节点（如果方向允许）
            if direction in ["down", "both"] and current_id in source_to_targets:
                for target_id in source_to_targets[current_id]:
                    if target_id not in visited:
                        # 添加目标表节点
                        if target_id not in node_ids:
                            tgt_table = db.query(TableMetadata).filter(TableMetadata.id == target_id).first()
                            if tgt_table:
                                nodes.append({
                                    "id": target_id,
                                    "name": tgt_table.name or f"表_{target_id}",
                                    "type": "table"
                                })
                                node_ids.add(target_id)
                        
                        # 添加边
                        edge_key = f"{current_id}_{target_id}_{relation_dict.get((current_id, target_id), '').id if (current_id, target_id) in relation_dict and hasattr(relation_dict[(current_id, target_id)], 'id') else 'unknown'}"
                        if edge_key not in edge_keys:
                            relation = relation_dict.get((current_id, target_id))
                            rel_type = "关联"
                            if relation and hasattr(relation, 'relation_type') and isinstance(relation.relation_type, str):
                                rel_type = relation.relation_type
                            
                            edge = {
                                "id": relation.id if relation and hasattr(relation, 'id') else hash(edge_key),
                                "source": current_id,
                                "target": target_id,
                                "type": "table_lineage",
                                "relation_type": rel_type
                            }
                            edges.append(edge)
                            edge_keys.add(edge_key)
                        
                        # 递归获取下游
                        get_lineage(target_id, current_depth + 1, visited.copy())
        
        # 开始递归获取多跳链路
        get_lineage(table_id, 0, set())
        
        # 构建最终结果
        result = {
            "nodes": nodes,
            "edges": edges
        }
        
        return result
    
    @staticmethod
    def get_column_lineage_graph(db: Session, column_id: int, depth: int = 2, direction: str = "both") -> LineageGraphResponse:
        """获取列的血缘关系图数据，包括上下游指定深度的列
        
        Args:
            db: 数据库会话
            column_id: 起始列ID
            depth: 获取的深度，默认为2
            direction: 方向，可选值："up"/"upstream"（只获取上游）、"down"/"downstream"（只获取下游）、"both"（获取双向），默认为"both"
        
        Returns:
            包含nodes和edges的LineageGraphResponse对象
        """
        # 创建图
        G = nx.DiGraph()
        column_nodes = set()
        table_nodes = set()
        column_edges = set()
        table_column_edges = set()  # 连接表和列的边
        
        # 统一方向参数格式，将"upstream"转换为"up"，"downstream"转换为"down"
        direction_map = {
            "upstream": "up",
            "downstream": "down",
            "up": "up",
            "down": "down",
            "both": "both"
        }
        direction = direction_map.get(direction.lower(), "both")
        
        # 递归获取上游列
        def get_upstream_columns(current_id: int, current_depth: int):
            if current_depth >= depth:
                return
            
            # 获取列级血缘关系
            upstream_relations = db.query(ColumnLineageRelation).options(
                joinedload(ColumnLineageRelation.source_column).joinedload(ColumnMetadata.table).joinedload(TableMetadata.data_source)
            ).filter(ColumnLineageRelation.target_column_id == current_id).all()
            
            for relation in upstream_relations:
                source_column = relation.source_column
                source_table = source_column.table
                
                # 添加列节点和表节点
                column_nodes.add(source_column.id)
                table_nodes.add(source_table.id)
                
                # 添加列级血缘关系边
                column_edges.add((source_column.id, current_id, relation.id))
                
                # 添加表和列的连接边
                table_column_edges.add((source_table.id, source_column.id))
                
                # 递归获取更上游的列
                get_upstream_columns(source_column.id, current_depth + 1)
        
        # 递归获取下游列
        def get_downstream_columns(current_id: int, current_depth: int):
            if current_depth >= depth:
                return
            
            # 获取列级血缘关系
            downstream_relations = db.query(ColumnLineageRelation).options(
                joinedload(ColumnLineageRelation.target_column).joinedload(ColumnMetadata.table).joinedload(TableMetadata.data_source)
            ).filter(ColumnLineageRelation.source_column_id == current_id).all()
            
            for relation in downstream_relations:
                target_column = relation.target_column
                target_table = target_column.table
                
                # 添加列节点和表节点
                column_nodes.add(target_column.id)
                table_nodes.add(target_table.id)
                
                # 添加列级血缘关系边
                column_edges.add((current_id, target_column.id, relation.id))
                
                # 添加表和列的连接边
                table_column_edges.add((target_table.id, target_column.id))
                
                # 递归获取更下游的列
                get_downstream_columns(target_column.id, current_depth + 1)
        
        # 获取起始列并添加到节点集合
        start_column = db.query(ColumnMetadata).options(
            joinedload(ColumnMetadata.table).joinedload(TableMetadata.data_source)
        ).filter(ColumnMetadata.id == column_id).first()
        
        if not start_column:
            raise ValueError(f"列ID {column_id} 不存在")
        
        start_table = start_column.table
        column_nodes.add(column_id)
        table_nodes.add(start_table.id)
        table_column_edges.add((start_table.id, column_id))
        
        # 根据方向获取列级血缘关系
        if direction in ["up", "both"]:
            get_upstream_columns(column_id, 0)
        if direction in ["down", "both"]:
            get_downstream_columns(column_id, 0)
        
        # 构建图响应数据
        node_list = []
        edge_list = []
        
        # 获取所有表详情
        tables = db.query(TableMetadata).options(
            joinedload(TableMetadata.data_source)
        ).filter(TableMetadata.id.in_(table_nodes)).all()
        
        # 获取所有列详情
        columns = db.query(ColumnMetadata).options(
            joinedload(ColumnMetadata.table)
        ).filter(ColumnMetadata.id.in_(column_nodes)).all()
        
        # 构建表节点列表
        table_dict = {}
        for table in tables:
            # 安全地获取表ID的整数值
            table_id_value = table.id
            # 检查是否是SQLAlchemy Column对象或其他非原始类型
            if hasattr(table_id_value, '__class__') and table_id_value.__class__.__name__ == 'Column' or 'InstrumentedAttribute' in str(type(table_id_value)):
                # 如果是Column对象，使用其属性字典中的值
                table_id_value = str(table_id_value)
            # 尝试转换为整数
            try:
                int_id = int(table_id_value)
                table_dict[int_id] = table
            except (ValueError, TypeError):
                # 如果转换失败，跳过此表
                continue
        # 构建表节点列表
        for table_id in table_nodes:
            table = table_dict.get(table_id)
            if table:
                node = LineageGraphNode(
                    id=table.id,
                    name=table.name,
                    type="table",
                    data_source=table.data_source.name if table.data_source else None,
                    data_source_type=table.data_source.type if table.data_source else None
                )
                node_list.append(node)
        
        # 构建列节点列表
        column_dict = {column.id: column for column in columns}
        for column_id in column_nodes:
            column = column_dict.get(column_id)
            if column:
                node = LineageGraphNode(
                    id=column.id,
                    name=f"{column.table.name}.{column.name}",
                    type="column",
                    data_source=column.table.data_source.name if column.table.data_source else None,
                    data_source_type=column.table.data_source.type if column.table.data_source else None
                )
                node_list.append(node)
        
        # 构建表和列的连接边
        for table_id, column_id in table_column_edges:
            edge = LineageGraphEdge(
                id=hash(f"t_{table_id}_c_{column_id}") & 0x7fffffff,  # 生成临时整数ID
                source=table_id,
                target=column_id,
                type="table_column_relation",
                relation_type="contains"
            )
            edge_list.append(edge)
        
        # 构建列级血缘关系边
        for source_id, target_id, relation_id in column_edges:
            edge = LineageGraphEdge(
                id=relation_id,
                source=source_id,
                target=target_id,
                type="column_lineage",
                relation_type="direct"
            )
            edge_list.append(edge)
        
        return LineageGraphResponse(nodes=node_list, edges=edge_list)