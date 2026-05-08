namespace GestaoFerias.Application.DTOs;

public class UpdateUserRequest
{
    public string? Nome { get; set; }
    public string? Role { get; set; }
    public string? Senha { get; set; }

    // troca setor pelo nome (opcional)
    public string? SetorNome { get; set; }
}
