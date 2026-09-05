import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { kiemKeTbDongBoAPI } from '../../services/api';
import { FiArrowLeft, FiSave } from 'react-icons/fi';
import { usePageTitle } from '../../context/PageHeaderContext';
import '../../styles/shared.css';
import './HoSoTbDongBo.css';

const moTaViTriDong = (v) => [v.tenNhaKho, v.tenDinhKhu, v.tenKhoi, v.tenGia, v.tenTang, v.tenHom]
  .filter(Boolean).join(' / ') || v.moTaViTri || '';

export default function XuLyKiemKeViTriPage() {
  const { maPhieu, maCtKiemKe } = useParams();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [forms, setForms] = useState({}); // { [maCtKiemKeViTri]: { soLuongThucTe, ghiChu } }
  const [dangLuu, setDangLuu] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (text, type = 'success') => { setToast({ text, type }); setTimeout(() => setToast(null), 3000); };

  const load = () => {
    setLoading(true);
    return kiemKeTbDongBoAPI.getChiTietViTri(maPhieu, maCtKiemKe)
      .then(res => {
        setData(res.data);
        setForms(Object.fromEntries(res.data.viTri.map(v => [v.maCtKiemKeViTri, { soLuongThucTe: v.soLuongThucTe, ghiChu: v.ghiChu ?? '' }])));
      })
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [maPhieu, maCtKiemKe]);

  usePageTitle('Kiểm kê');

  const suaForm = (id, field, value) => setForms(prev => ({ ...prev, [id]: { ...prev[id], [field]: value } }));

  const luuDong = async (row) => {
    const f = forms[row.maCtKiemKeViTri];
    if (f.soLuongThucTe === '' || Number(f.soLuongThucTe) < 0) { showToast('Nhập số lượng thực tế hợp lệ', 'error'); return; }
    setDangLuu(row.maCtKiemKeViTri);
    try {
      await kiemKeTbDongBoAPI.capNhatChiTietViTri(maPhieu, maCtKiemKe, row.maCtKiemKeViTri, {
        soLuongThucTe: Number(f.soLuongThucTe), ghiChu: f.ghiChu || null,
      });
      showToast('Lưu thành công!');
      load();
    } catch (err) { showToast(err.response?.data?.message || 'Lỗi thao tác', 'error'); }
    finally { setDangLuu(null); }
  };

  if (loading) return <div className="empty-state" style={{ padding: '40px 0' }}>Đang tải...</div>;
  if (!data) return <div className="empty-state" style={{ padding: '40px 0' }}>Không tìm thấy dòng chi tiết kiểm kê</div>;

  const daKetThuc = data.daKetThuc;

  return (
    <div>
      {toast && (
        <div className={`toast toast--${toast.type === 'error' ? 'error' : 'success'}`}>
          {toast.type === 'error' ? '✗' : '✓'} {toast.text}
        </div>
      )}

      <div className="page-header">
        <div className="page-header-left">
          <button className="btn-icon-edit" style={{ width: 38, height: 38 }} onClick={() => navigate(`/tb-dong-bo/kiem-ke/${maPhieu}`)} title="Quay lại phiếu kiểm kê">
            <FiArrowLeft size={16} />
          </button>
          <p style={{ margin: 0, fontSize: 12, color: '#888' }}>
            <span style={{ cursor: 'pointer', color: '#1a3a5c', fontWeight: 600 }} onClick={() => navigate(`/tb-dong-bo/kiem-ke/${maPhieu}`)}>
              Chi tiết phiếu
            </span>
            <span style={{ margin: '0 6px' }}>/</span>
            <span>Chi tiết trang bị {data.maTbdb}</span>
          </p>
        </div>
      </div>

      <div className="data-card" style={{ padding: 20 }}>
        <div className="tbdb-tab-toolbar">
          <span style={{ fontWeight: 600, fontSize: 19 }}>
            Danh sách tồn kho trang bị {data.maTbdb}
          </span>
        </div>
        {data.viTri.length === 0 ? (
          <div className="empty-state" style={{ padding: '24px 0' }}>Không có dữ liệu tồn kho lô nào cho dòng này</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table data-table--split">
              <thead>
                <tr>
                  <th style={{ width: 50 }}>STT</th>
                  <th>Mã lô</th>
                  <th style={{ textAlign: 'center' }}>Năm SX</th>
                  <th>Nước SX</th>
                  <th>Vị trí</th>
                  <th style={{ textAlign: 'center' }}>SL sổ sách</th>
                  <th style={{ textAlign: 'center' }}>SL thực tế</th>
                  <th style={{ textAlign: 'center' }}>Thừa</th>
                  <th style={{ textAlign: 'center' }}>Thiếu</th>
                  <th>Ghi chú</th>
                  {!daKetThuc && <th style={{ width: 70, textAlign: 'center' }}>Thao tác</th>}
                </tr>
              </thead>
              <tbody>
                {data.viTri.map((r, i) => {
                  const f = forms[r.maCtKiemKeViTri] || {};
                  return (
                    <tr key={r.maCtKiemKeViTri}>
                      <td className="td-muted td-center">{i + 1}</td>
                      <td><span className="sub-value">{r.maLoTbdb}</span></td>
                      <td className="td-center">{r.namSx || ''}</td>
                      <td>{r.nuocSx || ''}</td>
                      <td>{moTaViTriDong(r)}</td>
                      <td className="td-center">{r.soLuongSoSach}</td>
                      <td className="td-center">
                        {daKetThuc ? r.soLuongThucTe : (
                          <input className="form-input form-input--cell" style={{ padding: '6px 8px', textAlign: 'center', width: 90 }}
                            type="number" min="0" value={f.soLuongThucTe ?? ''}
                            onChange={e => suaForm(r.maCtKiemKeViTri, 'soLuongThucTe', e.target.value)} />
                        )}
                      </td>
                      <td className="td-center">{r.thua > 0 ? <span style={{ color: '#2e7d32', fontWeight: 600 }}>+{r.thua}</span> : ''}</td>
                      <td className="td-center">{r.thieu > 0 ? <span style={{ color: '#c62828', fontWeight: 600 }}>-{r.thieu}</span> : ''}</td>
                      <td>
                        {daKetThuc ? (r.ghiChu || '') : (
                          <input className="form-input" style={{ padding: '6px 8px' }} value={f.ghiChu ?? ''}
                            onChange={e => suaForm(r.maCtKiemKeViTri, 'ghiChu', e.target.value)} />
                        )}
                      </td>
                      {!daKetThuc && (
                        <td className="td-center">
                          <div className="td-actions">
                            <button className="btn-icon-edit" disabled={dangLuu === r.maCtKiemKeViTri} onClick={() => luuDong(r)} title="Lưu">
                              <FiSave size={13} />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
