using System;
using System.Collections.Generic;

namespace backend_dotnet.Models;

public partial class Tinh
{
    public string MaTinh { get; set; } = null!;

    public string TenTinh { get; set; } = null!;

    public string? VungMien { get; set; }

    public string? GhiChu { get; set; }

    public virtual ICollection<Kho> Khos { get; set; } = new List<Kho>();

    public virtual ICollection<Xa> Xas { get; set; } = new List<Xa>();
}
