const { getPool, sql } = require('../config/database');
const { logActivity } = require('../utils/activityLogger');

const PERM_MATRIX_QUERY = `
  SELECT vt.maVaiTro AS VaiTro, cn.maCN AS Module,
    CASE WHEN EXISTS (
      SELECT 1 FROM VaiTroChucNangQuyen v JOIN Quyen q ON q.maQuyen = v.maQuyen
      WHERE v.maVaiTro = vt.maVaiTro AND v.maCN = cn.maCN AND q.tenQuyen = 'XEM'
    ) THEN 1 ELSE 0 END AS CoTheXem,
    CASE WHEN EXISTS (
      SELECT 1 FROM VaiTroChucNangQuyen v JOIN Quyen q ON q.maQuyen = v.maQuyen
      WHERE v.maVaiTro = vt.maVaiTro AND v.maCN = cn.maCN AND q.tenQuyen = 'THEM'
    ) THEN 1 ELSE 0 END AS CoTheThemMoi,
    CASE WHEN EXISTS (
      SELECT 1 FROM VaiTroChucNangQuyen v JOIN Quyen q ON q.maQuyen = v.maQuyen
      WHERE v.maVaiTro = vt.maVaiTro AND v.maCN = cn.maCN AND q.tenQuyen = 'SUA'
    ) THEN 1 ELSE 0 END AS CoTheSua,
    CASE WHEN EXISTS (
      SELECT 1 FROM VaiTroChucNangQuyen v JOIN Quyen q ON q.maQuyen = v.maQuyen
      WHERE v.maVaiTro = vt.maVaiTro AND v.maCN = cn.maCN AND q.tenQuyen = 'XOA'
    ) THEN 1 ELSE 0 END AS CoTheXoa
  FROM VaiTro vt CROSS JOIN ChucNang cn
`;

const getAll = async (req, res) => {
  try {
    const pool = getPool();
    const result = await pool.request().query(`${PERM_MATRIX_QUERY} ORDER BY vt.maVaiTro, cn.maCN`);
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server', error: err.message });
  }
};

const getMyPermissions = async (req, res) => {
  try {
    const pool = getPool();
    const result = await pool.request()
      .input('vaiTro', sql.VarChar(50), req.user.role)
      .query(`${PERM_MATRIX_QUERY} WHERE vt.maVaiTro = @vaiTro`);
    const map = {};
    result.recordset.forEach(r => { map[r.Module] = r; });
    res.json(map);
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server', error: err.message });
  }
};

const updatePermission = async (req, res) => {
  try {
    const { vaiTro, module, coTheXem, coTheThemMoi, coTheSua, coTheXoa } = req.body;
    const flags = { XEM: coTheXem, THEM: coTheThemMoi, SUA: coTheSua, XOA: coTheXoa };
    const pool = getPool();

    const quyenRows = await pool.request().query(
      `SELECT maQuyen, tenQuyen FROM Quyen WHERE tenQuyen IN ('XEM','THEM','SUA','XOA')`
    );

    for (const row of quyenRows.recordset) {
      const granted = !!flags[row.tenQuyen];
      const exists = await pool.request()
        .input('vaiTro', sql.VarChar(50), vaiTro)
        .input('maQuyen', sql.Int, row.maQuyen)
        .input('module', sql.VarChar(50), module)
        .query('SELECT 1 FROM VaiTroChucNangQuyen WHERE maVaiTro=@vaiTro AND maQuyen=@maQuyen AND maCN=@module');

      if (granted && exists.recordset.length === 0) {
        await pool.request()
          .input('vaiTro', sql.VarChar(50), vaiTro)
          .input('maQuyen', sql.Int, row.maQuyen)
          .input('module', sql.VarChar(50), module)
          .query('INSERT INTO VaiTroChucNangQuyen (maVaiTro, maQuyen, maCN) VALUES (@vaiTro, @maQuyen, @module)');
      } else if (!granted && exists.recordset.length > 0) {
        await pool.request()
          .input('vaiTro', sql.VarChar(50), vaiTro)
          .input('maQuyen', sql.Int, row.maQuyen)
          .input('module', sql.VarChar(50), module)
          .query('DELETE FROM VaiTroChucNangQuyen WHERE maVaiTro=@vaiTro AND maQuyen=@maQuyen AND maCN=@module');
      }
    }

    await logActivity({
      maNguoiDung: req.user.id, tenDangNhap: req.user.username,
      hanhDong: 'SUA', doiTuong: 'VaiTroChucNangQuyen', maDoiTuong: `${vaiTro}:${module}`,
      moTa: `Cập nhật phân quyền chức năng "${module}" cho vai trò "${vaiTro}"`,
    });

    res.json({ message: 'Cập nhật quyền thành công' });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server', error: err.message });
  }
};

module.exports = { getAll, getMyPermissions, updatePermission };
