using System.Data;
using Dapper;
using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Logging;
using Prescription.Application.Exceptions;
using Prescription.Application.Repositories;

namespace Prescription.Infrastructure.Repositories;

// Separate repository from PrescriptionRepository, mirroring PrescriptionVersionRepository's
// identical one-concern-per-repository precedent already established for this module.
public class PrescriptionFinalizeRepository : IPrescriptionFinalizeRepository
{
    private readonly IDbConnection _connection;
    private readonly ILogger<PrescriptionFinalizeRepository> _logger;

    public PrescriptionFinalizeRepository(IDbConnection connection, ILogger<PrescriptionFinalizeRepository> logger)
    {
        _connection = connection;
        _logger = logger;
    }

    public async Task<PrescriptionFinalizeResult> FinalizeAsync(int prescriptionId, string finalizedBy)
    {
        var parameters = new { PrescriptionId = prescriptionId, FinalizedBy = finalizedBy };

        try
        {
            return await _connection.QuerySingleAsync<PrescriptionFinalizeResult>(
                "usp_Prescription_Finalize",
                parameters,
                commandType: CommandType.StoredProcedure);
        }
        catch (SqlException ex)
        {
            _logger.LogError(ex, "Database error in {Method}", nameof(FinalizeAsync));
            throw TranslateSqlException(ex);
        }
    }

    // Only the error numbers usp_Prescription_Finalize can actually raise - the fuller
    // 50041-50051 range belongs to Create/Update/Version and is translated by
    // PrescriptionRepository/PrescriptionVersionRepository instead.
    private static Exception TranslateSqlException(SqlException ex)
    {
        return ex.Number switch
        {
            50041 => new InvalidPatientReferenceException(),
            50042 => new InvalidProviderReferenceException(),
            50044 => new NoPrescriptionMedicationsException(),
            50047 => new InvalidOperationException("PrescriptionStatus 'DRAFT'/'PENDING' is not seeded. Run LookupSeedData.sql."),
            50048 => new PrescriptionNotFoundException(),
            50052 => new PrescriptionAlreadyFinalizedException(),
            50053 => new PrescriptionMedicineInactiveException(),
            50054 => new DuplicatePrescriptionMedicationException(),
            50055 => new PrescriptionMissingDirectionsException(),
            50056 => new InvalidPrescriptionIssueDateException(),
            50057 => new InvalidPrescriptionExpiryDateException(),
            _ => ex
        };
    }
}
