using System;
using System.Collections.Generic;

namespace backend_dotnet.Models;

public partial class ChiTietTcnx
{
    public string MaCtnx { get; set; } = null!;

    public string TenCtnx { get; set; } = null!;

    public string MaNx { get; set; } = null!;

    public string? GhiChu { get; set; }

    public virtual ICollection<Lenh> Lenhs { get; set; } = new List<Lenh>();

    public virtual TinhChatNhapXuat MaNxNavigation { get; set; } = null!;
}
