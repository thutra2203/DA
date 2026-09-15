import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { kiemKeTbDongBoAPI } from '../../services/api';
import { FiArrowLeft, FiCheckCircle, FiList, FiSearch } from 'react-icons/fi';
import { usePageTitle } from '../../context/PageHeaderContext';
import { useConfirm } from '../../context/ConfirmContext';
import { useModulePerm } from '../../hooks/useModulePerm';
import '../../styles/shared.css';
import './HoSoTbDongBo.css';

export default function XuLyKiemKePage() {
  const { maPhieu } = useParams();
  const navigate = useNavigate();
  const { canSua } = useModulePerm('TBDB_KIEM_KE_XL');
  const confirm = useConfirm();

  const [phieu, setPhieu] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dangKetThuc, setDangKetThuc] = useState(false);
  const [toast, setToast] = useState(null);
  const [search, setSearch] = useState('');
  const [selectedCcl, setSelectedCcl] = useState('ALL');

  const showToast = (text, type = 'success') => { setToast({ text, type }); setTimeout(() => setToast(null), 3000); };

  const load = () => {
    setLoading(true);
    return kiemKeTbDongBoAPI.getOne(maPhieu)
      .then(res => setPhieu(res.data))
      .catch(() => setPhieu(null))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [maPhieu]);

  usePageTitle('Kiểm kê');

  const ketThucKiemKe = async () => {
    if (!(await confirm('Kết thúc kiểm kê? Sau khi kết thúc sẽ không thể sửa số liệu của phiếu này nữa.'))) return;
    setDangKetThuc(true);
    try {
      await kiemKeTbDongBoAPI.ketThuc(maPhieu);
      showToast('Kết thúc kiểm kê thành công!');
      load();
    } catch (err) { showToast(err.response?.data?.message || 'Lỗi thao tác', 'error'); }
    finally { setDangKetThuc(false); }
  };

  const cclOptions = useMemo(() => {
    const map = new Map();
    (phieu?.chiTiet || []).forEach(r => { if (r.maCcl != null) map.set(r.maCcl, r.capChatLuong || r.maCcl); });
    return [...map.entries()];
  }, [phieu]);

  const chiTietLoc = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (phieu?.chiTiet || []).filter(r => {
      if (selectedCcl !== 'ALL' && String(r.maCcl) !== selectedCcl) return false;
      if (q && !`${r.maTbdb} ${r.tenTbdb || ''}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [phieu, search, selectedCcl]);

  if (loading) return <div className="empty-state" style={{ padding: '40px 0' }}>Đang tải...</div>;
  if (!phieu) return <div className="empty-state" style={{ padding: '40px 0' }}>Không tìm thấy phiếu kiểm kê</div>;

  const daKetThuc = phieu.daKetThuc;

  return (
    <div>
      {toast && (
        <div className={`toast toast--${toast.type === 'error' ? 'error' : 'success'}`}>
          {toast.type === 'error' ? '✗' : '✓'} {toast.text}
        </div>
      )}

      <div className="page-header" style={{ position: 'relative' }}>
        <div className="page-header-left">
          <button className="btn-icon-edit" style={{ width: 38, height: 38 }} onClick={() => navigate('/tb-dong-bo/kiem-ke')} title="Quay lại danh sách">
            <FiArrowLeft size={16} />
          </button>
          <div>
            <p style={{ margin: 0, fontSize: 12, color: '#888' }}>
              <span style={{ cursor: 'pointer', color: '#1a3a5c', fontWeight: 600 }} onClick={() => navigate('/tb-dong-bo/kiem-ke')}>
                Kiểm kê TBĐB
              </span>
              <span style={{ margin: '0 6px' }}>/</span>
              <span>Chi tiết phiếu</span>
            </p>
          </div>
        </div>
        {daKetThuc && (
          <span className="tbdb-finished-badge" style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }}>
            <FiCheckCircle size={14} style={{ marginRight: 6 }} />Đã kết thúc
          </span>
        )}
        {!daKetThuc && canSua && (
          <button className="btn-primary" disabled={dangKetThuc} onClick={ketThucKiemKe}>
            <FiCheckCircle style={{ marginRight: 6 }} />{dangKetThuc ? 'Đang xử lý...' : 'Kết thúc kiểm kê'}
          </button>
        )}
      </div>

      <div className="data-card" style={{ padding: 20 }}>
        <div className="tbdb-tab-toolbar">
          <span style={{ fontWeight: 600, fontSize: 19 }}>
            Danh sách trang bị đồng bộ {phieu.tenKho || phieu.maKho}
          </span>
        </div>

        <div className="table-toolbar" style={{ flexWrap: 'wrap', rowGap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <div className="search-wrap" style={{ width: 260 }}>
              <FiSearch className="search-icon" />
              <input className="search-input" placeholder="Tìm theo mã TB, tên TB..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <select className="tbdb-filter-select" value={selectedCcl} onChange={e => setSelectedCcl(e.target.value)}>
              <option value="ALL">Tất cả cấp CL</option>
              {cclOptions.map(([ma, ten]) => <option key={ma} value={ma}>{ten}</option>)}
            </select>
          </div>
        </div>

        {phieu.chiTiet.length === 0 ? (
          <div className="empty-state" style={{ padding: '24px 0' }}>Phiếu này chưa có dòng chi tiết nào</div>
        ) : chiTietLoc.length === 0 ? (
          <div className="empty-state" style={{ padding: '24px 0' }}>Không có dòng nào khớp với bộ lọc hiện tại</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table data-table--split">
              <thead>
                <tr>
                  <th rowSpan={2} style={{ width: 50 }}>STT</th>
                  <th rowSpan={2}>Mã TB</th>
                  <th rowSpan={2}>Tên TB</th>
                  <th rowSpan={2}>Cấp CL</th>
                  <th rowSpan={2} style={{ textAlign: 'center' }}>SL kỳ trước</th>
                  <th colSpan={3} style={{ textAlign: 'center' }}>Theo sổ sách</th>
                  <th colSpan={3} style={{ textAlign: 'center' }}>Thực tế kiểm kê</th>
                  <th rowSpan={2} style={{ width: 90, textAlign: 'center' }}>Thao tác</th>
                </tr>
                <tr>
                  <th style={{ textAlign: 'center' }}>Số lượng</th>
                  <th style={{ textAlign: 'center' }}>Tăng</th>
                  <th style={{ textAlign: 'center' }}>Giảm</th>
                  <th style={{ textAlign: 'center' }}>Số lượng</th>
                  <th style={{ textAlign: 'center' }}>Thừa</th>
                  <th style={{ textAlign: 'center' }}>Thiếu</th>
                </tr>
              </thead>
              <tbody>
                {chiTietLoc.map((r, i) => (
                  <tr key={r.maCtKiemKe}>
                    <td className="td-muted td-center">{i + 1}</td>
                    <td><span className="sub-value">{r.maTbdb}</span></td>
                    <td>{r.tenTbdb || ''}</td>
                    <td>{r.capChatLuong || ''}</td>
                    <td className="td-center">{r.soLuongKyTruoc}</td>
                    <td className="td-center">{r.soLuongSoSach}</td>
                    <td className="td-center">{r.tang > 0 ? <span style={{ color: '#2e7d32', fontWeight: 600 }}>+{r.tang}</span> : ''}</td>
                    <td className="td-center">{r.giam > 0 ? <span style={{ color: '#c62828', fontWeight: 600 }}>-{r.giam}</span> : ''}</td>
                    <td className="td-center">{r.soLuongThucTe}</td>
                    <td className="td-center">{r.thua > 0 ? <span style={{ color: '#2e7d32', fontWeight: 600 }}>+{r.thua}</span> : ''}</td>
                    <td className="td-center">{r.thieu > 0 ? <span style={{ color: '#c62828', fontWeight: 600 }}>-{r.thieu}</span> : ''}</td>
                    <td className="td-center">
                      <div className="td-actions">
                        <button className="btn-icon-edit" onClick={() => navigate(`/tb-dong-bo/kiem-ke/${maPhieu}/chi-tiet/${r.maCtKiemKe}`)} title="Chi tiết tồn kho theo lô, vị trí">
                          <FiList size={13} />
                        </button>
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
  );
}
