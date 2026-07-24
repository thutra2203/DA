using System;
using System.Collections.Generic;

namespace backend_dotnet.Models;

public partial class Hom
{
    public string MaHom { get; set; } = null!;

    public string MaTang { get; set; } = null!;

    public string? GhiChu { get; set; }

    public virtual ICollection<CtdongBoTrongLenh> CtdongBoTrongLenhs { get; set; } = new List<CtdongBoTrongLenh>();

    public virtual ICollection<HoSoSpkt> HoSoSpkts { get; set; } = new List<HoSoSpkt>();

    public virtual Tang MaTangNavigation { get; set; } = null!;

    public virtual ICollection<SpkttrongLenh> SpkttrongLenhs { get; set; } = new List<SpkttrongLenh>();

    public virtual ICollection<Tbdb> Tbdbs { get; set; } = new List<Tbdb>();
}
