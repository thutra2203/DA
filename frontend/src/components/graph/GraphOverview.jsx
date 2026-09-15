import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiShare2, FiRefreshCw, FiGitBranch, FiAlertCircle, FiArrowRight,
  FiHome, FiX, FiMapPin, FiPackage, FiArchive, FiLayers, FiClipboard,
} from 'react-icons/fi';
import { graphAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import NetworkGraph from './NetworkGraph';

// Khối "Đồ thị vận hành (Neo4j)" trên trang Tổng quan: chỉ số rút ra từ đồ thị + mạng luân chuyển
// giữa các kho. Bấm 1 node kho → xem "thực lực" kho đó (thông tin + trang bị hiện có).
export default function GraphOverview() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [kpi, setKpi] = useState(null);
  const [mang, setMang] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loi, setLoi] = useState(null);        // { message } khi Neo4j chưa bật / không kết nối
  const [dangDongBo, setDangDongBo] = useState(false);

  const [khoChon, setKhoChon] = useState(null);
  const [thucLuc, setThucLuc] = useState(null);
  const [dangTaiThucLuc, setDangTaiThucLuc] = useState(false);

  const tai = useCallback(async () => {
    setLoading(true);
    setLoi(null);
    try {
      const [tq, lc] = await Promise.all([graphAPI.tongQuan(), graphAPI.luanChuyenKho()]);
      setKpi(tq.data);
      setMang(lc.data);
    } catch (err) {
      const st = err.response?.status;
      setLoi(st === 503 || st === 403 ? err.response.data : { message: 'Không tải được dữ liệu đồ thị.' });
      setKpi(null);
      setMang(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { tai(); }, [tai]);

  const dongBoLai = async () => {
    setDangDongBo(true);
    try {
      await graphAPI.dongBo();
      setKhoChon(null);
      setThucLuc(null);
      await tai();
    } catch (err) {
      setLoi(err.response?.data ?? { message: 'Đồng bộ thất bại.' });
    } finally {
      setDangDongBo(false);
    }
  };

  const xemThucLuc = useCallback(async (maKho) => {
    setKhoChon(maKho);
    setDangTaiThucLuc(true);
    setThucLuc(null);
    try {
      const res = await graphAPI.khoThucLuc(maKho);
      setThucLuc(res.data);
    } catch {
      setThucLuc(null);
    } finally {
      setDangTaiThucLuc(false);
    }
  }, []);

  const { nodes, edges } = useMemo(() => {
    if (!mang) return { nodes: [], edges: [] };
    return {
      nodes: mang.nodes.map((n) => ({
        id: n.id,
        label: n.label,
        title: `${n.label}${n.tinh ? ' — ' + n.tinh : ''}\n${n.soLo} lô đang chứa`,
        value: n.soLo || 1,
      })),
      edges: mang.edges.map((e) => ({
        from: e.from,
        to: e.to,
        label: `${e.soLuot} lượt`,
        title: `${e.soLuot} lượt · ${e.tongSl} đơn vị`,
        value: e.tongSl || 1,
      })),
    };
  }, [mang]);

  const netOptions = useMemo(() => ({
    nodes: { scaling: { min: 10, max: 34, label: { min: 11, max: 16 } } },
    edges: { scaling: { min: 1, max: 6 } },
  }), []);

  return (
    <div className="graph-overview">
      <div className="graph-overview-head">
        <h3 className="section-title" style={{ margin: 0 }}>
          <FiShare2 size={13} style={{ marginRight: 6, verticalAlign: '-2px' }} />
          Tổng quan
        </h3>
        <div className="graph-overview-actions">
          {user?.role === 'ADMIN' && !loi && (
            <button className="graph-btn" onClick={dongBoLai} disabled={dangDongBo} title="Dựng lại đồ thị từ SQL Server">
              <FiRefreshCw size={12} className={dangDongBo ? 'spin' : ''} /> {dangDongBo ? 'Đang đồng bộ…' : 'Đồng bộ lại'}
            </button>
          )}
          <button className="graph-btn graph-btn--primary" onClick={() => navigate('/tb-dong-bo/dong-doi-lo')}>
            <FiGitBranch size={12} /> Tra dòng đời lô <FiArrowRight size={12} />
          </button>
        </div>
      </div>

      {loi ? (
        <div className="graph-notice">
          <FiAlertCircle size={16} />
          <div>
            <div className="graph-notice-title">Chưa bật đồ thị</div>
            <div className="graph-notice-desc">{loi.message}</div>
            <code className="graph-notice-code">docker compose up -d</code>
          </div>
        </div>
      ) : loading ? (
        <div className="graph-card graph-card--empty">Đang tải đồ thị…</div>
      ) : (
        <>
          <div className="graph-kpi-grid">
            {[
              { icon: <FiArchive />, value: kpi.soKho, label: 'Kho', tone: 'blue' },
              { icon: <FiLayers />, value: kpi.soTbdb, label: 'TB đồng bộ', tone: 'green' },
              { icon: <FiPackage />, value: kpi.tongLo, label: 'lô', tone: 'purple' },
              { icon: <FiClipboard />, value: kpi.soLenhDangThucHien, label: 'Lệnh đang thực hiện', tone: 'amber' },
            ].map((k) => (
              <div key={k.label} className={`graph-kpi graph-kpi--${k.tone}`}>
                <span className="graph-kpi-icon">{k.icon}</span>
                <span className="graph-kpi-value">{k.value}</span>
                <span className="graph-kpi-label">{k.label}</span>
              </div>
            ))}
          </div>

          <div className="graph-split">
            <div className="graph-card">
              <div className="graph-card-head">
                <span>Mạng luân chuyển giữa kho</span>
                <span className="graph-card-hint">Bấm vào kho để xem thực lực →</span>
              </div>
              {nodes.length === 0 ? (
                <div className="graph-card--empty">Chưa có dữ liệu kho trong đồ thị.</div>
              ) : (
                <NetworkGraph nodes={nodes} edges={edges} options={netOptions} height={400} onSelectNode={xemThucLuc} />
              )}
            </div>

            {khoChon && (
              <ThucLucKhoPanel
                loading={dangTaiThucLuc}
                data={thucLuc}
                onClose={() => { setKhoChon(null); setThucLuc(null); }}
              />
            )}
          </div>
        </>
      )}
    </div>
  );
}

function ThucLucKhoPanel({ loading, data, onClose }) {
  return (
    <div className="thuc-luc-panel">
      <div className="tlp-head">
        <span><FiHome size={13} /> Thực lực kho</span>
        <button className="tlp-close" onClick={onClose} title="Đóng"><FiX size={14} /></button>
      </div>

      {loading ? (
        <div className="tlp-empty">Đang tải…</div>
      ) : !data ? (
        <div className="tlp-empty">Không tải được thực lực kho.</div>
      ) : (
        <div className="tlp-body">
          <div className="tlp-ten">{data.kho.tenKho}</div>
          <div className="tlp-meta">
            {data.kho.tenLoaiKho && <span className="tlp-badge">{data.kho.tenLoaiKho}</span>}
            {data.kho.tenTinh && <span><FiMapPin size={10} /> {data.kho.tenTinh}</span>}
          </div>
          {data.kho.diaChi && <div className="tlp-diachi">{data.kho.diaChi}</div>}
          {data.kho.dienTich != null && <div className="tlp-diachi">Diện tích: {data.kho.dienTich} m²</div>}

          <div className="tlp-stats">
            <div><b>{data.tongSoLuong}</b><span>Tổng số lượng</span></div>
            <div><b>{data.soLoaiTb}</b><span>Loại trang bị</span></div>
            <div><b>{data.tongSoLo}</b><span>Số lô</span></div>
          </div>

          {data.theoTrangBi.length === 0 ? (
            <div className="tlp-empty">Kho hiện không chứa trang bị nào.</div>
          ) : (
            <div className="tlp-ds">
              <div className="tlp-ds-title"><FiPackage size={11} /> Trang bị hiện có</div>
              {data.theoTrangBi.map((tb) => (
                <div key={tb.maTb} className="tlp-tb">
                  <div className="tlp-tb-row">
                    <span className="tlp-tb-ten">{tb.tenTb || tb.maTb}</span>
                    <span className="tlp-tb-sl">{tb.soLuong}</span>
                  </div>
                  <div className="tlp-tb-cap">
                    {tb.theoCap.map((c, i) => (
                      <span key={i} className="tlp-cap-chip">{c.tenCcl || `Cấp ${c.maCcl ?? '?'}`}: {c.soLuong}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
