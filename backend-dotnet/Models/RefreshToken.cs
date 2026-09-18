using System;
using System.Collections.Generic;

namespace backend_dotnet.Models;

public partial class RefreshToken
{
    public long MaRefreshToken { get; set; }

    public int MaNguoiDung { get; set; }

    public string TokenHash { get; set; } = null!;

    public DateTime NgayTao { get; set; }

    public DateTime NgayHetHan { get; set; }

    public bool DaThuHoi { get; set; }

    public DateTime? NgayThuHoi { get; set; }

    public virtual NguoiDung MaNguoiDungNavigation { get; set; } = null!;
}
