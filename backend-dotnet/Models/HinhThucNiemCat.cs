using System;
using System.Collections.Generic;

namespace backend_dotnet.Models;

public partial class HinhThucNiemCat
{
    public string MaHtnc { get; set; } = null!;

    public string TenHtnc { get; set; } = null!;

    public virtual ICollection<HoSoSpkt> HoSoSpkts { get; set; } = new List<HoSoSpkt>();

    public virtual ICollection<SpkttrongLenh> SpkttrongLenhs { get; set; } = new List<SpkttrongLenh>();
}
