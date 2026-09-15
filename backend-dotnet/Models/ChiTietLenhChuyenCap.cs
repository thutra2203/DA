using System;
using System.Collections.Generic;

namespace backend_dotnet.Models;

public partial class ChiTietLenhChuyenCap
{
    public int MaCtlenhChuyenCap { get; set; }

    public string MaLenh { get; set; } = null!;

    public long MaTonKho { get; set; }

    public string MaLoTbdb { get; set; } = null!;

    public int SoLuong { get; set; }

    public string? GhiChu { get; set; }

    public int MaCclCu { get; set; }

    public int MaCclMoi { get; set; }

    public string? TrangThaiGoc { get; set; }

    public virtual CapChatLuong MaCclCuNavigation { get; set; } = null!;

    public virtual CapChatLuong MaCclMoiNavigation { get; set; } = null!;

    public virtual LenhChuyenCap MaLenhNavigation { get; set; } = null!;

    public virtual LoTbdb MaLoTbdbNavigation { get; set; } = null!;

    public virtual TonKhoTbdb MaTonKhoNavigation { get; set; } = null!;

    public virtual TrangThaiTb? TrangThaiGocNavigation { get; set; }
}
