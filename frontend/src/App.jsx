import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/auth/Login';
import MainLayout from './components/layout/MainLayout';
import Dashboard from './pages/Dashboard';
import QuanLyNguoiDung from './pages/users/QuanLyNguoiDung';
import DanhMucPage from './pages/danhMuc/DanhMucPage';
import PhanQuyen from './pages/PhanQuyen';
import QuanLyVaiTro from './pages/QuanLyVaiTro';
import NhatKyHoatDong from './pages/NhatKyHoatDong';
import ComingSoon from './pages/ComingSoon';
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
              <Route path="/nhat-ky" element={<NhatKyHoatDong />} />
              <Route path="/danh-muc/don-vi" element={<DanhMucPage type="don-vi" />} />
              <Route path="/danh-muc/cap-bac" element={<DanhMucPage type="cap-bac" />} />
              <Route path="/danh-muc/chuc-vu" element={<DanhMucPage type="chuc-vu" />} />
              <Route path="/danh-muc/to-chuc-nhan-su" element={<DanhMucPage type="to-chuc-nhan-su" />} />
              <Route path="/danh-muc/to-chuc-kho" element={<DanhMucPage type="to-chuc-kho" />} />

              <Route path="/danh-muc/tinh" element={<DanhMucPage type="tinh" />} />
              <Route path="/danh-muc/xa" element={<DanhMucPage type="xa" />} />

              <Route path="/danh-muc/loai-kho" element={<DanhMucPage type="loai-kho" />} />

              <Route path="/danh-muc/phan-nhom-tbkt" element={<DanhMucPage type="phan-nhom-tbkt" />} />
              <Route path="/danh-muc/phan-loai-tbkt" element={<DanhMucPage type="phan-loai-tbkt" />} />
              <Route path="/danh-muc/kieu-tbkt" element={<DanhMucPage type="kieu-tbkt" />} />
              <Route path="/danh-muc/nhom-dong-bo" element={<DanhMucPage type="nhom-dong-bo" />} />
              <Route path="/danh-muc/chi-tiet-dong-bo" element={<DanhMucPage type="chi-tiet-dong-bo" />} />
              <Route path="/danh-muc/tinh-trang-trang-bi" element={<DanhMucPage type="tinh-trang-trang-bi" />} />
              <Route path="/danh-muc/tinh-trang-kho-gui" element={<DanhMucPage type="tinh-trang-kho-gui" />} />
              <Route path="/danh-muc/hinh-thuc-niem-cat" element={<DanhMucPage type="hinh-thuc-niem-cat" />} />
              <Route path="/danh-muc/phan-loai-dong-bo" element={<DanhMucPage type="phan-loai-dong-bo" />} />

              <Route path="/danh-muc/phan-cap-chat-luong" element={<DanhMucPage type="phan-cap-chat-luong" />} />
              <Route path="/danh-muc/don-vi-tinh" element={<DanhMucPage type="don-vi-tinh" />} />
              <Route path="/danh-muc/nuoc-san-xuat" element={<DanhMucPage type="nuoc-san-xuat" />} />
              <Route path="/danh-muc/hang-san-xuat" element={<DanhMucPage type="hang-san-xuat" />} />
              <Route path="/danh-muc/nha-cung-cap" element={<DanhMucPage type="nha-cung-cap" />} />
              <Route path="/danh-muc/hinh-thuc-thanh-toan" element={<DanhMucPage type="hinh-thuc-thanh-toan" />} />
              <Route path="/danh-muc/hinh-thuc-cap-chuyen" element={<DanhMucPage type="hinh-thuc-cap-chuyen" />} />

              <Route path="/spkt" element={<ComingSoon title="Quản lý SPKT" icon="🎯" desc="Chức năng quản lý súng pháo kỹ thuật đang được thiết kế cấu trúc dữ liệu." />} />
              <Route path="/tb-dong-bo" element={<ComingSoon title="Quản lý TB đồng bộ" icon="🧩" desc="Chức năng quản lý trang bị đồng bộ đang được thiết kế cấu trúc dữ liệu." />} />
              <Route path="/bao-cao" element={<ComingSoon title="Tổng hợp, báo cáo" icon="📊" desc="Chức năng tổng hợp báo cáo đang được xây dựng." />} />
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
