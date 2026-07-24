const bcrypt = require('bcryptjs');
const { getPool, sql } = require('../config/database');
const { logActivity } = require('../utils/activityLogger');

const USER_LIST_QUERY = `
  SELECT nd.maND AS ID, nd.tenDangNhap AS TenDangNhap, nd.hoTen AS HoTen,
         vt.maVaiTro AS VaiTro,
         CASE WHEN nd.biKhoa = 0 THEN 1 ELSE 0 END AS TrangThai,
         nd.createdAt AS NgayTao
  FROM NguoiDung nd
  LEFT JOIN NguoiDungVaiTro ndvt ON ndvt.maNguoiDung = nd.maND
  LEFT JOIN VaiTro vt ON vt.maVaiTro = ndvt.maVaiTro
`;

const getAllUsers = async (req, res) => {
  try {
    const pool = getPool();
    const result = await pool.request().query(`${USER_LIST_QUERY} ORDER BY nd.createdAt DESC`);
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server', error: err.message });
  }
};

const createUser = async (req, res) => {
  try {
    const { tenDangNhap, hoTen, matKhau, vaiTro } = req.body;
    if (!tenDangNhap || !matKhau || !hoTen)
      return res.status(400).json({ message: 'Thiếu thông tin bắt buộc' });

    const pool = getPool();
    const check = await pool.request()
      .input('tenDangNhap', sql.VarChar(50), tenDangNhap)
      .query('SELECT maND FROM NguoiDung WHERE tenDangNhap = @tenDangNhap');

    if (check.recordset.length > 0)
      return res.status(400).json({ message: 'Tên đăng nhập đã tồn tại' });

    const hashedPassword = await bcrypt.hash(matKhau, 10);
    // NguoiDung.email là UNIQUE — sinh placeholder duy nhất vì form không thu thập email
    const placeholderEmail = `${tenDangNhap}@local`;

    const inserted = await pool.request()
      .input('tenDangNhap', sql.VarChar(50), tenDangNhap)
      .input('hoTen', sql.NVarChar(200), hoTen)
      .input('matKhauHash', sql.VarChar(255), hashedPassword)
      .input('email', sql.VarChar(200), placeholderEmail)
      .query(`INSERT INTO NguoiDung (tenDangNhap, matKhauHash, hoTen, email, isActive, biKhoa)
              OUTPUT INSERTED.maND
              VALUES (@tenDangNhap, @matKhauHash, @hoTen, @email, 1, 0)`);

    const newId = inserted.recordset[0].maND;

    await pool.request()
      .input('maNguoiDung', sql.Int, newId)
      .input('maVaiTro', sql.VarChar(50), vaiTro)
      .query('INSERT INTO NguoiDungVaiTro (maNguoiDung, maVaiTro) VALUES (@maNguoiDung, @maVaiTro)');

    await logActivity({
      maNguoiDung: req.user.id, tenDangNhap: req.user.username,
      hanhDong: 'THEM', doiTuong: 'NguoiDung', maDoiTuong: String(newId),
      moTa: `Tạo tài khoản mới "${tenDangNhap}" (vai trò: ${vaiTro})`,
    });

    res.status(201).json({ message: 'Tạo tài khoản thành công' });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server', error: err.message });
  }
};

const updateUserRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { vaiTro } = req.body;
    const pool = getPool();

    await pool.request().input('id', sql.Int, id).query('DELETE FROM NguoiDungVaiTro WHERE maNguoiDung = @id');
    await pool.request()
      .input('id', sql.Int, id)
      .input('vaiTro', sql.VarChar(50), vaiTro)
      .query('INSERT INTO NguoiDungVaiTro (maNguoiDung, maVaiTro) VALUES (@id, @vaiTro)');

    await logActivity({
      maNguoiDung: req.user.id, tenDangNhap: req.user.username,
      hanhDong: 'SUA', doiTuong: 'NguoiDung', maDoiTuong: String(id),
      moTa: `Đổi vai trò tài khoản ID ${id} thành "${vaiTro}"`,
    });

    res.json({ message: 'Cập nhật quyền thành công' });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server', error: err.message });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { matKhauMoi } = req.body;
    const hashedPassword = await bcrypt.hash(matKhauMoi || '123456', 10);
    const pool = getPool();
    await pool.request()
      .input('id', sql.Int, id)
      .input('matKhauHash', sql.VarChar(255), hashedPassword)
      .query('UPDATE NguoiDung SET matKhauHash = @matKhauHash WHERE maND = @id');

    await logActivity({
      maNguoiDung: req.user.id, tenDangNhap: req.user.username,
      hanhDong: 'SUA', doiTuong: 'NguoiDung', maDoiTuong: String(id),
      moTa: `Đặt lại mật khẩu cho tài khoản ID ${id}`,
    });

    res.json({ message: 'Đặt lại mật khẩu thành công' });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server', error: err.message });
  }
};

const toggleLockUser = async (req, res) => {
  try {
    const { id } = req.params;
    const pool = getPool();
    const result = await pool.request()
      .input('id', sql.Int, id)
      .query(`
        UPDATE NguoiDung
        SET biKhoa = CASE WHEN biKhoa = 1 THEN 0 ELSE 1 END,
            lyDoKhoa = CASE WHEN biKhoa = 1 THEN NULL ELSE N'Khóa bởi quản trị viên' END
        WHERE maND = @id;
        SELECT biKhoa FROM NguoiDung WHERE maND = @id;
      `);

    const biKhoa = result.recordset[0]?.biKhoa;
    await logActivity({
      maNguoiDung: req.user.id, tenDangNhap: req.user.username,
      hanhDong: 'SUA', doiTuong: 'NguoiDung', maDoiTuong: String(id),
      moTa: `${biKhoa ? 'Khóa' : 'Mở khóa'} tài khoản ID ${id}`,
    });

    res.json({ message: 'Cập nhật trạng thái tài khoản thành công' });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server', error: err.message });
  }
};

module.exports = { getAllUsers, createUser, updateUserRole, resetPassword, toggleLockUser };
