// Ánh xạ đường dẫn -> quyền cần có, khớp bảng ChucNang ở backend.
// Dùng cho: lọc menu (MainLayout) và chặn truy cập trang (PermGate).
//
// Mỗi rule: [tiền tố, [danh sách module chấp nhận], hành động]. Khớp tiền tố DÀI NHẤT trước.
// Trang được phép vào nếu vai trò có <hành động> ở ÍT NHẤT MỘT module trong danh sách.
// Trang "tạo lệnh…" -> quyền THÊM ở module *_LAP; trang xử lý/danh sách -> quyền XEM.
const RULES = [
  ['/dashboard',                             [['TONG_QUAN']],                        'xem'],
  ['/spkt',                                  [['SPKT']],                             'xem'],

  ['/tb-dong-bo/ho-so',                      [['TBDB_HOSO']],                        'xem'],

  ['/tb-dong-bo/tao-lenh-nhap-xuat',         [['TBDB_LENH_LAP']],                    'them'],
  ['/tb-dong-bo/cap-nhat-lenh-nhap-xuat',    [['TBDB_LENH_XL']],                     'xem'],
  ['/tb-dong-bo/doi-chieu-lenh',             [['TBDB_LENH_XL']],                     'xem'],
  ['/tb-dong-bo/huy-thanh-ly/tao-lenh',      [['TBDB_HUY_LAP']],                     'them'],
  ['/tb-dong-bo/huy-thanh-ly/cap-nhat',      [['TBDB_HUY_XL']],                      'xem'],
  ['/tb-dong-bo/huy-thanh-ly',               [['TBDB_HUY_LAP', 'TBDB_HUY_XL']]],

  // Tồn đầu & Kiểm kê chỉ có 1 trang gộp cả lập lẫn xử lý -> vào được nếu có 1 trong 2.
  ['/tb-dong-bo/ton-dau',                    [['TBDB_TON_DAU_LAP', 'TBDB_TON_DAU_XL']]], // action mặc định 'xem'
  ['/tb-dong-bo/kiem-ke',                    [['TBDB_KIEM_KE_LAP', 'TBDB_KIEM_KE_XL']]],
  ['/tb-dong-bo/chuyen-ky',                  [['TBDB_KIEM_KE_XL']],                  'xem'],

  ['/tb-dong-bo/chuyen-cap/tao-lenh',        [['TBDB_CCL_LAP']],                     'them'],
  ['/tb-dong-bo/chuyen-cap',                 [['TBDB_CCL_XL']],                      'xem'],

  ['/tb-dong-bo/thay-doi-vi-tri/tao-lenh',   [['TBDB_VT_LAP']],                      'them'],
  ['/tb-dong-bo/thay-doi-vi-tri',            [['TBDB_VT_XL']],                       'xem'],

  ['/tb-dong-bo/thay-doi-htnc/tao-lenh',     [['TBDB_HTNC_LAP']],                    'them'],
  ['/tb-dong-bo/thay-doi-htnc',              [['TBDB_HTNC_XL']],                     'xem'],

  ['/tb-dong-bo/dong-doi-lo',                [['TBDB_DONG_DOI_LO']],                 'xem'],

  ['/bao-cao',                               [['BAO_CAO']],                          'xem'],
  ['/danh-muc',                              [['DANH_MUC']],                         'xem'],

  ['/users',                                 [['HT_NGUOI_DUNG']],                    'xem'],
  ['/vai-tro',                               [['HT_VAI_TRO']],                       'xem'],
  ['/phan-quyen',                            [['HT_PHAN_QUYEN']],                    'xem'],
  ['/nhat-ky',                               [['HT_NHAT_KY']],                       'xem'],
].map(([p, mods, action]) => [p, mods[0], action || 'xem'])
  .sort((a, b) => b[0].length - a[0].length);

function match(path) {
  if (!path) return null;
  return RULES.find(([p]) => path === p || path.startsWith(p + '/')) || null;
}

// Danh sách module (nhóm chức năng) mà 1 đường dẫn thuộc về — cho việc lọc menu.
export function modulesOfPath(path) {
  const hit = match(path);
  return hit ? hit[1] : null;   // string[] hoặc null
}

// Quyền cần để vào trang: { modules: string[], action } hoặc null nếu không ràng buộc.
export function routePermOfPath(path) {
  const hit = match(path);
  return hit ? { modules: hit[1], action: hit[2] } : null;
}
