using System.Data;
using Dapper;
using Prescription.Application.Repositories;
using Prescription.Domain.Entities;

namespace Prescription.Infrastructure.Repositories;

public class PatientMedicationStatusRepository : IPatientMedicationStatusRepository
{
    private readonly IDbConnection _connection;

    public PatientMedicationStatusRepository(IDbConnection connection)
    {
        _connection = connection;
    }

    public async Task<IEnumerable<PatientMedicationStatus>> GetAllAsync()
    {
        return await _connection.QueryAsync<PatientMedicationStatus>(
            "usp_PatientMedicationStatus_GetAll",
            commandType: CommandType.StoredProcedure);
    }
}
