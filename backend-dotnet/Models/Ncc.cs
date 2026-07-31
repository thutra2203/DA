using System;
using System.Collections.Generic;

namespace backend_dotnet.Models;

public partial class Ncc
{
    public string MaNcc { get; set; } = null!;

    public string TenNcc { get; set; } = null!;

    public string? DiaChi { get; set; }

    public string? Email { get; set; }

    public string? Sdt { get; set; }

    public string? GhiChu { get; set; }

    public string? MaNsx { get; set; }

    public virtual ICollection<Lenh> Lenhs { get; set; } = new List<Lenh>();

    public virtual Nsx? MaNsxNavigation { get; set; }
}
