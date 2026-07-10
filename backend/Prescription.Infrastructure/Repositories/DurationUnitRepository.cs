using System.Data;
using Dapper;
using Prescription.Application.Repositories;
using Prescription.Domain.Entities;

namespace Prescription.Infrastructure.Repositories;

public class DurationUnitRepository : IDurationUnitRepository
{
    private readonly IDbConnection _connection;

    public DurationUnitRepository(IDbConnection connection)
    {
        _connection = connection;
    }

    public async Task<IEnumerable<DurationUnit>> GetAllAsync()
    {
        return await _connection.QueryAsync<DurationUnit>(
            "usp_DurationUnit_GetAll",
            commandType: CommandType.StoredProcedure);
    }
}
