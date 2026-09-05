using System;
using System.Collections.Generic;

namespace backend_dotnet.Models;

public partial class ChiTietLenhChuyenCap
{
    public int MaCtlenhChuyenCap { get; set; }

    public string MaLenh { get; set; } = null!;

    public string MaLoTbdb { get; set; } = null!;

    public long MaTonKho { get; set; }

    public int MaCclCu { get; set; }

    public int MaCclMoi { get; set; }

    public int SoLuong { get; set; }

    // Trạng thái TB của dòng tồn kho nguồn TRƯỚC khi bị đổi thành "TT04 - Đang chuyển cấp" lúc thêm
    // dòng (chỉ ghi khi dòng này giữ chỗ TOÀN BỘ số lượng hiện có của dòng tồn kho đó) — dùng để trả
    // lại đúng trạng thái gốc khi xóa dòng/xóa lệnh hoặc khi Kết thúc lệnh.
    public string? TrangThaiGoc { get; set; }

    public string? GhiChu { get; set; }

    public virtual LenhChuyenCap MaLenhNavigation { get; set; } = null!;

    public virtual LoTbdb MaLoTbdbNavigation { get; set; } = null!;

    public virtual TonKhoTbdb MaTonKhoNavigation { get; set; } = null!;

    public virtual CapChatLuong MaCclCuNavigation { get; set; } = null!;

    public virtual CapChatLuong MaCclMoiNavigation { get; set; } = null!;
}
