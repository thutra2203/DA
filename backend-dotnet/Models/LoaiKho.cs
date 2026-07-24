using System;
using System.Collections.Generic;

namespace backend_dotnet.Models;

public partial class LoaiKho
{
    public string MaLoaiKho { get; set; } = null!;

    public string TenLoaiKho { get; set; } = null!;

    public string? GhiChu { get; set; }

    public virtual ICollection<Kho> Khos { get; set; } = new List<Kho>();
}
