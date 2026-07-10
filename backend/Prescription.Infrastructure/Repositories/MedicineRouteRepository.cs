using System.Data;
using Dapper;
using Prescription.Application.Repositories;
using Prescription.Domain.Entities;

namespace Prescription.Infrastructure.Repositories;

public class MedicineRouteRepository : IMedicineRouteRepository
{
    private readonly IDbConnection _connection;

    public MedicineRouteRepository(IDbConnection connection)
    {
        _connection = connection;
    }

    public async Task<IEnumerable<MedicineRoute>> GetAllAsync()
    {
        return await _connection.QueryAsync<MedicineRoute>(
            "usp_MedicineRoute_GetAll",
            commandType: CommandType.StoredProcedure);
    }
}
