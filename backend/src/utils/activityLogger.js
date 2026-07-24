const { getPool, sql } = require('../config/database');

// Không throw lỗi ra ngoài — ghi log thất bại không được làm hỏng thao tác chính
const logActivity = async ({
  maNguoiDung = null, tenDangNhap = '', hanhDong, doiTuong = null, maDoiTuong = null,
  moTa = '', ketQua = 'THANH_CONG', lyDoThatBai = null,
}) => {
  try {
    const pool = getPool();
    await pool.request()
      .input('maNguoiDung', sql.Int, maNguoiDung)
      .input('tenDangNhap', sql.VarChar(50), tenDangNhap)
      .input('hanhDong', sql.VarChar(50), hanhDong)
      .input('doiTuong', sql.VarChar(100), doiTuong)
      .input('maDoiTuong', sql.VarChar(50), maDoiTuong)
      .input('moTa', sql.NVarChar, moTa)
      .input('ketQua', sql.VarChar(20), ketQua)
      .input('lyDoThatBai', sql.NVarChar, lyDoThatBai)
      .query(`INSERT INTO NhatKyHoatDong (maNguoiDung, tenDangNhap, hanhDong, doiTuong, maDoiTuong, moTa, ketQua, lyDoThatBai)
              VALUES (@maNguoiDung, @tenDangNhap, @hanhDong, @doiTuong, @maDoiTuong, @moTa, @ketQua, @lyDoThatBai)`);
  } catch (err) {
    console.error('Lỗi ghi nhật ký hoạt động:', err.message);
  }
};

module.exports = { logActivity };
