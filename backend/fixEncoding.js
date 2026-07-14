require('dotenv').config();
const { connectDB, getPool, sql } = require('./src/config/database');

async function fix() {
  await connectDB();
  const pool = getPool();
  await pool.request()
    .input('hoTen', sql.NVarChar, 'Quản trị viên')
    .query("UPDATE TaiKhoan SET HoTen = @hoTen WHERE TenDangNhap = 'admin'");
  const r = await pool.request().query('SELECT ID, TenDangNhap, HoTen, VaiTro FROM TaiKhoan');
  console.log(JSON.stringify(r.recordset, null, 2));
  process.exit(0);
}
fix().catch(e => { console.error(e.message); process.exit(1); });
