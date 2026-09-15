import { useState, useEffect } from 'react';
import api from '../services/api';
import { vaiTroAPI } from '../services/api';
import { FiSave } from 'react-icons/fi';
import { usePageTitle } from '../context/PageHeaderContext';
import Pagination from '../components/ui/Pagination';
import '../styles/shared.css';
import './PhanQuyen.css';

const ACTIONS = [
  { key: 'CoTheXem',     label: 'Xem',  color: '#1565c0' },
  { key: 'CoTheThemMoi', label: 'Thêm', color: '#2e7d32' },
  { key: 'CoTheSua',     label: 'Sửa',  color: '#e65100' },
  { key: 'CoTheXoa',     label: 'Xóa',  color: '#c62828' },
];

const PAGE_SIZE = 10;

export default function PhanQuyen() {
  usePageTitle('Phân quyền động');
  const [data, setData] = useState({});
  const [vaiTros, setVaiTros] = useState([]);
  const [modules, setModules] = useState([]);   // [{ key, label }] lấy từ bảng ChucNang
  const [saving, setSaving] = useState(null);
  const [toast, setToast] = useState(null);
  const [activeRole, setActiveRole] = useState(null);
  const [page, setPage] = useState(1);

  const load = async () => {
    const [pqRes, vtRes, cnRes] = await Promise.all([
      api.get('/phan-quyen'),
      vaiTroAPI.getAll(),
      api.get('/phan-quyen/chuc-nang'),
    ]);
    const map = {};
    pqRes.data.forEach(r => {
      if (!map[r.VaiTro]) map[r.VaiTro] = {};
      map[r.VaiTro][r.Module] = { ...r };
    });
    setData(map);
    setVaiTros(vtRes.data);
    setModules(cnRes.data.map(c => ({ key: c.maCn, label: c.tenCn })));
    setActiveRole(prev => prev ?? (vtRes.data.find(v => v.ID !== 'ADMIN')?.ID ?? vtRes.data[0]?.ID ?? null));
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
      for (const mod of modules) {
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

      <div className="data-card">
        <div className="pq-table-header">
          <div className="pq-role-picker">
            <label htmlFor="pq-role-select">Vai trò</label>
            <select
              id="pq-role-select"
              value={activeRole ?? ''}
              onChange={(e) => { setActiveRole(e.target.value); setPage(1); }}
            >
              {vaiTros.map(vt => (
                <option key={vt.ID} value={vt.ID}>
                  {vt.TenVaiTro} ({vt.ID}){vt.ID === 'ADMIN' ? ' — toàn quyền' : ''}
                </option>
              ))}
            </select>
            <span className="pq-role-count">{vaiTros.length} vai trò</span>
          </div>
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
            {modules.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((mod, i) => {
              const perm = data[activeRole]?.[mod.key] || {};
              const isAdmin = activeRole === 'ADMIN';
              const rowKey = `${activeRole}-${mod.key}`;
              return (
                <tr key={mod.key}>
                  <td className="td-muted td-center">{(page - 1) * PAGE_SIZE + i + 1}</td>
                  <td><span className="pq-mod-label">{mod.label}</span></td>
                  {ACTIONS.map(a => {
                    const on = isAdmin || !!perm[a.key];
                    return (
                      <td key={a.key} className="td-center">
                        <div
                          className="pq-check-box"
                          role="checkbox"
                          aria-checked={on}
                          aria-disabled={isAdmin}
                          style={{
                            background: on ? a.color : '#f0f0f0',
                            border: `2px solid ${on ? a.color : '#ddd'}`,
                            cursor: isAdmin ? 'not-allowed' : 'pointer',
                          }}
                          onClick={() => !isAdmin && toggle(activeRole, mod.key, a.key)}
                        >
                          {on && <span className="pq-check-mark">✓</span>}
                        </div>
                      </td>
                    );
                  })}
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

        <Pagination page={page} total={modules.length} pageSize={PAGE_SIZE} onChange={setPage} />

        {activeRole === 'ADMIN' && (
          <div className="pq-admin-note">
            ⚠ Vai trò Admin luôn có toàn quyền, không thể thay đổi.
          </div>
        )}
      </div>
    </div>
  );
}
