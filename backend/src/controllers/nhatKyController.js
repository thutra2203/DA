const { getPool, sql } = require('../config/database');

const getAll = async (req, res) => {
  try {
    const { page = 1, pageSize = 20, hanhDong = '', keyword = '', tuNgay = '', denNgay = '' } = req.query;
    const pool = getPool();
    const request = pool.request();

    let where = 'WHERE 1=1';
    if (hanhDong) {
      where += ' AND hanhDong = @hanhDong';
      request.input('hanhDong', sql.VarChar(50), hanhDong);
    }
    if (keyword) {
      where += ' AND (tenDangNhap LIKE @keyword OR moTa LIKE @keyword)';
      request.input('keyword', sql.NVarChar, `%${keyword}%`);
    }
    if (tuNgay) {
      where += ' AND thoiGian >= @tuNgay';
      request.input('tuNgay', sql.DateTime, new Date(tuNgay));
    }
    if (denNgay) {
      where += ' AND thoiGian <= @denNgay';
      request.input('denNgay', sql.DateTime, new Date(`${denNgay}T23:59:59`));
    }

    const countResult = await request.query(`SELECT COUNT(*) AS total FROM NhatKyHoatDong ${where}`);
    const total = countResult.recordset[0].total;

    request.input('offset', sql.Int, (Number(page) - 1) * Number(pageSize));
    request.input('pageSize', sql.Int, Number(pageSize));

    const result = await request.query(`
      SELECT id AS ID, maNguoiDung AS MaNguoiDung, tenDangNhap AS TenDangNhap,
             hanhDong AS HanhDong, doiTuong AS DoiTuong, maDoiTuong AS MaDoiTuong,
             moTa AS MoTa, thoiGian AS ThoiGian, ketQua AS KetQua, lyDoThatBai AS LyDoThatBai
      FROM NhatKyHoatDong
      ${where}
      ORDER BY thoiGian DESC
      OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY
    `);

    res.json({ data: result.recordset, total });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server', error: err.message });
  }
};

module.exports = { getAll };
