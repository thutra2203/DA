const { getPool, sql } = require('../config/database');
const { logActivity } = require('../utils/activityLogger');

const createCRUD = (tableName, idCol, fields, label) => ({
  getAll: async (req, res) => {
    try {
      const pool = getPool();
      const result = await pool.request().query(`SELECT * FROM ${tableName} ORDER BY ${idCol}`);
      res.json(result.recordset);
    } catch (err) {
      res.status(500).json({ message: 'Lỗi server', error: err.message });
    }
  },

  create: async (req, res) => {
    try {
      const pool = getPool();
      const req2 = pool.request();
      const cols = fields.map(f => f.col).join(', ');
      const params = fields.map(f => `@${f.col}`).join(', ');
      fields.forEach(f => req2.input(f.col, f.type, req.body[f.name]));
      await req2.query(`INSERT INTO ${tableName} (${cols}) VALUES (${params})`);

      await logActivity({
        taiKhoanId: req.user.id, tenDangNhap: req.user.username,
        hanhDong: 'TAO_MOI', moTa: `Thêm mới "${req.body[fields[0].name]}" vào ${label}`, req,
      });

      res.status(201).json({ message: 'Thêm mới thành công' });
    } catch (err) {
      res.status(500).json({ message: 'Lỗi server', error: err.message });
    }
  },

  update: async (req, res) => {
    try {
      const pool = getPool();
      const req2 = pool.request();
      const sets = fields.map(f => `${f.col} = @${f.col}`).join(', ');
      fields.forEach(f => req2.input(f.col, f.type, req.body[f.name]));
      req2.input(idCol, sql.Int, req.params.id);
      await req2.query(`UPDATE ${tableName} SET ${sets} WHERE ${idCol} = @${idCol}`);

      await logActivity({
        taiKhoanId: req.user.id, tenDangNhap: req.user.username,
        hanhDong: 'CAP_NHAT', moTa: `Cập nhật "${req.body[fields[0].name]}" trong ${label}`, req,
      });

      res.json({ message: 'Cập nhật thành công' });
    } catch (err) {
      res.status(500).json({ message: 'Lỗi server', error: err.message });
    }
  },

  remove: async (req, res) => {
    try {
      const pool = getPool();
      await pool.request()
        .input(idCol, sql.Int, req.params.id)
        .query(`DELETE FROM ${tableName} WHERE ${idCol} = @${idCol}`);

      await logActivity({
        taiKhoanId: req.user.id, tenDangNhap: req.user.username,
        hanhDong: 'XOA', moTa: `Xóa bản ghi ID ${req.params.id} trong ${label}`, req,
      });

      res.json({ message: 'Xóa thành công' });
    } catch (err) {
      res.status(500).json({ message: 'Lỗi server', error: err.message });
    }
  },
});

const NVarChar = sql.NVarChar;

const donViCRUD = createCRUD('DanhMucDonVi', 'ID', [
  { col: 'TenDonVi', name: 'tenDonVi', type: NVarChar },
  { col: 'MaDonVi', name: 'maDonVi', type: NVarChar },
  { col: 'GhiChu', name: 'ghiChu', type: NVarChar },
], 'Danh mục đơn vị');

const capBacCRUD = createCRUD('DanhMucCapBac', 'ID', [
  { col: 'TenCapBac', name: 'tenCapBac', type: NVarChar },
  { col: 'MaCapBac', name: 'maCapBac', type: NVarChar },
], 'Danh mục cấp bậc');

const chucVuCRUD = createCRUD('DanhMucChucVu', 'ID', [
  { col: 'TenChucVu', name: 'tenChucVu', type: NVarChar },
  { col: 'MaChucVu', name: 'maChucVu', type: NVarChar },
], 'Danh mục chức vụ');

const toChucNhanSuCRUD = createCRUD('DanhMucToChucNhanSu', 'ID', [
  { col: 'TenToChuc', name: 'tenToChuc', type: NVarChar },
  { col: 'MaToChuc', name: 'maToChuc', type: NVarChar },
], 'Tổ chức và nhân sự');

const toChucKhoCRUD = createCRUD('DanhMucToChucKho', 'ID', [
  { col: 'TenKho', name: 'tenKho', type: NVarChar },
  { col: 'MaKho', name: 'maKho', type: NVarChar },
  { col: 'DiaDiem', name: 'diaDiem', type: NVarChar },
], 'Tổ chức kho');

