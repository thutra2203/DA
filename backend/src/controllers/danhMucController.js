const { getPool, sql } = require('../config/database');

const createCRUD = (tableName, idCol, fields) => ({
  getAll: async (req, res) => {
    try {
      const pool = getPool();
      const result = await pool.request().query(`SELECT * FROM ${tableName} ORDER BY ${idCol}`);
      res.json(result.recordset);
    } catch (err) {
      res.status(500).json({ message: 'Lỗi server', error: err.message });
    }
  },

  create: async (req, res) => {
    try {
      const pool = getPool();
      const req2 = pool.request();
      const cols = fields.map(f => f.col).join(', ');
      const params = fields.map(f => `@${f.col}`).join(', ');
      fields.forEach(f => req2.input(f.col, f.type, req.body[f.name]));
      await req2.query(`INSERT INTO ${tableName} (${cols}) VALUES (${params})`);
      res.status(201).json({ message: 'Thêm mới thành công' });
    } catch (err) {
      res.status(500).json({ message: 'Lỗi server', error: err.message });
    }
  },

  update: async (req, res) => {
    try {
      const pool = getPool();
      const req2 = pool.request();
      const sets = fields.map(f => `${f.col} = @${f.col}`).join(', ');
      fields.forEach(f => req2.input(f.col, f.type, req.body[f.name]));
      req2.input(idCol, sql.Int, req.params.id);
      await req2.query(`UPDATE ${tableName} SET ${sets} WHERE ${idCol} = @${idCol}`);
      res.json({ message: 'Cập nhật thành công' });
    } catch (err) {
      res.status(500).json({ message: 'Lỗi server', error: err.message });
    }
  },

  remove: async (req, res) => {
    try {
      const pool = getPool();
      await pool.request()
        .input(idCol, sql.Int, req.params.id)
        .query(`DELETE FROM ${tableName} WHERE ${idCol} = @${idCol}`);
      res.json({ message: 'Xóa thành công' });
    } catch (err) {
      res.status(500).json({ message: 'Lỗi server', error: err.message });
    }
  },
});

const NVarChar = sql.NVarChar;

const donViCRUD = createCRUD('DanhMucDonVi', 'ID', [
  { col: 'TenDonVi', name: 'tenDonVi', type: NVarChar },
  { col: 'MaDonVi', name: 'maDonVi', type: NVarChar },
  { col: 'GhiChu', name: 'ghiChu', type: NVarChar },
]);

const capBacCRUD = createCRUD('DanhMucCapBac', 'ID', [
  { col: 'TenCapBac', name: 'tenCapBac', type: NVarChar },
  { col: 'MaCapBac', name: 'maCapBac', type: NVarChar },
]);

const chucVuCRUD = createCRUD('DanhMucChucVu', 'ID', [
  { col: 'TenChucVu', name: 'tenChucVu', type: NVarChar },
  { col: 'MaChucVu', name: 'maChucVu', type: NVarChar },
]);

const toChucNhanSuCRUD = createCRUD('DanhMucToChucNhanSu', 'ID', [
  { col: 'TenToChuc', name: 'tenToChuc', type: NVarChar },
  { col: 'MaToChuc', name: 'maToChuc', type: NVarChar },
]);

const toChucKhoCRUD = createCRUD('DanhMucToChucKho', 'ID', [
  { col: 'TenKho', name: 'tenKho', type: NVarChar },
  { col: 'MaKho', name: 'maKho', type: NVarChar },
  { col: 'DiaDiem', name: 'diaDiem', type: NVarChar },
]);

const tuDienTBN1CRUD = createCRUD('DanhMucTuDienTBN1', 'ID', [
  { col: 'TenTuDien', name: 'tenTuDien', type: NVarChar },
  { col: 'MaTuDien', name: 'maTuDien', type: NVarChar },
  { col: 'GhiChu', name: 'ghiChu', type: NVarChar },
]);

const tuDienTBN2CRUD = createCRUD('DanhMucTuDienTBN2', 'ID', [
  { col: 'TenTuDien', name: 'tenTuDien', type: NVarChar },
  { col: 'MaTuDien', name: 'maTuDien', type: NVarChar },
  { col: 'GhiChu', name: 'ghiChu', type: NVarChar },
]);

const tuDienDungChungCRUD = createCRUD('DanhMucTuDienDungChung', 'ID', [
  { col: 'TenTuDien', name: 'tenTuDien', type: NVarChar },
  { col: 'MaTuDien', name: 'maTuDien', type: NVarChar },
  { col: 'GhiChu', name: 'ghiChu', type: NVarChar },
]);

module.exports = {
  donViCRUD, capBacCRUD, chucVuCRUD,
  toChucNhanSuCRUD, toChucKhoCRUD,
  tuDienTBN1CRUD, tuDienTBN2CRUD, tuDienDungChungCRUD,
};
