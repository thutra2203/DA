using System;
using System.Collections.Generic;

namespace backend_dotnet.Models;

public partial class Httt
{
    public string MaHttt { get; set; } = null!;

    public string TenHttt { get; set; } = null!;

    public decimal? MucPhi { get; set; }

    public string? GhiChu { get; set; }

    public virtual ICollection<Lenh> Lenhs { get; set; } = new List<Lenh>();
}
