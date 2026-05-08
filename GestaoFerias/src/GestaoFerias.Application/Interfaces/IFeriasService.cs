using GestaoFerias.Application.DTOs;

namespace GestaoFerias.Application.Interfaces;

public interface IFeriasService
{
    Task<FeriasResponse> Solicitar(string matricula, SolicitarFeriasRequest request);
    Task<IEnumerable<FeriasResponse>> Minhas(string matricula);
    Task<IEnumerable<FeriasResponse>> PendentesPorSetor(Guid setorId);

    Task Aprovar(Guid feriasId, AprovarFeriasRequest request);
    Task Negar(Guid feriasId, NegarFeriasRequest request);
    Task Cancelar(Guid feriasId, string matricula);

    Task<IEnumerable<CalendarioOcupacaoDiaResponse>> Calendario(Guid setorId, DateOnly inicio, DateOnly fim);
}