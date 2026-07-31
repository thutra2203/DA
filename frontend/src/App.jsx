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
import HoSoTbDongBo from './pages/tbDongBo/HoSoTbDongBo';
import LenhTbDongBo from './pages/tbDongBo/LenhTbDongBo';
import CapNhatLenhTbDongBo from './pages/tbDongBo/CapNhatLenhTbDongBo';
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
              <Route path="/danh-muc/nhom-spkt" element={<DanhMucPage type="nhom-spkt" />} />
              <Route path="/danh-muc/loai-spkt" element={<DanhMucPage type="loai-spkt" />} />
              <Route path="/danh-muc/kieu-spkt" element={<DanhMucPage type="kieu-spkt" />} />
              <Route path="/danh-muc/loai-tbdb" element={<DanhMucPage type="loai-tbdb" />} />

              <Route path="/danh-muc/cap-bac" element={<DanhMucPage type="cap-bac" />} />
              <Route path="/danh-muc/chuc-vu" element={<DanhMucPage type="chuc-vu" />} />

              <Route path="/danh-muc/tinh" element={<DanhMucPage type="tinh" />} />
              <Route path="/danh-muc/xa" element={<DanhMucPage type="xa" />} />

              <Route path="/danh-muc/loai-kho" element={<DanhMucPage type="loai-kho" />} />
              <Route path="/danh-muc/kho" element={<DanhMucPage type="kho" />} />

              <Route path="/danh-muc/dvt" element={<DanhMucPage type="dvt" />} />
              <Route path="/danh-muc/nsx" element={<DanhMucPage type="nsx" />} />
              <Route path="/danh-muc/hang-sx" element={<DanhMucPage type="hang-sx" />} />
              <Route path="/danh-muc/ncc" element={<DanhMucPage type="ncc" />} />
              <Route path="/danh-muc/cap-chat-luong" element={<DanhMucPage type="cap-chat-luong" />} />

              <Route path="/danh-muc/httt" element={<DanhMucPage type="httt" />} />
              <Route path="/danh-muc/ht-van-chuyen" element={<DanhMucPage type="ht-van-chuyen" />} />
              <Route path="/danh-muc/tinh-chat-nhap-xuat" element={<DanhMucPage type="tinh-chat-nhap-xuat" />} />
              <Route path="/danh-muc/chi-tiet-tcnx" element={<DanhMucPage type="chi-tiet-tcnx" />} />
              <Route path="/danh-muc/hinh-thuc-niem-cat" element={<DanhMucPage type="hinh-thuc-niem-cat" />} />
              <Route path="/danh-muc/tinh-trang-bao-goi" element={<DanhMucPage type="tinh-trang-bao-goi" />} />
              <Route path="/danh-muc/trang-thai-tb" element={<DanhMucPage type="trang-thai-tb" />} />

              <Route path="/spkt" element={<ComingSoon title="Quản lý SPKT" icon="🎯" desc="Chức năng quản lý súng pháo kỹ thuật đang được thiết kế cấu trúc dữ liệu." />} />

              <Route path="/tb-dong-bo/ho-so" element={<HoSoTbDongBo />} />
              <Route path="/tb-dong-bo/tao-lenh-nhap-xuat" element={<LenhTbDongBo />} />
              <Route path="/tb-dong-bo/cap-nhat-lenh-nhap-xuat" element={<CapNhatLenhTbDongBo />} />
              <Route path="/tb-dong-bo/ton-dau" element={<ComingSoon title="Tồn đầu" icon="📦" desc="Chức năng khai báo tồn đầu trang bị đồng bộ đang được xây dựng." />} />
              <Route path="/tb-dong-bo/kiem-ke" element={<ComingSoon title="Kiểm kê" icon="✅" desc="Chức năng kiểm kê trang bị đồng bộ đang được xây dựng." />} />
              <Route path="/tb-dong-bo/phan-cap-chat-luong" element={<ComingSoon title="Quản lý phân cấp chất lượng" icon="🏅" desc="Chức năng quản lý phân cấp chất lượng trang bị đồng bộ đang được xây dựng." />} />
              <Route path="/tb-dong-bo/huy-thanh-ly" element={<ComingSoon title="Hủy/Thanh lý" icon="🗑️" desc="Chức năng hủy/thanh lý trang bị đồng bộ đang được xây dựng." />} />
              <Route path="/tb-dong-bo/chuyen-nuoc-chuyen-loai" element={<ComingSoon title="Chuyển nước, chuyển loại" icon="🔄" desc="Chức năng chuyển nước, chuyển loại trang bị đồng bộ đang được xây dựng." />} />
              <Route path="/tb-dong-bo/chuyen-thanh-vtpt" element={<ComingSoon title="Chuyển thành VTPT" icon="↪️" desc="Chức năng chuyển trang bị đồng bộ thành VTPT đang được xây dựng." />} />

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
