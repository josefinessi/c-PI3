using GestaoFerias.Application.DTOs;
using GestaoFerias.Application.Interfaces;
using GestaoFerias.Domain.Entities;
using GestaoFerias.Domain.Enums;
using GestaoFerias.Infrastructure.Data.Context;
using Microsoft.EntityFrameworkCore;

namespace GestaoFerias.Infrastructure.Services;

public class FeriasService : IFeriasService
{
    private readonly AppDbContext _context;

    public FeriasService(AppDbContext context)
    {
        _context = context;
    }

    private static int DiasCorridos(DateOnly inicio, DateOnly fim)
        => fim.DayNumber - inicio.DayNumber + 1;

    private static IEnumerable<DateOnly> EnumerarDias(DateOnly inicio, DateOnly fim)
    {
        for (var d = inicio; d <= fim; d = d.AddDays(1))
            yield return d;
    }

    private static void ValidarPeriodos(List<PeriodoDto> periodos)
    {
        if (periodos is null || periodos.Count == 0)
            throw new Exception("Informe pelo menos 1 período.");

        if (periodos.Count > 3)
            throw new Exception("Máximo de 3 períodos por solicitação (especificação E5).");

        var hoje = DateOnly.FromDateTime(DateTime.UtcNow);
        var limiteAntecedencia = hoje.AddDays(30);

        foreach (var p in periodos)
        {
            if (p.Inicio == default || p.Fim == default)
                throw new Exception("Período inválido: início/fim obrigatórios.");

            if (p.Inicio > p.Fim)
                throw new Exception("Período inválido: início maior que fim.");

            // E6 — antecedência mínima de 30 dias
            if (p.Inicio < limiteAntecedencia)
                throw new Exception($"Período inválido: início deve ser com pelo menos 30 dias de antecedência (a partir de {limiteAntecedencia:dd/MM/yyyy}).");
        }

        // sem sobreposição dentro do pedido
        var ordenados = periodos.OrderBy(p => p.Inicio).ToList();
        for (int i = 0; i < ordenados.Count - 1; i++)
        {
            var a = ordenados[i];
            var b = ordenados[i + 1];
            if (a.Inicio <= b.Fim && b.Inicio <= a.Fim)
                throw new Exception("Os períodos informados não podem se sobrepor.");
        }

        // E5 — total ≤ 30 dias
        var total = periodos.Sum(p => DiasCorridos(p.Inicio, p.Fim));
        if (total > 30)
            throw new Exception($"A soma dos períodos não pode ultrapassar 30 dias corridos. Total informado: {total}.");
    }

    private async Task<(Setor setor, Usuario usuario)> CarregarUsuarioPorMatricula(string matricula)
    {
        var usuario = await _context.Usuarios
            .Include(u => u.Setor)
            .FirstOrDefaultAsync(u => u.Matricula == matricula)
            ?? throw new Exception("Usuário não encontrado.");

        return (usuario.Setor, usuario);
    }

    private async Task<(List<DateOnly> conflitosAprovadas, List<DateOnly> avisosPendentes)> ChecarCapacidadeAsync(
        Guid setorId,
        List<PeriodoDto> periodos)
    {
        var setor = await _context.Setores.AsNoTracking().FirstOrDefaultAsync(s => s.Id == setorId)
            ?? throw new Exception("Setor não encontrado.");

        var limite = setor.LimiteFeriasSimultaneas;
        var min = periodos.Min(p => p.Inicio);
        var max = periodos.Max(p => p.Fim);

        var periodosNoRange = await _context.FeriasPeriodos
            .AsNoTracking()
            .Where(p =>
                p.Ferias.SetorId == setorId &&
                (p.Ferias.Status == FeriasStatus.AprovadaAdmin ||
                 p.Ferias.Status == FeriasStatus.AprovadaChefia ||
                 p.Ferias.Status == FeriasStatus.Pendente) &&
                p.Inicio <= max && min <= p.Fim
            )
            .Select(p => new { p.Inicio, p.Fim, Status = p.Ferias.Status })
            .ToListAsync();

        var aprovadasPorDia = new Dictionary<DateOnly, int>();
        var pendentesPorDia = new Dictionary<DateOnly, int>();

        foreach (var p in periodosNoRange)
        {
            foreach (var dia in EnumerarDias(p.Inicio, p.Fim))
            {
                if (p.Status == FeriasStatus.AprovadaAdmin)
                    aprovadasPorDia[dia] = aprovadasPorDia.TryGetValue(dia, out var n) ? n + 1 : 1;
                else
                    pendentesPorDia[dia] = pendentesPorDia.TryGetValue(dia, out var n) ? n + 1 : 1;
            }
        }

        var conflitos = new HashSet<DateOnly>();
        var avisos = new HashSet<DateOnly>();

        foreach (var pedido in periodos)
        {
            foreach (var dia in EnumerarDias(pedido.Inicio, pedido.Fim))
            {
                var aprov = aprovadasPorDia.TryGetValue(dia, out var a) ? a : 0;
                var pend = pendentesPorDia.TryGetValue(dia, out var p) ? p : 0;

                if (aprov >= limite)
                    conflitos.Add(dia);

                if (pend > 0)
                    avisos.Add(dia);
            }
        }

        return (conflitos.OrderBy(d => d).ToList(), avisos.OrderBy(d => d).ToList());
    }

