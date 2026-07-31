using System;
using System.Collections.Generic;

namespace backend_dotnet.Models;

public partial class CtdongBoTrongLenh
{
    public long MaCtdongBoLenh { get; set; }

    public string MaLenh { get; set; } = null!;

    public string MaTbdb { get; set; } = null!;

    public int? MaCcl { get; set; }

    public int SoLuongTheoLenh { get; set; }

    public decimal? DonGiaTheoLenh { get; set; }

    public string? GhiChu { get; set; }

    public int? SoLuongThuc { get; set; }

    public virtual LoTbdb? LoTbdb { get; set; }

    public virtual CapChatLuong? MaCclNavigation { get; set; }

    public virtual Lenh MaLenhNavigation { get; set; } = null!;

    public virtual Tbdb MaTbdbNavigation { get; set; } = null!;
}
