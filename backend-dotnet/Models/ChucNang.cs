using System;
using System.Collections.Generic;

namespace backend_dotnet.Models;

public partial class ChucNang
{
    public string MaCn { get; set; } = null!;

    public string TenCn { get; set; } = null!;

    public string? GhiChu { get; set; }

    public virtual ICollection<VaiTroChucNangQuyen> VaiTroChucNangQuyens { get; set; } = new List<VaiTroChucNangQuyen>();
}
