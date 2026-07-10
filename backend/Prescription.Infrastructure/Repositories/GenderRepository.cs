using System.Data;
using Dapper;
using Prescription.Application.Repositories;
using Prescription.Domain.Entities;

namespace Prescription.Infrastructure.Repositories;

public class GenderRepository : IGenderRepository
{
    private readonly IDbConnection _connection;

    public GenderRepository(IDbConnection connection)
    {
        _connection = connection;
    }

    public async Task<IEnumerable<Gender>> GetAllAsync()
    {
        return await _connection.QueryAsync<Gender>(
            "usp_Gender_GetAll",
            commandType: CommandType.StoredProcedure);
    }
}
