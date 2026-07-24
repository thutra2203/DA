const { getPool, sql } = require('../config/database');
const { logActivity } = require('../utils/activityLogger');

const friendlyDbError = (err) => {
  if (err.number === 2627 || err.number === 2601) return 'Mã đã tồn tại';
  if (err.number === 547) return 'Giá trị tham chiếu không hợp lệ hoặc bản ghi đang được sử dụng ở nơi khác';
  return err.message;
};

// pkCol/pkType: khóa chính (chính là "mã") của bảng danh mục.
// fields: toàn bộ cột có thể ghi (bao gồm cả cột PK), mỗi phần tử { col, type, label? }.
const createCRUD = (tableName, pkCol, pkType, fields, label) => {
  const labelField = fields.find(f => f.label) || fields[1] || fields[0];

  return {
    getAll: async (req, res) => {
      try {
        const pool = getPool();
        const result = await pool.request().query(`SELECT * FROM ${tableName} ORDER BY ${pkCol}`);
        res.json(result.recordset);
      } catch (err) {
        res.status(500).json({ message: 'Lỗi server', error: err.message });
      }
    },

    create: async (req, res) => {
      try {
        const pool = getPool();
        const request = pool.request();
        const cols = fields.map(f => f.col).join(', ');
        const params = fields.map(f => `@${f.col}`).join(', ');
        fields.forEach(f => request.input(f.col, f.type, req.body[f.col]));
        await request.query(`INSERT INTO ${tableName} (${cols}) VALUES (${params})`);

        await logActivity({
          maNguoiDung: req.user.id, tenDangNhap: req.user.username,
          hanhDong: 'THEM', doiTuong: tableName, maDoiTuong: String(req.body[pkCol]),
          moTa: `Thêm mới "${req.body[labelField.col]}" vào ${label}`,
        });

        res.status(201).json({ message: 'Thêm mới thành công' });
      } catch (err) {
        res.status(400).json({ message: friendlyDbError(err) });
      }
    },

    update: async (req, res) => {
      try {
        const pool = getPool();
        const request = pool.request();
        const settable = fields.filter(f => f.col !== pkCol);
        const sets = settable.map(f => `${f.col} = @${f.col}`).join(', ');
        settable.forEach(f => request.input(f.col, f.type, req.body[f.col]));
        request.input(pkCol, pkType, req.params.id);
        await request.query(`UPDATE ${tableName} SET ${sets} WHERE ${pkCol} = @${pkCol}`);

        await logActivity({
          maNguoiDung: req.user.id, tenDangNhap: req.user.username,
          hanhDong: 'SUA', doiTuong: tableName, maDoiTuong: String(req.params.id),
          moTa: `Cập nhật "${req.body[labelField.col]}" trong ${label}`,
        });

        res.json({ message: 'Cập nhật thành công' });
      } catch (err) {
        res.status(400).json({ message: friendlyDbError(err) });
      }
    },

    remove: async (req, res) => {
      try {
        const pool = getPool();
        await pool.request()
          .input(pkCol, pkType, req.params.id)
          .query(`DELETE FROM ${tableName} WHERE ${pkCol} = @${pkCol}`);

        await logActivity({
          maNguoiDung: req.user.id, tenDangNhap: req.user.username,
          hanhDong: 'XOA', doiTuong: tableName, maDoiTuong: String(req.params.id),
          moTa: `Xóa bản ghi "${req.params.id}" trong ${label}`,
        });

        res.json({ message: 'Xóa thành công' });
      } catch (err) {
        res.status(400).json({ message: friendlyDbError(err) });
      }
    },
  };
};

const V = (n) => sql.VarChar(n);
const NV = (n) => sql.NVarChar(n);

// ==== Nhóm không có khóa ngoại bắt buộc ====

const nhomSpktCRUD = createCRUD('NhomSPKT', 'maNhom', V(30), [
  { col: 'maNhom', type: V(30) },
  { col: 'tenNhom', type: NV(200), label: true },
  { col: 'moTa', type: NV(500) },
], 'Nhóm SPKT');

