using GestaoFerias.Application.DTOs;
using GestaoFerias.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GestaoFerias.API.Controllers;

[ApiController]
[Route("api/setores")]
[Authorize]
public class SetoresController : ControllerBase
{
    private readonly ISetorService _service;

    public SetoresController(ISetorService service)
    {
        _service = service;
    }

    [HttpPost]
    [Authorize(Roles = "Gestor")]
    public async Task<IActionResult> Create(CreateSetorRequest request)
        => Ok(await _service.Create(request));

    [HttpGet]
    public async Task<IActionResult> GetAll()
        => Ok(await _service.GetAll());

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
        => Ok(await _service.GetById(id));

    // /api/setores/buscar?nome=radio
    [HttpGet("buscar")]
    public async Task<IActionResult> Buscar([FromQuery] string nome)
        => Ok(await _service.SearchByNome(nome));

    [HttpPut("{id:guid}")]
    [Authorize(Roles = "Gestor")]
    public async Task<IActionResult> Update(Guid id, UpdateSetorRequest request)
    {
        await _service.Update(id, request);
        return NoContent();
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Roles = "Gestor")]
    public async Task<IActionResult> Delete(Guid id)
    {
        await _service.Delete(id);
        return NoContent();
    }
    [Authorize(Roles = "Gestor")]
    [HttpPatch("{id:guid}/limite-ferias")]
    public async Task<IActionResult> UpdateLimiteFerias(Guid id, [FromBody] UpdateLimiteFeriasRequest request)
    {
        await _service.UpdateLimiteFerias(id, request);
        return NoContent();
    }
}