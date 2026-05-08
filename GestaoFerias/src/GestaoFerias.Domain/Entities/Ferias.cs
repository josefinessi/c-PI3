using GestaoFerias.Domain.Enums;

namespace GestaoFerias.Domain.Entities;

public class Ferias
{
    public Guid Id { get; set; }

    public Guid UsuarioId { get; set; }
    public Usuario Usuario { get; set; } = null!;

    // Congela o setor no momento do pedido (regra de negócio)
    public Guid SetorId { get; set; }
    public Setor Setor { get; set; } = null!;

    public FeriasStatus Status { get; set; } = FeriasStatus.Pendente;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public Guid? AprovadoPorId { get; set; }
    public Usuario? AprovadoPor { get; set; }

    public DateTime? AprovadoEm { get; set; }

    public string? MotivoNegacao { get; set; }

    public List<FeriasPeriodo> Periodos { get; set; } = new();
}