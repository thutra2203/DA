using System;
using System.Collections.Generic;

namespace backend_dotnet.Models;

public partial class Dvt
{
    public string MaDvt { get; set; } = null!;

    public string TenDvt { get; set; } = null!;

    public string? DonViCoBan { get; set; }

    public double? HeSoCoBan { get; set; }

    public string? GhiChu { get; set; }

    public virtual ICollection<HoSoSpkt> HoSoSpkts { get; set; } = new List<HoSoSpkt>();

    public virtual ICollection<Tbdb> Tbdbs { get; set; } = new List<Tbdb>();
}
