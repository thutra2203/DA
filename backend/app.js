require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { connectDB } = require('./src/config/database');

const authRoutes = require('./src/routes/authRoutes');
const userRoutes = require('./src/routes/userRoutes');
const danhMucRoutes = require('./src/routes/danhMucRoutes');
const phanQuyenRoutes = require('./src/routes/phanQuyenRoutes');
const vaiTroRoutes = require('./src/routes/vaiTroRoutes');
const statsRoutes = require('./src/routes/statsRoutes');

const app = express();

app.use(cors({ origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175'], credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/danh-muc', danhMucRoutes);
app.use('/api/phan-quyen', phanQuyenRoutes);
app.use('/api/vai-tro', vaiTroRoutes);
app.use('/api/stats', statsRoutes);

app.get('/api/health', (req, res) => res.json({ status: 'OK', message: 'Server đang chạy' }));

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Lỗi server không xác định' });
});

const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  app.listen(PORT, () => console.log(`Server đang chạy tại http://localhost:${PORT}`));
});
