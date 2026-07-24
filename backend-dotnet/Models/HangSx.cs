using System;
using System.Collections.Generic;

namespace backend_dotnet.Models;

public partial class HangSx
{
    public string MaHsx { get; set; } = null!;

    public string TenHsx { get; set; } = null!;

    public string? DiaChi { get; set; }

    public string? Email { get; set; }

    public string? Sdt { get; set; }

    public string? GhiChu { get; set; }

    public string? MaNsx { get; set; }

    public virtual Nsx? MaNsxNavigation { get; set; }
}
