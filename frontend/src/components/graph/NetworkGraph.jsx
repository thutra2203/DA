import { useEffect, useRef } from 'react';
import { Network } from 'vis-network/standalone/esm/vis-network';

// Bọc vis-network thành 1 component React tái sử dụng. Tạo Network đúng 1 lần khi mount, sau đó chỉ
// gọi setData/setOptions khi props đổi — tránh dựng lại cả đồ thị mỗi lần render.
const BASE_OPTIONS = {
  autoResize: true,
  interaction: { hover: true, tooltipDelay: 150, navigationButtons: true, keyboard: false },
  nodes: {
    shape: 'dot',
    size: 14,
    borderWidth: 2,
    font: { size: 12, face: 'system-ui, "Segoe UI", sans-serif', color: '#2c3e50' },
    color: {
      border: '#1a3a5c',
      background: '#e8f0fb',
      highlight: { border: '#0d4a30', background: '#c8e6d0' },
      hover: { border: '#0d4a30', background: '#d8ecdd' },
    },
  },
  edges: {
    arrows: { to: { enabled: true, scaleFactor: 0.55 } },
    color: { color: '#c2ccdb', highlight: '#1a3a5c', hover: '#1a3a5c' },
    smooth: { enabled: true, type: 'dynamic' },
    font: { size: 10, color: '#8894a8', strokeWidth: 4, strokeColor: '#fff' },
  },
  physics: {
    barnesHut: { gravitationalConstant: -6500, springLength: 130, springConstant: 0.04, damping: 0.28 },
    stabilization: { iterations: 180 },
    minVelocity: 0.6,
  },
};

export default function NetworkGraph({ nodes, edges, options, onSelectNode, height = 420 }) {
  const elRef = useRef(null);
  const netRef = useRef(null);
  const selectCb = useRef(onSelectNode);
  selectCb.current = onSelectNode;

  useEffect(() => {
    const net = new Network(elRef.current, { nodes: [], edges: [] }, { ...BASE_OPTIONS, ...options });
    net.on('selectNode', (p) => {
      const id = p.nodes?.[0];
      if (id != null) selectCb.current?.(id);
    });
    netRef.current = net;
    return () => { net.destroy(); netRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    netRef.current?.setData({ nodes: nodes || [], edges: edges || [] });
  }, [nodes, edges]);

  useEffect(() => {
    if (options && netRef.current) netRef.current.setOptions({ ...BASE_OPTIONS, ...options });
  }, [options]);

  return <div ref={elRef} style={{ height, width: '100%' }} />;
}
