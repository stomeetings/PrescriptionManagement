using System.Data;
using Dapper;
using Prescription.Application.Repositories;
using Prescription.Domain.Entities;

namespace Prescription.Infrastructure.Repositories;

public class DoseUnitRepository : IDoseUnitRepository
{
    private readonly IDbConnection _connection;

    public DoseUnitRepository(IDbConnection connection)
    {
        _connection = connection;
    }

    public async Task<IEnumerable<DoseUnit>> GetAllAsync()
    {
        return await _connection.QueryAsync<DoseUnit>(
            "usp_DoseUnit_GetAll",
            commandType: CommandType.StoredProcedure);
    }
}
