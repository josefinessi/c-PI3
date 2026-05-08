namespace GestaoFerias.Domain.Entities;

public class FeriasPeriodo
{
    public Guid Id { get; set; }

    public Guid FeriasId { get; set; }
    public Ferias Ferias { get; set; } = null!;

    public DateOnly Inicio { get; set; }
    public DateOnly Fim { get; set; } // inclusivo
}