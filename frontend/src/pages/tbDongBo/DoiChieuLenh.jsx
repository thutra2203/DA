import { useState, useEffect, useMemo } from 'react';
import { lenhTbDongBoAPI, danhMucAPI } from '../../services/api';
import { FiSearch, FiAlertTriangle } from 'react-icons/fi';
import { usePageTitle } from '../../context/PageHeaderContext';
import '../../styles/shared.css';
import './HoSoTbDongBo.css';

const isXuat = (tenLoaiLenh) => (tenLoaiLenh || '').toLowerCase().includes('xuất');
const isNhap = (tenLoaiLenh) => (tenLoaiLenh || '').toLowerCase().includes('nhập');
const isHuyThanhLy = (tenLoaiLenh) => (tenLoaiLenh || '').toLowerCase().includes('hủy')
  || (tenLoaiLenh || '').toLowerCase().includes('thanh lý');

const TRANG_THAI_LABEL = {
  KHOP: { label: 'Khớp', cls: 'badge--active' },
  LECH: { label: 'Lệch', cls: 'badge--locked' },
  CHI_CO_O_XUAT: { label: 'Chỉ có ở lệnh xuất', cls: 'badge--pending' },
  CHI_CO_O_NHAP: { label: 'Chỉ có ở lệnh nhập', cls: 'badge--info' },
};

