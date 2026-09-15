// Chụp lại phần tử .print-only hiện có trên trang (vốn ẩn khi xem màn hình, chỉ hiện khi in —
// xem class .print-only trong HoSoTbDongBo.css) thành ảnh, nhúng vào PDF khổ ngang A3 (đủ rộng
// cho các bảng nhiều cột như báo cáo kiểm kê) rồi tải về máy — dùng chung cho mọi trang đã có
// sẵn 1 print-view, không cần dựng lại nội dung riêng cho PDF. jsPDF/html2canvas nặng và chỉ cần
// khi thật sự xuất PDF, nên import động để không kéo vào bundle chính của toàn bộ ứng dụng.
export async function taiPrintViewThanhPdf(tenFile) {
  const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
    import('jspdf'),
    import('html2canvas'),
  ]);

  const el = document.querySelector('.print-only');
  if (!el) throw new Error('Không tìm thấy nội dung để xuất PDF');

  // .print-only mặc định display:none, chỉ hiện qua @media print — phải hiện tạm thời (off-
  // screen, không ảnh hưởng giao diện) thì html2canvas mới chụp được, vì phần tử display:none
  // không có kích thước/layout để vẽ lại.
  const originalDisplay = el.style.display;
  const originalPosition = el.style.position;
  const originalLeft = el.style.left;
  el.style.display = 'block';
  el.style.position = 'fixed';
  el.style.left = '-9999px';
  el.style.top = '0';

  const LE = 40; // lề trang, đơn vị pt (~1.27cm) — chừa trắng 4 cạnh thay vì in sát mép giấy.

  try {
    const canvas = await html2canvas(el, { scale: 2, useCORS: true });
    const pdf = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const contentWidth = pageWidth - LE * 2;
    const contentHeight = pageHeight - LE * 2;
    const imgWidth = contentWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    if (imgHeight <= contentHeight) {
      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', LE, LE, imgWidth, imgHeight);
    } else {
      // Nội dung dài hơn 1 trang — cắt ảnh gốc thành nhiều lát theo chiều cao vùng in 1 trang.
      const pageHeightInCanvasPx = (contentHeight * canvas.width) / imgWidth;
      let renderedHeight = 0;
      let trangDau = true;
      while (renderedHeight < canvas.height) {
        const sliceHeight = Math.min(pageHeightInCanvasPx, canvas.height - renderedHeight);
        const sliceCanvas = document.createElement('canvas');
        sliceCanvas.width = canvas.width;
        sliceCanvas.height = sliceHeight;
        sliceCanvas.getContext('2d').drawImage(
          canvas, 0, renderedHeight, canvas.width, sliceHeight, 0, 0, canvas.width, sliceHeight
        );
        if (!trangDau) pdf.addPage();
        trangDau = false;
        pdf.addImage(sliceCanvas.toDataURL('image/png'), 'PNG', LE, LE, imgWidth, (sliceHeight * imgWidth) / canvas.width);
        renderedHeight += sliceHeight;
      }
    }

    pdf.save(tenFile);
  } finally {
    el.style.display = originalDisplay;
    el.style.position = originalPosition;
    el.style.left = originalLeft;
  }
}
