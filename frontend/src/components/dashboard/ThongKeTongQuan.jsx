import { useState, useEffect } from 'react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { FiTrendingUp, FiPieChart, FiAlertTriangle } from 'react-icons/fi';
import { thongKeTongQuanAPI } from '../../services/api';

const MAU = ['#1565c0', '#2e7d32', '#e07b00', '#6a3fb5', '#c2185b', '#00838f', '#5d4037', '#455a64'];

const thangNgan = (k) => `Th${Number(k.split('-')[1])}`;
const ngayNgan = (k) => { const p = k.split('-'); return `${p[2]}/${p[1]}`; };
const fmtNgay = (v) => (v ? new Date(v).toLocaleDateString('vi-VN') : '');

const soNgayQuaHan = (giaTriDenNgay) => {
  const hetHan = new Date(giaTriDenNgay); hetHan.setHours(0, 0, 0, 0);
  const homNay = new Date(); homNay.setHours(0, 0, 0, 0);
  return Math.round((homNay - hetHan) / 86400000);
};

// Khối "Thống kê tổng quan" — bổ sung cho phần đồ thị Neo4j (GraphOverview), độc lập hoàn toàn với
// Neo4j (thuần SQL Server) nên vẫn hiển thị được kể cả khi đồ thị chưa bật. Gồm 3 nhóm: xu hướng
// theo thời gian, phân bố hiện trạng (TBĐB + SPKT), và cảnh báo/điểm nóng cần chú ý.
export default function ThongKeTongQuan() {
  const [xuHuong, setXuHuong] = useState(null);
  const [phanBo, setPhanBo] = useState(null);
  const [canhBao, setCanhBao] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      thongKeTongQuanAPI.xuHuong(12).then(r => r.data).catch(() => null),
      thongKeTongQuanAPI.phanBo().then(r => r.data).catch(() => null),
      thongKeTongQuanAPI.canhBao().then(r => r.data).catch(() => null),
    ]).then(([xh, pb, cb]) => { setXuHuong(xh); setPhanBo(pb); setCanhBao(cb); })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="graph-card graph-card--empty">Đang tải thống kê…</div>;
  if (!xuHuong && !phanBo && !canhBao) return null;

  return (
    <div className="tk-tong-quan">
      {xuHuong && (
        <>
          <h3 className="section-title tk-section-title">
            <FiTrendingUp size={13} /> Xu hướng theo thời gian
          </h3>
          <div className="tk-grid-2">
            <div className="graph-card">
              <div className="graph-card-head"><span>Nhập/Xuất TBĐB theo tháng (12 tháng gần nhất)</span></div>
              <div className="tk-chart-pad">
                {xuHuong.nhapXuatTheoThang.every(d => d.soLuongNhap === 0 && d.soLuongXuat === 0) ? (
                  <div className="graph-card--empty">Chưa có lệnh Nhập/Xuất nào trong giai đoạn này.</div>
                ) : (
                  <ResponsiveContainer width="100%" height={230}>
                    <BarChart data={xuHuong.nhapXuatTheoThang.map(d => ({ ...d, thangNhan: thangNgan(d.thang) }))}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="thangNhan" fontSize={11} />
                      <YAxis fontSize={11} allowDecimals={false} width={34} />
                      <Tooltip />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Bar dataKey="soLuongNhap" name="SL nhập" fill="#2e7d32" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="soLuongXuat" name="SL xuất" fill="#c62828" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
            <div className="graph-card">
              <div className="graph-card-head"><span>Số lệnh theo nghiệp vụ</span></div>
              <div className="tk-chart-pad">
                <ResponsiveContainer width="100%" height={230}>
                  <BarChart data={xuHuong.soLenhTheoNghiepVu.map(d => ({ ...d, thangNhan: thangNgan(d.thang) }))}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="thangNhan" fontSize={11} />
                    <YAxis fontSize={11} allowDecimals={false} width={26} />
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: 10.5 }} />
                    <Bar dataKey="nhap" name="Nhập" stackId="a" fill="#1565c0" />
                    <Bar dataKey="xuat" name="Xuất" stackId="a" fill="#c62828" />
                    <Bar dataKey="tonDau" name="Tồn đầu" stackId="a" fill="#00838f" />
                    <Bar dataKey="huyThanhLy" name="Hủy/TL" stackId="a" fill="#6a3fb5" />
                    <Bar dataKey="chuyenCap" name="Chuyển cấp" stackId="a" fill="#e07b00" />
                    <Bar dataKey="thayDoiViTri" name="Đổi vị trí" stackId="a" fill="#5d4037" />
                    <Bar dataKey="thayDoiHtnc" name="Đổi HTNC" stackId="a" fill="#c2185b" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
          <div className="graph-card" style={{ marginTop: 14 }}>
            <div className="graph-card-head"><span>Hoạt động hệ thống — 30 ngày gần nhất</span></div>
            <div className="tk-chart-pad">
              <ResponsiveContainer width="100%" height={160}>
                <LineChart data={xuHuong.hoatDongTheoNgay.map(d => ({ ...d, ngayNhan: ngayNgan(d.ngay) }))}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="ngayNhan" fontSize={10} interval={2} />
                  <YAxis fontSize={11} allowDecimals={false} width={26} />
                  <Tooltip />
                  <Line type="monotone" dataKey="soLuong" name="Hoạt động" stroke="#1a3a5c" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}

      {phanBo && (
        <>
          <h3 className="section-title tk-section-title" style={{ marginTop: 26 }}>
            <FiPieChart size={13} /> Phân bố hiện trạng
          </h3>
          <div className="tk-grid-3">
            <div className="graph-card">
              <div className="graph-card-head"><span>TBĐB theo cấp chất lượng</span></div>
              <div className="tk-chart-pad">
                {phanBo.tbdbTheoCap.length === 0 ? (
                  <div className="graph-card--empty">Chưa có tồn kho.</div>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={phanBo.tbdbTheoCap} dataKey="soLuong" nameKey="tenCap" cx="50%" cy="50%" outerRadius={78} label={({ tenCap }) => tenCap}>
                        {phanBo.tbdbTheoCap.map((_, i) => <Cell key={i} fill={MAU[i % MAU.length]} />)}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
            <div className="graph-card">
              <div className="graph-card-head"><span>TBĐB theo trạng thái</span></div>
              <div className="tk-chart-pad">
                {phanBo.tbdbTheoTrangThai.length === 0 ? (
                  <div className="graph-card--empty">Chưa có tồn kho.</div>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={phanBo.tbdbTheoTrangThai} layout="vertical" margin={{ left: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                      <XAxis type="number" fontSize={11} allowDecimals={false} />
                      <YAxis type="category" dataKey="tenTrangThai" fontSize={10.5} width={90} />
                      <Tooltip />
                      <Bar dataKey="soLuong" name="Số lượng" fill="#1565c0" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
            <div className="graph-card">
              <div className="graph-card-head"><span>SPKT theo Nhóm</span></div>
              <div className="tk-chart-pad">
                {phanBo.spktTheoNhom.length === 0 ? (
                  <div className="graph-card--empty">Chưa có hồ sơ SPKT.</div>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={phanBo.spktTheoNhom} layout="vertical" margin={{ left: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                      <XAxis type="number" fontSize={11} allowDecimals={false} />
                      <YAxis type="category" dataKey="tenNhom" fontSize={10.5} width={110} />
                      <Tooltip />
                      <Bar dataKey="soLuong" name="Số lượng" fill="#2e7d32" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {canhBao && (
        <>
          <h3 className="section-title tk-section-title" style={{ marginTop: 26 }}>
            <FiAlertTriangle size={13} /> Cảnh báo / điểm nóng
          </h3>
          <div className="tk-grid-3">
            <div className="graph-card">
              <div className="graph-card-head">
                <span>Lệnh quá hạn</span>
                {canhBao.lenhQuaHan.length > 0 && <span className="graph-card-badge tk-badge-warn">{canhBao.lenhQuaHan.length}</span>}
              </div>
              <div className="tk-list">
                {canhBao.lenhQuaHan.length === 0 ? (
                  <div className="graph-card--empty">Không có lệnh nào quá hạn.</div>
                ) : canhBao.lenhQuaHan.map(l => (
                  <div key={l.maLenh} className="tk-list-item">
                    <div className="tk-list-row">
                      <span className="tk-list-ten">{l.maLenh} — {l.tenLoaiLenh}</span>
                      <span className="tk-list-tag tk-tag-warn">Quá hạn {soNgayQuaHan(l.giaTriDenNgay)} ngày</span>
                    </div>
                    <div className="tk-list-sub">{l.veViec || l.tenKho || ''} · Hạn {fmtNgay(l.giaTriDenNgay)}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="graph-card">
              <div className="graph-card-head">
                <span>SPKT thiếu phụ kiện đồng bộ</span>
                {canhBao.spktThieuDongBo.length > 0 && <span className="graph-card-badge tk-badge-warn">{canhBao.spktThieuDongBo.length}</span>}
              </div>
              <div className="tk-list">
                {canhBao.spktThieuDongBo.length === 0 ? (
                  <div className="graph-card--empty">Không có nhóm SPKT nào thiếu phụ kiện.</div>
                ) : canhBao.spktThieuDongBo.map((s, i) => (
                  <div key={i} className="tk-list-item">
                    <div className="tk-list-row">
                      <span className="tk-list-ten">{s.tenKieu} — {s.tenTbdb}</span>
                      <span className="tk-list-tag tk-tag-warn">Thiếu {s.thieu}</span>
                    </div>
                    <div className="tk-list-sub">Cần {s.canThiet} · Hiện có {s.conLai}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="graph-card">
              <div className="graph-card-head">
                <span>Chênh lệch kiểm kê</span>
                {canhBao.khoChenhLechKiemKe.length > 0 && <span className="graph-card-badge tk-badge-warn">{canhBao.khoChenhLechKiemKe.length}</span>}
              </div>
              <div className="tk-list">
                {canhBao.khoChenhLechKiemKe.length === 0 ? (
                  <div className="graph-card--empty">Không có chênh lệch kiểm kê nào.</div>
                ) : canhBao.khoChenhLechKiemKe.map((k, i) => (
                  <div key={i} className="tk-list-item">
                    <div className="tk-list-row">
                      <span className="tk-list-ten">{k.tenKho}</span>
                      <span className="tk-list-tag tk-tag-warn">
                        {k.tongThua > 0 && `+${k.tongThua}`}{k.tongThua > 0 && k.tongThieu > 0 && ' / '}{k.tongThieu > 0 && `-${k.tongThieu}`}
                      </span>
                    </div>
                    <div className="tk-list-sub">Phiếu {k.maPhieuKiemKe}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
