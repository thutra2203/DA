import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5000/api',
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

export const statsAPI = {
  get: () => api.get('/stats'),
};

export default api;
