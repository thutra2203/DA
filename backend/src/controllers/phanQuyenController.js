const { getPool, sql } = require('../config/database');

const getAll = async (req, res) => {
  try {
    const pool = getPool();
    const result = await pool.request().query(
      'SELECT * FROM PhanQuyen ORDER BY VaiTro, Module'
    );
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server', error: err.message });
  }
};

const getMyPermissions = async (req, res) => {
  try {
    const pool = getPool();
    const result = await pool.request()
      .input('vaiTro', sql.NVarChar, req.user.role)
      .query('SELECT * FROM PhanQuyen WHERE VaiTro = @vaiTro');
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
    const pool = getPool();
    await pool.request()
      .input('vaiTro', sql.NVarChar, vaiTro)
      .input('module', sql.NVarChar, module)
      .input('coTheXem', sql.Bit, coTheXem ? 1 : 0)
      .input('coTheThemMoi', sql.Bit, coTheThemMoi ? 1 : 0)
      .input('coTheSua', sql.Bit, coTheSua ? 1 : 0)
      .input('coTheXoa', sql.Bit, coTheXoa ? 1 : 0)
      .query(`
        UPDATE PhanQuyen
        SET CoTheXem=@coTheXem, CoTheThemMoi=@coTheThemMoi, CoTheSua=@coTheSua, CoTheXoa=@coTheXoa
        WHERE VaiTro=@vaiTro AND Module=@module
      `);
    res.json({ message: 'Cập nhật quyền thành công' });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server', error: err.message });
  }
};

module.exports = { getAll, getMyPermissions, updatePermission };
