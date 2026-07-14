const { getPool } = require('../config/database');

const getStats = async (req, res) => {
  try {
    const pool = getPool();
    const tables = [
      ['taiKhoan',       'TaiKhoan'],
      ['donVi',          'DanhMucDonVi'],
      ['capBac',         'DanhMucCapBac'],
      ['chucVu',         'DanhMucChucVu'],
      ['toChucNhanSu',   'DanhMucToChucNhanSu'],
      ['toChucKho',      'DanhMucToChucKho'],
      ['tuDienTbn1',     'DanhMucTuDienTBN1'],
      ['tuDienTbn2',     'DanhMucTuDienTBN2'],
      ['tuDienDungChung','DanhMucTuDienDungChung'],
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
