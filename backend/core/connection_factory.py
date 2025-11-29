from typing import Dict, Any, Optional
import cx_Oracle
from elasticsearch import Elasticsearch
from pymongo import MongoClient
import logging
from config.settings import settings

logger = logging.getLogger(__name__)

class ConnectionFactory:
    """数据源连接工厂类，负责创建和管理不同类型数据源的连接"""
    
    # 存储已创建的连接对象，避免重复创建
    _connections: Dict[str, Any] = {}
    
    @classmethod
    def get_connection(cls, data_source_type: str, connection_params: Dict[str, Any]) -> Any:
        """
        根据数据源类型和连接参数获取连接对象
        
        Args:
            data_source_type: 数据源类型（ORACLE、ELASTICSEARCH、MONGODB）
            connection_params: 连接参数
            
        Returns:
            对应的数据库连接对象
            
        Raises:
            ValueError: 不支持的数据源类型
            Exception: 连接失败
        """
        # 生成连接ID，用于缓存连接
        connection_id = f"{data_source_type.lower()}_{hash(str(connection_params))}"
        
        # 检查是否已有缓存的连接
        if connection_id in cls._connections:
            try:
                # 验证连接是否有效
                cls._validate_connection(data_source_type, cls._connections[connection_id])
                return cls._connections[connection_id]
            except Exception as e:
                logger.warning(f"连接验证失败，重新创建连接: {e}")
                # 移除无效连接
                del cls._connections[connection_id]
        
        # 创建新连接
        try:
            if data_source_type.upper() == "ORACLE":
                connection = cls._create_oracle_connection(connection_params)
            elif data_source_type.upper() == "ELASTICSEARCH":
                connection = cls._create_elasticsearch_connection(connection_params)
            elif data_source_type.upper() == "MONGODB":
                connection = cls._create_mongodb_connection(connection_params)
            else:
                raise ValueError(f"不支持的数据源类型: {data_source_type}")
            
            # 缓存连接
            cls._connections[connection_id] = connection
            return connection
        except Exception as e:
            logger.error(f"创建连接失败: {e}")
            raise
    
    @staticmethod
    def _validate_connection(data_source_type: str, connection: Any) -> bool:
        """验证连接是否有效"""
        try:
            if data_source_type.upper() == "ORACLE":
                # 验证Oracle连接
                if not connection.is_connected():
                    connection.connect()
                cursor = connection.cursor()
                cursor.execute("SELECT 1 FROM DUAL")
                cursor.close()
                return True
            elif data_source_type.upper() == "ELASTICSEARCH":
                # 验证Elasticsearch连接
                return connection.ping()
            elif data_source_type.upper() == "MONGODB":
                # 验证MongoDB连接
                connection.admin.command('ping')
                return True
            return False
        except Exception:
            return False
    
    @staticmethod
    def _create_oracle_connection(params: Dict[str, Any]) -> cx_Oracle.Connection:
        """
        创建Oracle数据库连接
        
        参数需包含：host, port, service_name, user, password
        """
        dsn = cx_Oracle.makedsn(
            params.get("host", "localhost"),
            params.get("port", 1521),
            service_name=params.get("service_name", "ORCLPDB1")
        )
        
        connection = cx_Oracle.connect(
            user=params.get("user"),
            password=params.get("password"),
            dsn=dsn
        )
        
        # 设置会话参数
        cursor = connection.cursor()
        cursor.execute("ALTER SESSION SET NLS_LANGUAGE='SIMPLIFIED CHINESE'")
        cursor.execute("ALTER SESSION SET NLS_TERRITORY='CHINA'")
        cursor.close()
        
        return connection
    
    @staticmethod
    def _create_elasticsearch_connection(params: Dict[str, Any]) -> Elasticsearch:
        """
        创建Elasticsearch连接
        
        参数需包含：hosts, 可能包含用户名密码或证书等
        """
        # 构建Elasticsearch连接参数
        es_params = {
            'hosts': params.get('hosts', ['localhost:9200'])
        }
        
        # 添加认证信息
        if 'http_auth' in params:
            es_params['http_auth'] = params['http_auth']
        elif 'username' in params and 'password' in params:
            es_params['http_auth'] = (params['username'], params['password'])
        
        # 添加SSL设置
        if params.get('use_ssl', False):
            es_params['use_ssl'] = True
            if 'verify_certs' in params:
                es_params['verify_certs'] = params['verify_certs']
            if 'ca_certs' in params:
                es_params['ca_certs'] = params['ca_certs']
        
        # 创建连接
        es = Elasticsearch(**es_params)
        
        # 验证连接
        if not es.ping():
            raise Exception("无法连接到Elasticsearch服务器")
        
        return es
    
    @staticmethod
    def _create_mongodb_connection(params: Dict[str, Any]) -> MongoClient:
        """
        创建MongoDB连接
        
        参数需包含：uri或host和port，可能包含用户名密码等
        """
        # 优先使用uri
        if 'uri' in params:
            client = MongoClient(params['uri'])
        else:
            # 构建连接参数
            mongo_params = {
                'host': params.get('host', 'localhost'),
                'port': params.get('port', 27017)
            }
            
            # 添加认证信息
            if 'username' in params and 'password' in params:
                mongo_params['username'] = params['username']
                mongo_params['password'] = params['password']
                if 'authSource' in params:
                    mongo_params['authSource'] = params['authSource']
            
            client = MongoClient(**mongo_params)
        
        # 验证连接
        client.admin.command('ping')
        
        return client
    
    @classmethod
    def close_connection(cls, data_source_type: str, connection_params: Dict[str, Any]) -> None:
        """关闭指定的连接"""
        connection_id = f"{data_source_type.lower()}_{hash(str(connection_params))}"
        if connection_id in cls._connections:
            try:
                cls._connections[connection_id].close()
            except Exception as e:
                logger.error(f"关闭连接失败: {e}")
            finally:
                del cls._connections[connection_id]
    
    @classmethod
    def close_all_connections(cls) -> None:
        """关闭所有缓存的连接"""
        for connection_id, connection in list(cls._connections.items()):
            try:
                connection.close()
            except Exception as e:
                logger.error(f"关闭连接 {connection_id} 失败: {e}")
            finally:
                if connection_id in cls._connections:
                    del cls._connections[connection_id]