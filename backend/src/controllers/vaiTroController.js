const { getPool, sql } = require('../config/database');

const getAll = async (req, res) => {
  try {
    const pool = getPool();
    const result = await pool.request().query('SELECT * FROM VaiTro ORDER BY ID');
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server', error: err.message });
  }
};

const create = async (req, res) => {
  try {
    const { tenVaiTro, moTa } = req.body;
    if (!tenVaiTro) return res.status(400).json({ message: 'Tên vai trò không được để trống' });

    const pool = getPool();
    const check = await pool.request()
      .input('tenVaiTro', sql.NVarChar, tenVaiTro)
      .query('SELECT ID FROM VaiTro WHERE TenVaiTro = @tenVaiTro');
    if (check.recordset.length > 0)
      return res.status(400).json({ message: 'Tên vai trò đã tồn tại' });

    // Tạo vai trò mới
    await pool.request()
      .input('tenVaiTro', sql.NVarChar, tenVaiTro)
      .input('moTa', sql.NVarChar, moTa || '')
      .query('INSERT INTO VaiTro (TenVaiTro, MoTa) VALUES (@tenVaiTro, @moTa)');

    // Tự động tạo bản ghi phân quyền mặc định (chỉ xem) cho vai trò mới
    const modules = [
      'quan-ly-nguoi-dung','danh-muc-don-vi','danh-muc-cap-bac','danh-muc-chuc-vu',
      'danh-muc-to-chuc-nhan-su','danh-muc-to-chuc-kho',
      'danh-muc-tu-dien-tbn1','danh-muc-tu-dien-tbn2','danh-muc-tu-dien-dung-chung',
    ];
    for (const mod of modules) {
      await pool.request()
        .input('vaiTro', sql.NVarChar, tenVaiTro)
        .input('module', sql.NVarChar, mod)
        .query(`INSERT INTO PhanQuyen (VaiTro, Module, CoTheXem, CoTheThemMoi, CoTheSua, CoTheXoa)
                VALUES (@vaiTro, @module, 1, 0, 0, 0)`);
    }

    res.status(201).json({ message: 'Tạo vai trò thành công' });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server', error: err.message });
  }
};

const update = async (req, res) => {
  try {
    const { id } = req.params;
    const { moTa } = req.body;
    const pool = getPool();

    const vt = await pool.request().input('id', sql.Int, id).query('SELECT TenVaiTro FROM VaiTro WHERE ID = @id');
    if (vt.recordset.length === 0) return res.status(404).json({ message: 'Không tìm thấy vai trò' });
    if (['Admin', 'QuanLy', 'NhanVien'].includes(vt.recordset[0].TenVaiTro))
      return res.status(400).json({ message: 'Không thể sửa vai trò mặc định' });

    await pool.request()
      .input('id', sql.Int, id)
      .input('moTa', sql.NVarChar, moTa)
      .query('UPDATE VaiTro SET MoTa = @moTa WHERE ID = @id');
    res.json({ message: 'Cập nhật thành công' });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server', error: err.message });
  }
};

const remove = async (req, res) => {
  try {
    const { id } = req.params;
    const pool = getPool();

    const vt = await pool.request().input('id', sql.Int, id).query('SELECT TenVaiTro FROM VaiTro WHERE ID = @id');
    if (vt.recordset.length === 0) return res.status(404).json({ message: 'Không tìm thấy vai trò' });
    const tenVaiTro = vt.recordset[0].TenVaiTro;
    if (['Admin', 'QuanLy', 'NhanVien'].includes(tenVaiTro))
      return res.status(400).json({ message: 'Không thể xóa vai trò mặc định của hệ thống' });

    const users = await pool.request()
      .input('vaiTro', sql.NVarChar, tenVaiTro)
      .query('SELECT COUNT(*) AS SoNguoi FROM TaiKhoan WHERE VaiTro = @vaiTro');
    if (users.recordset[0].SoNguoi > 0)
      return res.status(400).json({ message: `Còn ${users.recordset[0].SoNguoi} tài khoản đang dùng vai trò này` });

    await pool.request().input('vaiTro', sql.NVarChar, tenVaiTro).query('DELETE FROM PhanQuyen WHERE VaiTro = @vaiTro');
    await pool.request().input('id', sql.Int, id).query('DELETE FROM VaiTro WHERE ID = @id');
    res.json({ message: 'Xóa vai trò thành công' });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server', error: err.message });
  }
};

module.exports = { getAll, create, update, remove };
