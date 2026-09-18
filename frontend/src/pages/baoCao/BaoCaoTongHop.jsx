import { useState } from 'react';
import { FiCheckSquare, FiFileText } from 'react-icons/fi';
import { usePageTitle } from '../../context/PageHeaderContext';
import TaoBaoCaoKiemKeModal from './TaoBaoCaoKiemKeModal';
import TaoBaoCaoDongBoModal from './TaoBaoCaoDongBoModal';
import TaoBaoCaoDongBoPhaoModal from './TaoBaoCaoDongBoPhaoModal';
import TaoBaoCaoNhuCauDongBoModal from './TaoBaoCaoNhuCauDongBoModal';
import '../../styles/shared.css';

// Danh sách các loại báo cáo hỗ trợ — tách thành danh sách để dễ thêm loại báo cáo khác sau này mà
// không phải đổi cấu trúc trang.
const LOAI_BAO_CAO = [
  {
    ma: 'KIEM_KE_TBDB',
    ten: 'Báo cáo kiểm kê trang bị đồng bộ',
    moTa: 'Tổng hợp kết quả 1 phiếu kiểm kê TBĐB theo mẫu báo cáo kiểm kê ở kho, hoặc số lượng tồn kho toàn quân.',
  },
  {
    ma: 'DONG_BO_SUNG_BB',
    ten: 'Báo cáo tình hình đồng bộ súng bộ binh',
    moTa: 'Số súng và số phụ kiện đồng bộ hiện có tại 1 kho, theo từng Loại SPKT thuộc Súng bộ binh.',
  },
  {
    ma: 'DONG_BO_PHAO',
    ten: 'Báo cáo tình hình đồng bộ các loại pháo',
    moTa: 'Số pháo và số phụ kiện đồng bộ hiện có tại 1 kho, theo từng Loại SPKT thuộc 4 nhóm Pháo (chống tăng, mặt đất, phòng không, phản lực).',
  },
  {
    ma: 'NHU_CAU_DONG_BO',
    ten: 'Báo cáo nhu cầu đồng bộ súng pháo khí tài (Mẫu 34/18/QK-VK)',
    moTa: 'Nhu cầu, hiện có và cần bổ sung của từng phụ tùng đồng bộ, liệt kê chi tiết theo tất cả Nhóm SPKT tại 1 kho.',
  },
];

export default function BaoCaoTongHop() {
  usePageTitle('Tổng hợp, báo cáo');
  const [dangTaoLoai, setDangTaoLoai] = useState(null); // mã loại báo cáo đang mở form tạo

  return (
    <div>
      <div className="data-card">
        <div style={{ padding: 20 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
            {LOAI_BAO_CAO.map(lbc => (
              <div key={lbc.ma} style={{ border: '1.5px solid #e0e0e0', borderRadius: 8, padding: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, color: '#1a3a5c' }}>
                  {lbc.icon}
                  <strong>{lbc.ten}</strong>
                </div>
                <div style={{ fontSize: 13, color: '#666', marginBottom: 14, minHeight: 54 }}>{lbc.moTa}</div>
                <button className="btn-primary" onClick={() => setDangTaoLoai(lbc.ma)}>
                  <FiFileText style={{ marginRight: 6 }} />Tạo báo cáo
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {dangTaoLoai === 'KIEM_KE_TBDB' && (
        <TaoBaoCaoKiemKeModal onClose={() => setDangTaoLoai(null)} />
      )}
      {dangTaoLoai === 'DONG_BO_SUNG_BB' && (
        <TaoBaoCaoDongBoModal onClose={() => setDangTaoLoai(null)} />
      )}
      {dangTaoLoai === 'DONG_BO_PHAO' && (
        <TaoBaoCaoDongBoPhaoModal onClose={() => setDangTaoLoai(null)} />
      )}
      {dangTaoLoai === 'NHU_CAU_DONG_BO' && (
        <TaoBaoCaoNhuCauDongBoModal onClose={() => setDangTaoLoai(null)} />
      )}
    </div>
  );
}
