import { useState, useEffect, useMemo } from 'react';
import { nhomDongBoAPI, chiTietDongBoAPI, danhMucAPI } from '../../services/api';
import { FiPlus, FiEdit2, FiTrash2, FiSearch, FiEye } from 'react-icons/fi';
import { FaFolder, FaFolderOpen } from 'react-icons/fa';
import { usePageTitle } from '../../context/PageHeaderContext';
import { useConfirm } from '../../context/ConfirmContext';
import { useModulePerm } from '../../hooks/useModulePerm';
import '../../styles/shared.css';
import './NhomDongBoPage.css';

// Nghiệp vụ: một Kiểu SPKT có thể dùng chung cho nhiều Loại trang bị đồng bộ.
// Vì vậy giao diện tổ chức theo kiểu master-detail: chọn Kiểu SPKT bên trái,
// xem/quản lý các Loại TBĐB thuộc kiểu đó bên phải.
export default function NhomDongBoPage() {
  usePageTitle('Danh mục nhóm đồng bộ');
  const confirm = useConfirm();
  const { canThem, canSua, canXoa } = useModulePerm('DANH_MUC');

  const [items, setItems] = useState([]);
  const [kieuList, setKieuList] = useState([]);
  const [nhomList, setNhomList] = useState([]);
  const [loaiList, setLoaiList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [kieuSearch, setKieuSearch] = useState('');
  const [selectedKieu, setSelectedKieu] = useState('');
  const [expandedNhom, setExpandedNhom] = useState(new Set());
  const [toast, setToast] = useState(null);

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);   // null = thêm; object = sửa (khóa cứng khóa chính)
  const [form, setForm] = useState({ maKieuSpkt: '', maLoaiTbdb: '', ghiChu: '' });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  // Xem/quản lý chi tiết đồng bộ (thành phần SPKT) qua modal, không cần sang trang riêng
  const [tbdbList, setTbdbList] = useState([]);
  const [ctNhom, setCtNhom] = useState(null);   // nhóm (kiểu+loại) đang mở modal chi tiết
  const [ctItems, setCtItems] = useState([]);
  const [ctLoading, setCtLoading] = useState(false);
  const [showCtModal, setShowCtModal] = useState(false);
  const [ctEditing, setCtEditing] = useState(null);
  const [ctForm, setCtForm] = useState({ maTbdb: '', soLuongSpktCoSo: 0, slDinhMuc: 1, ghiChu: '' });
  const [ctErrors, setCtErrors] = useState({});
  const [ctSaving, setCtSaving] = useState(false);

  const showToast = (text, type = 'success') => { setToast({ text, type }); setTimeout(() => setToast(null), 3000); };

  const load = async () => {
    setLoading(true);
    try {
      const res = await nhomDongBoAPI.getAll();
      setItems(res.data);
    } catch { setItems([]); } finally { setLoading(false); }
  };

  useEffect(() => {
    load();
    danhMucAPI.getAll('kieu-spkt').then(r => setKieuList(r.data)).catch(() => setKieuList([]));
    danhMucAPI.getAll('nhom-spkt').then(r => setNhomList(r.data)).catch(() => setNhomList([]));
    danhMucAPI.getAll('loai-tbdb').then(r => setLoaiList(r.data)).catch(() => setLoaiList([]));
    chiTietDongBoAPI.getTbdbList().then(r => setTbdbList(r.data)).catch(() => setTbdbList([]));
  }, []);

  // Số Loại TBĐB đang gắn với từng Kiểu SPKT, dùng làm badge ở danh sách bên trái
  const countByKieu = useMemo(() => {
    const m = new Map();
    items.forEach(n => m.set(n.maKieuSpkt, (m.get(n.maKieuSpkt) || 0) + 1));
    return m;
  }, [items]);

  const UNASSIGNED = '__CHUA_PHAN_NHOM__';

  // Cây: Nhóm SPKT -> các Kiểu SPKT thuộc nhóm đó (kiểu chưa gắn nhóm gom vào 1 mục riêng)
  const tree = useMemo(() => {
    const groups = nhomList.map(n => ({ maNhom: n.maNhom, tenNhom: n.tenNhom, kieus: [] }));
    const byMa = new Map(groups.map(g => [g.maNhom, g]));
    const unassigned = { maNhom: UNASSIGNED, tenNhom: 'Chưa phân nhóm', kieus: [] };
    kieuList.forEach(k => {
      const g = (k.maNhom && byMa.get(k.maNhom)) || unassigned;
      g.kieus.push(k);
    });
    return unassigned.kieus.length ? [...groups, unassigned] : groups;
  }, [nhomList, kieuList]);

  const treeBySearch = useMemo(() => {
    const q = kieuSearch.trim().toLowerCase();
    if (!q) return tree;
    return tree
      .map(g => {
        const tenNhomMatch = g.tenNhom.toLowerCase().includes(q);
        const kieus = tenNhomMatch ? g.kieus : g.kieus.filter(k => [k.maKieu, k.tenKieu].some(v => String(v ?? '').toLowerCase().includes(q)));
        return { ...g, kieus };
      })
      .filter(g => g.kieus.length > 0);
  }, [tree, kieuSearch]);

  const toggleNhom = (maNhom) => {
    setExpandedNhom(prev => {
      const next = new Set(prev);
      next.has(maNhom) ? next.delete(maNhom) : next.add(maNhom);
      return next;
    });
  };

  // Mặc định chọn kiểu SPKT đầu tiên (ưu tiên kiểu đã có nhóm đồng bộ) và mở nhóm chứa nó
  useEffect(() => {
    if (selectedKieu || kieuList.length === 0) return;
    const firstWithData = kieuList.find(k => countByKieu.has(k.maKieu));
    const k = firstWithData || kieuList[0];
    setSelectedKieu(k.maKieu);
    setExpandedNhom(prev => new Set(prev).add(k.maNhom || UNASSIGNED));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kieuList, countByKieu]);

  const kieuHienTai = kieuList.find(k => k.maKieu === selectedKieu);
  const itemsCuaKieu = useMemo(() => items.filter(n => n.maKieuSpkt === selectedKieu), [items, selectedKieu]);
  const daCoMaLoai = new Set(itemsCuaKieu.map(n => n.maLoaiTbdb));

  // Đổi kiểu SPKT đang xem thì đóng modal chi tiết đồng bộ đang mở (nếu có)
  useEffect(() => { setCtNhom(null); }, [selectedKieu]);

  const loadCt = (maKieuSpkt, maLoaiTbdb) => {
    setCtLoading(true);
    chiTietDongBoAPI.getByNhom(maKieuSpkt, maLoaiTbdb)
      .then(r => setCtItems(r.data)).catch(() => setCtItems([])).finally(() => setCtLoading(false));
  };

  const openCtList = (n) => {
    setCtNhom(n);
    loadCt(n.maKieuSpkt, n.maLoaiTbdb);
  };

  const ctDaCoMaTbdb = new Set(ctItems.map(c => c.maTbdb));

  const openCtAdd = () => { setCtEditing(null); setCtForm({ maTbdb: '', soLuongSpktCoSo: 0, slDinhMuc: 1, ghiChu: '' }); setCtErrors({}); setShowCtModal(true); };
  const openCtEdit = (c) => {
    setCtEditing(c);
    setCtForm({ maTbdb: c.maTbdb, soLuongSpktCoSo: c.soLuongSpktCoSo, slDinhMuc: c.slDinhMuc, ghiChu: c.ghiChu || '' });
    setCtErrors({});
    setShowCtModal(true);
  };

  const handleCtSubmit = async (e) => {
    e.preventDefault();
    const err = {};
    if (!ctEditing && !ctForm.maTbdb) err.maTbdb = 'Chưa chọn trang bị';
    if (!ctForm.slDinhMuc || Number(ctForm.slDinhMuc) <= 0) err.slDinhMuc = 'Số lượng định mức phải lớn hơn 0';
    if (Object.keys(err).length) { setCtErrors(err); return; }

    const payload = {
      maKieuSpkt: ctNhom.maKieuSpkt, maLoaiTbdb: ctNhom.maLoaiTbdb,
      maTbdb: ctEditing ? ctEditing.maTbdb : ctForm.maTbdb,
      soLuongSpktCoSo: Number(ctForm.soLuongSpktCoSo) || 0,
      slDinhMuc: Number(ctForm.slDinhMuc),
      ghiChu: ctForm.ghiChu || null,
    };
    setCtSaving(true);
    try {
      if (ctEditing) {
        await chiTietDongBoAPI.update(ctNhom.maKieuSpkt, ctNhom.maLoaiTbdb, ctEditing.maTbdb, payload);
        showToast('Cập nhật thành công!');
      } else {
        await chiTietDongBoAPI.create(payload);
        showToast('Thêm thành phần thành công!');
      }
      setShowCtModal(false);
      loadCt(ctNhom.maKieuSpkt, ctNhom.maLoaiTbdb);
      load();
    } catch (err) {
      showToast(err.response?.data?.message || 'Lỗi lưu dữ liệu', 'error');
    } finally { setCtSaving(false); }
  };

  const handleCtDelete = async (c) => {
    if (!(await confirm(`Bỏ trang bị "${c.tenTbdb || c.maTbdb}" khỏi chi tiết đồng bộ?`))) return;
    try {
      await chiTietDongBoAPI.remove(ctNhom.maKieuSpkt, ctNhom.maLoaiTbdb, c.maTbdb);
      showToast('Đã xóa');
      loadCt(ctNhom.maKieuSpkt, ctNhom.maLoaiTbdb);
      load();
    } catch (err) {
      showToast(err.response?.data?.message || 'Lỗi xóa', 'error');
    }
  };

  const openAdd = () => { setEditing(null); setForm({ maKieuSpkt: selectedKieu, maLoaiTbdb: '', ghiChu: '' }); setErrors({}); setShowModal(true); };
  const openEdit = (n) => {
    setEditing(n);
    setForm({ maKieuSpkt: n.maKieuSpkt, maLoaiTbdb: n.maLoaiTbdb, ghiChu: n.ghiChu || '' });
    setErrors({});
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!editing) {
      const err = {};
      if (!form.maLoaiTbdb) err.maLoaiTbdb = 'Chưa chọn loại TBĐB';
      if (Object.keys(err).length) { setErrors(err); return; }
    }
    setSaving(true);
    try {
      if (editing) {
        await nhomDongBoAPI.update(editing.maKieuSpkt, editing.maLoaiTbdb, { maKieuSpkt: editing.maKieuSpkt, maLoaiTbdb: editing.maLoaiTbdb, ghiChu: form.ghiChu });
        showToast('Cập nhật thành công!');
      } else {
        await nhomDongBoAPI.create({ maKieuSpkt: selectedKieu, maLoaiTbdb: form.maLoaiTbdb, ghiChu: form.ghiChu });
        showToast('Thêm loại TBĐB vào nhóm thành công!');
      }
      setShowModal(false);
      load();
    } catch (err) {
      showToast(err.response?.data?.message || 'Lỗi lưu dữ liệu', 'error');
    } finally { setSaving(false); }
  };

  const handleDelete = async (n) => {
    if (!(await confirm(`Bỏ "${n.tenLoaiTbdb}" khỏi nhóm đồng bộ của kiểu SPKT "${n.tenKieuSpkt}"?`))) return;
    try {
      await nhomDongBoAPI.remove(n.maKieuSpkt, n.maLoaiTbdb);
      showToast('Đã xóa');
      load();
    } catch (err) {
      showToast(err.response?.data?.message || 'Lỗi xóa', 'error');
    }
  };

  return (
    <div className="nhomdb-page">
      {toast && (
        <div className={`toast toast--${toast.type === 'error' ? 'error' : 'success'}`}>
          {toast.type === 'error' ? '✗' : '✓'} {toast.text}
        </div>
      )}

      <div className="nhomdb-layout">
        <div className="nhomdb-sidebar">
          <div className="nhomdb-sidebar-header">
            <p className="nhomdb-sidebar-title">SPKT </p>
            <div className="search-wrap">
              <FiSearch className="search-icon" />
              <input className="search-input" placeholder="Tìm nhóm, kiểu SPKT..." value={kieuSearch} onChange={e => setKieuSearch(e.target.value)} />
            </div>
          </div>
          <div className="nhomdb-tree">
            {treeBySearch.length === 0 ? (
              <div className="nhomdb-list-empty">Không tìm thấy nhóm/kiểu SPKT nào</div>
            ) : treeBySearch.map(g => {
              const open = kieuSearch.trim() ? true : expandedNhom.has(g.maNhom);
              return (
                <div className="nhomdb-tree-node" key={g.maNhom}>
                  <div className="nhomdb-tree-row" onClick={() => toggleNhom(g.maNhom)}>
                    <span className="nhomdb-tree-toggle">{open ? '−' : '+'}</span>
                    {open ? <FaFolderOpen className="nhomdb-tree-icon" size={15} /> : <FaFolder className="nhomdb-tree-icon" size={15} />}
                    <span className="nhomdb-tree-label">{g.tenNhom}</span>
                    <span className="nhomdb-tree-count">{g.kieus.length}</span>
                  </div>
                  {open && (
                    <div className="nhomdb-tree-children">
                      {g.kieus.map(k => (
                        <div className="nhomdb-tree-node" key={k.maKieu}>
                          <div className={`nhomdb-tree-row nhomdb-tree-row--leaf${k.maKieu === selectedKieu ? ' nhomdb-tree-row--active' : ''}`}
                            onClick={() => setSelectedKieu(k.maKieu)}>
                            <span className="nhomdb-tree-toggle-spacer" />
                            <span className="nhomdb-tree-leaf-dot" />
                            <span className="nhomdb-tree-label">{k.tenKieu}</span>
                            <span className="nhomdb-tree-count">{countByKieu.get(k.maKieu) || 0}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="nhomdb-main data-card">
          {!selectedKieu ? (
            <div className="empty-state">

              <div className="empty-state-title">Chọn một kiểu SPKT bên trái</div>
            </div>
          ) : (
            <>
              <div className="nhomdb-detail-header">
                <div>
                  <h3 className="nhomdb-detail-title">{kieuHienTai?.tenKieu}</h3>
                  <div className="nhomdb-detail-sub">Các loại trang bị đồng bộ cho kiểu SPKT này</div>
                </div>
                {canThem && (
                  <button className="btn-add" onClick={openAdd}><FiPlus style={{ marginRight: 6 }} /> Thêm loại TBĐB</button>
                )}
              </div>

              {loading ? (
                <p style={{ color: '#999', padding: 20 }}>Đang tải...</p>
              ) : itemsCuaKieu.length === 0 ? (
                <div className="empty-state">

                  <div className="empty-state-title">Kiểu SPKT này chưa gắn với loại TBĐB nào</div>
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th style={{ width: 50 }}>STT</th>
                        <th>Loại trang bị đồng bộ</th>
                        <th style={{ textAlign: 'center', width: 90 }}>Số chi tiết</th>
                        <th>Ghi chú</th>
                        <th style={{ width: 110, textAlign: 'center' }}>Thao tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      {itemsCuaKieu.map((n, i) => (
                        <tr key={`${n.maKieuSpkt}|${n.maLoaiTbdb}`}>
                          <td className="td-muted td-center">{i + 1}</td>
                          <td>{n.tenLoaiTbdb}</td>
                          <td className="td-center"><span className="badge">{n.soChiTiet}</span></td>
                          <td className="td-muted">{n.ghiChu || '—'}</td>
                          <td className="td-center">
                            <div className="td-actions">
                              <button className="btn-icon-edit" onClick={() => openCtList(n)} title="Xem chi tiết đồng bộ"><FiEye size={13} /></button>
                              {canSua && <button className="btn-icon-edit" onClick={() => openEdit(n)} title="Sửa ghi chú"><FiEdit2 size={13} /></button>}
                              {canXoa && <button className="btn-icon-delete" onClick={() => handleDelete(n)} title="Xóa"><FiTrash2 size={13} /></button>}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {showModal && (
        <div className="overlay">
          <div className="modal fade-in">
            <div className="modal-header">
              <h3 className="modal-title">{editing ? 'Sửa nhóm đồng bộ' : 'Thêm loại TBĐB'}</h3>
              <button className="modal-close-btn" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit} className="modal-body" noValidate>
              <div className="form-field">
                <label className="form-label">Kiểu SPKT</label>
                <input className="form-input" value={kieuHienTai?.tenKieu || ''} disabled />
              </div>
              <div className="form-field">
                <label className="form-label">Loại trang bị đồng bộ <span style={{ color: 'red' }}>*</span></label>
                <select className={`form-input${errors.maLoaiTbdb ? ' form-input--invalid' : ''}`} value={form.maLoaiTbdb}
                  disabled={!!editing}
                  onChange={e => { setForm({ ...form, maLoaiTbdb: e.target.value }); setErrors(p => ({ ...p, maLoaiTbdb: undefined })); }}>
                  <option value="">-- Chọn loại TBĐB --</option>
                  {editing && <option value={editing.maLoaiTbdb}>{editing.tenLoaiTbdb}</option>}
                  {!editing && loaiList.filter(l => !daCoMaLoai.has(l.maLoai)).map(l => (
                    <option key={l.maLoai} value={l.maLoai}>{l.tenLoai}</option>
                  ))}
                </select>
                {errors.maLoaiTbdb && <p className="form-error-text">{errors.maLoaiTbdb}</p>}
              </div>
              <div className="form-field">
                <label className="form-label">Ghi chú</label>
                <textarea className="form-input" style={{ height: 70, resize: 'vertical' }} value={form.ghiChu}
                  onChange={e => setForm({ ...form, ghiChu: e.target.value })} placeholder="Ghi chú..." />
              </div>
              {editing && <div className="form-hint">Kiểu SPKT và Loại TBĐB là khóa, không đổi được. Muốn đổi thì xóa rồi thêm lại.</div>}
              <div className="modal-footer">
                <button type="button" className="btn-cancel" onClick={() => setShowModal(false)}>Hủy</button>
                <button type="submit" className="btn-primary" disabled={saving}>
                  {editing ? <FiEdit2 style={{ marginRight: 6 }} /> : <FiPlus style={{ marginRight: 6 }} />}
                  {saving ? 'Đang lưu…' : editing ? 'Lưu' : 'Thêm'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {ctNhom && (
        <div className="overlay">
          <div className="modal modal--form nhomdb-ct-modal fade-in">
            <div className="modal-header">
              <h3 className="modal-title">Chi tiết đồng bộ thuộc {ctNhom.tenLoaiTbdb}</h3>
              <button className="modal-close-btn" onClick={() => setCtNhom(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10 }}>
                {canThem && (
                  <button className="btn-add" onClick={openCtAdd}><FiPlus style={{ marginRight: 6 }} /> Thêm chi tiết</button>
                )}
              </div>
              {ctLoading ? (
                <p style={{ color: '#999', padding: 20 }}>Đang tải...</p>
              ) : ctItems.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-title">Nhóm này chưa có trang bị thành phần</div>
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th style={{ width: 40 }}>STT</th>
                        <th>Trang bị đồng bộ</th>
                        <th style={{ textAlign: 'center', width: 130 }}>SL SPKT cơ sở</th>
                        <th style={{ textAlign: 'center', width: 120 }}>SL định mức</th>
                        <th>Ghi chú</th>
                        <th style={{ width: 90, textAlign: 'center' }}>Thao tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ctItems.map((c, ci) => (
                        <tr key={c.maTbdb}>
                          <td className="td-muted td-center">{ci + 1}</td>
                          <td>{c.tenTbdb}</td>
                          <td className="td-center">{c.soLuongSpktCoSo}</td>
                          <td className="td-center">{c.slDinhMuc}</td>
                          <td className="td-muted">{c.ghiChu || '—'}</td>
                          <td className="td-center">
                            <div className="td-actions">
                              {canSua && <button className="btn-icon-edit" onClick={() => openCtEdit(c)} title="Sửa"><FiEdit2 size={13} /></button>}
                              {canXoa && <button className="btn-icon-delete" onClick={() => handleCtDelete(c)} title="Xóa"><FiTrash2 size={13} /></button>}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showCtModal && (
        <div className="overlay">
          <div className="modal fade-in">
            <div className="modal-header">
              <h3 className="modal-title">{ctEditing ? 'Sửa chi tiết đồng bộ' : 'Thêm trang bị vào nhóm'}</h3>
              <button className="modal-close-btn" onClick={() => setShowCtModal(false)}>✕</button>
            </div>
            <form onSubmit={handleCtSubmit} className="modal-body" noValidate>
              <div className="form-field">
                <label className="form-label">Trang bị đồng bộ <span style={{ color: 'red' }}>*</span></label>
                <select className={`form-input${ctErrors.maTbdb ? ' form-input--invalid' : ''}`} value={ctForm.maTbdb}
                  disabled={!!ctEditing}
                  onChange={e => { setCtForm({ ...ctForm, maTbdb: e.target.value }); setCtErrors(p => ({ ...p, maTbdb: undefined })); }}>
                  <option value="">-- Chọn trang bị --</option>
                  {ctEditing && <option value={ctEditing.maTbdb}>{ctEditing.tenTbdb}</option>}
                  {!ctEditing && tbdbList.filter(t => !ctDaCoMaTbdb.has(t.maTbdb)).map(t => (
                    <option key={t.maTbdb} value={t.maTbdb}>{t.tenTbdb}</option>
                  ))}
                </select>
                {ctErrors.maTbdb && <p className="form-error-text">{ctErrors.maTbdb}</p>}
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <div className="form-field" style={{ flex: 1 }}>
                  <label className="form-label">SL SPKT cơ sở</label>
                  <input className="form-input" type="number" min="0" value={ctForm.soLuongSpktCoSo}
                    onChange={e => setCtForm({ ...ctForm, soLuongSpktCoSo: e.target.value })} />
                </div>
                <div className="form-field" style={{ flex: 1 }}>
                  <label className="form-label">SL định mức <span style={{ color: 'red' }}>*</span></label>
                  <input className={`form-input${ctErrors.slDinhMuc ? ' form-input--invalid' : ''}`} type="number" min="1" value={ctForm.slDinhMuc}
                    onChange={e => { setCtForm({ ...ctForm, slDinhMuc: e.target.value }); setCtErrors(p => ({ ...p, slDinhMuc: undefined })); }} />
                  {ctErrors.slDinhMuc && <p className="form-error-text">{ctErrors.slDinhMuc}</p>}
                </div>
              </div>
              <div className="form-field">
                <label className="form-label">Ghi chú</label>
                <textarea className="form-input" style={{ height: 60, resize: 'vertical' }} value={ctForm.ghiChu}
                  onChange={e => setCtForm({ ...ctForm, ghiChu: e.target.value })} placeholder="Ghi chú..." />
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-cancel" onClick={() => setShowCtModal(false)}>Hủy</button>
                <button type="submit" className="btn-primary" disabled={ctSaving}>
                  {ctEditing ? <FiEdit2 style={{ marginRight: 6 }} /> : <FiPlus style={{ marginRight: 6 }} />}
                  {ctSaving ? 'Đang lưu…' : ctEditing ? 'Lưu' : 'Thêm'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
