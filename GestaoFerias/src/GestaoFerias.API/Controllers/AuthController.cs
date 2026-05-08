using GestaoFerias.Application.DTOs;
using GestaoFerias.Application.Interfaces;
using Microsoft.AspNetCore.Mvc;
using GestaoFerias.Infrastructure.Auth;
using Microsoft.AspNetCore.Authorization;



namespace GestaoFerias.API.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _authService;

    public AuthController(IAuthService authService)
    {
        _authService = authService;
    }

    [HttpPost("register")]
    [AllowAnonymous]
public async Task<IActionResult> Register([FromBody] RegisterRequest request)
{
    var result = await _authService.Register(request);

    return Ok(new
    {
        matricula = result.Matricula,
        token = result.Token
    });
}

[AllowAnonymous]
    [HttpPost("login")]
    public async Task<IActionResult> Login(LoginRequest request)
        => Ok(new { token = await _authService.Login(request) });
}
