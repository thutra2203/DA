using System;
using System.Collections.Generic;

namespace backend_dotnet.Models;

public partial class DinhKhu
{
    public string MaDinhKhu { get; set; } = null!;

    public string MaNhaKho { get; set; } = null!;

    public string TenDinhKhu { get; set; } = null!;

    public string? GhiChu { get; set; }

    public virtual ICollection<HoSoSpkt> HoSoSpkts { get; set; } = new List<HoSoSpkt>();

    public virtual ICollection<KhoiHang> KhoiHangs { get; set; } = new List<KhoiHang>();

    public virtual NhaKho MaNhaKhoNavigation { get; set; } = null!;

    public virtual ICollection<Tbdb> Tbdbs { get; set; } = new List<Tbdb>();
}
