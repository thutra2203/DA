import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FiSearch, FiGitBranch, FiAlertCircle, FiPackage, FiMapPin } from 'react-icons/fi';
import { graphAPI } from '../../services/api';
import { usePageTitle } from '../../context/PageHeaderContext';
import NetworkGraph from '../../components/graph/NetworkGraph';
import '../../styles/shared.css';
import './DongDoiLo.css';

// Tra "dòng đời" của một lô trang bị đồng bộ: lô này tách ra từ lô nào, đã đẻ ra những lô nào
// (qua chuyển cấp chất lượng / thay đổi hình thức niêm cất). Dữ liệu lấy từ đồ thị Neo4j.
export default function DongDoiLo() {
  usePageTitle('Dòng đời lô trang bị');
  const [params, setParams] = useSearchParams();

  const [tuKhoa, setTuKhoa] = useState(params.get('lo') ?? '');
  const [ketQuaTim, setKetQuaTim] = useState([]);
  const [dangTim, setDangTim] = useState(false);
  const [loiChung, setLoiChung] = useState(null);

  const [loChon, setLoChon] = useState(params.get('lo') ?? null);
  const [doThi, setDoThi] = useState(null);
  const [dangTaiDoThi, setDangTaiDoThi] = useState(false);
  const [loiDoThi, setLoiDoThi] = useState(null);
  const [nodeChon, setNodeChon] = useState(null);

  const debounceRef = useRef(null);

  const timLo = useCallback(async (q) => {
    setDangTim(true);
    setLoiChung(null);
    try {
      const res = await graphAPI.timLo(q);
      setKetQuaTim(res.data.danhSach ?? []);
    } catch (err) {
      setLoiChung(err.response?.data?.message ?? 'Không tìm được lô.');
      setKetQuaTim([]);
    } finally {
      setDangTim(false);
    }
  }, []);

  // Tìm theo từ khoá (debounce 350ms)
  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => timLo(tuKhoa), 350);
    return () => clearTimeout(debounceRef.current);
  }, [tuKhoa, timLo]);

  const taiDoThi = useCallback(async (maLo) => {
    setLoChon(maLo);
    setNodeChon(null);
    setDangTaiDoThi(true);
    setLoiDoThi(null);
    setParams((p) => { p.set('lo', maLo); return p; }, { replace: true });
    try {
      const res = await graphAPI.dongDoiLo(maLo);
      setDoThi(res.data);
    } catch (err) {
      setLoiDoThi(err.response?.data?.message ?? 'Không tải được dòng đời lô.');
      setDoThi(null);
    } finally {
      setDangTaiDoThi(false);
    }
  }, [setParams]);

  useEffect(() => {
    if (loChon) taiDoThi(loChon);
    // chỉ chạy 1 lần lúc vào trang nếu URL có ?lo=
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { nodes, edges } = useMemo(() => {
    if (!doThi) return { nodes: [], edges: [] };
    const nodes = doThi.nodes.map((n) => ({
      id: n.maLo,
      label: n.maLo,
      title: `${n.maLo}${n.tenTb ? ' — ' + n.tenTb : ''}\nTồn: ${n.tongTon}${n.trangThai ? ' · ' + n.trangThai : ''}`,
      color: n.laGoc
        ? { border: '#0d4a30', background: '#ffd24d' }
        : undefined,
      borderWidth: n.laGoc ? 3 : 2,
    }));
    // Vẽ theo chiều "gốc → nhánh con" (đảo hướng cạnh TACH_TU con→gốc) để lô gốc nằm trên.
    const edges = doThi.edges.map((e) => ({
      from: e.parent,
      to: e.child,
      label: e.lyDo || '',
    }));
    return { nodes, edges };
  }, [doThi]);

  const netOptions = useMemo(() => ({
    layout: { hierarchical: { enabled: true, direction: 'UD', sortMethod: 'directed', levelSeparation: 120, nodeSpacing: 160 } },
    physics: false,
    edges: { smooth: { type: 'cubicBezier', forceDirection: 'vertical', roundness: 0.5 } },
  }), []);

  const chiTietNode = useMemo(
    () => (nodeChon && doThi ? doThi.nodes.find((n) => n.maLo === nodeChon) : null),
    [nodeChon, doThi],
  );

  return (
    <div className="dong-doi-lo">
      <div className="ddl-left">
        <div className="data-card">
          <div className="search-wrap" style={{ width: '100%' }}>
            <FiSearch className="search-icon" />
            <input
              className="search-input"
              placeholder="Tìm mã lô…"
              value={tuKhoa}
              onChange={(e) => setTuKhoa(e.target.value)}
            />
          </div>

          {loiChung ? (
            <div className="ddl-loi"><FiAlertCircle size={14} /> {loiChung}</div>
          ) : dangTim ? (
            <div className="ddl-trong">Đang tìm…</div>
          ) : ketQuaTim.length === 0 ? (
            <div className="ddl-trong">Không có lô nào khớp.</div>
          ) : (
            <ul className="ddl-ds">
              {ketQuaTim.map((l) => (
                <li
                  key={l.maLo}
                  className={`ddl-ds-item${loChon === l.maLo ? ' ddl-ds-item--active' : ''}`}
                  onClick={() => taiDoThi(l.maLo)}
                >
                  <div className="ddl-ds-ma">{l.maLo}</div>
                  <div className="ddl-ds-meta">
                    {l.tenTb || '—'}
                    {l.soConTach > 0 && <span className="ddl-tag ddl-tag--tach">{l.soConTach} nhánh con</span>}
                    {l.coGoc && <span className="ddl-tag ddl-tag--goc">tách từ lô khác</span>}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="ddl-right">
        <div className="data-card ddl-canvas-card">
          {!loChon ? (
            <div className="ddl-canvas-trong">
              <FiGitBranch size={30} />
              <div>Chọn một lô ở danh sách bên trái để xem dòng đời</div>
            </div>
          ) : loiDoThi ? (
            <div className="ddl-loi"><FiAlertCircle size={14} /> {loiDoThi}</div>
          ) : dangTaiDoThi ? (
            <div className="ddl-canvas-trong">Đang dựng đồ thị…</div>
          ) : doThi ? (
            <>
              <div className="ddl-canvas-head">
                <FiGitBranch size={13} />
                Dòng đời lô <strong>{loChon}</strong> — {doThi.nodes.length} lô, {doThi.edges.length} lần tách
              </div>
              {doThi.nodes.length <= 1 && doThi.edges.length === 0 ? (
                <div className="ddl-canvas-trong">Lô này chưa tách nhánh và không tách ra từ lô nào.</div>
              ) : (
                <NetworkGraph
                  nodes={nodes}
                  edges={edges}
                  options={netOptions}
                  height={460}
                  onSelectNode={setNodeChon}
                />
              )}
            </>
          ) : null}
        </div>

        {chiTietNode && (
          <div className="data-card ddl-chi-tiet">
            <div className="ddl-ct-head">
              <FiPackage size={13} /> Lô {chiTietNode.maLo}
              {chiTietNode.laGoc && <span className="ddl-tag ddl-tag--goc">lô đang tra</span>}
            </div>
            <div className="ddl-ct-grid">
              <div><span className="ddl-ct-key">Trang bị:</span> {chiTietNode.tenTb || chiTietNode.maTb || '—'}</div>
              <div><span className="ddl-ct-key">Cấp chất lượng:</span> {chiTietNode.maCcl ?? '—'}</div>
              <div><span className="ddl-ct-key">Năm SX:</span> {chiTietNode.namSx ?? '—'}</div>
              <div><span className="ddl-ct-key">Trạng thái lô:</span> {chiTietNode.trangThai || '—'}</div>
              <div><span className="ddl-ct-key">Tổng tồn:</span> {chiTietNode.tongTon}</div>
            </div>
            {chiTietNode.viTriKho?.length > 0 && (
              <div className="ddl-ct-vitri">
                <div className="ddl-ct-key" style={{ marginBottom: 4 }}><FiMapPin size={11} /> Đang ở kho:</div>
                <ul>
                  {chiTietNode.viTriKho.map((v, i) => (
                    <li key={i}>{v.tenKho || v.maKho}: <strong>{v.soLuong}</strong></li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
