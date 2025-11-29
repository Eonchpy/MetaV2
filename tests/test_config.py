import json
from fastapi.testclient import TestClient

# 测试用例：配置管理API

def test_get_all_configs(client: TestClient):
    """测试获取所有配置"""
    response = client.get("/api/configs")
    
    assert response.status_code == 200
    response_data = response.json()
    assert isinstance(response_data, list)


def test_get_configs_by_type(client: TestClient):
    """测试按类型获取配置"""
    # 测试获取通用配置
    response = client.get("/api/configs/general")
    
    assert response.status_code == 200
    response_data = response.json()
    assert isinstance(response_data, list)

    # 测试获取数据库配置
    response = client.get("/api/configs/database")
    
    assert response.status_code == 200
    response_data = response.json()
    assert isinstance(response_data, list)

    # 测试获取告警配置
    response = client.get("/api/configs/alerts")
    
    assert response.status_code == 200
    response_data = response.json()
    assert isinstance(response_data, list)


def test_update_general_config(client: TestClient):
    """测试更新通用配置"""
    config_data = {
        "app_name": "测试元数据管理系统",
        "debug": True,
        "language": "en-US"
    }
    
    response = client.put("/api/configs/general", json=config_data)
    
    assert response.status_code == 200
    response_data = response.json()
    assert response_data["status"] == "success"
    
    # 验证配置是否已更新
    get_response = client.get("/api/configs/general")
    configs = get_response.json()
    
    config_dict = {config["config_key"]: config["config_value"] for config in configs}
    assert config_dict["app_name"] == config_data["app_name"]
    assert config_dict["debug"] == "true"  # 注意：JSON序列化后布尔值为字符串
    assert config_dict["language"] == config_data["language"]


def test_update_database_config(client: TestClient):
    """测试更新数据库配置"""
    config_data = {
        "db_pool_size": 10,
        "db_max_overflow": 20
    }
    
    response = client.put("/api/configs/database", json=config_data)
    
    assert response.status_code == 200
    response_data = response.json()
    assert response_data["status"] == "success"


def test_update_alerts_config(client: TestClient):
    """测试更新告警配置"""
    config_data = {
        "enable_email_alerts": False,
        "alert_threshold": 50
    }
    
    response = client.put("/api/configs/alerts", json=config_data)
    
    assert response.status_code == 200
    response_data = response.json()
    assert response_data["status"] == "success"


def test_test_db_connection(client: TestClient):
    """测试测试数据库连接"""
    # 测试成功连接配置
    test_data = {
        "host": "localhost",
        "port": 3306,
        "username": "test",
        "password": "test",
        "database": "test_db"
    }
    
    response = client.post("/api/configs/test-db-connection", json=test_data)
    
    # 由于是模拟测试，连接可能失败，但接口应该正常响应
    assert response.status_code in [200, 400]


def test_test_email_connection(client: TestClient):
    """测试测试邮件连接"""
    # 测试邮件连接配置
    test_data = {
        "smtp_server": "smtp.example.com",
        "smtp_port": 587,
        "smtp_username": "test@example.com",
        "smtp_password": "test_password",
        "use_ssl": False
    }
    
    response = client.post("/api/configs/test-email-connection", json=test_data)
    
    # 由于是模拟测试，连接可能失败，但接口应该正常响应
    assert response.status_code in [200, 400]