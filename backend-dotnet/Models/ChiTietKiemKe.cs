using System;
using System.Collections.Generic;

namespace backend_dotnet.Models;

public partial class ChiTietKiemKe
{
    public int MaCtkiemKe { get; set; }

    public string MaPhieuKiemKe { get; set; } = null!;

    public string? MaLoaiSpkt { get; set; }

    public string? MaTbdb { get; set; }

    public int SoLuongKyTruoc { get; set; }

    public int SoTang { get; set; }

    public int SoGiam { get; set; }

    public int SoLuongSoSach { get; set; }

    public int SoLuongThucTe { get; set; }

    public int? Thua { get; set; }

    public int? Thieu { get; set; }

    public string? GhiChu { get; set; }

    public virtual LoaiSpkt? MaLoaiSpktNavigation { get; set; }

    public virtual PhieuKiemKe MaPhieuKiemKeNavigation { get; set; } = null!;

    public virtual Tbdb? MaTbdbNavigation { get; set; }
}
