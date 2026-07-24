const { getPool, sql } = require('../config/database');
const { logActivity } = require('../utils/activityLogger');

const PROTECTED_ROLE = 'ADMIN';

const DIACRITICS_RE = new RegExp('[̀-ͯ]', 'g');

const slugifyRoleCode = (name) => {
  const code = (name || '')
    .replace(/đ/g, 'd').replace(/Đ/g, 'D')
    .normalize('NFD').replace(DIACRITICS_RE, '')
    .trim().toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return code || ('VT_' + Date.now());
};

const getAll = async (req, res) => {
  try {
    const pool = getPool();
    const result = await pool.request()
      .query('SELECT maVaiTro AS ID, tenVaiTro AS TenVaiTro, moTa AS MoTa FROM VaiTro ORDER BY maVaiTro');
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server', error: err.message });
  }
};

const create = async (req, res) => {
  try {
    const { tenVaiTro, moTa } = req.body;
    if (!tenVaiTro) return res.status(400).json({ message: 'Tên vai trò không được để trống' });

    const pool = getPool();
    const check = await pool.request()
      .input('tenVaiTro', sql.NVarChar(200), tenVaiTro)
      .query('SELECT maVaiTro FROM VaiTro WHERE tenVaiTro = @tenVaiTro');
    if (check.recordset.length > 0)
      return res.status(400).json({ message: 'Tên vai trò đã tồn tại' });

    let maVaiTro = slugifyRoleCode(tenVaiTro);
    const dup = await pool.request().input('ma', sql.VarChar(50), maVaiTro).query('SELECT maVaiTro FROM VaiTro WHERE maVaiTro = @ma');
    if (dup.recordset.length > 0) maVaiTro = `${maVaiTro}_${Date.now().toString().slice(-4)}`;

    await pool.request()
      .input('maVaiTro', sql.VarChar(50), maVaiTro)
      .input('tenVaiTro', sql.NVarChar(200), tenVaiTro)
      .input('moTa', sql.NVarChar(500), moTa || '')
      .query('INSERT INTO VaiTro (maVaiTro, tenVaiTro, moTa) VALUES (@maVaiTro, @tenVaiTro, @moTa)');

    // Quyền mặc định: chỉ xem (XEM) trên toàn bộ chức năng hệ thống
    const chucNangs = await pool.request().query('SELECT maCN FROM ChucNang');
    const xemQuyen = await pool.request().query(`SELECT maQuyen FROM Quyen WHERE tenQuyen = 'XEM'`);
    const maQuyenXem = xemQuyen.recordset[0]?.maQuyen;
    if (maQuyenXem) {
      for (const cn of chucNangs.recordset) {
        await pool.request()
          .input('maVaiTro', sql.VarChar(50), maVaiTro)
          .input('maQuyen', sql.Int, maQuyenXem)
          .input('maCN', sql.VarChar(50), cn.maCN)
          .query('INSERT INTO VaiTroChucNangQuyen (maVaiTro, maQuyen, maCN) VALUES (@maVaiTro, @maQuyen, @maCN)');
      }
    }

    await logActivity({
      maNguoiDung: req.user.id, tenDangNhap: req.user.username,
      hanhDong: 'THEM', doiTuong: 'VaiTro', maDoiTuong: maVaiTro,
      moTa: `Tạo vai trò mới "${tenVaiTro}" (mã ${maVaiTro})`,
    });

    res.status(201).json({ message: 'Tạo vai trò thành công' });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server', error: err.message });
  }
};

const update = async (req, res) => {
  try {
    const { id } = req.params;
    const { moTa } = req.body;
    const pool = getPool();

    const vt = await pool.request().input('id', sql.VarChar(50), id).query('SELECT tenVaiTro FROM VaiTro WHERE maVaiTro = @id');
    if (vt.recordset.length === 0) return res.status(404).json({ message: 'Không tìm thấy vai trò' });
    if (id === PROTECTED_ROLE)
      return res.status(400).json({ message: 'Không thể sửa vai trò mặc định' });

    await pool.request()
      .input('id', sql.VarChar(50), id)
      .input('moTa', sql.NVarChar(500), moTa)
      .query('UPDATE VaiTro SET moTa = @moTa WHERE maVaiTro = @id');

    await logActivity({
      maNguoiDung: req.user.id, tenDangNhap: req.user.username,
      hanhDong: 'SUA', doiTuong: 'VaiTro', maDoiTuong: id,
      moTa: `Cập nhật mô tả vai trò "${vt.recordset[0].tenVaiTro}"`,
    });

    res.json({ message: 'Cập nhật thành công' });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server', error: err.message });
  }
};

const remove = async (req, res) => {
  try {
    const { id } = req.params;
    const pool = getPool();

    const vt = await pool.request().input('id', sql.VarChar(50), id).query('SELECT tenVaiTro FROM VaiTro WHERE maVaiTro = @id');
    if (vt.recordset.length === 0) return res.status(404).json({ message: 'Không tìm thấy vai trò' });
    if (id === PROTECTED_ROLE)
      return res.status(400).json({ message: 'Không thể xóa vai trò mặc định của hệ thống' });

    const users = await pool.request()
      .input('id', sql.VarChar(50), id)
      .query('SELECT COUNT(*) AS SoNguoi FROM NguoiDungVaiTro WHERE maVaiTro = @id');
    if (users.recordset[0].SoNguoi > 0)
      return res.status(400).json({ message: `Còn ${users.recordset[0].SoNguoi} tài khoản đang dùng vai trò này` });

    await pool.request().input('id', sql.VarChar(50), id).query('DELETE FROM VaiTroChucNangQuyen WHERE maVaiTro = @id');
    await pool.request().input('id', sql.VarChar(50), id).query('DELETE FROM VaiTro WHERE maVaiTro = @id');

    await logActivity({
      maNguoiDung: req.user.id, tenDangNhap: req.user.username,
      hanhDong: 'XOA', doiTuong: 'VaiTro', maDoiTuong: id,
      moTa: `Xóa vai trò "${vt.recordset[0].tenVaiTro}"`,
    });

    res.json({ message: 'Xóa vai trò thành công' });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server', error: err.message });
  }
};

module.exports = { getAll, create, update, remove };
