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

        if (nova > 9999999)
            throw new InvalidOperationException("Limite de matrículas atingido.");

        return nova.ToString("D4");
    }

    private static UserRole ParseRole(string role) => role.ToLower() switch
    {
        "admin"        => UserRole.Admin,
        "chefia"       => UserRole.Chefia,
        "gestor"       => UserRole.Chefia,       // backward compat
        "funcionario"  => UserRole.Funcionario,
        "colaborador"  => UserRole.Funcionario,   // backward compat
        _ => throw new Exception($"Cargo inválido: '{role}'. Use Admin, Chefia ou Funcionario.")
    };

    public async Task<(string Matricula, string Token)> Register(RegisterRequest request)
    {
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

        var matricula = await GerarMatriculaAsync();

        var usuario = new Usuario
        {
            Id = Guid.NewGuid(),
            Matricula = matricula,
            Nome = request.Nome,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Senha),
            Role = ParseRole(request.Role),
            SetorId = setorId
        };

        try
        {
            _context.Usuarios.Add(usuario);
            await _context.SaveChangesAsync();
        }
        catch (DbUpdateException ex) when (ex.InnerException is PostgresException pg && pg.SqlState == "23505")
        {
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
            throw new Exception("Dados incorretos. Tente novamente.");

        return _tokenService.GenerateToken(usuario);
    }
}
