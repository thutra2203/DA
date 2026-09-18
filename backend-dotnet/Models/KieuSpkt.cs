using System;
using System.Collections.Generic;

namespace backend_dotnet.Models;

public partial class KieuSpkt
{
    public string MaKieu { get; set; } = null!;

    public string TenKieu { get; set; } = null!;

    public string? MaDvt { get; set; }

    public string? GhiChu { get; set; }

    public string? MaNhom { get; set; }

    public string? MaNsx { get; set; }

    public virtual ICollection<LoaiSpkt> LoaiSpkts { get; set; } = new List<LoaiSpkt>();

    public virtual NhomSpkt? MaNhomNavigation { get; set; }

    public virtual Nsx? MaNsxNavigation { get; set; }

    public virtual ICollection<NhomDongBo> NhomDongBos { get; set; } = new List<NhomDongBo>();
}
