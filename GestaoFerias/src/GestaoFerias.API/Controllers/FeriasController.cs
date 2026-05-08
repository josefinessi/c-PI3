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

    [Authorize]
    [HttpPost("solicitar/{matricula}")]
    public async Task<IActionResult> Solicitar(string matricula, [FromBody] SolicitarFeriasRequest request)
        => Ok(await _service.Solicitar(matricula, request));

    [Authorize]
    [HttpGet("minhas/{matricula}")]
    public async Task<IActionResult> Minhas(string matricula)
        => Ok(await _service.Minhas(matricula));

    // Para chefia: pedidos Pendente do setor
    [Authorize]
    [HttpGet("pendentes/setor/{setorId:guid}")]
    public async Task<IActionResult> PendentesPorSetor(Guid setorId)
        => Ok(await _service.PendentesPorSetor(setorId));

    // Para admin: pedidos AprovadaChefia aguardando aprovação final
    [Authorize]
    [HttpGet("aguardando-admin")]
    public async Task<IActionResult> AguardandoAdmin()
        => Ok(await _service.AguardandoAdmin());

    // Chefia aprova (Pendente → AprovadaChefia)
    [Authorize(Roles = "Chefia,Admin")]
    [HttpPost("{feriasId:guid}/aprovar-chefia")]
    public async Task<IActionResult> AprovarChefia(Guid feriasId, [FromBody] AprovarFeriasRequest request)
    {
        await _service.AprovarChefia(feriasId, request);
        return NoContent();
    }

    // Admin aprova (AprovadaChefia → AprovadaAdmin)
    [Authorize(Roles = "Admin")]
    [HttpPost("{feriasId:guid}/aprovar-admin")]
    public async Task<IActionResult> AprovarAdmin(Guid feriasId, [FromBody] AprovarFeriasRequest request)
    {
        await _service.AprovarAdmin(feriasId, request);
        return NoContent();
    }

    // Chefia reprova (Pendente → ReprovadaChefia)
    [Authorize(Roles = "Chefia,Admin")]
    [HttpPost("{feriasId:guid}/negar-chefia")]
    public async Task<IActionResult> NegarChefia(Guid feriasId, [FromBody] NegarFeriasRequest request)
    {
        await _service.NegarChefia(feriasId, request);
        return NoContent();
    }

    // Admin reprova (AprovadaChefia → ReprovadaAdmin)
    [Authorize(Roles = "Admin")]
    [HttpPost("{feriasId:guid}/negar-admin")]
    public async Task<IActionResult> NegarAdmin(Guid feriasId, [FromBody] NegarFeriasRequest request)
    {
        await _service.NegarAdmin(feriasId, request);
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
    [HttpGet("calendario/setor/{setorId:guid}")]
    public async Task<IActionResult> Calendario(
        Guid setorId,
        [FromQuery] DateOnly? inicio,
        [FromQuery] DateOnly? fim)
    {
        var start = inicio ?? DateOnly.FromDateTime(DateTime.UtcNow);
        var end = fim ?? start.AddDays(90);

        if (end < start)
            return BadRequest("Intervalo inválido: fim deve ser maior ou igual ao início.");

        return Ok(await _service.Calendario(setorId, start, end));
    }

    // Dashboard admin: lista adiantamentos solicitados
    [Authorize(Roles = "Admin")]
    [HttpGet("adiantamentos")]
    public async Task<IActionResult> Adiantamentos()
        => Ok(await _service.ListaAdiantamentos());
}
