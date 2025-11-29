import axios from 'axios';

// 创建axios实例
const api = axios.create({
  baseURL: 'http://localhost:8000/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// 响应拦截器，保留原始响应结构以便获取响应头
api.interceptors.response.use(
  response => {
    // 对于表查询接口，保留原始响应以便获取总数信息
    if (response.config && response.config.url && 
        (response.config.url.includes('/tables') || 
         response.config.url.includes('/columns') || 
         response.config.url.includes('/lineages'))) {
      return {
        data: response.data,
        total: parseInt(response.headers['x-total-count'] || 0),
        headers: response.headers
      };
    }
    return response.data;
  },
  error => {
    console.error('API错误:', error);
    throw error;
  }
);

// 数据源相关API
export const dataSourceApi = {
  // 获取所有数据源
  getAll: () => api.get('/data-sources'),
  
  // 获取单个数据源
  getById: (id) => api.get(`/data-sources/${id}`),
  
  // 创建数据源
  create: (dataSource) => api.post('/data-sources', dataSource),
  
  // 更新数据源
  update: (id, dataSource) => api.put(`/data-sources/${id}`, dataSource),
  
  // 删除数据源
  delete: (id, config = {}) => api.delete(`/data-sources/${id}`, config)
};

// 表元数据相关API
export const tableMetadataApi = {
  // 获取所有表元数据（分页）
  getAll: (params) => api.get('/tables', { params }),
  
  // 根据ID获取表元数据
  getById: (id) => api.get(`/tables/${id}`),
  
  // 根据数据源获取表元数据
  getByDataSource: (dataSourceId) => api.get('/tables', { params: { data_source_id: dataSourceId } }),
  
  // 创建表元数据
  create: (table) => api.post('/tables', table),
  
  // 批量创建表元数据
  batchCreate: (tables) => api.post('/tables/batch', tables),
  
  // 更新表元数据
  update: (id, table) => api.put(`/tables/${id}`, table),
  
  // 删除表元数据
  delete: (id) => api.delete(`/tables/${id}`)
};

// 列元数据相关API
export const columnMetadataApi = {
  // 获取所有列元数据（分页）
  getAll: (params) => api.get('/columns', { params }),
  
  // 根据ID获取列元数据
  getById: (id) => api.get(`/columns/${id}`),
  
  // 根据表ID获取列元数据
  getByTable: (tableId) => api.get('/columns', { params: { table_id: tableId } }),
  
  // 创建列元数据
  create: (column) => api.post('/columns', column),
  
  // 批量创建列元数据
  batchCreate: (columns) => api.post('/columns/batch', columns),
  
  // 更新列元数据
  update: (id, column) => api.put(`/columns/${id}`, column),
  
  // 删除列元数据
  delete: (id) => api.delete(`/columns/${id}`)
};

// 血缘关系相关API
export const lineageApi = {
  // 获取所有表级血缘关系（分页）
  getAllTableRelations: (params) => api.get('/lineages/table', { params }),
  
  // 获取所有列级血缘关系（分页）
  getAllColumnRelations: (params) => api.get('/lineages/column', { params }),
  
  // 根据ID获取表级血缘关系
  getTableRelationById: (id) => api.get(`/lineages/table/${id}`),
  
  // 根据ID获取列级血缘关系
  getColumnRelationById: (id) => api.get(`/lineages/column/${id}`),
  
  // 创建表级血缘关系
  createTableRelation: (relation) => api.post('/lineages/table', relation),
  
  // 创建列级血缘关系
  createColumnRelation: (relation) => api.post('/lineages/column', relation),
  
  // 更新表级血缘关系
  updateTableRelation: (id, relation) => api.put(`/lineages/table/${id}`, relation),
  
  // 更新列级血缘关系
  updateColumnRelation: (id, relation) => api.put(`/lineages/column/${id}`, relation),
  
  // 删除表级血缘关系
  deleteTableRelation: (id) => api.delete(`/lineages/table/${id}`),
  
  // 删除列级血缘关系
  deleteColumnRelation: (id) => api.delete(`/lineages/column/${id}`),
  
  // 获取表级血缘关系图数据
  getTableLineageGraph: (tableId) => api.get(`/lineages/table/graph/${tableId}`),
  
  // 获取列级血缘关系图数据
  getColumnLineageGraph: (columnId) => api.get(`/lineages/column/graph/${columnId}`)
};

// 上传相关API
export const uploadApi = {
  // 表结构导入（Excel）
  uploadTableStructureExcel: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/upload/table-structure/excel', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  
  // 表结构导入（JSON）
  uploadTableStructureJson: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/upload/table-structure/json', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  
  // 表血缘导入（Excel）
  uploadTableLineageExcel: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/upload/table-lineage/excel', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  
  // 表血缘导入（JSON）
  uploadTableLineageJson: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/upload/table-lineage/json', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  
  // 字段血缘导入（Excel）
  uploadColumnLineageExcel: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/upload/column-lineage/excel', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  
  // 字段血缘导入（JSON）
  uploadColumnLineageJson: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/upload/column-lineage/json', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  }
};

export default api;