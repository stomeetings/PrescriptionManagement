using System.Data;
using Dapper;
using Prescription.Application.Repositories;
using Prescription.Domain.Entities;

namespace Prescription.Infrastructure.Repositories;

public class FrequencyRepository : IFrequencyRepository
{
    private readonly IDbConnection _connection;

    public FrequencyRepository(IDbConnection connection)
    {
        _connection = connection;
    }

    public async Task<IEnumerable<Frequency>> GetAllAsync()
    {
        return await _connection.QueryAsync<Frequency>(
            "usp_Frequency_GetAll",
            commandType: CommandType.StoredProcedure);
    }
}
