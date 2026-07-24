using System;
using System.Collections.Generic;

namespace backend_dotnet.Models;

public partial class NhaKho
{
    public string MaNhaKho { get; set; } = null!;

    public string MaKho { get; set; } = null!;

    public string TenNhaKho { get; set; } = null!;

    public string? GhiChu { get; set; }

    public virtual ICollection<DinhKhu> DinhKhus { get; set; } = new List<DinhKhu>();

    public virtual ICollection<HoSoSpkt> HoSoSpkts { get; set; } = new List<HoSoSpkt>();

    public virtual Kho MaKhoNavigation { get; set; } = null!;

    public virtual ICollection<Tbdb> Tbdbs { get; set; } = new List<Tbdb>();
}
