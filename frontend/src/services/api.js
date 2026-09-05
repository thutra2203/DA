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
  updateKho: (id, maDonVi) => api.put(`/users/${id}/kho`, { maDonVi }),
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
  getByKho: (maKho, extra = {}) => api.get('/tb-dong-bo/ho-so/by-kho', { params: { maKho, ...extra } }),
  getChiTiet: (maTbdb, maKho) => api.get(`/tb-dong-bo/ho-so/${maTbdb}/chi-tiet`, { params: { maKho } }),
  getCtdbKhaDung: (maTbdb) => api.get(`/tb-dong-bo/ho-so/${maTbdb}/ctdb-kha-dung`),
  getTonKhoTheoCap: (maKho) => api.get('/tb-dong-bo/ho-so/ton-kho-theo-cap', { params: { maKho } }),
  xuatExcel: (maKho, extra = {}, search) => api.get('/tb-dong-bo/ho-so/xuat-excel', { params: { maKho, ...extra, search }, responseType: 'blob' }),
  xuatExcelLo: (maTbdb, maKho, extra = {}, search) =>
    api.get(`/tb-dong-bo/ho-so/${maTbdb}/lo/xuat-excel`, { params: { maKho, ...extra, search }, responseType: 'blob' }),
  xuatExcelViTri: (maTbdb, maKho, extra = {}, search) =>
    api.get(`/tb-dong-bo/ho-so/${maTbdb}/vi-tri/xuat-excel`, { params: { maKho, ...extra, search }, responseType: 'blob' }),
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
    suaLo: (maLenh, maCtdongBoLenh, data) => api.put(`/tb-dong-bo/lenh/${maLenh}/chi-tiet/${maCtdongBoLenh}/lo`, data),
    getTonKhoKhaDung: (maLenh, maCtdongBoLenh) => api.get(`/tb-dong-bo/lenh/${maLenh}/chi-tiet/${maCtdongBoLenh}/ton-kho-kha-dung`),
    xuatKho: (maLenh, maCtdongBoLenh, dong) => api.post(`/tb-dong-bo/lenh/${maLenh}/chi-tiet/${maCtdongBoLenh}/xuat-kho`, { dong }),
  },

  tonKhoLoKhaDung: (maLenh) => api.get(`/tb-dong-bo/lenh/${maLenh}/ton-kho-lo-kha-dung`),
  ketThucHuyThanhLy: (maLenh) => api.post(`/tb-dong-bo/lenh/${maLenh}/huy-thanh-ly/ket-thuc`),
  taiMauNhapHuyThanhLy: (maLenh) => api.get(`/tb-dong-bo/lenh/${maLenh}/huy-thanh-ly/mau-nhap`, { responseType: 'blob' }),
  xemTruocNhapHuyThanhLyTuFile: (maLenh, file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post(`/tb-dong-bo/lenh/${maLenh}/huy-thanh-ly/nhap-file/xem-truoc`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  xacNhanNhapHuyThanhLyTuFile: (maLenh, danhSach) => api.post(`/tb-dong-bo/lenh/${maLenh}/huy-thanh-ly/nhap-file/xac-nhan`, { danhSach }),

  taiMauNhapChiTiet: (maLenh) => api.get(`/tb-dong-bo/lenh/${maLenh}/mau-nhap-chi-tiet`, { responseType: 'blob' }),
  xemTruocNhapChiTietTuFile: (maLenh, file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post(`/tb-dong-bo/lenh/${maLenh}/nhap-chi-tiet-file/xem-truoc`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  xacNhanNhapChiTietTuFile: (maLenh, danhSach) => api.post(`/tb-dong-bo/lenh/${maLenh}/nhap-chi-tiet-file/xac-nhan`, { danhSach }),

  hoanThanh: (maLenh) => api.post(`/tb-dong-bo/lenh/${maLenh}/hoan-thanh`),
  taiMauNhapLo: (maLenh) => api.get(`/tb-dong-bo/lenh/${maLenh}/mau-nhap-lo`, { responseType: 'blob' }),
  xemTruocNhapLoTuFile: (maLenh, file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post(`/tb-dong-bo/lenh/${maLenh}/nhap-lo-file/xem-truoc`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  xacNhanNhapLoTuFile: (maLenh, danhSach) => api.post(`/tb-dong-bo/lenh/${maLenh}/nhap-lo-file/xac-nhan`, { danhSach }),

  lo: {
    taiMauNhapViTri: (maLenh, maLoTbdb) => api.get(`/tb-dong-bo/lenh/${maLenh}/lo/${maLoTbdb}/mau-nhap-vi-tri`, { responseType: 'blob' }),
    nhapViTriTuFile: (maLenh, maLoTbdb, file) => {
      const formData = new FormData();
      formData.append('file', file);
      return api.post(`/tb-dong-bo/lenh/${maLenh}/lo/${maLoTbdb}/nhap-vi-tri-file`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
    },
  },
};

export const tonDauTbDongBoAPI = {
  getAll: () => api.get('/tb-dong-bo/ton-dau'),
  getOne: (maLenh) => api.get(`/tb-dong-bo/ton-dau/${maLenh}`),
  taoLenh: (data) => api.post('/tb-dong-bo/ton-dau/tao-lenh', data),
  suaLenh: (maLenh, data) => api.put(`/tb-dong-bo/ton-dau/${maLenh}`, data),
  xoaLenh: (maLenh) => api.delete(`/tb-dong-bo/ton-dau/${maLenh}`),
  hoanTat: (maLenh) => api.post(`/tb-dong-bo/ton-dau/${maLenh}/hoan-tat`),
  taiMauNhap: () => api.get('/tb-dong-bo/ton-dau/mau-nhap', { responseType: 'blob' }),
  xemTruocTuFile: (maLenh, file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post(`/tb-dong-bo/ton-dau/${maLenh}/xem-truoc-file`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  xacNhanNhapTuFile: (maLenh, danhSachLo) => api.post(`/tb-dong-bo/ton-dau/${maLenh}/nhap-lo-file/xac-nhan`, { danhSachLo }),

  lo: {
    getAll: (maLenh) => api.get(`/tb-dong-bo/ton-dau/${maLenh}/lo`),
    create: (maLenh, data) => api.post(`/tb-dong-bo/ton-dau/${maLenh}/lo`, data),
    update: (maLenh, maLoTbdb, data) => api.put(`/tb-dong-bo/ton-dau/${maLenh}/lo/${maLoTbdb}`, data),
    remove: (maLenh, maLoTbdb) => api.delete(`/tb-dong-bo/ton-dau/${maLenh}/lo/${maLoTbdb}`),
  },
};

export const kiemKeTbDongBoAPI = {
  getAll: (params) => api.get('/tb-dong-bo/kiem-ke', { params }),
  getOne: (maPhieu) => api.get(`/tb-dong-bo/kiem-ke/${maPhieu}`),
  taoPhieu: (data) => api.post('/tb-dong-bo/kiem-ke/tao-phieu', data),
  suaPhieu: (maPhieu, data) => api.put(`/tb-dong-bo/kiem-ke/${maPhieu}`, data),
  xoaPhieu: (maPhieu) => api.delete(`/tb-dong-bo/kiem-ke/${maPhieu}`),
  getChiTietViTri: (maPhieu, maCtKiemKe) => api.get(`/tb-dong-bo/kiem-ke/${maPhieu}/chi-tiet/${maCtKiemKe}`),
  capNhatChiTietViTri: (maPhieu, maCtKiemKe, maCtKiemKeViTri, data) =>
    api.put(`/tb-dong-bo/kiem-ke/${maPhieu}/chi-tiet/${maCtKiemKe}/vi-tri/${maCtKiemKeViTri}`, data),
  ketThuc: (maPhieu) => api.post(`/tb-dong-bo/kiem-ke/${maPhieu}/ket-thuc`),
};

export const chuyenKyAPI = {
  getAll: () => api.get('/tb-dong-bo/chuyen-ky'),
  getPhieuKhaDung: () => api.get('/tb-dong-bo/chuyen-ky/phieu-kha-dung'),
  thucHien: (data) => api.post('/tb-dong-bo/chuyen-ky/thuc-hien', data),
};

export const chuyenCapAPI = {
  getAll: (params) => api.get('/tb-dong-bo/chuyen-cap', { params }),
  getOne: (maLenh) => api.get(`/tb-dong-bo/chuyen-cap/${maLenh}`),
  getLoKhaDung: (maLenh) => api.get(`/tb-dong-bo/chuyen-cap/${maLenh}/lo-kha-dung`),
  taoLenh: (data) => api.post('/tb-dong-bo/chuyen-cap/tao-lenh', data),
  suaLenh: (maLenh, data) => api.put(`/tb-dong-bo/chuyen-cap/${maLenh}`, data),
  themChiTiet: (maLenh, data) => api.post(`/tb-dong-bo/chuyen-cap/${maLenh}/chi-tiet`, data),
  suaChiTiet: (maLenh, id, data) => api.put(`/tb-dong-bo/chuyen-cap/${maLenh}/chi-tiet/${id}`, data),
  xoaChiTiet: (maLenh, id) => api.delete(`/tb-dong-bo/chuyen-cap/${maLenh}/chi-tiet/${id}`),
  xoaLenh: (maLenh) => api.delete(`/tb-dong-bo/chuyen-cap/${maLenh}`),

  taiMauNhap: (maLenh) => api.get(`/tb-dong-bo/chuyen-cap/${maLenh}/mau-nhap`, { responseType: 'blob' }),
  xemTruocNhapTuFile: (maLenh, file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post(`/tb-dong-bo/chuyen-cap/${maLenh}/nhap-file/xem-truoc`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  xacNhanNhapTuFile: (maLenh, danhSach) => api.post(`/tb-dong-bo/chuyen-cap/${maLenh}/nhap-file/xac-nhan`, { danhSach }),
  ketThuc: (maLenh) => api.post(`/tb-dong-bo/chuyen-cap/${maLenh}/ket-thuc`),
};

export const thayDoiViTriAPI = {
  getAll: (params) => api.get('/tb-dong-bo/thay-doi-vi-tri', { params }),
  getOne: (maLenh) => api.get(`/tb-dong-bo/thay-doi-vi-tri/${maLenh}`),
  getViTriKhaDung: (maLenh) => api.get(`/tb-dong-bo/thay-doi-vi-tri/${maLenh}/vi-tri-kha-dung`),
  taoLenh: (data) => api.post('/tb-dong-bo/thay-doi-vi-tri/tao-lenh', data),
  suaLenh: (maLenh, data) => api.put(`/tb-dong-bo/thay-doi-vi-tri/${maLenh}`, data),
  themChiTiet: (maLenh, data) => api.post(`/tb-dong-bo/thay-doi-vi-tri/${maLenh}/chi-tiet`, data),
  suaChiTiet: (maLenh, id, data) => api.put(`/tb-dong-bo/thay-doi-vi-tri/${maLenh}/chi-tiet/${id}`, data),
  xoaChiTiet: (maLenh, id) => api.delete(`/tb-dong-bo/thay-doi-vi-tri/${maLenh}/chi-tiet/${id}`),
  xoaLenh: (maLenh) => api.delete(`/tb-dong-bo/thay-doi-vi-tri/${maLenh}`),
  ketThuc: (maLenh) => api.post(`/tb-dong-bo/thay-doi-vi-tri/${maLenh}/ket-thuc`),

  taiMauNhap: (maLenh) => api.get(`/tb-dong-bo/thay-doi-vi-tri/${maLenh}/mau-nhap`, { responseType: 'blob' }),
  xemTruocNhapTuFile: (maLenh, file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post(`/tb-dong-bo/thay-doi-vi-tri/${maLenh}/nhap-file/xem-truoc`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  xacNhanNhapTuFile: (maLenh, danhSach) => api.post(`/tb-dong-bo/thay-doi-vi-tri/${maLenh}/nhap-file/xac-nhan`, { danhSach }),
};

export const statsAPI = {
  get: () => api.get('/stats'),
};

export const nhatKyAPI = {
  getAll: (params) => api.get('/nhat-ky', { params }),
};

export default api;
