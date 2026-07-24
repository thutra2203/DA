using System;
using System.Collections.Generic;

namespace backend_dotnet.Models;

public partial class TinhChatNhapXuat
{
    public string MaNx { get; set; } = null!;

    public string TenNx { get; set; } = null!;

    public string? NhomTb { get; set; }

    public string? GhiChu { get; set; }

    public virtual ICollection<ChiTietTcnx> ChiTietTcnxes { get; set; } = new List<ChiTietTcnx>();

    public virtual ICollection<Lenh> Lenhs { get; set; } = new List<Lenh>();
}
