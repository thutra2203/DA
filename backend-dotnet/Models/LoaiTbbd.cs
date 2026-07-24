using System;
using System.Collections.Generic;

namespace backend_dotnet.Models;

public partial class LoaiTbbd
{
    public string MaLoai { get; set; } = null!;

    public string TenLoai { get; set; } = null!;

    public string? GhiChu { get; set; }
}
