using GestaoFerias.Application.DTOs;

namespace GestaoFerias.Application.Interfaces;

public interface ISetorService
{
    Task<SetorResponse> Create(CreateSetorRequest request);
    Task<IEnumerable<SetorResponse>> GetAll();
    Task<SetorResponse> GetById(Guid id);
    Task<IEnumerable<SetorResponse>> SearchByNome(string nome);
    Task Update(Guid id, UpdateSetorRequest request);
    Task Delete(Guid id);
    Task UpdateLimiteFerias(Guid id, UpdateLimiteFeriasRequest request);
}