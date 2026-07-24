const { getPool } = require('../config/database');

const getStats = async (req, res) => {
  try {
    const pool = getPool();
    const tables = [
      ['taiKhoan',    'NguoiDung'],
      ['kho',         'Kho'],
      ['loaiSpkt',    'LoaiSPKT'],
      ['nhaCungCap',  'NCC'],
      ['capBac',      'CapBac'],
      ['chucVu',      'ChucVu'],
      ['dvt',         'DVT'],
      ['nsx',         'NSX'],
      ['loaiTbdb',    'LoaiTBDB'],
      ['tinh',        'Tinh'],
    ];
    const results = await Promise.all(
      tables.map(([, tbl]) => pool.request().query(`SELECT COUNT(*) AS count FROM ${tbl}`))
    );
    const stats = {};
    tables.forEach(([key], i) => { stats[key] = results[i].recordset[0].count; });
    res.json(stats);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getStats };