    private FeriasResponse MapResponse(Ferias f, string matricula, string nome)
    {
        return new FeriasResponse
        {
            Id = f.Id,
            Matricula = matricula,
            Nome = nome,
            SetorNome = f.Setor?.Nome ?? "",
            Status = f.Status,
            CreatedAt = f.CreatedAt,
            AdiantFerias = f.AdiantFerias,
            Adiant13 = f.Adiant13,
            MotivoNegacao = f.MotivoNegacao,
            Periodos = f.Periodos
                .OrderBy(p => p.Inicio)
                .Select(p => new PeriodoDto { Inicio = p.Inicio, Fim = p.Fim })
                .ToList()
        };
    }

    public async Task<FeriasResponse> Solicitar(string matricula, SolicitarFeriasRequest request)
    {
        var periodos = request.Periodos ?? new List<PeriodoDto>();
        ValidarPeriodos(periodos);

        var (_, usuario) = await CarregarUsuarioPorMatricula(matricula);

        // E3 — apenas 1 pedido pendente (Pendente ou AprovadaChefia) por ano
        var anoAtual = DateTime.UtcNow.Year;
        var pendente = await _context.Ferias
            .AsNoTracking()
            .Where(f => f.UsuarioId == usuario.Id &&
                        f.CreatedAt.Year == anoAtual &&
                        (f.Status == FeriasStatus.Pendente || f.Status == FeriasStatus.AprovadaChefia))
            .FirstOrDefaultAsync();

        if (pendente != null)
            throw new Exception("Você já possui uma solicitação pendente ou em aprovação para este ano (E3). Cancele a anterior antes de enviar uma nova.");

        // verifica capacidade
        var (conflitos, avisos) = await ChecarCapacidadeAsync(usuario.SetorId, periodos);

        if (conflitos.Count > 0)
        {
            var primeiro = conflitos.First();
            throw new Exception($"Conflito: o setor já atingiu o limite de férias aprovadas no dia {primeiro:yyyy-MM-dd}.");
        }

        var ferias = new Ferias
        {
            Id = Guid.NewGuid(),
            UsuarioId = usuario.Id,
            SetorId = usuario.SetorId,
            Status = FeriasStatus.Pendente,
            CreatedAt = DateTime.UtcNow,
            AdiantFerias = request.AdiantFerias,
            Adiant13 = request.Adiant13,
            Periodos = periodos.Select(p => new FeriasPeriodo
            {
                Id = Guid.NewGuid(),
                Inicio = p.Inicio,
                Fim = p.Fim
            }).ToList()
        };

        _context.Ferias.Add(ferias);
        await _context.SaveChangesAsync();

        return new FeriasResponse
        {
            Id = ferias.Id,
            Matricula = usuario.Matricula,
            Nome = usuario.Nome,
            SetorNome = usuario.Setor.Nome,
            Status = ferias.Status,
            CreatedAt = ferias.CreatedAt,
            AdiantFerias = ferias.AdiantFerias,
            Adiant13 = ferias.Adiant13,
            Periodos = periodos,
            Avisos = avisos.Count > 0
                ? new List<string> { $"Aviso: existem solicitações em andamento que incluem {avisos.Count} dia(s) do seu pedido." }
                : new List<string>()
        };
    }

    public async Task<IEnumerable<FeriasResponse>> Minhas(string matricula)
    {
        var usuario = await _context.Usuarios.AsNoTracking().FirstOrDefaultAsync(u => u.Matricula == matricula)
            ?? throw new Exception("Usuário não encontrado.");

        var itens = await _context.Ferias
            .AsNoTracking()
            .Include(f => f.Periodos)
            .Include(f => f.Setor)
            .Where(f => f.UsuarioId == usuario.Id)
            .OrderByDescending(f => f.CreatedAt)
            .ToListAsync();

        return itens.Select(f => MapResponse(f, matricula, usuario.Nome));
    }

