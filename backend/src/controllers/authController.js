const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getPool, sql } = require('../config/database');
const { logActivity } = require('../utils/activityLogger');

const login = async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password)
      return res.status(400).json({ message: 'Vui lòng nhập tài khoản và mật khẩu' });

    const pool = getPool();
    const result = await pool.request()
      .input('username', sql.NVarChar, username)
      .query('SELECT * FROM TaiKhoan WHERE TenDangNhap = @username AND TrangThai = 1');

    if (result.recordset.length === 0) {
      await logActivity({
        tenDangNhap: username, hanhDong: 'DANG_NHAP_THAT_BAI',
        moTa: 'Đăng nhập thất bại: tài khoản không tồn tại hoặc đã bị khóa', req,
      });
      return res.status(401).json({ message: 'Tài khoản không tồn tại hoặc đã bị khóa' });
    }

    const user = result.recordset[0];
    const isMatch = await bcrypt.compare(password, user.MatKhau);
    if (!isMatch) {
      await logActivity({
        taiKhoanId: user.ID, tenDangNhap: user.TenDangNhap, hoTen: user.HoTen,
        hanhDong: 'DANG_NHAP_THAT_BAI', moTa: 'Đăng nhập thất bại: sai mật khẩu', req,
      });
      return res.status(401).json({ message: 'Mật khẩu không đúng' });
    }

    const token = jwt.sign(
      { id: user.ID, username: user.TenDangNhap, role: user.VaiTro },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    await logActivity({
      taiKhoanId: user.ID, tenDangNhap: user.TenDangNhap, hoTen: user.HoTen,
      hanhDong: 'DANG_NHAP', moTa: 'Đăng nhập thành công', req,
    });

    res.json({
      message: 'Đăng nhập thành công',
      token,
      user: { id: user.ID, username: user.TenDangNhap, hoTen: user.HoTen, role: user.VaiTro },
    });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server', error: err.message });
  }
};

const logout = async (req, res) => {
  try {
    await logActivity({
      taiKhoanId: req.user.id, tenDangNhap: req.user.username,
      hanhDong: 'DANG_XUAT', moTa: 'Đăng xuất khỏi hệ thống', req,
    });
    res.json({ message: 'Đăng xuất thành công' });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server', error: err.message });
  }
};

module.exports = { login, logout };
