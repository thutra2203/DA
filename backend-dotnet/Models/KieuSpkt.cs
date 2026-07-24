using System;
using System.Collections.Generic;

namespace backend_dotnet.Models;

public partial class KieuSpkt
{
    public string MaKieu { get; set; } = null!;

    public string TenKieu { get; set; } = null!;

    public string? NuocSx { get; set; }

    public string? MaDvt { get; set; }

    public string? GhiChu { get; set; }

    public virtual ICollection<NhomDongBo> NhomDongBos { get; set; } = new List<NhomDongBo>();

    public virtual ICollection<LoaiSpkt> MaLoaiSpkts { get; set; } = new List<LoaiSpkt>();
}
