const { getPool, sql } = require('../config/database');

const getClientIp = (req) => {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) return forwarded.split(',')[0].trim();
  return req.socket?.remoteAddress || req.ip || '';
};

// Không throw lỗi ra ngoài — ghi log thất bại không được làm hỏng thao tác chính
const logActivity = async ({ taiKhoanId = null, tenDangNhap = '', hoTen = '', hanhDong, moTa = '', req = null }) => {
  try {
    const pool = getPool();
    await pool.request()
      .input('taiKhoanId', sql.Int, taiKhoanId)
      .input('tenDangNhap', sql.NVarChar, tenDangNhap)
      .input('hoTen', sql.NVarChar, hoTen)
      .input('hanhDong', sql.NVarChar, hanhDong)
      .input('moTa', sql.NVarChar, moTa)
      .input('diaChiIp', sql.NVarChar, req ? getClientIp(req) : '')
      .query(`INSERT INTO NhatKyHoatDong (TaiKhoanID, TenDangNhap, HoTen, HanhDong, MoTa, DiaChiIP, ThoiGian)
              VALUES (@taiKhoanId, @tenDangNhap, @hoTen, @hanhDong, @moTa, @diaChiIp, GETDATE())`);
  } catch (err) {
    console.error('Lỗi ghi nhật ký hoạt động:', err.message);
  }
};

module.exports = { logActivity };
