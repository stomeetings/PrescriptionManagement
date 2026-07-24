using System.Data;
using Dapper;
using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Logging;
using Prescription.Application.Exceptions;
using Prescription.Application.Repositories;

namespace Prescription.Infrastructure.Repositories;

// Separate repository from PrescriptionRepository, mirroring PrescriptionFinalizeRepository/
// PrescriptionRenewalRepository's identical one-concern-per-repository precedent already
// established for this module.
public class PrescriptionCancellationRepository : IPrescriptionCancellationRepository
{
    private readonly IDbConnection _connection;
    private readonly ILogger<PrescriptionCancellationRepository> _logger;

    public PrescriptionCancellationRepository(IDbConnection connection, ILogger<PrescriptionCancellationRepository> logger)
    {
        _connection = connection;
        _logger = logger;
    }

    public async Task<PrescriptionCancellationResult> CancelAsync(
        int prescriptionId,
        string cancellationType,
        string cancellationReason,
        string comments,
        string cancelledBy)
    {
        var parameters = new
        {
            PrescriptionId = prescriptionId,
            CancellationType = cancellationType,
            CancellationReason = cancellationReason,
            Comments = comments,
            CancelledBy = cancelledBy
        };

        try
        {
            return await _connection.QuerySingleAsync<PrescriptionCancellationResult>(
                "usp_Prescription_Cancel",
                parameters,
                commandType: CommandType.StoredProcedure);
        }
        catch (SqlException ex)
        {
            _logger.LogError(ex, "Database error in {Method}", nameof(CancelAsync));
            throw TranslateSqlException(ex);
        }
    }

    // Only the error numbers usp_Prescription_Cancel can actually raise.
    private static Exception TranslateSqlException(SqlException ex)
    {
        return ex.Number switch
        {
            50047 => new InvalidOperationException("PrescriptionStatus 'DRAFT'/'CANCELLED'/'DISPENSED' is not seeded. Run LookupSeedData.sql."),
            50048 => new PrescriptionNotFoundException(),
            50062 => new PrescriptionNotEligibleForCancellationException(),
            50063 => new PrescriptionAlreadyCancelledException(),
            50064 => new PrescriptionFullyDispensedException(),
            50065 => new PrescriptionCancellationConflictException(),
            _ => ex
        };
    }
}
