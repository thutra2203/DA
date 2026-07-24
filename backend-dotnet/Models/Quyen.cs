using System;
using System.Collections.Generic;

namespace backend_dotnet.Models;

public partial class Quyen
{
    public int MaQuyen { get; set; }

    public string TenQuyen { get; set; } = null!;

    public string? GhiChu { get; set; }

    public virtual ICollection<VaiTroChucNangQuyen> VaiTroChucNangQuyens { get; set; } = new List<VaiTroChucNangQuyen>();
}
