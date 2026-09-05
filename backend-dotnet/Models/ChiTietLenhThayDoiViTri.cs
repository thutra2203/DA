using System;
using System.Collections.Generic;

namespace backend_dotnet.Models;

public partial class ChiTietLenhThayDoiViTri
{
    public int MaCtlenhThayDoiViTri { get; set; }

    public string MaLenh { get; set; } = null!;

    public long MaTonKho { get; set; }

    public string MaLoTbdb { get; set; } = null!;

    public int SoLuong { get; set; }

    public string? TenNhaKhoMoi { get; set; }

    public string? TenDinhKhuMoi { get; set; }

    public string? TenKhoiMoi { get; set; }

    public string? TenGiaMoi { get; set; }

    public string? TenTangMoi { get; set; }

    public string? TenHomMoi { get; set; }

    public string? MoTaViTriMoi { get; set; }

    // Trạng thái TB của dòng tồn kho nguồn TRƯỚC khi bị đổi thành "TT03 - Đang làm lệnh" lúc thêm
    // dòng (chỉ ghi khi dòng này giữ chỗ TOÀN BỘ số lượng hiện có của dòng tồn kho đó) — dùng để trả
    // lại đúng trạng thái gốc khi xóa dòng/xóa lệnh hoặc khi Kết thúc lệnh.
    public string? TrangThaiGoc { get; set; }

    public string? GhiChu { get; set; }

    public virtual LenhThayDoiViTri MaLenhNavigation { get; set; } = null!;

    public virtual LoTbdb MaLoTbdbNavigation { get; set; } = null!;

    public virtual TonKhoTbdb MaTonKhoNavigation { get; set; } = null!;
}
