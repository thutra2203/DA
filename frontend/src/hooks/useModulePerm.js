import { usePermission } from '../context/PermissionContext';

// Tiện ích lấy 4 cờ quyền cho 1 nhóm chức năng (module) — dùng để ẩn/khóa nút Thêm/Sửa/Xóa.
export function useModulePerm(module) {
  const { can, loading } = usePermission();
  return {
    loading,
    canXem: can(module, 'xem'),
    canThem: can(module, 'them'),
    canSua: can(module, 'sua'),
    canXoa: can(module, 'xoa'),
  };
}
