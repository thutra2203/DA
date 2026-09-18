using System;
using System.Collections.Generic;

namespace backend_dotnet.Models;

public partial class NhomSpkt
{
    public string MaNhom { get; set; } = null!;

    public string TenNhom { get; set; } = null!;

    public string? MoTa { get; set; }

    public virtual ICollection<KieuSpkt> KieuSpkts { get; set; } = new List<KieuSpkt>();

    public virtual ICollection<LoaiSpkt> LoaiSpkts { get; set; } = new List<LoaiSpkt>();
}
