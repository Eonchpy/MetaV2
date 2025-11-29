from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from datetime import datetime
import json
import logging

from models.config import SystemConfig, ConfigType

logger = logging.getLogger(__name__)

class ConfigService:
    """配置管理服务类"""
    
    @staticmethod
    def get_config_by_type(db: Session, config_type: ConfigType) -> Dict[str, Any]:
        """根据配置类型获取所有配置项"""
        try:
            configs = db.query(SystemConfig).filter(
                SystemConfig.config_type == config_type
            ).all()
            
            result = {}
            for config in configs:
                # 尝试解析JSON值，如果失败则保留原始值
                try:
                    result[config.config_key] = json.loads(config.config_value)
                except json.JSONDecodeError:
                    result[config.config_key] = config.config_value
            
            return result
        except Exception as e:
            logger.error(f"获取配置失败: {e}")
            return {}
    
    @staticmethod
    def get_config_by_key(db: Session, config_type: ConfigType, config_key: str) -> Optional[Any]:
        """根据类型和键获取特定配置项"""
        try:
            config = db.query(SystemConfig).filter(
                SystemConfig.config_type == config_type,
                SystemConfig.config_key == config_key
            ).first()
            
            if config:
                # 尝试解析JSON值
                try:
                    return json.loads(config.config_value)
                except json.JSONDecodeError:
                    return config.config_value
            return None
        except Exception as e:
            logger.error(f"获取特定配置失败: {e}")
            return None
    
    @staticmethod
    def update_configs(db: Session, config_type: ConfigType, configs: Dict[str, Any]) -> bool:
        """批量更新配置项"""
        try:
            current_time = datetime.now().isoformat()
            
            for key, value in configs.items():
                # 将值序列化为JSON
                json_value = json.dumps(value, ensure_ascii=False)
                
                # 查找现有配置
                config = db.query(SystemConfig).filter(
                    SystemConfig.config_type == config_type,
                    SystemConfig.config_key == key
                ).first()
                
                if config:
                    # 更新现有配置
                    config.config_value = json_value
                    config.updated_at = current_time
                else:
                    # 创建新配置
                    new_config = SystemConfig(
                        config_type=config_type,
                        config_key=key,
                        config_value=json_value,
                        description="",
                        is_encrypted=key.lower() in ['password', 'email_password'],
                        created_at=current_time,
                        updated_at=current_time
                    )
                    db.add(new_config)
            
            db.commit()
            logger.info(f"配置类型 {config_type} 已更新")
            return True
        except Exception as e:
            logger.error(f"更新配置失败: {e}")
            db.rollback()
            return False
    
    @staticmethod
    def update_single_config(db: Session, config_type: ConfigType, key: str, value: Any, description: str = "") -> bool:
        """更新单个配置项"""
        return ConfigService.update_configs(db, config_type, {key: value})
    
    @staticmethod
    def delete_config(db: Session, config_type: ConfigType, config_key: str) -> bool:
        """删除配置项"""
        try:
            config = db.query(SystemConfig).filter(
                SystemConfig.config_type == config_type,
                SystemConfig.config_key == config_key
            ).first()
            
            if config:
                db.delete(config)
                db.commit()
                logger.info(f"配置 {config_type}.{config_key} 已删除")
                return True
            return False
        except Exception as e:
            logger.error(f"删除配置失败: {e}")
            db.rollback()
            return False
    
    @staticmethod
    def get_all_configs(db: Session) -> Dict[str, Dict[str, Any]]:
        """获取所有配置项，按类型分组"""
        try:
            all_configs = db.query(SystemConfig).all()
            result = {}
            
            for config_type in ConfigType:
                result[config_type.value] = {}
            
            for config in all_configs:
                # 尝试解析JSON值
                try:
                    value = json.loads(config.config_value)
                except json.JSONDecodeError:
                    value = config.config_value
                
                result[config.config_type.value][config.config_key] = value
            
            return result
        except Exception as e:
            logger.error(f"获取所有配置失败: {e}")
            return {}
    
    @staticmethod
    def validate_database_config(configs: Dict[str, Any]) -> Dict[str, str]:
        """验证数据库配置"""
        errors = {}
        
        # 验证数据库URL
        if 'metadata_db_url' in configs:
            db_url = configs['metadata_db_url']
            if not db_url:
                errors['metadata_db_url'] = '数据库URL不能为空'
            elif not (db_url.startswith('sqlite://') or 
                     db_url.startswith('postgresql://') or 
                     db_url.startswith('mysql://')):
                errors['metadata_db_url'] = '不支持的数据库类型'
        
        # 验证连接池大小
        if 'db_pool_size' in configs:
            try:
                pool_size = int(configs['db_pool_size'])
                if pool_size < 1 or pool_size > 100:
                    errors['db_pool_size'] = '连接池大小必须在1-100之间'
            except ValueError:
                errors['db_pool_size'] = '连接池大小必须是整数'
        
        # 验证最大溢出连接数
        if 'db_max_overflow' in configs:
            try:
                max_overflow = int(configs['db_max_overflow'])
                if max_overflow < 0 or max_overflow > 200:
                    errors['db_max_overflow'] = '最大溢出连接数必须在0-200之间'
            except ValueError:
                errors['db_max_overflow'] = '最大溢出连接数必须是整数'
        
        return errors
    
    @staticmethod
    def validate_email_config(configs: Dict[str, Any]) -> Dict[str, str]:
        """验证邮件配置"""
        errors = {}
        
        # 如果启用了邮件告警
        if configs.get('enable_email_alerts', False):
            # 验证邮件服务器
            if not configs.get('email_server'):
                errors['email_server'] = '邮件服务器地址不能为空'
            
            # 验证邮件端口
            if 'email_port' in configs:
                try:
                    port = int(configs['email_port'])
                    if port < 1 or port > 65535:
                        errors['email_port'] = '端口号必须在1-65535之间'
                except ValueError:
                    errors['email_port'] = '端口号必须是整数'
            else:
                errors['email_port'] = '邮件端口不能为空'
            
            # 验证邮箱用户名
            if not configs.get('email_user'):
                errors['email_user'] = '邮箱用户名不能为空'
            
            # 验证邮箱密码
            if not configs.get('email_password'):
                errors['email_password'] = '邮箱密码不能为空'
        
        return errors