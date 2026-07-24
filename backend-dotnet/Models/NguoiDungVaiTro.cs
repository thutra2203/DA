using System;
using System.Collections.Generic;

namespace backend_dotnet.Models;

public partial class NguoiDungVaiTro
{
    public int MaNguoiDung { get; set; }

    public string MaVaiTro { get; set; } = null!;

    public string? GhiChu { get; set; }

    public virtual NguoiDung MaNguoiDungNavigation { get; set; } = null!;

    public virtual VaiTro MaVaiTroNavigation { get; set; } = null!;
}
