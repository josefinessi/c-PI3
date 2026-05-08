using GestaoFerias.Application.DTOs;
using GestaoFerias.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GestaoFerias.API.Controllers;

[ApiController]
[Route("api/usuarios")]
[Authorize]
public class UsuariosController : ControllerBase
{
    private readonly IUsuarioService _service;

    public UsuariosController(IUsuarioService service)
    {
        _service = service;
    }

    [HttpGet]
    [AllowAnonymous]
    public async Task<IActionResult> GetAll()
        => Ok(await _service.GetAll());

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(Guid id)
        => Ok(await _service.GetById(id));

        [HttpGet("matricula/{matricula}")]
public async Task<IActionResult> GetByMatricula(string matricula)
    => Ok(await _service.GetByMatricula(matricula));

    [HttpGet("buscar")]
public async Task<IActionResult> GetByNome([FromQuery] string nome)
    => Ok(await _service.GetByNome(nome));



    [HttpPut("{id}")]
    [Authorize(Roles = "Gestor")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateUserRequest request)
    {
        await _service.Update(id, request);
        return NoContent();
    }

    [HttpPut("matricula/{matricula}")]
[Authorize(Roles = "Gestor")]
public async Task<IActionResult> UpdateByMatricula(
    string matricula,
    UpdateUserRequest request)
{
    await _service.UpdateByMatricula(matricula, request);
    return NoContent();
}



    [HttpDelete("{id}")]
    [Authorize(Roles = "Gestor")]
    public async Task<IActionResult> Delete(Guid id)
    {
        await _service.Delete(id);
        return NoContent();
    }

    [HttpDelete("matricula/{matricula}")]
[Authorize(Roles = "Gestor")]
public async Task<IActionResult> DeleteByMatricula(string matricula)
{
    await _service.DeleteByMatricula(matricula);
    return NoContent();
}

}
