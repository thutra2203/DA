using System;
using System.Collections.Generic;

namespace backend_dotnet.Models;

public partial class NhomDongBo
{
    public string MaKieuSpkt { get; set; } = null!;

    public string MaLoaiTbdb { get; set; } = null!;

    public string? GhiChu { get; set; }

    public virtual ICollection<ChiTietDongBo> ChiTietDongBos { get; set; } = new List<ChiTietDongBo>();

    public virtual KieuSpkt MaKieuSpktNavigation { get; set; } = null!;

    public virtual LoaiTbdb MaLoaiTbdbNavigation { get; set; } = null!;
}