const dvtCRUD = createCRUD('DVT', 'maDVT', V(20), [
  { col: 'maDVT', type: V(20) },
  { col: 'tenDVT', type: NV(200), label: true },
  { col: 'donViCoBan', type: V(20) },
  { col: 'heSoCoBan', type: sql.Float },
  { col: 'ghiChu', type: NV(200) },
], 'Đơn vị tính');

const nsxCRUD = createCRUD('NSX', 'maNSX', V(20), [
  { col: 'maNSX', type: V(20) },
  { col: 'tenNSX', type: NV(100), label: true },
  { col: 'ghiChu', type: NV(200) },
], 'Nước sản xuất');

const htttCRUD = createCRUD('HTTT', 'maHTTT', V(20), [
  { col: 'maHTTT', type: V(20) },
  { col: 'tenHTTT', type: NV(100), label: true },
  { col: 'mucPhi', type: sql.Decimal(18, 2) },
  { col: 'ghiChu', type: NV(200) },
], 'Hình thức thanh toán');

const htVanChuyenCRUD = createCRUD('HTVanChuyen', 'maHTVC', V(20), [
  { col: 'maHTVC', type: V(20) },
  { col: 'tenHTVC', type: NV(100), label: true },
  { col: 'mucPhi', type: sql.Decimal(18, 2) },
  { col: 'ghiChu', type: NV(200) },
], 'Hình thức vận chuyển');

const loaiTbdbCRUD = createCRUD('LoaiTBDB', 'maLoai', V(20), [
  { col: 'maLoai', type: V(20) },
  { col: 'tenLoai', type: NV(100), label: true },
  { col: 'ghiChu', type: NV(200) },
], 'Loại trang bị đồng bộ');

const capChatLuongCRUD = createCRUD('CapChatLuong', 'maCap', sql.Int, [
  { col: 'maCap', type: sql.Int },
  { col: 'tenCap', type: NV(100), label: true },
  { col: 'moTa', type: NV(500) },
], 'Cấp chất lượng');

const hinhThucNiemCatCRUD = createCRUD('HinhThucNiemCat', 'maHTNC', V(20), [
  { col: 'maHTNC', type: V(20) },
  { col: 'tenHTNC', type: NV(100), label: true },
], 'Hình thức niêm cất');

const tinhTrangBaoGoiCRUD = createCRUD('TinhTrangBaoGoi', 'maTTBG', V(20), [
  { col: 'maTTBG', type: V(20) },
  { col: 'tenTTBG', type: NV(200), label: true },
  { col: 'ghiChu', type: NV(200) },
], 'Tình trạng bao gói');

const trangThaiTbCRUD = createCRUD('TrangThaiTB', 'maTTTB', V(20), [
  { col: 'maTTTB', type: V(20) },
  { col: 'tenTTTB', type: NV(200), label: true },
  { col: 'ghiChu', type: NV(200) },
], 'Trạng thái trang bị');

const capBacCRUD = createCRUD('CapBac', 'maCapBac', V(20), [
  { col: 'maCapBac', type: V(20) },
  { col: 'tenCapBac', type: NV(100), label: true },
  { col: 'thuTu', type: sql.Int },
], 'Cấp bậc');

const chucVuCRUD = createCRUD('ChucVu', 'maChucVu', V(50), [
  { col: 'maChucVu', type: V(50) },
  { col: 'tenChucVu', type: NV(200), label: true },
  { col: 'moTa', type: NV(500) },
], 'Chức vụ');

const tinhCRUD = createCRUD('Tinh', 'maTinh', V(5), [
  { col: 'maTinh', type: V(5) },
  { col: 'tenTinh', type: NV(100), label: true },
  { col: 'vungMien', type: V(10) },
  { col: 'ghiChu', type: NV(200) },
], 'Tỉnh');

const loaiKhoCRUD = createCRUD('LoaiKho', 'maLoaiKho', V(30), [
  { col: 'maLoaiKho', type: V(30) },
  { col: 'tenLoaiKho', type: NV(100), label: true },
  { col: 'ghiChu', type: NV(500) },
], 'Loại kho');

