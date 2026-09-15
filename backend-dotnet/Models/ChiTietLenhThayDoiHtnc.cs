using System;
using System.Collections.Generic;

namespace backend_dotnet.Models;

public partial class ChiTietLenhThayDoiHtnc
{
    public int MaCtlenhThayDoiHtnc { get; set; }

    public string MaLenh { get; set; } = null!;

    public long MaTonKho { get; set; }

    public string MaLoTbdb { get; set; } = null!;

    public int SoLuong { get; set; }

    public string? MaHtncCu { get; set; }

    public string MaHtncMoi { get; set; } = null!;

    public string? TrangThaiGoc { get; set; }

    public string? GhiChu { get; set; }

    public virtual HinhThucNiemCat? MaHtncCuNavigation { get; set; }

    public virtual HinhThucNiemCat MaHtncMoiNavigation { get; set; } = null!;

    public virtual LenhThayDoiHtnc MaLenhNavigation { get; set; } = null!;

    public virtual LoTbdb MaLoTbdbNavigation { get; set; } = null!;

    public virtual TonKhoTbdb MaTonKhoNavigation { get; set; } = null!;

    public virtual TrangThaiTb? TrangThaiGocNavigation { get; set; }
}
