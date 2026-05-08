using GestaoFerias.Application.DTOs;

namespace GestaoFerias.Application.Interfaces;

public interface IUsuarioService
{
    Task<IEnumerable<UserResponse>> GetAll();
    Task<UserResponse> GetById(Guid id);
    Task<UserResponse> GetByMatricula(string matricula);
    Task<IEnumerable<UserResponse>> GetByNome(string nome);
    Task Update(Guid id, UpdateUserRequest request);
    Task UpdateByMatricula(string matricula, UpdateUserRequest request);
    Task Delete(Guid id);
    Task DeleteByMatricula(string matricula);
}
