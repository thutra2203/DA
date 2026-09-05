using System;
using System.Collections.Generic;

namespace backend_dotnet.Models;

public partial class DotKiemKe
{
    public string MaDotKiemKe { get; set; } = null!;

    public string TenDotKiemKe { get; set; } = null!;

    public DateOnly NgayBatDau { get; set; }

    public DateOnly? NgayKetThuc { get; set; }

    public string? TrangThai { get; set; }

    public string? NoiDung { get; set; }

    public string? GhiChu { get; set; }

    public int? Nam { get; set; }

    public virtual ICollection<PhieuKiemKe> PhieuKiemKes { get; set; } = new List<PhieuKiemKe>();
}
