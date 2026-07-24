using System;
using System.Collections.Generic;

namespace backend_dotnet.Models;

public partial class Xa
{
    public string MaXa { get; set; } = null!;

    public string MaTinh { get; set; } = null!;

    public string TenXa { get; set; } = null!;

    public string? GhiChu { get; set; }

    public virtual ICollection<Kho> Khos { get; set; } = new List<Kho>();

    public virtual Tinh MaTinhNavigation { get; set; } = null!;
}