    public async Task<IEnumerable<FeriasResponse>> PendentesPorSetor(Guid setorId)
    {
        var itens = await _context.Ferias
            .AsNoTracking()
            .Include(f => f.Usuario)
            .Include(f => f.Setor)
            .Include(f => f.Periodos)
            .Where(f => f.SetorId == setorId && f.Status == FeriasStatus.Pendente)
            .OrderBy(f => f.CreatedAt)
            .ToListAsync();

        return itens.Select(f => MapResponse(f, f.Usuario.Matricula, f.Usuario.Nome));
    }

    public async Task<IEnumerable<FeriasResponse>> AguardandoAdmin()
    {
        var itens = await _context.Ferias
            .AsNoTracking()
            .Include(f => f.Usuario)
            .Include(f => f.Setor)
            .Include(f => f.Periodos)
            .Where(f => f.Status == FeriasStatus.AprovadaChefia)
            .OrderBy(f => f.CreatedAt)
            .ToListAsync();

        return itens.Select(f => MapResponse(f, f.Usuario.Matricula, f.Usuario.Nome));
    }

    public async Task AprovarChefia(Guid feriasId, AprovarFeriasRequest request)
    {
        var ferias = await _context.Ferias
            .Include(f => f.Periodos)
            .FirstOrDefaultAsync(f => f.Id == feriasId)
            ?? throw new Exception("Solicitação não encontrada.");

        if (ferias.Status != FeriasStatus.Pendente)
            throw new Exception("Apenas solicitações pendentes podem ser aprovadas pela chefia.");

        ferias.Status = FeriasStatus.AprovadaChefia;
        ferias.AprovadoChefiaPorId = request.AprovadoPorId;
        ferias.AprovadoChefiaEm = DateTime.UtcNow;

        await _context.SaveChangesAsync();
    }

    public async Task AprovarAdmin(Guid feriasId, AprovarFeriasRequest request)
    {
        var ferias = await _context.Ferias
            .Include(f => f.Periodos)
            .FirstOrDefaultAsync(f => f.Id == feriasId)
            ?? throw new Exception("Solicitação não encontrada.");

        if (ferias.Status != FeriasStatus.AprovadaChefia)
            throw new Exception("Apenas solicitações já aprovadas pela chefia podem ser aprovadas pelo admin.");

        var periodos = ferias.Periodos.Select(p => new PeriodoDto { Inicio = p.Inicio, Fim = p.Fim }).ToList();
        var (conflitos, _) = await ChecarCapacidadeAsync(ferias.SetorId, periodos);

        if (conflitos.Count > 0)
            throw new Exception($"Não é possível aprovar: o setor já atingiu o limite de férias em {conflitos.First():yyyy-MM-dd}.");

        ferias.Status = FeriasStatus.AprovadaAdmin;
        ferias.AprovadoPorId = request.AprovadoPorId;
        ferias.AprovadoEm = DateTime.UtcNow;

        await _context.SaveChangesAsync();
    }

    public async Task NegarChefia(Guid feriasId, NegarFeriasRequest request)
    {
        var ferias = await _context.Ferias.FirstOrDefaultAsync(f => f.Id == feriasId)
            ?? throw new Exception("Solicitação não encontrada.");

        if (ferias.Status != FeriasStatus.Pendente)
            throw new Exception("Apenas solicitações pendentes podem ser reprovadas pela chefia.");

        if (string.IsNullOrWhiteSpace(request.Motivo))
            throw new Exception("Informe o motivo da reprovação.");

        ferias.Status = FeriasStatus.ReprovadaChefia;
        ferias.MotivoNegacao = request.Motivo.Trim();

        await _context.SaveChangesAsync();
    }

    public async Task NegarAdmin(Guid feriasId, NegarFeriasRequest request)
    {
        var ferias = await _context.Ferias.FirstOrDefaultAsync(f => f.Id == feriasId)
            ?? throw new Exception("Solicitação não encontrada.");

        if (ferias.Status != FeriasStatus.AprovadaChefia)
            throw new Exception("Apenas solicitações aprovadas pela chefia podem ser reprovadas pelo admin.");

        if (string.IsNullOrWhiteSpace(request.Motivo))
            throw new Exception("Informe o motivo da reprovação.");

        ferias.Status = FeriasStatus.ReprovadaAdmin;
        ferias.MotivoNegacao = request.Motivo.Trim();

        await _context.SaveChangesAsync();
    }

