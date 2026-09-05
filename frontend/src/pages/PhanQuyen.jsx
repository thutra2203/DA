import { useState, useEffect } from 'react';
import api from '../services/api';
import { vaiTroAPI } from '../services/api';
import { FiSave } from 'react-icons/fi';
import { usePageTitle } from '../context/PageHeaderContext';
import '../styles/shared.css';
import './PhanQuyen.css';

const MODULES = [
  { key: 'DANH_MUC',   label: 'Quản lý danh mục' },
  { key: 'NHOM_I',     label: 'Nghiệp vụ nhóm I' },
  { key: 'NHOM_II',    label: 'Nghiệp vụ nhóm II' },
  { key: 'LENH',       label: 'Quản lý lệnh' },
  { key: 'BDKT',       label: 'Bảo đảm kỹ thuật' },
  { key: 'KTKT',       label: 'Kỹ thuật kiểm tra' },
  { key: 'KIEM_KE',    label: 'Quản lý kiểm kê' },
  { key: 'BAO_CAO',    label: 'Báo cáo thống kê' },
  { key: 'HE_THONG',   label: 'Quản trị hệ thống' },
  { key: 'CHUYEN_KY',  label: 'Chuyển kỳ dữ liệu' },
];

const ACTIONS = [
  { key: 'CoTheXem',     label: 'Xem',  color: '#1565c0' },
  { key: 'CoTheThemMoi', label: 'Thêm', color: '#2e7d32' },
  { key: 'CoTheSua',     label: 'Sửa',  color: '#e65100' },
  { key: 'CoTheXoa',     label: 'Xóa',  color: '#c62828' },
];

