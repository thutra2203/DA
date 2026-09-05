using System;
using System.Collections.Generic;

namespace backend_dotnet.Models;

public partial class TonDauKy
{
    public int MaTonDau { get; set; }

    public int Nam { get; set; }

    public string MaKho { get; set; } = null!;

    public string NhomTb { get; set; } = null!;

    public string? MaLoaiSpkt { get; set; }

    public string? MaTbdb { get; set; }

    public int? MaCcl { get; set; }

    public int SoLuong { get; set; }

    public string NguonTao { get; set; } = null!;

    public string? MaChuyenKy { get; set; }

    public DateTime NgayTao { get; set; }

    public string? NguoiTao { get; set; }

    public string? GhiChu { get; set; }

    public virtual CapChatLuong? MaCclNavigation { get; set; }

    public virtual ChuyenKy? MaChuyenKyNavigation { get; set; }

    public virtual Kho MaKhoNavigation { get; set; } = null!;

    public virtual LoaiSpkt? MaLoaiSpktNavigation { get; set; }

    public virtual Tbdb? MaTbdbNavigation { get; set; }
}
