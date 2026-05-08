using GestaoFerias.Application.DTOs;
using GestaoFerias.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GestaoFerias.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class FeriasController : ControllerBase
{
    private readonly IFeriasService _service;

    public FeriasController(IFeriasService service)
    {
        _service = service;
    }

    // simplão: matricula vem do body/route — depois você troca pra vir do JWT claim
    [Authorize]
    [HttpPost("solicitar/{matricula}")]
    public async Task<IActionResult> Solicitar(string matricula, [FromBody] SolicitarFeriasRequest request)
        => Ok(await _service.Solicitar(matricula, request));

    [Authorize]
    [HttpGet("minhas/{matricula}")]
    public async Task<IActionResult> Minhas(string matricula)
        => Ok(await _service.Minhas(matricula));

    [Authorize]
    [HttpGet("pendentes/setor/{setorId:guid}")]
    public async Task<IActionResult> PendentesPorSetor(Guid setorId)
        => Ok(await _service.PendentesPorSetor(setorId));

    [Authorize]
    [HttpPost("{feriasId:guid}/aprovar")]
    public async Task<IActionResult> Aprovar(Guid feriasId, [FromBody] AprovarFeriasRequest request)
    {
        await _service.Aprovar(feriasId, request);
        return NoContent();
    }

    [Authorize]
    [HttpPost("{feriasId:guid}/negar")]
    public async Task<IActionResult> Negar(Guid feriasId, [FromBody] NegarFeriasRequest request)
    {
        await _service.Negar(feriasId, request);
        return NoContent();
    }

    [Authorize]
    [HttpDelete("{feriasId:guid}/cancelar/{matricula}")]
    public async Task<IActionResult> Cancelar(Guid feriasId, string matricula)
    {
        await _service.Cancelar(feriasId, matricula);
        return NoContent();
    }

    [Authorize]
    [Authorize]
[HttpGet("calendario/setor/{setorId:guid}")]
public async Task<IActionResult> Calendario(
    Guid setorId,
    [FromQuery] DateOnly? inicio,
    [FromQuery] DateOnly? fim)
{
    var start = inicio ?? DateOnly.FromDateTime(DateTime.UtcNow);
    var end = fim ?? start.AddDays(09); // ou 30, 90… você decide

    if (end < start)
        return BadRequest("Intervalo inválido: fim deve ser maior ou igual ao início.");

    return Ok(await _service.Calendario(setorId, start, end));
}
}