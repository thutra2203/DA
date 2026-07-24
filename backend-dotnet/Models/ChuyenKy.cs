using System;
using System.Collections.Generic;

namespace backend_dotnet.Models;

public partial class ChuyenKy
{
    public string MaChuyenKy { get; set; } = null!;

    public string MaPhieuKiemKe { get; set; } = null!;

    public int NamCu { get; set; }

    public int NamMoi { get; set; }

    public DateOnly NgayChuyen { get; set; }

    public string? TrangThai { get; set; }

    public string? NguoiThucHien { get; set; }

    public string? GhiChu { get; set; }

    public virtual PhieuKiemKe MaPhieuKiemKeNavigation { get; set; } = null!;
}
