using System;
using System.Collections.Generic;

namespace backend_dotnet.Models;

public partial class Tbdb
{
    public string MaTbdb { get; set; } = null!;

    public string MaLoaiTbdb { get; set; } = null!;

    public string? TenTbdb { get; set; }

    public int? NamSx { get; set; }

    public string? MaNuocSx { get; set; }

    public int? MaCcl { get; set; }

    public string? MaDvt { get; set; }

    public string? MaHinhThucNiemCat { get; set; }

    public string? MaTinhTrangBaoGoi { get; set; }

    public string? MaKho { get; set; }

    public string? MaNhaKho { get; set; }

    public string? MaKhu { get; set; }

    public string? MaKhoi { get; set; }

    public string? MaTang { get; set; }

    public string? MaHom { get; set; }

    public string? MaTrangThaiTb { get; set; }

    public string? ViTri { get; set; }

    public int SoLuong { get; set; }

    public decimal? DonGia { get; set; }

    public decimal? ThanhTien { get; set; }

    public string? GhiChu { get; set; }

    public DateTime ThoiGianTao { get; set; }

    public DateTime? CapNhatMoiNhat { get; set; }

    public virtual ICollection<ChiTietDongBo> ChiTietDongBos { get; set; } = new List<ChiTietDongBo>();

    public virtual ICollection<ChiTietKiemKe> ChiTietKiemKes { get; set; } = new List<ChiTietKiemKe>();

    public virtual ICollection<CtdongBoTrongLenh> CtdongBoTrongLenhs { get; set; } = new List<CtdongBoTrongLenh>();

    public virtual CapChatLuong? MaCclNavigation { get; set; }

    public virtual Dvt? MaDvtNavigation { get; set; }

    public virtual HinhThucNiemCat? MaHinhThucNiemCatNavigation { get; set; }

    public virtual Hom? MaHomNavigation { get; set; }

    public virtual Kho? MaKhoNavigation { get; set; }

    public virtual KhoiHang? MaKhoiNavigation { get; set; }

    public virtual DinhKhu? MaKhuNavigation { get; set; }

    public virtual LoaiTbdb MaLoaiTbdbNavigation { get; set; } = null!;

    public virtual NhaKho? MaNhaKhoNavigation { get; set; }

    public virtual Nsx? MaNuocSxNavigation { get; set; }

    public virtual Tang? MaTangNavigation { get; set; }

    public virtual TinhTrangBaoGoi? MaTinhTrangBaoGoiNavigation { get; set; }

    public virtual TrangThaiTb? MaTrangThaiTbNavigation { get; set; }
}
