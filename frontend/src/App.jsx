import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/auth/Login';
import MainLayout from './components/layout/MainLayout';
import Dashboard from './pages/Dashboard';
import QuanLyNguoiDung from './pages/users/QuanLyNguoiDung';
import DanhMucPage from './pages/danhMuc/DanhMucPage';
import NhomDongBoPage from './pages/danhMuc/NhomDongBoPage';
import PhanQuyen from './pages/PhanQuyen';
import QuanLyVaiTro from './pages/QuanLyVaiTro';
import NhatKyHoatDong from './pages/NhatKyHoatDong';
import ComingSoon from './pages/ComingSoon';
import HoSoTbDongBo from './pages/tbDongBo/HoSoTbDongBo';
import LenhTbDongBo from './pages/tbDongBo/LenhTbDongBo';
import ChiTietLenhPage from './pages/tbDongBo/ChiTietLenhPage';
import CapNhatLenhTbDongBo from './pages/tbDongBo/CapNhatLenhTbDongBo';
import XuLyLenhPage from './pages/tbDongBo/XuLyLenhPage';
import DoiChieuLenh from './pages/tbDongBo/DoiChieuLenh';
import TonDauTbDongBo from './pages/tbDongBo/TonDauTbDongBo';
import XuLyTonDauPage from './pages/tbDongBo/XuLyTonDauPage';
import KiemKeTbDongBo from './pages/tbDongBo/KiemKeTbDongBo';
import XuLyKiemKePage from './pages/tbDongBo/XuLyKiemKePage';
import XuLyKiemKeViTriPage from './pages/tbDongBo/XuLyKiemKeViTriPage';
import ChuyenKyTbDongBo from './pages/tbDongBo/ChuyenKyTbDongBo';
import TaoLenhChuyenCap from './pages/tbDongBo/TaoLenhChuyenCap';
import ChuyenCapChatLuong from './pages/tbDongBo/ChuyenCapChatLuong';
import XuLyChuyenCapPage from './pages/tbDongBo/XuLyChuyenCapPage';
import TaoLenhHuyThanhLy from './pages/tbDongBo/TaoLenhHuyThanhLy';
import CapNhatLenhHuyThanhLy from './pages/tbDongBo/CapNhatLenhHuyThanhLy';
import XuLyLenhHuyThanhLyPage from './pages/tbDongBo/XuLyLenhHuyThanhLyPage';
import TaoLenhThayDoiViTri from './pages/tbDongBo/TaoLenhThayDoiViTri';
import ThayDoiViTri from './pages/tbDongBo/ThayDoiViTri';
import XuLyThayDoiViTriPage from './pages/tbDongBo/XuLyThayDoiViTriPage';
import TaoLenhThayDoiHtnc from './pages/tbDongBo/TaoLenhThayDoiHtnc';
import ThayDoiHinhThucNiemCat from './pages/tbDongBo/ThayDoiHinhThucNiemCat';
import XuLyThayDoiHtncPage from './pages/tbDongBo/XuLyThayDoiHtncPage';
import DongDoiLo from './pages/tbDongBo/DongDoiLo';
import BaoCaoTongHop from './pages/baoCao/BaoCaoTongHop';
import { PermissionProvider } from './context/PermissionContext';
import { ConfirmProvider } from './context/ConfirmContext';
import { PermGate, HomeRedirect } from './components/PermGate';

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
            <PermGate>
            <Routes>
              <Route path="/" element={<HomeRedirect />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/users" element={<QuanLyNguoiDung />} />
              <Route path="/phan-quyen" element={<PhanQuyen />} />
              <Route path="/vai-tro" element={<QuanLyVaiTro />} />
              <Route path="/nhat-ky" element={<NhatKyHoatDong />} />
              <Route path="/danh-muc/nhom-spkt" element={<DanhMucPage type="nhom-spkt" />} />
              <Route path="/danh-muc/loai-spkt" element={<DanhMucPage type="loai-spkt" />} />
              <Route path="/danh-muc/kieu-spkt" element={<DanhMucPage type="kieu-spkt" />} />
              <Route path="/danh-muc/loai-tbdb" element={<DanhMucPage type="loai-tbdb" />} />
              <Route path="/danh-muc/nhom-dong-bo" element={<NhomDongBoPage />} />

              <Route path="/danh-muc/cap-bac" element={<DanhMucPage type="cap-bac" />} />
              <Route path="/danh-muc/chuc-vu" element={<DanhMucPage type="chuc-vu" />} />

              <Route path="/danh-muc/tinh" element={<DanhMucPage type="tinh" />} />
              <Route path="/danh-muc/xa" element={<DanhMucPage type="xa" />} />

              <Route path="/danh-muc/loai-kho" element={<DanhMucPage type="loai-kho" />} />
              <Route path="/danh-muc/cap-quan-ly" element={<DanhMucPage type="cap-quan-ly" />} />
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
              <Route path="/danh-muc/dot-kiem-ke" element={<DanhMucPage type="dot-kiem-ke" />} />

              <Route path="/spkt" element={<ComingSoon title="Quản lý SPKT" icon="🎯" desc="Chức năng quản lý súng pháo kỹ thuật đang được thiết kế cấu trúc dữ liệu." />} />

              <Route path="/tb-dong-bo/ho-so" element={<HoSoTbDongBo />} />
              <Route path="/tb-dong-bo/tao-lenh-nhap-xuat" element={<LenhTbDongBo />} />
              <Route path="/tb-dong-bo/tao-lenh-nhap-xuat/:maLenh" element={<ChiTietLenhPage />} />
              <Route path="/tb-dong-bo/cap-nhat-lenh-nhap-xuat" element={<CapNhatLenhTbDongBo />} />
              <Route path="/tb-dong-bo/cap-nhat-lenh-nhap-xuat/:maLenh" element={<XuLyLenhPage />} />
              <Route path="/tb-dong-bo/doi-chieu-lenh" element={<DoiChieuLenh />} />
              <Route path="/tb-dong-bo/ton-dau" element={<TonDauTbDongBo />} />
              <Route path="/tb-dong-bo/ton-dau/:maLenh" element={<XuLyTonDauPage />} />
              <Route path="/tb-dong-bo/kiem-ke" element={<KiemKeTbDongBo />} />
              <Route path="/tb-dong-bo/kiem-ke/:maPhieu" element={<XuLyKiemKePage />} />
              <Route path="/tb-dong-bo/kiem-ke/:maPhieu/chi-tiet/:maCtKiemKe" element={<XuLyKiemKeViTriPage />} />
              <Route path="/tb-dong-bo/chuyen-ky" element={<ChuyenKyTbDongBo />} />
              <Route path="/tb-dong-bo/chuyen-cap/tao-lenh" element={<TaoLenhChuyenCap />} />
              <Route path="/tb-dong-bo/chuyen-cap" element={<ChuyenCapChatLuong />} />
              <Route path="/tb-dong-bo/chuyen-cap/:maLenh" element={<XuLyChuyenCapPage />} />
              <Route path="/tb-dong-bo/huy-thanh-ly/tao-lenh" element={<TaoLenhHuyThanhLy />} />
              <Route path="/tb-dong-bo/huy-thanh-ly/cap-nhat" element={<CapNhatLenhHuyThanhLy />} />
              <Route path="/tb-dong-bo/huy-thanh-ly/cap-nhat/:maLenh" element={<XuLyLenhHuyThanhLyPage />} />
              <Route path="/tb-dong-bo/thay-doi-vi-tri/tao-lenh" element={<TaoLenhThayDoiViTri />} />
              <Route path="/tb-dong-bo/thay-doi-vi-tri" element={<ThayDoiViTri />} />
              <Route path="/tb-dong-bo/thay-doi-vi-tri/:maLenh" element={<XuLyThayDoiViTriPage />} />
              <Route path="/tb-dong-bo/thay-doi-htnc/tao-lenh" element={<TaoLenhThayDoiHtnc />} />
              <Route path="/tb-dong-bo/thay-doi-htnc" element={<ThayDoiHinhThucNiemCat />} />
              <Route path="/tb-dong-bo/thay-doi-htnc/:maLenh" element={<XuLyThayDoiHtncPage />} />
              <Route path="/tb-dong-bo/dong-doi-lo" element={<DongDoiLo />} />

              <Route path="/bao-cao" element={<BaoCaoTongHop />} />
            </Routes>
            </PermGate>
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
          <ConfirmProvider>
            <AppRoutes />
          </ConfirmProvider>
        </PermissionProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