export default function PhanQuyen() {
  usePageTitle('Phân quyền động');
  const [data, setData] = useState({});
  const [vaiTros, setVaiTros] = useState([]);
  const [saving, setSaving] = useState(null);
  const [toast, setToast] = useState(null);
  const [activeRole, setActiveRole] = useState('QUAN_LY');

  const load = async () => {
    const [pqRes, vtRes] = await Promise.all([
      api.get('/phan-quyen'),
      vaiTroAPI.getAll(),
    ]);
    const map = {};
    pqRes.data.forEach(r => {
      if (!map[r.VaiTro]) map[r.VaiTro] = {};
      map[r.VaiTro][r.Module] = { ...r };
    });
    setData(map);
    setVaiTros(vtRes.data);
  };

  useEffect(() => { load(); }, []);

  const showToast = (text, type = 'success') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 2500);
  };

  const toggle = (vaiTro, module, action) => {
    if (vaiTro === 'ADMIN') return;
    setData(prev => ({
      ...prev,
      [vaiTro]: {
        ...prev[vaiTro],
        [module]: {
          ...prev[vaiTro]?.[module],
          [action]: !prev[vaiTro]?.[module]?.[action],
        },
      },
    }));
  };

  const saveRow = async (vaiTro, module) => {
    const key = `${vaiTro}-${module}`;
    setSaving(key);
    try {
      const p = data[vaiTro]?.[module] || {};
      await api.put('/phan-quyen', {
        vaiTro, module,
        coTheXem:     !!p.CoTheXem,
        coTheThemMoi: !!p.CoTheThemMoi,
        coTheSua:     !!p.CoTheSua,
        coTheXoa:     !!p.CoTheXoa,
      });
      showToast('Đã lưu quyền!');
    } catch {
      showToast('Lỗi lưu quyền', 'error');
    } finally {
      setSaving(null);
    }
  };

  const saveAll = async (vaiTro) => {
    setSaving('all');
    try {
      for (const mod of MODULES) {
        const p = data[vaiTro]?.[mod.key] || {};
        await api.put('/phan-quyen', {
          vaiTro, module: mod.key,
          coTheXem:     !!p.CoTheXem,
          coTheThemMoi: !!p.CoTheThemMoi,
          coTheSua:     !!p.CoTheSua,
          coTheXoa:     !!p.CoTheXoa,
        });
      }
      showToast(`Đã lưu tất cả quyền cho vai trò ${vaiTro}!`);
    } catch {
      showToast('Lỗi lưu quyền', 'error');
    } finally {
      setSaving(null);
    }
  };

  return (
    <div>
      {toast && (
        <div className={`toast toast--${toast.type === 'error' ? 'error' : 'success'}`}>
          {toast.type === 'error' ? '✗' : '✓'} {toast.text}
        </div>
      )}

      <div className="page-header">
        <p className="page-sub">Cấu hình quyền Xem / Thêm / Sửa / Xóa cho từng vai trò</p>
      </div>

      {/* Tab chọn vai trò */}
      <div className="pq-tabs">
        {vaiTros.map(vt => (
          <button
            key={vt.ID}
            className={`pq-tab${activeRole === vt.ID ? ' pq-tab--active' : ''}`}
            onClick={() => setActiveRole(vt.ID)}
          >
            {vt.TenVaiTro}
            {vt.ID === 'ADMIN' && <span className="pq-admin-badge">Toàn quyền</span>}
          </button>
        ))}
      </div>

      <div className="data-card">
        <div className="pq-table-header">
          <span className="pq-table-header-label">
            Quyền của vai trò: <span className="pq-role-highlight">{activeRole}</span>
          </span>
          {activeRole !== 'ADMIN' && (
            <button className="pq-btn-save-all" onClick={() => saveAll(activeRole)} disabled={saving === 'all'}>
              <FiSave size={14} style={{ marginRight: 6 }} />
              {saving === 'all' ? 'Đang lưu...' : 'Lưu tất cả'}
            </button>
          )}
        </div>

        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: 40 }}>STT</th>
              <th>Chức năng / Module</th>
              {ACTIONS.map(a => (
                <th key={a.key} style={{ textAlign: 'center', color: a.color, width: 80 }}>
                  {a.label}
                </th>
              ))}
              {activeRole !== 'ADMIN' && <th style={{ width: 80, textAlign: 'center' }}>Lưu</th>}
            </tr>
          </thead>
          <tbody>
            {MODULES.map((mod, i) => {
              const perm = data[activeRole]?.[mod.key] || {};
              const isAdmin = activeRole === 'ADMIN';
              const rowKey = `${activeRole}-${mod.key}`;
              return (
                <tr key={mod.key}>
                  <td className="td-muted td-center">{i + 1}</td>
                  <td><span className="pq-mod-label">{mod.label}</span></td>
                  {ACTIONS.map(a => (
                    <td key={a.key} className="td-center">
                      <label className="pq-check-wrap">
                        <input
                          type="checkbox"
                          style={{ display: 'none' }}
                          checked={isAdmin ? true : !!perm[a.key]}
                          disabled={isAdmin}
                          onChange={() => toggle(activeRole, mod.key, a.key)}
                        />
                        <div
                          className="pq-check-box"
                          style={{
                            background: (isAdmin || !!perm[a.key]) ? a.color : '#f0f0f0',
                            border: `2px solid ${(isAdmin || !!perm[a.key]) ? a.color : '#ddd'}`,
                            cursor: isAdmin ? 'not-allowed' : 'pointer',
                          }}
                          onClick={() => !isAdmin && toggle(activeRole, mod.key, a.key)}
                        >
                          {(isAdmin || !!perm[a.key]) && <span className="pq-check-mark">✓</span>}
                        </div>
                      </label>
                    </td>
                  ))}
                  {activeRole !== 'ADMIN' && (
                    <td className="td-center">
                      <button
                        className="pq-btn-save"
                        onClick={() => saveRow(activeRole, mod.key)}
                        disabled={saving === rowKey}
                      >
                        {saving === rowKey ? '...' : <FiSave size={13} />}
                      </button>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>

        {activeRole === 'ADMIN' && (
          <div className="pq-admin-note">
            ⚠ Vai trò Admin luôn có toàn quyền, không thể thay đổi.
          </div>
        )}
      </div>
    </div>
  );
}
