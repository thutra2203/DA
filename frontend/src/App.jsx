import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/auth/Login';
import MainLayout from './components/layout/MainLayout';
import Dashboard from './pages/Dashboard';
import QuanLyNguoiDung from './pages/users/QuanLyNguoiDung';
import DanhMucPage from './pages/danhMuc/DanhMucPage';
import PhanQuyen from './pages/PhanQuyen';
import QuanLyVaiTro from './pages/QuanLyVaiTro';
import { PermissionProvider } from './context/PermissionContext';

function PrivateRoute({ children }) {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" replace />;
}

function AppRoutes() {
  const { user } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/*" element={
        <PrivateRoute>
          <MainLayout>
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/users" element={<QuanLyNguoiDung />} />
              <Route path="/phan-quyen" element={<PhanQuyen />} />
              <Route path="/vai-tro" element={<QuanLyVaiTro />} />
              <Route path="/danh-muc/don-vi" element={<DanhMucPage type="don-vi" />} />
              <Route path="/danh-muc/cap-bac" element={<DanhMucPage type="cap-bac" />} />
              <Route path="/danh-muc/chuc-vu" element={<DanhMucPage type="chuc-vu" />} />
              <Route path="/danh-muc/to-chuc-nhan-su" element={<DanhMucPage type="to-chuc-nhan-su" />} />
              <Route path="/danh-muc/to-chuc-kho" element={<DanhMucPage type="to-chuc-kho" />} />
              <Route path="/danh-muc/tu-dien-tbn1" element={<DanhMucPage type="tu-dien-tbn1" />} />
              <Route path="/danh-muc/tu-dien-tbn2" element={<DanhMucPage type="tu-dien-tbn2" />} />
              <Route path="/danh-muc/tu-dien-dung-chung" element={<DanhMucPage type="tu-dien-dung-chung" />} />
            </Routes>
          </MainLayout>
        </PrivateRoute>
      } />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <PermissionProvider>
          <AppRoutes />
        </PermissionProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