    public async Task Cancelar(Guid feriasId, string matricula)
    {
        var usuario = await _context.Usuarios.AsNoTracking().FirstOrDefaultAsync(u => u.Matricula == matricula)
            ?? throw new Exception("Usuário não encontrado.");

        var ferias = await _context.Ferias.FirstOrDefaultAsync(f => f.Id == feriasId)
            ?? throw new Exception("Solicitação não encontrada.");

        if (ferias.UsuarioId != usuario.Id)
            throw new Exception("Você não pode cancelar solicitação de outro usuário.");

        if (ferias.Status != FeriasStatus.Pendente)
            throw new Exception("Apenas solicitações pendentes podem ser canceladas.");

        ferias.Status = FeriasStatus.Cancelada;
        await _context.SaveChangesAsync();
    }

    public async Task<IEnumerable<CalendarioOcupacaoDiaResponse>> Calendario(Guid setorId, DateOnly inicio, DateOnly fim)
    {
        if (inicio == default) inicio = DateOnly.FromDateTime(DateTime.UtcNow);
        if (fim == default) fim = inicio.AddDays(90);
        if (inicio > fim) throw new Exception("Intervalo inválido.");

        var setor = await _context.Setores.AsNoTracking().FirstOrDefaultAsync(s => s.Id == setorId)
            ?? throw new Exception("Setor não encontrado.");

        var limite = setor.LimiteFeriasSimultaneas;

        var periodos = await _context.FeriasPeriodos
            .AsNoTracking()
            .Where(p =>
                p.Ferias.SetorId == setorId &&
                (p.Ferias.Status == FeriasStatus.AprovadaAdmin ||
                 p.Ferias.Status == FeriasStatus.AprovadaChefia ||
                 p.Ferias.Status == FeriasStatus.Pendente) &&
                p.Inicio <= fim && inicio <= p.Fim
            )
            .Select(p => new { p.Inicio, p.Fim, Status = p.Ferias.Status })
            .ToListAsync();

        var aprovadas = new Dictionary<DateOnly, int>();
        var pendentes = new Dictionary<DateOnly, int>();

        foreach (var p in periodos)
        {
            foreach (var dia in EnumerarDias(p.Inicio, p.Fim))
            {
                if (p.Status == FeriasStatus.AprovadaAdmin)
                    aprovadas[dia] = aprovadas.TryGetValue(dia, out var n) ? n + 1 : 1;
                else
                    pendentes[dia] = pendentes.TryGetValue(dia, out var n) ? n + 1 : 1;
            }
        }

        var resp = new List<CalendarioOcupacaoDiaResponse>();
        foreach (var dia in EnumerarDias(inicio, fim))
        {
            resp.Add(new CalendarioOcupacaoDiaResponse
            {
                Dia = dia,
                Aprovadas = aprovadas.TryGetValue(dia, out var a) ? a : 0,
                Pendentes = pendentes.TryGetValue(dia, out var p) ? p : 0,
                Limite = limite
            });
        }

        return resp;
    }

    public async Task<IEnumerable<AdiantamentoResumoResponse>> ListaAdiantamentos()
    {
        var itens = await _context.Ferias
            .AsNoTracking()
            .Include(f => f.Usuario)
            .Include(f => f.Setor)
            .Include(f => f.Periodos)
            .Where(f => (f.AdiantFerias || f.Adiant13) &&
                        f.Status != FeriasStatus.Cancelada &&
                        f.Status != FeriasStatus.ReprovadaChefia &&
                        f.Status != FeriasStatus.ReprovadaAdmin)
            .OrderByDescending(f => f.CreatedAt)
            .ToListAsync();

        return itens.Select(f => new AdiantamentoResumoResponse
        {
            FeriasId = f.Id,
            Matricula = f.Usuario.Matricula,
            Nome = f.Usuario.Nome,
            SetorNome = f.Setor.Nome,
            Status = f.Status,
            AdiantFerias = f.AdiantFerias,
            Adiant13 = f.Adiant13,
            CreatedAt = f.CreatedAt,
            Periodos = f.Periodos
                .OrderBy(p => p.Inicio)
                .Select(p => new PeriodoDto { Inicio = p.Inicio, Fim = p.Fim })
                .ToList()
        });
    }
}
