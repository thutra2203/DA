using backend_dotnet.Models;
using backend_dotnet.Services;

namespace backend_dotnet.Controllers;

// 22 controller con — mỗi cái chỉ khai báo route + nhãn tiếng Việt cho nhật ký,
// toàn bộ logic CRUD nằm ở DanhMucControllerBase<TEntity>.

[Microsoft.AspNetCore.Mvc.Route("api/danh-muc/nhom-spkt")]
public class NhomSpktController(QuanLyKhoQuanKhiContext db, IActivityLogger log) : DanhMucControllerBase<NhomSpkt>(db, log)
{ protected override string TableLabel => "Nhóm SPKT"; }

[Microsoft.AspNetCore.Mvc.Route("api/danh-muc/dvt")]
public class DvtController(QuanLyKhoQuanKhiContext db, IActivityLogger log) : DanhMucControllerBase<Dvt>(db, log)
{ protected override string TableLabel => "Đơn vị tính"; }

[Microsoft.AspNetCore.Mvc.Route("api/danh-muc/nsx")]
public class NsxController(QuanLyKhoQuanKhiContext db, IActivityLogger log) : DanhMucControllerBase<Nsx>(db, log)
{ protected override string TableLabel => "Nước sản xuất"; }

[Microsoft.AspNetCore.Mvc.Route("api/danh-muc/httt")]
public class HtttController(QuanLyKhoQuanKhiContext db, IActivityLogger log) : DanhMucControllerBase<Httt>(db, log)
{ protected override string TableLabel => "Hình thức thanh toán"; }

[Microsoft.AspNetCore.Mvc.Route("api/danh-muc/ht-van-chuyen")]
public class HtvanChuyenController(QuanLyKhoQuanKhiContext db, IActivityLogger log) : DanhMucControllerBase<HtvanChuyen>(db, log)
{ protected override string TableLabel => "Hình thức vận chuyển"; }

[Microsoft.AspNetCore.Mvc.Route("api/danh-muc/loai-tbdb")]
public class LoaiTbdbController(QuanLyKhoQuanKhiContext db, IActivityLogger log) : DanhMucControllerBase<LoaiTbdb>(db, log)
{ protected override string TableLabel => "Loại trang bị đồng bộ"; }

[Microsoft.AspNetCore.Mvc.Route("api/danh-muc/cap-chat-luong")]
public class CapChatLuongController(QuanLyKhoQuanKhiContext db, IActivityLogger log) : DanhMucControllerBase<CapChatLuong>(db, log)
{ protected override string TableLabel => "Cấp chất lượng"; }

[Microsoft.AspNetCore.Mvc.Route("api/danh-muc/hinh-thuc-niem-cat")]
public class HinhThucNiemCatController(QuanLyKhoQuanKhiContext db, IActivityLogger log) : DanhMucControllerBase<HinhThucNiemCat>(db, log)
{ protected override string TableLabel => "Hình thức niêm cất"; }

[Microsoft.AspNetCore.Mvc.Route("api/danh-muc/tinh-trang-bao-goi")]
public class TinhTrangBaoGoiController(QuanLyKhoQuanKhiContext db, IActivityLogger log) : DanhMucControllerBase<TinhTrangBaoGoi>(db, log)
{ protected override string TableLabel => "Tình trạng bao gói"; }

[Microsoft.AspNetCore.Mvc.Route("api/danh-muc/trang-thai-tb")]
public class TrangThaiTbController(QuanLyKhoQuanKhiContext db, IActivityLogger log) : DanhMucControllerBase<TrangThaiTb>(db, log)
{ protected override string TableLabel => "Trạng thái trang bị"; }

[Microsoft.AspNetCore.Mvc.Route("api/danh-muc/cap-bac")]
public class CapBacController(QuanLyKhoQuanKhiContext db, IActivityLogger log) : DanhMucControllerBase<CapBac>(db, log)
{ protected override string TableLabel => "Cấp bậc"; }

[Microsoft.AspNetCore.Mvc.Route("api/danh-muc/chuc-vu")]
public class ChucVuController(QuanLyKhoQuanKhiContext db, IActivityLogger log) : DanhMucControllerBase<ChucVu>(db, log)
{ protected override string TableLabel => "Chức vụ"; }