const tinhChatNhapXuatCRUD = createCRUD('TinhChatNhapXuat', 'maNX', V(20), [
  { col: 'maNX', type: V(20) },
  { col: 'tenNX', type: NV(200), label: true },
  { col: 'nhomTB', type: V(50) },
  { col: 'ghiChu', type: NV(200) },
], 'Tính chất nhập xuất');

// ==== Nhóm có khóa ngoại tùy chọn ====

const kieuSpktCRUD = createCRUD('KieuSPKT', 'maKieu', V(30), [
  { col: 'maKieu', type: V(30) },
  { col: 'tenKieu', type: NV(200), label: true },
  { col: 'nuocSX', type: NV(100) },
  { col: 'maDVT', type: V(20) },
  { col: 'ghiChu', type: NV(200) },
], 'Kiểu SPKT');

const hangSxCRUD = createCRUD('HangSX', 'maHSX', V(20), [
  { col: 'maHSX', type: V(20) },
  { col: 'tenHSX', type: NV(100), label: true },
  { col: 'diaChi', type: NV(200) },
  { col: 'email', type: V(100) },
  { col: 'SDT', type: V(20) },
  { col: 'ghiChu', type: NV(200) },
  { col: 'maNSX', type: V(20) },
], 'Hãng sản xuất');

const nccCRUD = createCRUD('NCC', 'maNCC', V(20), [
  { col: 'maNCC', type: V(20) },
  { col: 'tenNCC', type: NV(100), label: true },
  { col: 'diaChi', type: NV(200) },
  { col: 'email', type: V(100) },
  { col: 'SDT', type: V(20) },
  { col: 'ghiChu', type: NV(200) },
  { col: 'maNSX', type: V(20) },
], 'Nhà cung cấp');

// ==== Nhóm có khóa ngoại bắt buộc ====

const xaCRUD = createCRUD('Xa', 'maXa', V(6), [
  { col: 'maXa', type: V(6) },
  { col: 'maTinh', type: V(5) },
  { col: 'tenXa', type: NV(100), label: true },
  { col: 'ghiChu', type: NV(150) },
], 'Xã');

const khoCRUD = createCRUD('Kho', 'maKho', V(30), [
  { col: 'maKho', type: V(30) },
  { col: 'maLoaiKho', type: V(30) },
  { col: 'tenKho', type: NV(200), label: true },
  { col: 'dienTich', type: sql.Decimal(10, 2) },
  { col: 'diaChi', type: NV(200) },
  { col: 'maXa', type: V(6) },
  { col: 'maTinh', type: V(5) },
  { col: 'ghiChu', type: NV(500) },
], 'Kho');

const loaiSpktCRUD = createCRUD('LoaiSPKT', 'maLoai', V(30), [
  { col: 'maLoai', type: V(30) },
  { col: 'maNhom', type: V(30) },
  { col: 'tenLoai', type: NV(100), label: true },
  { col: 'co', type: V(20) },
  { col: 'kiHieu', type: V(30) },
  { col: 'nuocSX', type: NV(50) },
  { col: 'maDVT', type: V(20) },
  { col: 'ghiChu', type: NV(200) },
], 'Loại SPKT');

const chiTietTcnxCRUD = createCRUD('ChiTietTCNX', 'maCTNX', V(20), [
  { col: 'maCTNX', type: V(20) },
  { col: 'tenCTNX', type: NV(200), label: true },
  { col: 'maNX', type: V(20) },
  { col: 'ghiChu', type: NV(200) },
], 'Chi tiết tính chất nhập xuất');

module.exports = {
  nhomSpktCRUD, dvtCRUD, nsxCRUD, htttCRUD, htVanChuyenCRUD, loaiTbdbCRUD,
  capChatLuongCRUD, hinhThucNiemCatCRUD, tinhTrangBaoGoiCRUD, trangThaiTbCRUD,
  capBacCRUD, chucVuCRUD, tinhCRUD, loaiKhoCRUD, tinhChatNhapXuatCRUD,
  kieuSpktCRUD, hangSxCRUD, nccCRUD,
  xaCRUD, khoCRUD, loaiSpktCRUD, chiTietTcnxCRUD,
};
