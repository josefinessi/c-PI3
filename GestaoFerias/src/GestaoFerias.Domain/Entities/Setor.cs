namespace GestaoFerias.Domain.Entities;

public class Setor
{
    public Guid Id { get; set; }
    public string Nome { get; set; } = null!;

    // Quantas pessoas podem ficar de férias ao mesmo tempo nesse setor
    public int LimiteFeriasSimultaneas { get; set; } = 1;
}