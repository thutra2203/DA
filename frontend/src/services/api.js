import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5080/api',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 || err.response?.status === 403) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export const authAPI = {
  login: (data) => api.post('/auth/login', data),
  logout: () => api.post('/auth/logout'),
};

export const userAPI = {
  getAll: () => api.get('/users'),
  create: (data) => api.post('/users', data),
  updateRole: (id, vaiTro) => api.put(`/users/${id}/role`, { vaiTro }),
  resetPassword: (id, matKhauMoi) => api.put(`/users/${id}/reset-password`, { matKhauMoi }),
  toggleLock: (id) => api.put(`/users/${id}/toggle-lock`),
};

export const vaiTroAPI = {
  getAll: () => api.get('/vai-tro'),
  create: (data) => api.post('/vai-tro', data),
  update: (id, data) => api.put(`/vai-tro/${id}`, data),
  remove: (id) => api.delete(`/vai-tro/${id}`),
};

export const danhMucAPI = {
  getAll: (type) => api.get(`/danh-muc/${type}`),
  create: (type, data) => api.post(`/danh-muc/${type}`, data),
  update: (type, id, data) => api.put(`/danh-muc/${type}/${id}`, data),
  remove: (type, id) => api.delete(`/danh-muc/${type}/${id}`),
};

export const tbDongBoAPI = {
  getByKho: (maKho) => api.get('/tb-dong-bo/ho-so/by-kho', { params: { maKho } }),
  getChiTiet: (maTbdb, maKho) => api.get(`/tb-dong-bo/ho-so/${maTbdb}/chi-tiet`, { params: { maKho } }),
  getCtdbKhaDung: (maTbdb) => api.get(`/tb-dong-bo/ho-so/${maTbdb}/ctdb-kha-dung`),
  create: (data) => api.post('/tb-dong-bo/ho-so', data),
  update: (id, data) => api.put(`/tb-dong-bo/ho-so/${id}`, data),
  remove: (id) => api.delete(`/tb-dong-bo/ho-so/${id}`),

  lo: {
    create: (data) => api.post('/tb-dong-bo/lo', data),
    update: (id, data) => api.put(`/tb-dong-bo/lo/${id}`, data),
    remove: (id) => api.delete(`/tb-dong-bo/lo/${id}`),
  },
  tonKho: {
    create: (data) => api.post('/tb-dong-bo/ton-kho', data),
    update: (id, data) => api.put(`/tb-dong-bo/ton-kho/${id}`, data),
    remove: (id) => api.delete(`/tb-dong-bo/ton-kho/${id}`),
  },
};

export const lenhTbDongBoAPI = {
  getAll: (maLoaiLenh, maKho) => api.get('/tb-dong-bo/lenh', { params: { maLoaiLenh, maKho } }),
  getOne: (maLenh) => api.get(`/tb-dong-bo/lenh/${maLenh}`),
  create: (data) => api.post('/tb-dong-bo/lenh', data),
  update: (maLenh, data) => api.put(`/tb-dong-bo/lenh/${maLenh}`, data),
  remove: (maLenh) => api.delete(`/tb-dong-bo/lenh/${maLenh}`),

  chiTiet: {
    getAll: (maLenh) => api.get(`/tb-dong-bo/lenh/${maLenh}/chi-tiet`),
    create: (maLenh, data) => api.post(`/tb-dong-bo/lenh/${maLenh}/chi-tiet`, data),
    update: (maLenh, maCtdongBoLenh, data) => api.put(`/tb-dong-bo/lenh/${maLenh}/chi-tiet/${maCtdongBoLenh}`, data),
    remove: (maLenh, maCtdongBoLenh) => api.delete(`/tb-dong-bo/lenh/${maLenh}/chi-tiet/${maCtdongBoLenh}`),
    taoLo: (maLenh, maCtdongBoLenh, data) => api.post(`/tb-dong-bo/lenh/${maLenh}/chi-tiet/${maCtdongBoLenh}/tao-lo`, data),
  },

  hoanThanh: (maLenh) => api.post(`/tb-dong-bo/lenh/${maLenh}/hoan-thanh`),
  taiMauNhapLo: (maLenh) => api.get(`/tb-dong-bo/lenh/${maLenh}/mau-nhap-lo`, { responseType: 'blob' }),
  nhapLoTuFile: (maLenh, file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post(`/tb-dong-bo/lenh/${maLenh}/nhap-lo-file`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
};

export const statsAPI = {
  get: () => api.get('/stats'),
};

export const nhatKyAPI = {
  getAll: (params) => api.get('/nhat-ky', { params }),
};

export default api;
