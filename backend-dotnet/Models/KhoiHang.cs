using System;
using System.Collections.Generic;

namespace backend_dotnet.Models;

public partial class KhoiHang
{
    public string MaKhoi { get; set; } = null!;

    public string MaDinhKhu { get; set; } = null!;

    public string TenKhoi { get; set; } = null!;

    public string? GhiChu { get; set; }

    public virtual ICollection<GiaHang> GiaHangs { get; set; } = new List<GiaHang>();

    public virtual ICollection<HoSoSpkt> HoSoSpkts { get; set; } = new List<HoSoSpkt>();

    public virtual DinhKhu MaDinhKhuNavigation { get; set; } = null!;
}
