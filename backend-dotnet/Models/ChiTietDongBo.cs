using System;
using System.Collections.Generic;

namespace backend_dotnet.Models;

public partial class ChiTietDongBo
{
    public string MaKieuSpkt { get; set; } = null!;

    public string MaLoaiTbdb { get; set; } = null!;

    public string MaTbdb { get; set; } = null!;

    public int SoLuongSpktcoSo { get; set; }

    public int SldinhMuc { get; set; }

    public string? GhiChu { get; set; }

    public virtual Tbdb MaTbdbNavigation { get; set; } = null!;

    public virtual NhomDongBo NhomDongBo { get; set; } = null!;
}
