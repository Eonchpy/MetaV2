import json
from fastapi.testclient import TestClient

# 测试用例：数据源管理API

def test_create_data_source(client: TestClient):
    """测试创建数据源"""
    # 准备测试数据
    data = {
        "name": "测试数据源",
        "type": "ORACLE",
        "connection_config": {
            "host": "localhost",
            "port": 1521,
            "service_name": "ORCL",
            "username": "test_user",
            "password": "test_password"
        },
        "description": "用于测试的Oracle数据源"
    }
    
    # 发送请求
    response = client.post("/api/datasources", json=data)
    
    # 验证响应
    assert response.status_code == 200
    response_data = response.json()
    assert response_data["name"] == data["name"]
    assert response_data["type"] == data["type"]
    assert "id" in response_data


def test_get_data_sources(client: TestClient):
    """测试获取数据源列表"""
    # 先创建两个测试数据源
    data1 = {
        "name": "测试数据源1",
        "type": "ORACLE",
        "connection_config": {"host": "localhost"},
        "description": "测试数据源1"
    }
    
    data2 = {
        "name": "测试数据源2",
        "type": "MYSQL",
        "connection_config": {"host": "localhost"},
        "description": "测试数据源2"
    }
    
    client.post("/api/datasources", json=data1)
    client.post("/api/datasources", json=data2)
    
    # 获取数据源列表
    response = client.get("/api/datasources")
    
    # 验证响应
    assert response.status_code == 200
    response_data = response.json()
    assert isinstance(response_data, list)
    assert len(response_data) >= 2
    
    # 查找特定数据源
    found = False
    for ds in response_data:
        if ds["name"] == "测试数据源1":
            found = True
            break
    assert found


def test_get_data_source_by_id(client: TestClient):
    """测试根据ID获取数据源"""
    # 先创建测试数据源
    data = {
        "name": "测试数据源",
        "type": "ORACLE",
        "connection_config": {"host": "localhost"},
        "description": "测试数据源"
    }
    
    response = client.post("/api/datasources", json=data)
    data_source_id = response.json()["id"]
    
    # 根据ID获取数据源
    response = client.get(f"/api/datasources/{data_source_id}")
    
    # 验证响应
    assert response.status_code == 200
    response_data = response.json()
    assert response_data["id"] == data_source_id
    assert response_data["name"] == data["name"]


def test_update_data_source(client: TestClient):
    """测试更新数据源"""
    # 先创建测试数据源
    data = {
        "name": "旧数据源名称",
        "type": "ORACLE",
        "connection_config": {"host": "localhost"},
        "description": "旧描述"
    }
    
    response = client.post("/api/datasources", json=data)
    data_source_id = response.json()["id"]
    
    # 更新数据源
    update_data = {
        "name": "新数据源名称",
        "description": "新描述"
    }
    
    response = client.put(f"/api/datasources/{data_source_id}", json=update_data)
    
    # 验证响应
    assert response.status_code == 200
    response_data = response.json()
    assert response_data["name"] == update_data["name"]
    assert response_data["description"] == update_data["description"]


def test_delete_data_source(client: TestClient):
    """测试删除数据源"""
    # 先创建测试数据源
    data = {
        "name": "要删除的数据源",
        "type": "ORACLE",
        "connection_config": {"host": "localhost"},
        "description": "测试删除"
    }
    
    response = client.post("/api/datasources", json=data)
    data_source_id = response.json()["id"]
    
    # 删除数据源
    response = client.delete(f"/api/datasources/{data_source_id}")
    
    # 验证响应
    assert response.status_code == 200
    
    # 尝试获取已删除的数据源，应该返回404
    response = client.get(f"/api/datasources/{data_source_id}")
    assert response.status_code == 404