export default function DoiChieuLenh() {
  usePageTitle('Đối chiếu lệnh nhập/xuất');

  const [lenhList, setLenhList] = useState([]);
  const [loadingLenh, setLoadingLenh] = useState(true);
  const [khoList, setKhoList] = useState([]);
  const [capQuanLyList, setCapQuanLyList] = useState([]);
  const [loaiKhoList, setLoaiKhoList] = useState([]);
  const [maLenhXuat, setMaLenhXuat] = useState('');
  const [maLenhNhap, setMaLenhNhap] = useState('');
  // Lọc RÚT GỌN danh sách lệnh xuất theo cấp quản lý/loại kho/kho cụ thể của kho XUẤT (bên giao).
  const [selectedCapQuanLyXuat, setSelectedCapQuanLyXuat] = useState('ALL');
  const [selectedLoaiKhoXuat, setSelectedLoaiKhoXuat] = useState('ALL');
  const [selectedKhoXuat, setSelectedKhoXuat] = useState('ALL');
  // Lọc RÚT GỌN danh sách lệnh nhập theo cấp quản lý/loại kho/kho cụ thể của kho NHẬP (bên nhận).
  const [selectedCapQuanLyNhap, setSelectedCapQuanLyNhap] = useState('ALL');
  const [selectedLoaiKhoNhap, setSelectedLoaiKhoNhap] = useState('ALL');
  const [selectedKhoNhap, setSelectedKhoNhap] = useState('ALL');
  const [ketQua, setKetQua] = useState(null);
  const [dangDoiChieu, setDangDoiChieu] = useState(false);
  const [loi, setLoi] = useState('');

  useEffect(() => {
    setLoadingLenh(true);
    Promise.all([
      lenhTbDongBoAPI.getAll().then(res => res.data).catch(() => []),
      danhMucAPI.getAll('kho').then(res => res.data).catch(() => []),
      danhMucAPI.getAll('cap-quan-ly').then(res => res.data).catch(() => []),
      danhMucAPI.getAll('loai-kho').then(res => res.data).catch(() => []),
    ]).then(([lenh, kho, capQuanLy, loaiKho]) => {
      setLenhList(lenh);
      setKhoList(kho);
      setCapQuanLyList(capQuanLy);
      setLoaiKhoList(loaiKho);
    }).finally(() => setLoadingLenh(false));
  }, []);

  const khoInfoMap = useMemo(() => Object.fromEntries(khoList.map(k => [k.maKho, k])), [khoList]);

  // Chọn kho cụ thể cũng RÚT GỌN theo cấp quản lý/loại kho đã chọn — giống hệt cách làm ở trang
  // Hồ sơ TB đồng bộ.
  const khoLocListXuat = useMemo(() => khoList.filter(k =>
    (selectedCapQuanLyXuat === 'ALL' || k.maCapQuanLy === selectedCapQuanLyXuat) &&
    (selectedLoaiKhoXuat === 'ALL' || k.maLoaiKho === selectedLoaiKhoXuat)
  ), [khoList, selectedCapQuanLyXuat, selectedLoaiKhoXuat]);
  const khoLocListNhap = useMemo(() => khoList.filter(k =>
    (selectedCapQuanLyNhap === 'ALL' || k.maCapQuanLy === selectedCapQuanLyNhap) &&
    (selectedLoaiKhoNhap === 'ALL' || k.maLoaiKho === selectedLoaiKhoNhap)
  ), [khoList, selectedCapQuanLyNhap, selectedLoaiKhoNhap]);

  // Chỉ đối chiếu được lệnh chuyển kho NỘI BỘ (có cả kho xuất lẫn kho nhập) — lệnh giao/nhận với
  // nhà cung cấp/đối tác ngoài hệ thống không có "lệnh phía bên kia" để so khớp. Cấp quản lý/loại
  // kho/chọn kho chỉ để RÚT GỌN danh sách lệnh cần chọn (hệ thống nhiều kho, nhiều lệnh) — không
  // phải điều kiện đối chiếu, tương tự cách lọc chọn kho ở trang Hồ sơ TB đồng bộ.
  const dsLenhXuat = useMemo(
    () => lenhList.filter(l => isXuat(l.tenLoaiLenh) && !isHuyThanhLy(l.tenLoaiLenh) && l.maKhoXuat && l.maKhoNhap
      && (selectedCapQuanLyXuat === 'ALL' || khoInfoMap[l.maKhoXuat]?.maCapQuanLy === selectedCapQuanLyXuat)
      && (selectedLoaiKhoXuat === 'ALL' || khoInfoMap[l.maKhoXuat]?.maLoaiKho === selectedLoaiKhoXuat)
      && (selectedKhoXuat === 'ALL' || l.maKhoXuat === selectedKhoXuat)),
    [lenhList, khoInfoMap, selectedCapQuanLyXuat, selectedLoaiKhoXuat, selectedKhoXuat]
  );
  const dsLenhNhap = useMemo(
    () => lenhList.filter(l => isNhap(l.tenLoaiLenh) && l.maKhoXuat && l.maKhoNhap
      && (selectedCapQuanLyNhap === 'ALL' || khoInfoMap[l.maKhoNhap]?.maCapQuanLy === selectedCapQuanLyNhap)
      && (selectedLoaiKhoNhap === 'ALL' || khoInfoMap[l.maKhoNhap]?.maLoaiKho === selectedLoaiKhoNhap)
      && (selectedKhoNhap === 'ALL' || l.maKhoNhap === selectedKhoNhap)),
    [lenhList, khoInfoMap, selectedCapQuanLyNhap, selectedLoaiKhoNhap, selectedKhoNhap]
  );

  // Kho đang chọn không còn nằm trong danh sách vừa rút gọn (do vừa đổi cấp quản lý/loại kho) —
  // quay về "Tất cả kho" để tránh giữ 1 lựa chọn đã ẩn khỏi dropdown.
  useEffect(() => {
    if (selectedKhoXuat !== 'ALL' && !khoLocListXuat.some(k => k.maKho === selectedKhoXuat)) setSelectedKhoXuat('ALL');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [khoLocListXuat]);
  useEffect(() => {
    if (selectedKhoNhap !== 'ALL' && !khoLocListNhap.some(k => k.maKho === selectedKhoNhap)) setSelectedKhoNhap('ALL');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [khoLocListNhap]);

  // Lệnh đang chọn không còn nằm trong danh sách vừa rút gọn (do vừa đổi bộ lọc) — bỏ chọn để
  // tránh giữ 1 lựa chọn đã ẩn khỏi dropdown.
  useEffect(() => {
    if (maLenhXuat && !dsLenhXuat.some(l => l.maLenh === maLenhXuat)) { setMaLenhXuat(''); setKetQua(null); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dsLenhXuat]);
  useEffect(() => {
    if (maLenhNhap && !dsLenhNhap.some(l => l.maLenh === maLenhNhap)) { setMaLenhNhap(''); setKetQua(null); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dsLenhNhap]);

  const doiChieu = () => {
    if (!maLenhXuat || !maLenhNhap) return;
    setDangDoiChieu(true);
    setLoi('');
    setKetQua(null);
    lenhTbDongBoAPI.doiChieu(maLenhXuat, maLenhNhap)
      .then(res => setKetQua(res.data))
      .catch(err => setLoi(err.response?.data?.message || 'Lỗi đối chiếu lệnh'))
      .finally(() => setDangDoiChieu(false));
  };

  const soDongLech = ketQua?.danhSach.filter(d => d.trangThai !== 'KHOP').length ?? 0;

  return (
    <div>
      <div className="data-card">
        <div style={{ padding: '16px 20px', display: 'flex', gap: 24, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ minWidth: 380 }}>
            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <select className="form-input" style={{ flex: 1, height: 38, boxSizing: 'border-box' }}
                value={selectedCapQuanLyXuat} onChange={e => setSelectedCapQuanLyXuat(e.target.value)}>
                <option value="ALL">Tất cả cấp quản lý</option>
                {capQuanLyList.map(c => <option key={c.maCapQuanLy} value={c.maCapQuanLy}>{c.tenCapQuanLy}</option>)}
              </select>
              <select className="form-input" style={{ flex: 1, height: 38, boxSizing: 'border-box' }}
                value={selectedLoaiKhoXuat} onChange={e => setSelectedLoaiKhoXuat(e.target.value)}>
                <option value="ALL">Tất cả loại kho</option>
                {loaiKhoList.map(l => <option key={l.maLoaiKho} value={l.maLoaiKho}>{l.tenLoaiKho}</option>)}
              </select>
              <select className="form-input" style={{ flex: 1, height: 38, boxSizing: 'border-box' }}
                value={selectedKhoXuat} onChange={e => setSelectedKhoXuat(e.target.value)}>
                <option value="ALL">Tất cả kho</option>
                {khoLocListXuat.map(k => <option key={k.maKho} value={k.maKho}>{k.tenKho}</option>)}
              </select>
            </div>
            <div className="form-field" style={{ margin: 0 }}>
              <label className="form-label">Lệnh xuất </label>
              <select className="form-input" style={{ height: 38, boxSizing: 'border-box' }} value={maLenhXuat} disabled={loadingLenh}
                onChange={e => { setMaLenhXuat(e.target.value); setKetQua(null); }}>
                <option value="">-- Chọn lệnh xuất --</option>
                {dsLenhXuat.map(l => (
                  <option key={l.maLenh} value={l.maLenh}>
                    {l.maLenh} - {l.tenKhoXuat} → {l.tenKhoNhap} ({l.ngay})
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div style={{ minWidth: 380 }}>
            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <select className="form-input" style={{ flex: 1, height: 38, boxSizing: 'border-box' }}
                value={selectedCapQuanLyNhap} onChange={e => setSelectedCapQuanLyNhap(e.target.value)}>
                <option value="ALL">Tất cả cấp quản lý</option>
                {capQuanLyList.map(c => <option key={c.maCapQuanLy} value={c.maCapQuanLy}>{c.tenCapQuanLy}</option>)}
              </select>
              <select className="form-input" style={{ flex: 1, height: 38, boxSizing: 'border-box' }}
                value={selectedLoaiKhoNhap} onChange={e => setSelectedLoaiKhoNhap(e.target.value)}>
                <option value="ALL">Tất cả loại kho</option>
                {loaiKhoList.map(l => <option key={l.maLoaiKho} value={l.maLoaiKho}>{l.tenLoaiKho}</option>)}
              </select>
              <select className="form-input" style={{ flex: 1, height: 38, boxSizing: 'border-box' }}
                value={selectedKhoNhap} onChange={e => setSelectedKhoNhap(e.target.value)}>
                <option value="ALL">Tất cả kho</option>
                {khoLocListNhap.map(k => <option key={k.maKho} value={k.maKho}>{k.tenKho}</option>)}
              </select>
            </div>
            <div className="form-field" style={{ margin: 0 }}>
              <label className="form-label">Lệnh nhập </label>
              <select className="form-input" style={{ height: 38, boxSizing: 'border-box' }} value={maLenhNhap} disabled={loadingLenh}
                onChange={e => { setMaLenhNhap(e.target.value); setKetQua(null); }}>
                <option value="">-- Chọn lệnh nhập --</option>
                {dsLenhNhap.map(l => (
                  <option key={l.maLenh} value={l.maLenh}>
                    {l.maLenh} - {l.tenKhoXuat} → {l.tenKhoNhap} ({l.ngay})
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="form-field" style={{ margin: 0 }}>
            <button className="btn-primary" style={{ height: 38, boxSizing: 'border-box', padding: '0 15px' }}
              disabled={!maLenhXuat || !maLenhNhap || dangDoiChieu} onClick={doiChieu}>
              <FiSearch style={{ marginRight: 6 }} />
              {dangDoiChieu ? 'Đang đối chiếu...' : 'Đối chiếu'}
            </button>
          </div>
        </div>

        {loi && <div className="form-error-text" style={{ padding: '0 20px 16px' }}>{loi}</div>}

        {ketQua && (
          <div style={{ padding: '0 20px 20px' }}>
            <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', marginBottom: 12, fontSize: 13 }}>
              <div>
                <strong>Lệnh xuất {ketQua.lenhXuat.maLenh}</strong>: {ketQua.lenhXuat.tenKhoXuat} → {ketQua.lenhXuat.tenKhoNhap || '(ngoài hệ thống)'}
              </div>
              <div>
                <strong>Lệnh nhập {ketQua.lenhNhap.maLenh}</strong>: {ketQua.lenhNhap.tenKhoXuat || '(ngoài hệ thống)'} → {ketQua.lenhNhap.tenKhoNhap}
              </div>
            </div>

            {!ketQua.khoKhopNhau && (
              <div className="form-hint" style={{ color: '#e65100', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                <FiAlertTriangle size={14} />
                Kho ghi trên 2 lệnh không khớp nhau. Có thể bạn đã chọn nhầm cặp lệnh không cùng 1 đợt chuyển kho.
              </div>
            )}

            <div className="form-hint" style={{ marginBottom: 10 }}>
              {soDongLech === 0
                ? 'Toàn bộ trang bị và số lượng theo lệnh trùng khớp giữa 2 lệnh.'
                : `Có ${soDongLech} dòng không khớp giữa 2 lệnh, xem chi tiết bên dưới.`}
            </div>

            <table className="data-table">
              <thead>
                <tr>
                  <th>Mã TB</th>
                  <th>Tên TB</th>
                  <th>Cấp CL</th>
                  <th>SL theo lệnh (Xuất)</th>
                  <th>SL thực xuất</th>
                  <th>SL theo lệnh (Nhập)</th>
                  <th>SL thực nhập</th>
                  <th>Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {ketQua.danhSach.map(d => (
                  <tr key={`${d.maTbdb}-${d.maCcl}`}>
                    <td>{d.maTbdb}</td>
                    <td>{d.tenTbdb}</td>
                    <td className="td-center">{d.tenCcl || d.maCcl}</td>
                    <td className="td-center">{d.slTheoLenhXuat ?? '—'}</td>
                    <td className="td-center">{d.slThucXuat ?? '—'}</td>
                    <td className="td-center">{d.slTheoLenhNhap ?? '—'}</td>
                    <td className="td-center">{d.slThucNhap ?? '—'}</td>
                    <td>
                      <span className={`badge ${TRANG_THAI_LABEL[d.trangThai].cls}`}>
                        {TRANG_THAI_LABEL[d.trangThai].label}
                      </span>
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
