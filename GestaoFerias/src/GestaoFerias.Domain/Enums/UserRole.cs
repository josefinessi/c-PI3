namespace GestaoFerias.Domain.Enums;

public enum UserRole
{
    Chefia = 1,      // antigo Gestor — mantém valor 1 no banco
    Funcionario = 2, // antigo Colaborador — mantém valor 2 no banco
    Admin = 3        // novo papel de administrador global
}
