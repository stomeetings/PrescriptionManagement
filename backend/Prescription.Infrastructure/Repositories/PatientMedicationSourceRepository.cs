using System.Data;
using Dapper;
using Prescription.Application.Repositories;
using Prescription.Domain.Entities;

namespace Prescription.Infrastructure.Repositories;

public class PatientMedicationSourceRepository : IPatientMedicationSourceRepository
{
    private readonly IDbConnection _connection;

    public PatientMedicationSourceRepository(IDbConnection connection)
    {
        _connection = connection;
    }

    public async Task<IEnumerable<PatientMedicationSource>> GetAllAsync()
    {
        return await _connection.QueryAsync<PatientMedicationSource>(
            "usp_PatientMedicationSource_GetAll",
            commandType: CommandType.StoredProcedure);
    }
}
