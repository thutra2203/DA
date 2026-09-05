using System;
using System.Collections.Generic;

namespace backend_dotnet.Models;

// Dòng tồn kho (lô + vị trí) CỤ THỂ đã chọn khi "Xuất kho" cho 1 dòng chi tiết lệnh Xuất — ghi
// nhận ngay ("giữ chỗ") nhưng KHÔNG trừ Tồn kho ở đây; chỉ thực trừ khi lệnh Kết thúc. 1 dòng chi
// tiết (CtdongBoTrongLenh) có thể được xuất từ nhiều lô/vị trí khác nhau, qua nhiều lần "Xuất kho"
// — mỗi lần cộng thêm 1 (hoặc nhiều) dòng CTXuatKho.
public partial class CtXuatKho
{
    public long MaCtxuatKho { get; set; }

    public long MaCtdongBoLenh { get; set; }

    public long MaTonKho { get; set; }

    public int SoLuong { get; set; }

    public virtual CtdongBoTrongLenh MaCtdongBoLenhNavigation { get; set; } = null!;

    public virtual TonKhoTbdb MaTonKhoNavigation { get; set; } = null!;
}
