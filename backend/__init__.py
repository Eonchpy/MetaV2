"""元数据管理系统后端包初始化"""

from config.settings import settings
from models import init_db

# 初始化数据库连接
init_db(settings.metadata_db_url)