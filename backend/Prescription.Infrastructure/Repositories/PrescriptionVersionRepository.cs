using System.Data;
using Dapper;
using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Logging;
using Prescription.Application.Exceptions;
using Prescription.Application.Repositories;

namespace Prescription.Infrastructure.Repositories;

// Logs every database exception before translating/rethrowing it, matching
// PrescriptionRepository/PatientMedicationRepository's identical discipline.
public class PrescriptionVersionRepository : IPrescriptionVersionRepository
{
    private readonly IDbConnection _connection;
    private readonly ILogger<PrescriptionVersionRepository> _logger;

    public PrescriptionVersionRepository(IDbConnection connection, ILogger<PrescriptionVersionRepository> logger)
    {
        _connection = connection;
        _logger = logger;
    }

    public async Task<IEnumerable<PrescriptionVersionSummary>> GetAllAsync(int prescriptionId)
    {
        try
        {
            return await _connection.QueryAsync<PrescriptionVersionSummary>(
                "usp_PrescriptionVersion_GetAll",
                new { PrescriptionId = prescriptionId },
                commandType: CommandType.StoredProcedure);
        }
        catch (SqlException ex)
        {
            _logger.LogError(ex, "Database error in {Method}", nameof(GetAllAsync));
            throw TranslateSqlException(ex);
        }
    }

    public async Task<PrescriptionVersionDetail> GetByVersionAsync(int prescriptionId, int versionNumber)
    {
        var parameters = new { PrescriptionId = prescriptionId, VersionNumber = versionNumber };

        try
        {
            using var multi = await _connection.QueryMultipleAsync(
                "usp_PrescriptionVersion_GetByVersion",
                parameters,
                commandType: CommandType.StoredProcedure);

            var detail = await multi.ReadSingleAsync<PrescriptionVersionDetail>();
            detail.Items = await multi.ReadAsync<PrescriptionVersionItemDetail>();

            return detail;
        }
        catch (SqlException ex)
        {
            _logger.LogError(ex, "Database error in {Method}", nameof(GetByVersionAsync));
            throw TranslateSqlException(ex);
        }
    }

    public async Task<PrescriptionRestoreResult> RestoreAsync(int prescriptionId, int versionNumber, string restoredBy)
    {
        var parameters = new { PrescriptionId = prescriptionId, VersionNumber = versionNumber, RestoredBy = restoredBy };

        try
        {
            return await _connection.QuerySingleAsync<PrescriptionRestoreResult>(
                "usp_Prescription_RestoreVersion",
                parameters,
                commandType: CommandType.StoredProcedure);
        }
        catch (SqlException ex)
        {
            _logger.LogError(ex, "Database error in {Method}", nameof(RestoreAsync));
            throw TranslateSqlException(ex);
        }
    }

    // Only the error numbers these three stored procedures can actually raise
    // (50048/50049/50051) - the fuller 50041-50047 range belongs to Create/Update and is
    // translated by PrescriptionRepository instead.
    private static Exception TranslateSqlException(SqlException ex)
    {
        return ex.Number switch
        {
            50048 => new PrescriptionNotFoundException(),
            50049 => new PrescriptionNotEditableException(),
            50051 => new PrescriptionVersionNotFoundException(),
            _ => ex
        };
    }
}
