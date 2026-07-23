const bcrypt = require('bcryptjs');
const { getPool, sql } = require('../config/database');
const { logActivity } = require('../utils/activityLogger');

const getAllUsers = async (req, res) => {
  try {
    const pool = getPool();
    const result = await pool.request()
      .query('SELECT ID, TenDangNhap, HoTen, VaiTro, TrangThai, NgayTao FROM TaiKhoan ORDER BY NgayTao DESC');
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
      .input('tenDangNhap', sql.NVarChar, tenDangNhap)
      .query('SELECT ID FROM TaiKhoan WHERE TenDangNhap = @tenDangNhap');

    if (check.recordset.length > 0)
      return res.status(400).json({ message: 'Tên đăng nhập đã tồn tại' });

    const hashedPassword = await bcrypt.hash(matKhau, 10);
    await pool.request()
      .input('tenDangNhap', sql.NVarChar, tenDangNhap)
      .input('hoTen', sql.NVarChar, hoTen)
      .input('matKhau', sql.NVarChar, hashedPassword)
      .input('vaiTro', sql.NVarChar, vaiTro || 'NhanVien')
      .query(`INSERT INTO TaiKhoan (TenDangNhap, HoTen, MatKhau, VaiTro, TrangThai, NgayTao)
              VALUES (@tenDangNhap, @hoTen, @matKhau, @vaiTro, 1, GETDATE())`);

    await logActivity({
      taiKhoanId: req.user.id, tenDangNhap: req.user.username,
      hanhDong: 'TAO_MOI', moTa: `Tạo tài khoản mới "${tenDangNhap}" (vai trò: ${vaiTro || 'NhanVien'})`, req,
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
    await pool.request()
      .input('id', sql.Int, id)
      .input('vaiTro', sql.NVarChar, vaiTro)
      .query('UPDATE TaiKhoan SET VaiTro = @vaiTro WHERE ID = @id');

    await logActivity({
      taiKhoanId: req.user.id, tenDangNhap: req.user.username,
      hanhDong: 'CAP_NHAT', moTa: `Đổi vai trò tài khoản ID ${id} thành "${vaiTro}"`, req,
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
      .input('matKhau', sql.NVarChar, hashedPassword)
      .query('UPDATE TaiKhoan SET MatKhau = @matKhau WHERE ID = @id');

    await logActivity({
      taiKhoanId: req.user.id, tenDangNhap: req.user.username,
      hanhDong: 'CAP_NHAT', moTa: `Đặt lại mật khẩu cho tài khoản ID ${id}`, req,
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
      .query('UPDATE TaiKhoan SET TrangThai = CASE WHEN TrangThai = 1 THEN 0 ELSE 1 END WHERE ID = @id; SELECT TrangThai FROM TaiKhoan WHERE ID = @id');

    const trangThai = result.recordset[0]?.TrangThai;
    await logActivity({
      taiKhoanId: req.user.id, tenDangNhap: req.user.username,
      hanhDong: 'CAP_NHAT', moTa: `${trangThai ? 'Mở khóa' : 'Khóa'} tài khoản ID ${id}`, req,
    });

    res.json({ message: 'Cập nhật trạng thái tài khoản thành công' });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server', error: err.message });
  }
};

module.exports = { getAllUsers, createUser, updateUserRole, resetPassword, toggleLockUser };
