using GestaoFerias.Domain.Enums;

namespace GestaoFerias.Application.DTOs;

public class PeriodoDto
{
    public DateOnly Inicio { get; set; }
    public DateOnly Fim { get; set; }
}

public class SolicitarFeriasRequest
{
    public List<PeriodoDto> Periodos { get; set; } = new();
    public bool AdiantFerias { get; set; } = false;
    public bool Adiant13 { get; set; } = false;
}

public class FeriasResponse
{
    public Guid Id { get; set; }
    public string Matricula { get; set; } = null!;
    public string Nome { get; set; } = null!;
    public string SetorNome { get; set; } = null!;
    public FeriasStatus Status { get; set; }
    public DateTime CreatedAt { get; set; }
    public List<PeriodoDto> Periodos { get; set; } = new();
    public bool AdiantFerias { get; set; }
    public bool Adiant13 { get; set; }
    public string? MotivoNegacao { get; set; }
    public List<string> Avisos { get; set; } = new();
}

public class AprovarFeriasRequest
{
    public Guid AprovadoPorId { get; set; }
}

public class NegarFeriasRequest
{
    public Guid NegadoPorId { get; set; }
    public string Motivo { get; set; } = null!;
}

public class AdiantamentoResumoResponse
{
    public Guid FeriasId { get; set; }
    public string Matricula { get; set; } = null!;
    public string Nome { get; set; } = null!;
    public string SetorNome { get; set; } = null!;
    public FeriasStatus Status { get; set; }
    public bool AdiantFerias { get; set; }
    public bool Adiant13 { get; set; }
    public DateTime CreatedAt { get; set; }
    public List<PeriodoDto> Periodos { get; set; } = new();
}

public class CalendarioOcupacaoDiaResponse
{
    public DateOnly Dia { get; set; }
    public int Aprovadas { get; set; }
    public int Pendentes { get; set; }
    public int Limite { get; set; }
}
