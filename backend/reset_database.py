from models import Base, init_db
import os

# 数据库URL - 使用配置中指定的metadata.db
DATABASE_URL = "sqlite:///../metadata.db"

print("开始重置数据库...")

# 删除旧的数据库文件
METADATA_DB_PATH = "../metadata.db"
if os.path.exists(METADATA_DB_PATH):
    print("删除旧的metadata.db文件...")
    os.remove(METADATA_DB_PATH)

# 重新初始化数据库
try:
    print("重新创建数据库表...")
    init_db(DATABASE_URL)
    print("数据库重置成功！所有表已重新创建。")
except Exception as e:
    print(f"数据库重置失败: {e}")
