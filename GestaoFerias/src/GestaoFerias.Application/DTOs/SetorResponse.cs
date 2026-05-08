namespace GestaoFerias.Application.DTOs;

public class SetorResponse
{
    public Guid Id { get; set; }
    public string Nome { get; set; } = null!;
    public int LimiteFeriasSimultaneas { get; set; }
}