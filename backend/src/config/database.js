const sql = require('mssql');
require('dotenv').config();

const config = {
  server: process.env.DB_SERVER,
  database: process.env.DB_DATABASE,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT) || 1433,
  options: {
    encrypt: false,
    trustServerCertificate: true,
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
};

let pool;

const connectDB = async () => {
  try {
    pool = await sql.connect(config);
    console.log('Kết nối SQL Server thành công!');
    return pool;
  } catch (err) {
    console.error('Lỗi kết nối SQL Server:', err.message);
    process.exit(1);
  }
};

const getPool = () => {
  if (!pool) throw new Error('Database chưa được kết nối');
  return pool;
};

module.exports = { connectDB, getPool, sql };
