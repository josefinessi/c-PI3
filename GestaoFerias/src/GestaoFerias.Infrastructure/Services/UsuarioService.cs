using GestaoFerias.Application.DTOs;
using GestaoFerias.Application.Interfaces;
using GestaoFerias.Domain.Entities;
using GestaoFerias.Domain.Enums;
using GestaoFerias.Infrastructure.Auth;
using GestaoFerias.Infrastructure.Data.Context;
using Microsoft.EntityFrameworkCore;

namespace GestaoFerias.Infrastructure.Services;

public class UsuarioService : IUsuarioService
{
    private readonly AppDbContext _context;

    public UsuarioService(AppDbContext context)
    {
        _context = context;
    }

    private async Task<string> GerarMatriculaAsync()
    {
        var ultima = await _context.Usuarios
            .OrderByDescending(u => u.Matricula)
            .Select(u => u.Matricula)
            .FirstOrDefaultAsync();

        int nova = string.IsNullOrEmpty(ultima) ? 1 : int.Parse(ultima) + 1;

        if (nova > 9999)
            throw new Exception("Limite de matrículas atingido.");

        return nova.ToString("D4");
    }

    public async Task<IEnumerable<UserResponse>> GetAll()
    => await _context.Usuarios
        .AsNoTracking()
        .Include(u => u.Setor)
        .Select(u => new UserResponse
        {
            Id = u.Id,
            Matricula = u.Matricula,
            Nome = u.Nome,
            Role = u.Role.ToString(),
            SetorId = u.SetorId,
            SetorNome = u.Setor.Nome
        })
        .ToListAsync();

    public async Task<UserResponse> GetById(Guid id)
{
    var usuario = await _context.Usuarios
        .AsNoTracking()
        .Include(u => u.Setor)
        .FirstOrDefaultAsync(u => u.Id == id)
        ?? throw new Exception("Usuário não encontrado.");

    return new UserResponse
    {
        Id = usuario.Id,
        Matricula = usuario.Matricula,
        Nome = usuario.Nome,
        Role = usuario.Role.ToString(),
        SetorId = usuario.SetorId,
        SetorNome = usuario.Setor.Nome
    };
}

public async Task<UserResponse> GetByMatricula(string matricula)
{
    var usuario = await _context.Usuarios
        .AsNoTracking()
        .Include(u => u.Setor)
        .FirstOrDefaultAsync(u => u.Matricula == matricula)
        ?? throw new Exception("Usuário não encontrado.");

    return new UserResponse
    {
        Id = usuario.Id,
        Matricula = usuario.Matricula,
        Nome = usuario.Nome,
        Role = usuario.Role.ToString(),
        SetorId = usuario.SetorId,
        SetorNome = usuario.Setor.Nome
    };
}

public async Task<IEnumerable<UserResponse>> GetByNome(string nome)
{
    return await _context.Usuarios
        .AsNoTracking()
        .Include(u => u.Setor)
        .Where(u => EF.Functions.ILike(u.Nome, $"%{nome}%"))
        .Select(u => new UserResponse
        {
            Id = u.Id,
            Matricula = u.Matricula,
            Nome = u.Nome,
            Role = u.Role.ToString(),
            SetorId = u.SetorId,
            SetorNome = u.Setor.Nome
        })
        .ToListAsync();
}



private static readonly Guid DefaultSetorId = new("11111111-1111-1111-1111-111111111111");

private async Task<Guid> ResolverSetorIdPorNomeAsync(string? setorNome)
{
    if (string.IsNullOrWhiteSpace(setorNome))
        return DefaultSetorId;

    var nome = setorNome.Trim();

    var setor = await _context.Setores
        .AsNoTracking()
        .FirstOrDefaultAsync(s => s.Nome.ToLower() == nome.ToLower());

    if (setor is null)
        throw new Exception($"Setor '{nome}' não encontrado.");

    return setor.Id;
}

private static UserRole? TryParseRole(string? role)
{
    if (string.IsNullOrWhiteSpace(role))
        return null;

    var raw = role.Trim();

    // Swagger placeholder / lixo comum
    if (raw.Equals("string", StringComparison.OrdinalIgnoreCase))
        return null;

    // aceita "0"/"1"
    if (int.TryParse(raw, out var n) && Enum.IsDefined(typeof(UserRole), n))
        return (UserRole)n;

    // aceita "Gestor", "Colaborador", etc.
    if (Enum.TryParse<UserRole>(raw, true, out var parsed))
        return parsed;

    return null; // inválido de verdade
}

public async Task Update(Guid id, UpdateUserRequest request)
{
    var usuario = await _context.Usuarios
        .FirstOrDefaultAsync(u => u.Id == id)
        ?? throw new Exception("Usuário não encontrado.");

    // Nome (opcional)
    if (!string.IsNullOrWhiteSpace(request.Nome))
        usuario.Nome = request.Nome.Trim();

    // Role (opcional)
    if (!string.IsNullOrWhiteSpace(request.Role))
{
    var parsed = TryParseRole(request.Role);

    // se role veio mas era lixo tipo "string", apenas ignora
    if (parsed is null && !request.Role.Trim().Equals("string", StringComparison.OrdinalIgnoreCase))
        throw new Exception("Role inválida.");

    if (parsed is not null)
        usuario.Role = parsed.Value;
}

    // Senha (opcional)
    if (!string.IsNullOrWhiteSpace(request.Senha))
        usuario.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Senha);

    // Setor (opcional) — muda pelo nome
    if (request.SetorNome is not null) // se veio no JSON, mesmo vazio, decide
        usuario.SetorId = await ResolverSetorIdPorNomeAsync(request.SetorNome);

    await _context.SaveChangesAsync();
}

public async Task UpdateByMatricula(string matricula, UpdateUserRequest request)
{
    var usuario = await _context.Usuarios
        .FirstOrDefaultAsync(u => u.Matricula == matricula)
        ?? throw new Exception("Usuário não encontrado.");

    if (!string.IsNullOrWhiteSpace(request.Nome))
        usuario.Nome = request.Nome.Trim();

if (!string.IsNullOrWhiteSpace(request.Role))
{
    var parsed = TryParseRole(request.Role);

    // se role veio mas era lixo tipo "string", apenas ignora
    if (parsed is null && !request.Role.Trim().Equals("string", StringComparison.OrdinalIgnoreCase))
        throw new Exception("Role inválida.");

    if (parsed is not null)
        usuario.Role = parsed.Value;
}
    if (!string.IsNullOrWhiteSpace(request.Senha))
        usuario.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Senha);

    if (request.SetorNome is not null)
        usuario.SetorId = await ResolverSetorIdPorNomeAsync(request.SetorNome);

    await _context.SaveChangesAsync();
}

    public async Task Delete(Guid id)
    {
        var usuario = await _context.Usuarios.FindAsync(id)
            ?? throw new Exception("Usuário não encontrado.");

        _context.Usuarios.Remove(usuario);
        await _context.SaveChangesAsync();
    }
    public async Task DeleteByMatricula(string matricula)
{
    var usuario = await _context.Usuarios
        .FirstOrDefaultAsync(u => u.Matricula == matricula)
        ?? throw new Exception("Usuário não encontrado.");

    _context.Usuarios.Remove(usuario);
    await _context.SaveChangesAsync();
}

}
