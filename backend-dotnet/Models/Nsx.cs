using System;
using System.Collections.Generic;

namespace backend_dotnet.Models;

public partial class Nsx
{
    public string MaNsx { get; set; } = null!;

    public string TenNsx { get; set; } = null!;

    public string? GhiChu { get; set; }

    public virtual ICollection<HangSx> HangSxes { get; set; } = new List<HangSx>();

    public virtual ICollection<HoSoSpkt> HoSoSpkts { get; set; } = new List<HoSoSpkt>();

    public virtual ICollection<LoTbdb> LoTbdbs { get; set; } = new List<LoTbdb>();

    public virtual ICollection<Ncc> Nccs { get; set; } = new List<Ncc>();

    public virtual ICollection<SpkttrongLenh> SpkttrongLenhs { get; set; } = new List<SpkttrongLenh>();
}