// ==== Đơn vị hành chính ====

const tinhCRUD = createCRUD('DanhMucTinh', 'ID', [
  { col: 'TenTinh', name: 'tenTinh', type: NVarChar },
  { col: 'MaTinh', name: 'maTinh', type: NVarChar },
  { col: 'GhiChu', name: 'ghiChu', type: NVarChar },
], 'Danh mục tỉnh');

const xaCRUD = createCRUD('DanhMucXa', 'ID', [
  { col: 'TenXa', name: 'tenXa', type: NVarChar },
  { col: 'MaXa', name: 'maXa', type: NVarChar },
  { col: 'GhiChu', name: 'ghiChu', type: NVarChar },
], 'Danh mục xã');

// ==== Tổ chức kho ====

const loaiKhoCRUD = createCRUD('DanhMucLoaiKho', 'ID', [
  { col: 'TenLoaiKho', name: 'tenLoaiKho', type: NVarChar },
  { col: 'MaLoaiKho', name: 'maLoaiKho', type: NVarChar },
  { col: 'GhiChu', name: 'ghiChu', type: NVarChar },
], 'Danh mục loại kho');

// ==== Từ điển về TB (TBKT) ====

const phanNhomTBKTCRUD = createCRUD('DanhMucPhanNhomTBKT', 'ID', [
  { col: 'TenPhanNhom', name: 'tenPhanNhom', type: NVarChar },
  { col: 'MaPhanNhom', name: 'maPhanNhom', type: NVarChar },
  { col: 'GhiChu', name: 'ghiChu', type: NVarChar },
], 'Phân nhóm trang bị TBKT');

const phanLoaiTBKTCRUD = createCRUD('DanhMucPhanLoaiTBKT', 'ID', [
  { col: 'TenPhanLoai', name: 'tenPhanLoai', type: NVarChar },
  { col: 'MaPhanLoai', name: 'maPhanLoai', type: NVarChar },
  { col: 'GhiChu', name: 'ghiChu', type: NVarChar },
], 'Phân loại trang bị TBKT');

const kieuTBKTCRUD = createCRUD('DanhMucKieuTBKT', 'ID', [
  { col: 'TenKieu', name: 'tenKieu', type: NVarChar },
  { col: 'MaKieu', name: 'maKieu', type: NVarChar },
  { col: 'GhiChu', name: 'ghiChu', type: NVarChar },
], 'Danh mục kiểu TBKT');

const nhomDongBoCRUD = createCRUD('DanhMucNhomDongBo', 'ID', [
  { col: 'TenNhom', name: 'tenNhom', type: NVarChar },
  { col: 'MaNhom', name: 'maNhom', type: NVarChar },
  { col: 'GhiChu', name: 'ghiChu', type: NVarChar },
], 'Danh mục nhóm đồng bộ');

const chiTietDongBoCRUD = createCRUD('DanhMucChiTietDongBo', 'ID', [
  { col: 'TenChiTiet', name: 'tenChiTiet', type: NVarChar },
  { col: 'MaChiTiet', name: 'maChiTiet', type: NVarChar },
  { col: 'GhiChu', name: 'ghiChu', type: NVarChar },
], 'Danh mục chi tiết đồng bộ');

const tinhTrangTrangBiCRUD = createCRUD('DanhMucTinhTrangTrangBi', 'ID', [
  { col: 'TenTinhTrang', name: 'tenTinhTrang', type: NVarChar },
  { col: 'MaTinhTrang', name: 'maTinhTrang', type: NVarChar },
  { col: 'GhiChu', name: 'ghiChu', type: NVarChar },
], 'Tình trạng trang bị');

const tinhTrangKhoGuiCRUD = createCRUD('DanhMucTinhTrangKhoGui', 'ID', [
  { col: 'TenTinhTrang', name: 'tenTinhTrang', type: NVarChar },
  { col: 'MaTinhTrang', name: 'maTinhTrang', type: NVarChar },
  { col: 'GhiChu', name: 'ghiChu', type: NVarChar },
], 'Tình trạng kho gửi');

