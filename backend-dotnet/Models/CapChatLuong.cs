using System;
using System.Collections.Generic;

namespace backend_dotnet.Models;

public partial class CapChatLuong
{
    public int MaCap { get; set; }

    public string TenCap { get; set; } = null!;

    public string? MoTa { get; set; }

    public virtual ICollection<ChiTietLenh> ChiTietLenhs { get; set; } = new List<ChiTietLenh>();

    public virtual ICollection<CtdongBoTrongLenh> CtdongBoTrongLenhs { get; set; } = new List<CtdongBoTrongLenh>();

    public virtual ICollection<HoSoSpkt> HoSoSpkts { get; set; } = new List<HoSoSpkt>();

    public virtual ICollection<SpkttrongLenh> SpkttrongLenhs { get; set; } = new List<SpkttrongLenh>();

    public virtual ICollection<Tbdb> Tbdbs { get; set; } = new List<Tbdb>();
}
