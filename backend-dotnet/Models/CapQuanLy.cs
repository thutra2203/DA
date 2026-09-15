using System;
using System.Collections.Generic;

namespace backend_dotnet.Models;

public partial class CapQuanLy
{
    public string MaCapQuanLy { get; set; } = null!;

    public string TenCapQuanLy { get; set; } = null!;

    public string? GhiChu { get; set; }

    public int? ThuTuHienThi { get; set; }

    public virtual ICollection<Kho> Khos { get; set; } = new List<Kho>();
}
