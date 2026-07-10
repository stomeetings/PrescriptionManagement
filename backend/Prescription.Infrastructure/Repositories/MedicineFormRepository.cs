using System.Data;
using Dapper;
using Prescription.Application.Repositories;
using Prescription.Domain.Entities;

namespace Prescription.Infrastructure.Repositories;

public class MedicineFormRepository : IMedicineFormRepository
{
    private readonly IDbConnection _connection;

    public MedicineFormRepository(IDbConnection connection)
    {
        _connection = connection;
    }

    public async Task<IEnumerable<MedicineForm>> GetAllAsync()
    {
        return await _connection.QueryAsync<MedicineForm>(
            "usp_MedicineForm_GetAll",
            commandType: CommandType.StoredProcedure);
    }
}
