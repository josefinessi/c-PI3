using GestaoFerias.Application.DTOs;
using GestaoFerias.Application.Interfaces;
using GestaoFerias.Domain.Entities;
using GestaoFerias.Infrastructure.Data.Context;
using Microsoft.EntityFrameworkCore;

namespace GestaoFerias.Infrastructure.Services;

public class SetorService : ISetorService
{
    private readonly AppDbContext _context;

    public SetorService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<SetorResponse> Create(CreateSetorRequest request)
    {
        var nome = request.Nome.Trim();

        if (string.IsNullOrWhiteSpace(nome))
            throw new ArgumentException("Nome do setor é obrigatório.");

        var exists = await _context.Setores.AnyAsync(s => s.Nome.ToLower() == nome.ToLower());
        if (exists)
            throw new InvalidOperationException("Já existe um setor com esse nome.");

        var setor = new Setor
        {
            Id = Guid.NewGuid(),
            Nome = nome,
            LimiteFeriasSimultaneas = 1
        };

        _context.Setores.Add(setor);
        await _context.SaveChangesAsync();

        return new SetorResponse { Id = setor.Id, Nome = setor.Nome, LimiteFeriasSimultaneas = setor.LimiteFeriasSimultaneas };
    }

    public async Task<IEnumerable<SetorResponse>> GetAll()
        => await _context.Setores
            .AsNoTracking()
            .OrderBy(s => s.Nome)
            .Select(s => new SetorResponse { Id = s.Id, Nome = s.Nome, LimiteFeriasSimultaneas = s.LimiteFeriasSimultaneas })
            .ToListAsync();
            

    public async Task<SetorResponse> GetById(Guid id)
    {
        var setor = await _context.Setores.AsNoTracking().FirstOrDefaultAsync(s => s.Id == id)
            ?? throw new Exception("Setor não encontrado.");

        return new SetorResponse { Id = setor.Id, Nome = setor.Nome, LimiteFeriasSimultaneas = setor.LimiteFeriasSimultaneas };
    }

    public async Task<IEnumerable<SetorResponse>> SearchByNome(string nome)
    {
        nome = nome.Trim();

        if (string.IsNullOrWhiteSpace(nome))
            return Array.Empty<SetorResponse>();

        return await _context.Setores
            .AsNoTracking()
            .Where(s => EF.Functions.ILike(s.Nome, $"%{nome}%"))
            .OrderBy(s => s.Nome)
            .Select(s => new SetorResponse { Id = s.Id, Nome = s.Nome, LimiteFeriasSimultaneas = s.LimiteFeriasSimultaneas })
            .ToListAsync();
    }

    public async Task Update(Guid id, UpdateSetorRequest request)
    {
        var setor = await _context.Setores.FirstOrDefaultAsync(s => s.Id == id)
            ?? throw new Exception("Setor não encontrado.");

        var nome = request.Nome.Trim();
        if (string.IsNullOrWhiteSpace(nome))
            throw new ArgumentException("Nome do setor é obrigatório.");

        var exists = await _context.Setores.AnyAsync(s => s.Id != id && s.Nome.ToLower() == nome.ToLower());
        if (exists)
            throw new InvalidOperationException("Já existe um setor com esse nome.");

        setor.Nome = nome;
        await _context.SaveChangesAsync();
    }

    public async Task Delete(Guid id)
    {
        var setor = await _context.Setores.FirstOrDefaultAsync(s => s.Id == id)
            ?? throw new Exception("Setor não encontrado.");

        // Segurança: impedir deletar setor em uso
        var emUso = await _context.Usuarios.AnyAsync(u => u.SetorId == id);
        if (emUso)
            throw new InvalidOperationException("Não é possível excluir: setor está vinculado a usuários.");

        _context.Setores.Remove(setor);
        await _context.SaveChangesAsync();
    }
    public async Task UpdateLimiteFerias(Guid id, UpdateLimiteFeriasRequest request)
{
    if (request.LimiteFeriasSimultaneas < 1)
        throw new ArgumentException("LimiteFeriasSimultaneas deve ser >= 1.");

    var setor = await _context.Setores.FirstOrDefaultAsync(s => s.Id == id)
        ?? throw new Exception("Setor não encontrado.");

    setor.LimiteFeriasSimultaneas = request.LimiteFeriasSimultaneas;

    await _context.SaveChangesAsync();
}
}