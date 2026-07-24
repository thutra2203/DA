using System;
using System.Collections.Generic;

namespace backend_dotnet.Models;

public partial class HtvanChuyen
{
    public string MaHtvc { get; set; } = null!;

    public string TenHtvc { get; set; } = null!;

    public decimal? MucPhi { get; set; }

    public string? GhiChu { get; set; }
}
