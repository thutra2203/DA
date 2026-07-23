const { getPool, sql } = require('../config/database');

const getAll = async (req, res) => {
  try {
    const { page = 1, pageSize = 20, hanhDong = '', keyword = '', tuNgay = '', denNgay = '' } = req.query;
    const pool = getPool();
    const request = pool.request();

    let where = 'WHERE 1=1';
    if (hanhDong) {
      where += ' AND HanhDong = @hanhDong';
      request.input('hanhDong', sql.NVarChar, hanhDong);
    }
    if (keyword) {
      where += ' AND (TenDangNhap LIKE @keyword OR HoTen LIKE @keyword OR MoTa LIKE @keyword)';
      request.input('keyword', sql.NVarChar, `%${keyword}%`);
    }
    if (tuNgay) {
      where += ' AND ThoiGian >= @tuNgay';
      request.input('tuNgay', sql.DateTime, new Date(tuNgay));
    }
    if (denNgay) {
      where += ' AND ThoiGian <= @denNgay';
      request.input('denNgay', sql.DateTime, new Date(`${denNgay}T23:59:59`));
    }

    const countResult = await request.query(`SELECT COUNT(*) AS total FROM NhatKyHoatDong ${where}`);
    const total = countResult.recordset[0].total;

    request.input('offset', sql.Int, (Number(page) - 1) * Number(pageSize));
    request.input('pageSize', sql.Int, Number(pageSize));

    const result = await request.query(`
      SELECT * FROM NhatKyHoatDong
      ${where}
      ORDER BY ThoiGian DESC
      OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY
    `);

    res.json({ data: result.recordset, total });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server', error: err.message });
  }
};

module.exports = { getAll };
