namespace GestaoFerias.Application.DTOs;

public class LoginRequest
{
    public string Matricula { get; set; } = null!;
    public string Senha { get; set; } = null!;
}
