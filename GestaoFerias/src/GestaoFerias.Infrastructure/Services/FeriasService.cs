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

        foreach (var p in periodos)
        {
            if (p.Inicio == default || p.Fim == default)
                throw new Exception("Período inválido: início/fim obrigatórios.");

            if (p.Inicio > p.Fim)
                throw new Exception("Período inválido: início maior que fim.");
        }

        // não pode sobrepor dentro do próprio pedido
        var ordenados = periodos.OrderBy(p => p.Inicio).ToList();
        for (int i = 0; i < ordenados.Count - 1; i++)
        {
            var a = ordenados[i];
            var b = ordenados[i + 1];

            var sobrepoe = a.Inicio <= b.Fim && b.Inicio <= a.Fim;
            if (sobrepoe)
                throw new Exception("Os períodos informados não podem se sobrepor.");
        }

        var total = periodos.Sum(p => DiasCorridos(p.Inicio, p.Fim));
        if (total != 30)
            throw new Exception($"A soma dos períodos deve ser exatamente 30 dias corridos. Atual: {total}.");
    }

    private async Task<(Setor setor, Usuario usuario)> CarregarUsuarioPorMatricula(string matricula)
    {
        var usuario = await _context.Usuarios
            .Include(u => u.Setor)
            .FirstOrDefaultAsync(u => u.Matricula == matricula)
            ?? throw new Exception("Usuário não encontrado.");

        return (usuario.Setor, usuario);
    }

    /// <summary>
    /// Retorna:
    /// - conflitosAprovadas: dias onde já bateu o limite
    /// - avisosPendentes: dias com pendências (não bloqueia, apenas avisa)
    /// </summary>
    private async Task<(List<DateOnly> conflitosAprovadas, List<DateOnly> avisosPendentes)> ChecarCapacidadeAsync(
        Guid setorId,
        List<PeriodoDto> periodos)
    {
        var setor = await _context.Setores.AsNoTracking().FirstOrDefaultAsync(s => s.Id == setorId)
            ?? throw new Exception("Setor não encontrado.");

        var limite = setor.LimiteFeriasSimultaneas;

        var min = periodos.Min(p => p.Inicio);
        var max = periodos.Max(p => p.Fim);

        // puxa todos os períodos de férias (aprovadas + pendentes) que sobrepõem o intervalo global
        var periodosNoRange = await _context.FeriasPeriodos
            .AsNoTracking()
            .Where(p =>
                p.Ferias.SetorId == setorId &&
                (p.Ferias.Status == FeriasStatus.Aprovada || p.Ferias.Status == FeriasStatus.Pendente) &&
                p.Inicio <= max && min <= p.Fim
            )
            .Select(p => new
            {
                p.Inicio,
                p.Fim,
                Status = p.Ferias.Status
            })
            .ToListAsync();

        // contabiliza por dia
        var aprovadasPorDia = new Dictionary<DateOnly, int>();
        var pendentesPorDia = new Dictionary<DateOnly, int>();

        foreach (var p in periodosNoRange)
        {
            foreach (var dia in EnumerarDias(p.Inicio, p.Fim))
            {
                if (p.Status == FeriasStatus.Aprovada)
                    aprovadasPorDia[dia] = aprovadasPorDia.TryGetValue(dia, out var n) ? n + 1 : 1;
                else
                    pendentesPorDia[dia] = pendentesPorDia.TryGetValue(dia, out var n) ? n + 1 : 1;
            }
        }

        // agora avalia os dias do pedido
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

    public async Task<FeriasResponse> Solicitar(string matricula, SolicitarFeriasRequest request)
    {
        var periodos = request.Periodos ?? new List<PeriodoDto>();
        ValidarPeriodos(periodos);

        var (_, usuario) = await CarregarUsuarioPorMatricula(matricula);

        // checa capacidade (bloqueia aprovadas, avisa pendentes)
        var (conflitos, avisos) = await ChecarCapacidadeAsync(usuario.SetorId, periodos);

        if (conflitos.Count > 0)
        {
            var primeiro = conflitos.First();
            throw new Exception($"Conflito: o setor já atingiu o limite de férias no dia {primeiro:yyyy-MM-dd} (e outros).");
        }

        var ferias = new Ferias
        {
            Id = Guid.NewGuid(),
            UsuarioId = usuario.Id,
            SetorId = usuario.SetorId,
            Status = FeriasStatus.Pendente,
            CreatedAt = DateTime.UtcNow,
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
            Periodos = periodos,
            Avisos = avisos.Count > 0
                ? new List<string> { $"Aviso: existem solicitações pendentes que incluem {avisos.Count} dia(s) do seu pedido." }
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

        return itens.Select(f => new FeriasResponse
        {
            Id = f.Id,
            Matricula = matricula,
            Nome = usuario.Nome,
            SetorNome = f.Setor.Nome,
            Status = f.Status,
            CreatedAt = f.CreatedAt,
            Periodos = f.Periodos
                .OrderBy(p => p.Inicio)
                .Select(p => new PeriodoDto { Inicio = p.Inicio, Fim = p.Fim })
                .ToList()
        });
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

        return itens.Select(f => new FeriasResponse
        {
            Id = f.Id,
            Matricula = f.Usuario.Matricula,
            Nome = f.Usuario.Nome,
            SetorNome = f.Setor.Nome,
            Status = f.Status,
            CreatedAt = f.CreatedAt,
            Periodos = f.Periodos.OrderBy(p => p.Inicio)
                .Select(p => new PeriodoDto { Inicio = p.Inicio, Fim = p.Fim })
                .ToList()
        });
    }

    public async Task Aprovar(Guid feriasId, AprovarFeriasRequest request)
    {
        var ferias = await _context.Ferias
            .Include(f => f.Periodos)
            .FirstOrDefaultAsync(f => f.Id == feriasId)
            ?? throw new Exception("Solicitação não encontrada.");

        if (ferias.Status != FeriasStatus.Pendente)
            throw new Exception("Apenas solicitações pendentes podem ser aprovadas.");

        var periodos = ferias.Periodos.Select(p => new PeriodoDto { Inicio = p.Inicio, Fim = p.Fim }).ToList();

        // valida capacidade novamente no momento da aprovação (concorrência)
        var (conflitos, _) = await ChecarCapacidadeAsync(ferias.SetorId, periodos);

        // aqui IMPORTANTÍSSIMO: ignorar os próprios períodos pendentes da solicitação atual
        // (como só bloqueamos por APROVADAS, está ok. Conflito vem só por aprovadas.)

        if (conflitos.Count > 0)
            throw new Exception($"Não é possível aprovar: o setor já atingiu o limite de férias em {conflitos.First():yyyy-MM-dd}.");

        ferias.Status = FeriasStatus.Aprovada;
        ferias.AprovadoPorId = request.AprovadoPorId;
        ferias.AprovadoEm = DateTime.UtcNow;
        ferias.MotivoNegacao = null;

        await _context.SaveChangesAsync();
    }

    public async Task Negar(Guid feriasId, NegarFeriasRequest request)
    {
        var ferias = await _context.Ferias.FirstOrDefaultAsync(f => f.Id == feriasId)
            ?? throw new Exception("Solicitação não encontrada.");

        if (ferias.Status != FeriasStatus.Pendente)
            throw new Exception("Apenas solicitações pendentes podem ser negadas.");

        if (string.IsNullOrWhiteSpace(request.Motivo))
            throw new Exception("Informe o motivo da negação.");

        ferias.Status = FeriasStatus.Negada;
        ferias.AprovadoPorId = request.NegadoPorId;
        ferias.AprovadoEm = DateTime.UtcNow;
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
                (p.Ferias.Status == FeriasStatus.Aprovada || p.Ferias.Status == FeriasStatus.Pendente) &&
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
                if (p.Status == FeriasStatus.Aprovada)
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
}