using GestaoFerias.Application.DTOs;

namespace GestaoFerias.Application.Interfaces;

public interface IFeriasService
{
    Task<FeriasResponse> Solicitar(string matricula, SolicitarFeriasRequest request);
    Task<IEnumerable<FeriasResponse>> Minhas(string matricula);

    // Para chefia: pedidos pendentes do setor
    Task<IEnumerable<FeriasResponse>> PendentesPorSetor(Guid setorId);

    // Para admin: pedidos aprovados pela chefia aguardando aprovação final
    Task<IEnumerable<FeriasResponse>> AguardandoAdmin();

    // Aprovação em duas etapas
    Task AprovarChefia(Guid feriasId, AprovarFeriasRequest request);
    Task AprovarAdmin(Guid feriasId, AprovarFeriasRequest request);

    // Reprovação (cada papel reprova do seu estado)
    Task NegarChefia(Guid feriasId, NegarFeriasRequest request);
    Task NegarAdmin(Guid feriasId, NegarFeriasRequest request);

    Task Cancelar(Guid feriasId, string matricula);

    Task<IEnumerable<CalendarioOcupacaoDiaResponse>> Calendario(Guid setorId, DateOnly inicio, DateOnly fim);

    // Dashboard do admin: lista quem solicitou adiantamento de férias ou 13°
    Task<IEnumerable<AdiantamentoResumoResponse>> ListaAdiantamentos();
}
