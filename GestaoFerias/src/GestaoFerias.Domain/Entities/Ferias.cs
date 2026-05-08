using GestaoFerias.Domain.Enums;

namespace GestaoFerias.Domain.Entities;

public class Ferias
{
    public Guid Id { get; set; }

    public Guid UsuarioId { get; set; }
    public Usuario Usuario { get; set; } = null!;

    public Guid SetorId { get; set; }
    public Setor Setor { get; set; } = null!;

    public FeriasStatus Status { get; set; } = FeriasStatus.Pendente;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Aprovação chefia (1ª etapa)
    public Guid? AprovadoChefiaPorId { get; set; }
    public Usuario? AprovadoChefiaPor { get; set; }
    public DateTime? AprovadoChefiaEm { get; set; }

    // Aprovação admin (2ª etapa — estado final)
    public Guid? AprovadoPorId { get; set; }
    public Usuario? AprovadoPor { get; set; }
    public DateTime? AprovadoEm { get; set; }

    public string? MotivoNegacao { get; set; }

    // Adiantamentos
    public bool AdiantFerias { get; set; } = false;
    public bool Adiant13 { get; set; } = false;

    public List<FeriasPeriodo> Periodos { get; set; } = new();
}
