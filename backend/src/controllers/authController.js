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
      .input('username', sql.VarChar(50), username)
      .query(`
        SELECT nd.*, vt.maVaiTro
        FROM NguoiDung nd
        LEFT JOIN NguoiDungVaiTro ndvt ON ndvt.maNguoiDung = nd.maND
        LEFT JOIN VaiTro vt ON vt.maVaiTro = ndvt.maVaiTro
        WHERE nd.tenDangNhap = @username
      `);

    if (result.recordset.length === 0) {
      await logActivity({
        tenDangNhap: username, hanhDong: 'DANG_NHAP', ketQua: 'THAT_BAI',
        lyDoThatBai: 'Tài khoản không tồn tại', req,
      });
      return res.status(401).json({ message: 'Tài khoản không tồn tại hoặc đã bị khóa' });
    }

    const user = result.recordset[0];

    if (!user.isActive || user.biKhoa) {
      await logActivity({
        maNguoiDung: user.maND, tenDangNhap: user.tenDangNhap,
        hanhDong: 'DANG_NHAP', ketQua: 'THAT_BAI', lyDoThatBai: 'Tài khoản đã bị khóa',
      });
      return res.status(401).json({ message: 'Tài khoản không tồn tại hoặc đã bị khóa' });
    }

    const isMatch = await bcrypt.compare(password, user.matKhauHash);
    if (!isMatch) {
      await pool.request()
        .input('id', sql.Int, user.maND)
        .query('UPDATE NguoiDung SET soLanSaiMK = soLanSaiMK + 1 WHERE maND = @id');
      await logActivity({
        maNguoiDung: user.maND, tenDangNhap: user.tenDangNhap,
        hanhDong: 'DANG_NHAP', ketQua: 'THAT_BAI', lyDoThatBai: 'Sai mật khẩu',
      });
      return res.status(401).json({ message: 'Mật khẩu không đúng' });
    }

    await pool.request()
      .input('id', sql.Int, user.maND)
      .query('UPDATE NguoiDung SET soLanSaiMK = 0, lanDangNhapCuoi = SYSDATETIME() WHERE maND = @id');

    const token = jwt.sign(
      { id: user.maND, username: user.tenDangNhap, role: user.maVaiTro },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    await logActivity({
      maNguoiDung: user.maND, tenDangNhap: user.tenDangNhap,
      hanhDong: 'DANG_NHAP', ketQua: 'THANH_CONG',
    });

    res.json({
      message: 'Đăng nhập thành công',
      token,
      user: { id: user.maND, username: user.tenDangNhap, hoTen: user.hoTen, role: user.maVaiTro },
    });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server', error: err.message });
  }
};

const logout = async (req, res) => {
  try {
    await logActivity({
      maNguoiDung: req.user.id, tenDangNhap: req.user.username,
      hanhDong: 'DANG_XUAT', ketQua: 'THANH_CONG',
    });
    res.json({ message: 'Đăng xuất thành công' });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server', error: err.message });
  }
};

module.exports = { login, logout };
