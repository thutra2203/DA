namespace backend_dotnet.Services.Rbac;

// Mã các nhóm chức năng (module) dùng cho phân quyền. Là nguồn sự thật duy nhất — RbacSeeder nạp
// đúng danh sách này vào bảng ChucNang, controller tham chiếu bằng hằng, frontend lấy qua API.
//
// Với các nghiệp vụ TBĐB có 2 bước (lập lệnh -> xử lý/thực hiện), quyền được tách đôi:
//   *_LAP : lập/sửa/xóa BẢN THÂN lệnh (header) — vai trò "người lập lệnh".
//   *_XL  : thao tác trên nội dung lệnh (thêm/sửa/xóa dòng) + kết thúc/thực hiện — vai trò "người xử lý".
public static class Cn
{
    public const string TongQuan        = "TONG_QUAN";
    public const string Spkt            = "SPKT";
    public const string TbdbHoSo        = "TBDB_HOSO";

    public const string TbdbLenhLap     = "TBDB_LENH_LAP";
    public const string TbdbLenhXl      = "TBDB_LENH_XL";
    public const string TbdbHuyLap      = "TBDB_HUY_LAP";
    public const string TbdbHuyXl       = "TBDB_HUY_XL";
    public const string TbdbTonDauLap   = "TBDB_TON_DAU_LAP";
    public const string TbdbTonDauXl    = "TBDB_TON_DAU_XL";
    public const string TbdbKiemKeLap   = "TBDB_KIEM_KE_LAP";
    public const string TbdbKiemKeXl    = "TBDB_KIEM_KE_XL";
    public const string TbdbCclLap      = "TBDB_CCL_LAP";
    public const string TbdbCclXl       = "TBDB_CCL_XL";
    public const string TbdbVtLap       = "TBDB_VT_LAP";
    public const string TbdbVtXl        = "TBDB_VT_XL";
    public const string TbdbHtncLap     = "TBDB_HTNC_LAP";
    public const string TbdbHtncXl      = "TBDB_HTNC_XL";
    public const string TbdbDongDoiLo   = "TBDB_DONG_DOI_LO";

    public const string BaoCao          = "BAO_CAO";
    public const string DanhMuc         = "DANH_MUC";
    public const string HtNguoiDung     = "HT_NGUOI_DUNG";
    public const string HtVaiTro        = "HT_VAI_TRO";
    public const string HtPhanQuyen     = "HT_PHAN_QUYEN";
    public const string HtNhatKy        = "HT_NHAT_KY";

    // Danh sách hiển thị (theo đúng thứ tự này trên màn hình Phân quyền).
    public static readonly (string Ma, string Ten)[] DanhSach =
    [
        (TongQuan,       "Tổng quan"),
        (Spkt,           "Quản lý SPKT"),
        (TbdbHoSo,       "Hồ sơ trang bị đồng bộ"),
        (TbdbLenhLap,    "Lập lệnh nhập / xuất"),
        (TbdbLenhXl,     "Xử lý lệnh nhập / xuất"),
        (TbdbHuyLap,     "Lập lệnh hủy / thanh lý"),
        (TbdbHuyXl,      "Xử lý lệnh hủy / thanh lý"),
        (TbdbTonDauLap,  "Lập lệnh tồn đầu kỳ"),
        (TbdbTonDauXl,   "Xử lý tồn đầu kỳ"),
        (TbdbKiemKeLap,  "Lập phiếu kiểm kê"),
        (TbdbKiemKeXl,   "Xử lý kiểm kê & chuyển kỳ"),
        (TbdbCclLap,     "Lập lệnh chuyển cấp chất lượng"),
        (TbdbCclXl,      "Xử lý chuyển cấp chất lượng"),
        (TbdbVtLap,      "Lập lệnh thay đổi vị trí"),
        (TbdbVtXl,       "Xử lý thay đổi vị trí"),
        (TbdbHtncLap,    "Lập lệnh thay đổi hình thức niêm cất"),
        (TbdbHtncXl,     "Xử lý thay đổi hình thức niêm cất"),
        (TbdbDongDoiLo,  "Dòng đời lô (đồ thị)"),
        (BaoCao,         "Tổng hợp, báo cáo"),
        (DanhMuc,        "Quản lý danh mục"),
        (HtNguoiDung,    "Quản lý người dùng"),
        (HtVaiTro,       "Quản lý vai trò"),
        (HtPhanQuyen,    "Phân quyền"),
        (HtNhatKy,       "Nhật ký hoạt động"),
    ];
}

public static class QuyenCodes
{
    public const string Xem = "XEM";
    public const string Them = "THEM";
    public const string Sua = "SUA";
    public const string Xoa = "XOA";

    public static readonly (string Ma, string Ten)[] DanhSach =
    [
        (Xem,  "Xem / truy cập"),
        (Them, "Thêm mới"),
        (Sua,  "Sửa / cập nhật"),
        (Xoa,  "Xóa"),
    ];
}
