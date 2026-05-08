using GestaoFerias.Application.DTOs;

namespace GestaoFerias.Application.Interfaces;

public interface IAuthService
{
    Task<(string Matricula, string Token)> Register(RegisterRequest request);
    Task<string> Login(LoginRequest request);
}


