using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;

namespace backend_dotnet.Services;

// Tương đương friendlyDbError trong backend/src/controllers/danhMucController.js.
public static class DbErrorTranslator
{
    public static string Translate(DbUpdateException ex)
    {
        if (ex.InnerException is SqlException sqlEx)
        {
            if (sqlEx.Number is 2627 or 2601) return "Mã đã tồn tại";
            if (sqlEx.Number == 547) return "Giá trị tham chiếu không hợp lệ hoặc bản ghi đang được sử dụng ở nơi khác";
        }
        return ex.InnerException?.Message ?? ex.Message;
    }
}
