using System.Data;
using Dapper;
using Prescription.Application.Repositories;

namespace Prescription.Infrastructure.Repositories;

public class PatientMedicationPrescriptionRepository : IPatientMedicationPrescriptionRepository
{
    private readonly IDbConnection _connection;

    public PatientMedicationPrescriptionRepository(IDbConnection connection)
    {
        _connection = connection;
    }

    public async Task<IEnumerable<PatientMedicationPrescriptionEntry>> GetByPatientMedicationAsync(int patientMedicationId)
    {
        return await _connection.QueryAsync<PatientMedicationPrescriptionEntry>(
            "usp_PatientMedicationPrescription_GetByPatientMedication",
            new { PatientMedicationId = patientMedicationId },
            commandType: CommandType.StoredProcedure);
    }

    public async Task<IEnumerable<OriginatingPatientMedicationEntry>> GetByPrescriptionAsync(int prescriptionId)
    {
        return await _connection.QueryAsync<OriginatingPatientMedicationEntry>(
            "usp_PatientMedicationPrescription_GetByPrescription",
            new { PrescriptionId = prescriptionId },
            commandType: CommandType.StoredProcedure);
    }
}