const hinhThucNiemCatCRUD = createCRUD('DanhMucHinhThucNiemCat', 'ID', [
  { col: 'TenHinhThuc', name: 'tenHinhThuc', type: NVarChar },
  { col: 'MaHinhThuc', name: 'maHinhThuc', type: NVarChar },
  { col: 'GhiChu', name: 'ghiChu', type: NVarChar },
], 'Hình thức niêm cất');

const phanLoaiDongBoCRUD = createCRUD('DanhMucPhanLoaiDongBo', 'ID', [
  { col: 'TenPhanLoai', name: 'tenPhanLoai', type: NVarChar },
  { col: 'MaPhanLoai', name: 'maPhanLoai', type: NVarChar },
  { col: 'GhiChu', name: 'ghiChu', type: NVarChar },
], 'Phân loại trang bị đồng bộ');

// ==== Từ điển dùng chung ====

const phanCapChatLuongCRUD = createCRUD('DanhMucPhanCapChatLuong', 'ID', [
  { col: 'TenPhanCap', name: 'tenPhanCap', type: NVarChar },
  { col: 'MaPhanCap', name: 'maPhanCap', type: NVarChar },
  { col: 'GhiChu', name: 'ghiChu', type: NVarChar },
], 'Danh mục phân cấp chất lượng');

const donViTinhCRUD = createCRUD('DanhMucDonViTinh', 'ID', [
  { col: 'TenDonViTinh', name: 'tenDonViTinh', type: NVarChar },
  { col: 'MaDonViTinh', name: 'maDonViTinh', type: NVarChar },
  { col: 'GhiChu', name: 'ghiChu', type: NVarChar },
], 'Danh mục đơn vị tính');

const nuocSanXuatCRUD = createCRUD('DanhMucNuocSanXuat', 'ID', [
  { col: 'TenNuoc', name: 'tenNuoc', type: NVarChar },
  { col: 'MaNuoc', name: 'maNuoc', type: NVarChar },
  { col: 'GhiChu', name: 'ghiChu', type: NVarChar },
], 'Danh mục nước sản xuất');

const hangSanXuatCRUD = createCRUD('DanhMucHangSanXuat', 'ID', [
  { col: 'TenHang', name: 'tenHang', type: NVarChar },
  { col: 'MaHang', name: 'maHang', type: NVarChar },
  { col: 'GhiChu', name: 'ghiChu', type: NVarChar },
], 'Danh mục hãng sản xuất');

const nhaCungCapCRUD = createCRUD('DanhMucNhaCungCap', 'ID', [
  { col: 'TenNhaCungCap', name: 'tenNhaCungCap', type: NVarChar },
  { col: 'MaNhaCungCap', name: 'maNhaCungCap', type: NVarChar },
  { col: 'GhiChu', name: 'ghiChu', type: NVarChar },
], 'Danh mục nhà cung cấp');

const hinhThucThanhToanCRUD = createCRUD('DanhMucHinhThucThanhToan', 'ID', [
  { col: 'TenHinhThuc', name: 'tenHinhThuc', type: NVarChar },
  { col: 'MaHinhThuc', name: 'maHinhThuc', type: NVarChar },
  { col: 'GhiChu', name: 'ghiChu', type: NVarChar },
], 'Danh mục hình thức thanh toán');

const hinhThucCapChuyenCRUD = createCRUD('DanhMucHinhThucCapChuyen', 'ID', [
  { col: 'TenHinhThuc', name: 'tenHinhThuc', type: NVarChar },
  { col: 'MaHinhThuc', name: 'maHinhThuc', type: NVarChar },
  { col: 'GhiChu', name: 'ghiChu', type: NVarChar },
], 'Danh mục hình thức cấp chuyển');

module.exports = {
  donViCRUD, capBacCRUD, chucVuCRUD,
  toChucNhanSuCRUD, toChucKhoCRUD,
  tinhCRUD, xaCRUD,
  loaiKhoCRUD,
  phanNhomTBKTCRUD, phanLoaiTBKTCRUD, kieuTBKTCRUD,
  nhomDongBoCRUD, chiTietDongBoCRUD,
  tinhTrangTrangBiCRUD, tinhTrangKhoGuiCRUD,
  hinhThucNiemCatCRUD, phanLoaiDongBoCRUD,
  phanCapChatLuongCRUD, donViTinhCRUD, nuocSanXuatCRUD, hangSanXuatCRUD,
  nhaCungCapCRUD, hinhThucThanhToanCRUD, hinhThucCapChuyenCRUD,
};
