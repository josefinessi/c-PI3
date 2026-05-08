namespace GestaoFerias.Application.DTOs;

public class UserResponse
{
    public Guid Id { get; set; }
    public string Matricula { get; set; } = null!;
    public string Nome { get; set; } = null!;
    public string Role { get; set; } = null!;
    
    public Guid SetorId { get; set; }
    public string SetorNome { get; set; } = null!;
}
