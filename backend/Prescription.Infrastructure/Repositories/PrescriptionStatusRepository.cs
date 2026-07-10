using System.Data;
using Dapper;
using Prescription.Application.Repositories;
using Prescription.Domain.Entities;

namespace Prescription.Infrastructure.Repositories;

public class PrescriptionStatusRepository : IPrescriptionStatusRepository
{
    private readonly IDbConnection _connection;

    public PrescriptionStatusRepository(IDbConnection connection)
    {
        _connection = connection;
    }

    public async Task<IEnumerable<PrescriptionStatus>> GetAllAsync()
    {
        return await _connection.QueryAsync<PrescriptionStatus>(
            "usp_PrescriptionStatus_GetAll",
            commandType: CommandType.StoredProcedure);
    }
}
