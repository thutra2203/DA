const fmtMoney = (v) => (v === null || v === undefined ? '' : Number(v).toLocaleString('vi-VN'));
const fmtDate = (v) => (v ? new Date(v).toLocaleDateString('vi-VN') : '');
const isXuat = (tenLoaiLenh) => (tenLoaiLenh || '').toLowerCase().includes('xuất');

// Nội dung "phiếu in" cho 1 lệnh nhập/xuất TBĐB — dùng chung cho cả trang Chi tiết lệnh (in ngay
// tại chỗ, dữ liệu đã có sẵn) và trang Danh sách lệnh (in nhanh từ nút trên bảng, không cần điều
// hướng sang trang chi tiết). Ẩn khi xem trên màn hình, chỉ hiện khi in — xem class .print-only
// trong HoSoTbDongBo.css.
export default function LenhPrintView({ lenh, rows }) {
  if (!lenh) return null;
  const xuat = isXuat(lenh.tenLoaiLenh);
  const soLuongLabel = xuat ? 'SL phải xuất' : 'SL phải nhập';
  const danhSach = rows || [];

  return (
    <div className="print-only">
      <div className="print-quochieu">
        <div className="print-quochieu-dong1">Cộng hòa xã hội chủ nghĩa Việt Nam</div>
        <div className="print-quochieu-dong2">Độc lập - Tự do - Hạnh phúc</div>
      </div>
      <div className="print-title">
        {xuat ? 'Lệnh xuất kho' : 'Lệnh nhập kho'}
      </div>
      <table className="print-info">
        <tbody>
          <tr>
            <td><strong>Số lệnh:</strong> {lenh.maLenh}</td>
            <td><strong>Ngày:</strong> {fmtDate(lenh.ngay)}</td>
          </tr>
          <tr>
            <td><strong>Lý do:</strong> {lenh.tenLyDo || ''}</td>
            <td><strong>Ngày hiệu lực:</strong> {fmtDate(lenh.ngayHieuLuc)}</td>
          </tr>
          <tr>
            <td><strong>{xuat ? 'Kho xuất:' : 'Kho nhập:'}</strong> {(xuat ? lenh.tenKhoXuat : lenh.tenKhoNhap) || (xuat ? lenh.maKhoXuat : lenh.maKhoNhap) || ''}</td>
            <td>
              <strong>Đối tác:</strong> {lenh.tenNcc || lenh.maNcc || (xuat ? (lenh.tenKhoNhap || lenh.maKhoNhap) : (lenh.tenKhoXuat || lenh.maKhoXuat)) || ''}
            </td>
          </tr>
          <tr>
            <td><strong>Về việc:</strong> {lenh.veViec || ''}</td>
            <td><strong>Căn cứ:</strong> {lenh.canCu || ''}</td>
          </tr>
          <tr>
            <td><strong>Hình thức thanh toán:</strong> {lenh.tenHttt || ''}</td>
            <td><strong>Phương thức vận chuyển:</strong> {lenh.ptVanChuyen || ''}</td>
          </tr>
          <tr>
            <td><strong>Đơn vị chuyển:</strong> {lenh.donViChuyen || ''}</td>
            <td><strong>Người lập:</strong> {lenh.nguoiTao || ''}</td>
          </tr>
          {lenh.ghiChu && (
            <tr>
              <td colSpan={2}><strong>Ghi chú:</strong> {lenh.ghiChu}</td>
            </tr>
          )}
        </tbody>
      </table>

      <table className="print-table">
        <thead>
          <tr>
            <th rowSpan={2} style={{ width: 32 }}>TT</th>
            <th rowSpan={2}>TÊN TB</th>
            <th rowSpan={2}>Đơn vị tính</th>
            <th colSpan={2}>Số phải {xuat ? 'xuất' : 'nhập'} kho</th>
            <th colSpan={2}>Số thực {xuat ? 'xuất' : 'nhập'} kho</th>
            <th rowSpan={2}>Đơn giá</th>
            <th rowSpan={2}>Thành tiền</th>
          </tr>
          <tr>
            <th>Phân cấp</th>
            <th>Số lượng</th>
            <th>Phân cấp</th>
            <th>Số lượng</th>
          </tr>
        </thead>
        <tbody>
          {danhSach.map((r, i) => {
            const slThuc = xuat ? r.soLuongThuc : r.soLuongThucNhap;
            return (
              <tr key={r.maCtdongBoLenh}>
                <td style={{ textAlign: 'center' }}>{i + 1}</td>
                <td>{r.tenTbdb || r.maTbdb}</td>
                <td style={{ textAlign: 'center' }}>{r.tenDvt || r.maDvt || ''}</td>
                <td style={{ textAlign: 'center' }}>{r.tenCcl || r.maCcl}</td>
                <td style={{ textAlign: 'center' }}>{r.soLuongTheoLenh}</td>
                <td style={{ textAlign: 'center' }}>{slThuc ? (r.tenCcl || r.maCcl) : ''}</td>
                <td style={{ textAlign: 'center' }}>{slThuc || ''}</td>
                <td style={{ textAlign: 'right' }}>{fmtMoney(r.donGiaTheoLenh)}</td>
                <td style={{ textAlign: 'right' }}>{fmtMoney((r.donGiaTheoLenh || 0) * r.soLuongTheoLenh)}</td>
              </tr>
            );
          })}
          {Array.from({ length: Math.max(0, 3 - danhSach.length) }).map((_, i) => (
            <tr key={`trong-${i}`}>
              <td>&nbsp;</td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="print-summary-line">
        <span>Tổng số khoản:</span>
        <span className="print-dots">{danhSach.length}</span>
      </div>
      <div className="print-summary-line">
        <span>Thành tiền:</span>
        <span className="print-dots">{fmtMoney(danhSach.reduce((sum, r) => sum + (r.donGiaTheoLenh || 0) * r.soLuongTheoLenh, 0))}</span>
      </div>

      <div className="print-signatures">
        <div>
          <div className="print-signature-top" style={{ fontWeight: 700 }}>{xuat ? 'Đơn vị xuất' : 'Đơn vị nhập'}</div>
          <div className="print-signature-title">Người giao</div>
        </div>
        <div>
          <div className="print-signature-top">Đã thực hiện xong ngày.........tháng.........năm.............</div>
          <div className="print-signature-title">Người nhận phiếu</div>
        </div>
        <div>
          <div className="print-signature-top">Ngày.........tháng.........năm.............</div>
          <div className="print-signature-title">Thủ trưởng ra lệnh</div>
        </div>
      </div>
    </div>
  );
}
