using GestaoFerias.Domain.Enums;

namespace GestaoFerias.Domain.Entities;

public class Usuario
{
    public Guid Id { get; set; }
    public string Matricula { get; set; } = null!;
    public string Nome { get; set; } = null!;
    public string PasswordHash { get; set; } = null!;
    public UserRole Role { get; set; }
    public Guid SetorId { get; set; }
public Setor Setor { get; set; } = null!;
}
