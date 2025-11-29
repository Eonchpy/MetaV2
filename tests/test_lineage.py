from fastapi.testclient import TestClient

# 测试用例：血缘关系API

def test_get_table_lineage(client: TestClient):
    """测试获取表级血缘关系"""
    # 测试参数
    table_name = "test_table"
    
    # 发送请求
    response = client.get(f"/api/lineage/table/{table_name}")
    
    # 验证响应格式
    assert response.status_code == 200
    response_data = response.json()
    assert "nodes" in response_data
    assert "links" in response_data
    assert isinstance(response_data["nodes"], list)
    assert isinstance(response_data["links"], list)


def test_get_column_lineage(client: TestClient):
    """测试获取列级血缘关系"""
    # 测试参数
    table_name = "test_table"
    column_name = "test_column"
    
    # 发送请求
    response = client.get(f"/api/lineage/column/{table_name}/{column_name}")
    
    # 验证响应格式
    assert response.status_code == 200
    response_data = response.json()
    assert "nodes" in response_data
    assert "links" in response_data
    assert isinstance(response_data["nodes"], list)
    assert isinstance(response_data["links"], list)


def test_get_upstream_tables(client: TestClient):
    """测试获取上游表"""
    # 测试参数
    table_name = "test_table"
    
    # 发送请求
    response = client.get(f"/api/lineage/{table_name}/upstream")
    
    # 验证响应格式
    assert response.status_code == 200
    response_data = response.json()
    assert isinstance(response_data, list)


def test_get_downstream_tables(client: TestClient):
    """测试获取下游表"""
    # 测试参数
    table_name = "test_table"
    
    # 发送请求
    response = client.get(f"/api/lineage/{table_name}/downstream")
    
    # 验证响应格式
    assert response.status_code == 200
    response_data = response.json()
    assert isinstance(response_data, list)


def test_get_table_metadata(client: TestClient):
    """测试获取表元数据"""
    # 测试参数
    data_source_id = 1  # 假设的数据源ID
    
    # 发送请求
    response = client.get(f"/api/metadata/tables/{data_source_id}")
    
    # 验证响应格式
    assert response.status_code == 200
    response_data = response.json()
    assert isinstance(response_data, list)


def test_get_column_metadata(client: TestClient):
    """测试获取列元数据"""
    # 测试参数
    data_source_id = 1  # 假设的数据源ID
    table_name = "test_table"
    
    # 发送请求
    response = client.get(f"/api/metadata/columns/{data_source_id}/{table_name}")
    
    # 验证响应格式
    assert response.status_code == 200
    response_data = response.json()
    assert isinstance(response_data, list)