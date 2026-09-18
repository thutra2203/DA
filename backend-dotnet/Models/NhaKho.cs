using System;
using System.Collections.Generic;

namespace backend_dotnet.Models;

public partial class NhaKho
{
    public string MaNhaKho { get; set; } = null!;

    public string MaKho { get; set; } = null!;

    public string TenNhaKho { get; set; } = null!;

    public string? GhiChu { get; set; }

    public virtual Kho MaKhoNavigation { get; set; } = null!;
}
