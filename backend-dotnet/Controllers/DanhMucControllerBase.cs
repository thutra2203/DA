using System.Text.Json;
using backend_dotnet.Models;
using backend_dotnet.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata;

namespace backend_dotnet.Controllers;

// Controller CRUD chung cho các bảng "danh mục" — tương đương factory createCRUD()
// trong backend/src/controllers/danhMucController.js (Node). JSON trả về dùng
// Dictionary<string, object?> với key = đúng tên cột DB (camelCase) để khớp 100%
// với response hiện tại của backend Node, không cần DTO riêng cho từng bảng.
[ApiController]
[Authorize]
public abstract class DanhMucControllerBase<TEntity> : ControllerBase where TEntity : class, new()
{
    private readonly QuanLyKhoQuanKhiContext _db;
    private readonly IActivityLogger _log;
    private readonly IEntityType _entityType;
    private readonly IProperty _pk;

    protected abstract string TableLabel { get; }

    protected DanhMucControllerBase(QuanLyKhoQuanKhiContext db, IActivityLogger log)
    {
        _db = db;
        _log = log;
        _entityType = db.Model.FindEntityType(typeof(TEntity))
            ?? throw new InvalidOperationException($"Khong tim thay entity type {typeof(TEntity).Name}");
        _pk = _entityType.FindPrimaryKey()!.Properties[0];
    }

    private Dictionary<string, object?> ToDict(TEntity entity)
    {
        var dict = new Dictionary<string, object?>();
        foreach (var prop in _entityType.GetProperties())
        {
            dict[prop.GetColumnName()] = prop.PropertyInfo?.GetValue(entity);
        }
        return dict;
    }

    private object? ConvertPk(string raw)
        => _pk.ClrType == typeof(int) ? int.Parse(raw)
         : _pk.ClrType == typeof(long) ? long.Parse(raw)
         : raw;

    private static object? ConvertJson(JsonElement el, Type targetType)
    {
        if (el.ValueKind is JsonValueKind.Null or JsonValueKind.Undefined) return null;
        var t = Nullable.GetUnderlyingType(targetType) ?? targetType;

        if (t == typeof(string)) return el.ValueKind == JsonValueKind.String ? el.GetString() : el.GetRawText();
        if (t == typeof(int)) return el.ValueKind == JsonValueKind.String ? int.Parse(el.GetString()!) : el.GetInt32();
        if (t == typeof(double)) return el.ValueKind == JsonValueKind.String ? double.Parse(el.GetString()!) : el.GetDouble();
        if (t == typeof(decimal)) return el.ValueKind == JsonValueKind.String ? decimal.Parse(el.GetString()!) : el.GetDecimal();
        if (t == typeof(bool)) return el.GetBoolean();
        if (t == typeof(DateOnly)) return DateOnly.Parse(el.GetString()!);
        if (t == typeof(DateTime)) return el.GetDateTime();
        return el.GetRawText();
    }

    private void ApplyBody(TEntity entity, JsonElement body, bool skipPk)
    {
        foreach (var prop in _entityType.GetProperties())
        {
            if (skipPk && prop == _pk) continue;
            var col = prop.GetColumnName();
            if (body.TryGetProperty(col, out var val) && prop.PropertyInfo != null)
            {
                prop.PropertyInfo.SetValue(entity, ConvertJson(val, prop.ClrType));
            }
        }
    }

    // Hook cho phép controller con giới hạn dữ liệu trả về (ví dụ KhoController giới hạn theo
    // kho của người dùng đang đăng nhập) mà không cần override lại toàn bộ GetAll/ToDict.
    protected virtual IQueryable<TEntity> ApplyScope(IQueryable<TEntity> query) => query;

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var list = await ApplyScope(_db.Set<TEntity>()).ToListAsync();
        IEnumerable<TEntity> ordered = _pk.ClrType == typeof(int)
            ? list.OrderBy(e => (int)_pk.PropertyInfo!.GetValue(e)!)
            : _pk.ClrType == typeof(long)
                ? list.OrderBy(e => (long)_pk.PropertyInfo!.GetValue(e)!)
                : list.OrderBy(e => (string)_pk.PropertyInfo!.GetValue(e)!, StringComparer.Ordinal);
        return Ok(ordered.Select(ToDict));
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] JsonElement body)
    {
        var entity = new TEntity();
        ApplyBody(entity, body, skipPk: false);
        _db.Set<TEntity>().Add(entity);

        try
        {
            await _db.SaveChangesAsync();
        }
        catch (DbUpdateException ex)
        {
            return BadRequest(new { message = DbErrorTranslator.Translate(ex) });
        }

        var pkValue = _pk.PropertyInfo?.GetValue(entity);
        await _log.LogAsync(this.CurrentUserId(), this.CurrentUsername(), "THEM", typeof(TEntity).Name, pkValue?.ToString(),
            $"Thêm mới \"{pkValue}\" vào {TableLabel}");

        return StatusCode(201, new { message = "Thêm mới thành công" });
    }

    // Hook cho phép controller con chặn sửa/xóa bản ghi ngoài phạm vi được phép (ví dụ
    // TbDongBoTonKhoController chặn sửa/xóa tồn kho của kho khác).
    protected virtual bool DuocPhepSuaXoa(TEntity entity) => true;

    [HttpPut("{id}")]
    public virtual async Task<IActionResult> Update(string id, [FromBody] JsonElement body)
    {
        var entity = await _db.Set<TEntity>().FindAsync(ConvertPk(id));
        if (entity == null) return NotFound(new { message = "Không tìm thấy bản ghi" });
        if (!DuocPhepSuaXoa(entity)) return NotFound(new { message = "Không tìm thấy bản ghi" });

        ApplyBody(entity, body, skipPk: true);

        try
        {
            await _db.SaveChangesAsync();
        }
        catch (DbUpdateException ex)
        {
            return BadRequest(new { message = DbErrorTranslator.Translate(ex) });
        }

        await _log.LogAsync(this.CurrentUserId(), this.CurrentUsername(), "SUA", typeof(TEntity).Name, id,
            $"Cập nhật \"{id}\" trong {TableLabel}");

        return Ok(new { message = "Cập nhật thành công" });
    }

    [HttpDelete("{id}")]
    public virtual async Task<IActionResult> Remove(string id)
    {
        var entity = await _db.Set<TEntity>().FindAsync(ConvertPk(id));
        if (entity == null) return NotFound(new { message = "Không tìm thấy bản ghi" });
        if (!DuocPhepSuaXoa(entity)) return NotFound(new { message = "Không tìm thấy bản ghi" });

        _db.Set<TEntity>().Remove(entity);

        try
        {
            await _db.SaveChangesAsync();
        }
        catch (DbUpdateException ex)
        {
            return BadRequest(new { message = DbErrorTranslator.Translate(ex) });
        }

        await _log.LogAsync(this.CurrentUserId(), this.CurrentUsername(), "XOA", typeof(TEntity).Name, id,
            $"Xóa bản ghi \"{id}\" trong {TableLabel}");

        return Ok(new { message = "Xóa thành công" });
    }
}