[Microsoft.AspNetCore.Mvc.Route("api/danh-muc/tinh")]
public class TinhController(QuanLyKhoQuanKhiContext db, IActivityLogger log) : DanhMucControllerBase<Tinh>(db, log)
{ protected override string TableLabel => "Tỉnh"; }

[Microsoft.AspNetCore.Mvc.Route("api/danh-muc/loai-kho")]
public class LoaiKhoController(QuanLyKhoQuanKhiContext db, IActivityLogger log) : DanhMucControllerBase<LoaiKho>(db, log)
{ protected override string TableLabel => "Loại kho"; }

[Microsoft.AspNetCore.Mvc.Route("api/danh-muc/cap-quan-ly")]
public class CapQuanLyController(QuanLyKhoQuanKhiContext db, IActivityLogger log) : DanhMucControllerBase<CapQuanLy>(db, log)
{ protected override string TableLabel => "Cấp quản lý"; }

[Microsoft.AspNetCore.Mvc.Route("api/danh-muc/tinh-chat-nhap-xuat")]
public class TinhChatNhapXuatController(QuanLyKhoQuanKhiContext db, IActivityLogger log) : DanhMucControllerBase<TinhChatNhapXuat>(db, log)
{ protected override string TableLabel => "Tính chất nhập xuất"; }

[Microsoft.AspNetCore.Mvc.Route("api/danh-muc/kieu-spkt")]
public class KieuSpktController(QuanLyKhoQuanKhiContext db, IActivityLogger log) : DanhMucControllerBase<KieuSpkt>(db, log)
{ protected override string TableLabel => "Kiểu SPKT"; }

[Microsoft.AspNetCore.Mvc.Route("api/danh-muc/hang-sx")]
public class HangSxController(QuanLyKhoQuanKhiContext db, IActivityLogger log) : DanhMucControllerBase<HangSx>(db, log)
{ protected override string TableLabel => "Hãng sản xuất"; }

[Microsoft.AspNetCore.Mvc.Route("api/danh-muc/ncc")]
public class NccController(QuanLyKhoQuanKhiContext db, IActivityLogger log) : DanhMucControllerBase<Ncc>(db, log)
{ protected override string TableLabel => "Nhà cung cấp"; }

[Microsoft.AspNetCore.Mvc.Route("api/danh-muc/xa")]
public class XaController(QuanLyKhoQuanKhiContext db, IActivityLogger log) : DanhMucControllerBase<Xa>(db, log)
{ protected override string TableLabel => "Xã"; }

[Microsoft.AspNetCore.Mvc.Route("api/danh-muc/kho")]
public class KhoController(QuanLyKhoQuanKhiContext db, IActivityLogger log) : DanhMucControllerBase<Kho>(db, log)
{
    protected override string TableLabel => "Kho";

    // Người dùng bị giới hạn theo kho chỉ thấy đúng kho của mình trong mọi dropdown "chọn kho".
    protected override IQueryable<Kho> ApplyScope(IQueryable<Kho> query)
        => this.IsGioiHanKho() ? query.Where(k => k.MaKho == this.CurrentMaKho()) : query;

    protected override bool DuocPhepSuaXoa(Kho entity)
        => !this.IsGioiHanKho() || entity.MaKho == this.CurrentMaKho();
}

[Microsoft.AspNetCore.Mvc.Route("api/danh-muc/loai-spkt")]
public class LoaiSpktController(QuanLyKhoQuanKhiContext db, IActivityLogger log) : DanhMucControllerBase<LoaiSpkt>(db, log)
{ protected override string TableLabel => "Loại SPKT"; }

[Microsoft.AspNetCore.Mvc.Route("api/danh-muc/chi-tiet-tcnx")]
public class ChiTietTcnxController(QuanLyKhoQuanKhiContext db, IActivityLogger log) : DanhMucControllerBase<ChiTietTcnx>(db, log)
{ protected override string TableLabel => "Chi tiết tính chất nhập xuất"; }

[Microsoft.AspNetCore.Mvc.Route("api/danh-muc/dot-kiem-ke")]
public class DotKiemKeController(QuanLyKhoQuanKhiContext db, IActivityLogger log) : DanhMucControllerBase<DotKiemKe>(db, log)
{ protected override string TableLabel => "Đợt kiểm kê"; }
