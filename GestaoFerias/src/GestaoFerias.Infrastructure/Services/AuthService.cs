using GestaoFerias.Application.DTOs;
using GestaoFerias.Application.Interfaces;
using GestaoFerias.Domain.Entities;
using GestaoFerias.Domain.Enums;
using Npgsql;
using GestaoFerias.Infrastructure.Auth;
using GestaoFerias.Infrastructure.Data.Context;
using Microsoft.EntityFrameworkCore;

namespace GestaoFerias.Infrastructure.Services;

public class AuthService : IAuthService
{
    private readonly AppDbContext _context;
    private readonly TokenService _tokenService;

    public AuthService(AppDbContext context, TokenService tokenService)
    {
        _context = context;
        _tokenService = tokenService;
    }

private async Task<string> GerarMatriculaAsync()
{
    var matriculas = await _context.Usuarios
        .AsNoTracking()
        .Select(u => u.Matricula)
        .ToListAsync();

    var max = matriculas
        .Select(m => int.TryParse(m, out var n) ? n : 0)
        .DefaultIfEmpty(0)
        .Max();

    var nova = max + 1;

    if (nova > 9999)
        throw new InvalidOperationException("Limite de matrículas atingido.");

    return nova.ToString("D4");
}

public async Task<(string Matricula, string Token)> Register(RegisterRequest request)
{
    // 1) resolve SetorId por nome (ou usa "Sem Setor")
    var defaultSetorId = new Guid("11111111-1111-1111-1111-111111111111");

    Guid setorId = defaultSetorId;

    if (!string.IsNullOrWhiteSpace(request.SetorNome))
    {
        var setor = await _context.Setores
            .AsNoTracking()
            .FirstOrDefaultAsync(s => s.Nome.ToLower() == request.SetorNome.ToLower());

        if (setor == null)
            throw new Exception($"Setor '{request.SetorNome}' não encontrado.");

        setorId = setor.Id;
    }

    // 2) gera matrícula
    var matricula = await GerarMatriculaAsync();

    // 3) cria usuário
    var usuario = new Usuario
    {
        Id = Guid.NewGuid(),
        Matricula = matricula,
        Nome = request.Nome,
        PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Senha),
        Role = Enum.Parse<UserRole>(request.Role, true),
        SetorId = setorId
    };

    try
    {
        _context.Usuarios.Add(usuario);
        await _context.SaveChangesAsync();
    }
    catch (DbUpdateException ex) when (ex.InnerException is PostgresException pg && pg.SqlState == "23505")
    {
        // 23505 = unique violation (matricula duplicada, etc.)
        throw new Exception("Conflito ao salvar usuário (dados duplicados). Tente novamente.");
    }

    var token = _tokenService.GenerateToken(usuario);
    return (usuario.Matricula, token);
}

    public async Task<string> Login(LoginRequest request)
    {
        var usuario = await _context.Usuarios
            .FirstOrDefaultAsync(u => u.Matricula == request.Matricula);

        if (usuario == null || !BCrypt.Net.BCrypt.Verify(request.Senha, usuario.PasswordHash))
            throw new Exception("Credenciais inválidas.");

        return _tokenService.GenerateToken(usuario);
    }
//     private async Task<Guid> ResolverSetorIdAsync(RegisterRequest request)
// {
//     // 1) Preferir SetorId se veio
//     if (request.SetorId.HasValue && request.SetorId.Value != Guid.Empty)
//         return request.SetorId.Value;

//     // 2) Se vier SetorNome, buscar no banco
//     if (!string.IsNullOrWhiteSpace(request.SetorNome))
//     {
//         var nome = request.SetorNome.Trim();

//         var setor = await _context.Setores
//             .AsNoTracking()
//             .FirstOrDefaultAsync(s => s.Nome.ToLower() == nome.ToLower());

//         if (setor is null)
//             throw new Exception($"Setor '{nome}' não encontrado.");

//         return setor.Id;
//     }

//     // 3) Fallback: Sem Setor
//     return new Guid("11111111-1111-1111-1111-111111111111");
// }
}