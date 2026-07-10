using System.Data;
using Dapper;
using Prescription.Application.Repositories;
using Prescription.Domain.Entities;

namespace Prescription.Infrastructure.Repositories;

public class ProfileTypeRepository : IProfileTypeRepository
{
    private readonly IDbConnection _connection;

    public ProfileTypeRepository(IDbConnection connection)
    {
        _connection = connection;
    }

    public async Task<IEnumerable<ProfileType>> GetAllAsync()
    {
        return await _connection.QueryAsync<ProfileType>(
            "usp_ProfileType_GetAll",
            commandType: CommandType.StoredProcedure);
    }
}
