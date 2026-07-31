using System;
using System.Collections.Generic;

namespace backend_dotnet.Models;

public partial class ChiTietLenh
{
    public int MaCtlenh { get; set; }

    public string MaLenh { get; set; } = null!;

    public string? MaLoaiSpkt { get; set; }

    public string? MaLoaiTbdb { get; set; }

    public int? MaCcl { get; set; }

    public int SoLuong { get; set; }

    public int? SlThuc { get; set; }

    public string? GhiChu { get; set; }

    public virtual CapChatLuong? MaCclNavigation { get; set; }

    public virtual Lenh MaLenhNavigation { get; set; } = null!;

    public virtual LoaiSpkt? MaLoaiSpktNavigation { get; set; }

    public virtual LoaiTbdb? MaLoaiTbdbNavigation { get; set; }

    public virtual ICollection<SpkttrongLenh> SpkttrongLenhs { get; set; } = new List<SpkttrongLenh>();
}
