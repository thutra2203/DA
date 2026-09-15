using System;
using System.Collections.Generic;

namespace backend_dotnet.Models;

public partial class LenhChuyenCap
{
    public string MaLenh { get; set; } = null!;

    public string MaKho { get; set; } = null!;

    public DateOnly NgayLap { get; set; }

    public string? TrangThai { get; set; }

    public string? NguoiTao { get; set; }

    public string? NguoiKetThuc { get; set; }

    public DateOnly? NgayKetThuc { get; set; }

    public string? GhiChu { get; set; }

    public string? CanCu { get; set; }

    public string? VeViec { get; set; }

    public virtual ICollection<ChiTietLenhChuyenCap> ChiTietLenhChuyenCaps { get; set; } = new List<ChiTietLenhChuyenCap>();

    public virtual Kho MaKhoNavigation { get; set; } = null!;
}
