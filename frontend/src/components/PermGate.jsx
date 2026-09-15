import { useLocation, Navigate } from 'react-router-dom';
import { FiLock } from 'react-icons/fi';
import { usePermission } from '../context/PermissionContext';
import { routePermOfPath, modulesOfPath } from '../config/permMap';

// Thứ tự ưu tiên khi chọn trang đích cho vai trò không có quyền "Tổng quan".
const TRANG_UU_TIEN = [
  '/dashboard',
  '/tb-dong-bo/ho-so',
  '/tb-dong-bo/kiem-ke',
  '/tb-dong-bo/chuyen-cap',
  '/tb-dong-bo/thay-doi-vi-tri',
  '/tb-dong-bo/thay-doi-htnc',
  '/tb-dong-bo/ton-dau',
  '/tb-dong-bo/cap-nhat-lenh-nhap-xuat',
  '/tb-dong-bo/tao-lenh-nhap-xuat',
  '/bao-cao',
  '/danh-muc/kho',
  '/spkt',
];

const coQuyenVao = (can, rule) =>
  !rule || rule.modules.some(m => can(m, rule.action));

function KhongCoQuyen() {
  return (
    <div style={{ textAlign: 'center', padding: '80px 20px', color: '#667085' }}>
      <FiLock size={40} style={{ marginBottom: 14 }} />
      <h3 style={{ color: '#1a3a5c', margin: '0 0 6px' }}>Không có quyền truy cập</h3>
      <p style={{ fontSize: 13, margin: 0 }}>
        Vai trò của bạn chưa được cấp quyền cho chức năng này. Liên hệ quản trị viên để được cấp quyền.
      </p>
    </div>
  );
}

// Chặn truy cập trang theo quyền của vai trò hiện tại. Trong lúc đang tải quyền thì cho hiển thị
// (backend vẫn chặn thật bằng 403), tránh nháy trang trắng.
export function PermGate({ children }) {
  const location = useLocation();
  const { can, loading } = usePermission();
  if (loading) return children;
  if (!coQuyenVao(can, routePermOfPath(location.pathname))) return <KhongCoQuyen />;
  return children;
}

// Điều hướng "/" tới trang đầu tiên mà vai trò được phép xem.
export function HomeRedirect() {
  const { can, loading } = usePermission();
  if (loading) return null;
  const dich = TRANG_UU_TIEN.find(p => {
    const mods = modulesOfPath(p);
    return !mods || mods.some(m => can(m, 'xem'));
  });
  return <Navigate to={dich || '/dashboard'} replace />;
}
