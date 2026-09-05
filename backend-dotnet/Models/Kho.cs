using System;
using System.Collections.Generic;

namespace backend_dotnet.Models;

public partial class Kho
{
    public string MaKho { get; set; } = null!;

    public string MaLoaiKho { get; set; } = null!;

    public string TenKho { get; set; } = null!;

    public decimal? DienTich { get; set; }

    public string? DiaChi { get; set; }

    public string? MaXa { get; set; }

    public string? MaTinh { get; set; }

    public string? GhiChu { get; set; }

    public virtual ICollection<HoSoSpkt> HoSoSpkts { get; set; } = new List<HoSoSpkt>();

    public virtual ICollection<Lenh> LenhMaKhoNhapNavigations { get; set; } = new List<Lenh>();

    public virtual ICollection<Lenh> LenhMaKhoXuatNavigations { get; set; } = new List<Lenh>();

    public virtual LoaiKho MaLoaiKhoNavigation { get; set; } = null!;

    public virtual Tinh? MaTinhNavigation { get; set; }

    public virtual Xa? MaXaNavigation { get; set; }

    public virtual ICollection<NguoiDung> NguoiDungs { get; set; } = new List<NguoiDung>();

    public virtual ICollection<NhaKho> NhaKhos { get; set; } = new List<NhaKho>();

    public virtual ICollection<PhieuKiemKe> PhieuKiemKes { get; set; } = new List<PhieuKiemKe>();

    public virtual ICollection<TonDauKy> TonDauKies { get; set; } = new List<TonDauKy>();

    public virtual ICollection<TonKhoTbdb> TonKhoTbdbs { get; set; } = new List<TonKhoTbdb>();
}
