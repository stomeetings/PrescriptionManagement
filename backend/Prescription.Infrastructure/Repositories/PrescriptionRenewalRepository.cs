using System.Data;
using System.Text.Json;
using Dapper;
using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Logging;
using Prescription.Application.Exceptions;
using Prescription.Application.Repositories;

namespace Prescription.Infrastructure.Repositories;

public class PrescriptionRenewalRepository : IPrescriptionRenewalRepository
{
    private readonly IDbConnection _connection;
    private readonly ILogger<PrescriptionRenewalRepository> _logger;

    public PrescriptionRenewalRepository(IDbConnection connection, ILogger<PrescriptionRenewalRepository> logger)
    {
        _connection = connection;
        _logger = logger;
    }

    public async Task<PrescriptionRenewalResult> RenewAsync(
        int originalPrescriptionId,
        IEnumerable<PrescriptionRenewalItemSelection> selectedItems,
        string newXhtml,
        string renewedBy)
    {
        // Same OPENJSON shredding convention as CreateDraftAsync/UpdateDraftAsync - kept
        // as its own explicit block rather than a shared helper (this project's
        // established preference for flat, duplicated code over a shared abstraction).
        var itemsJson = JsonSerializer.Serialize(selectedItems.Select(item => new
        {
            prescriptionItemId = item.PrescriptionItemId,
            quantity = item.Quantity,
            duration = item.Duration,
            instructions = item.Instructions
        }));

        var parameters = new
        {
            OriginalPrescriptionId = originalPrescriptionId,
            ItemsJson = itemsJson,
            NewXhtml = newXhtml,
            RenewedBy = renewedBy
        };

        try
        {
            return await _connection.QuerySingleAsync<PrescriptionRenewalResult>(
                "usp_Prescription_Renew",
                parameters,
                commandType: CommandType.StoredProcedure);
        }
        catch (SqlException ex)
        {
            _logger.LogError(ex, "Database error in {Method}", nameof(RenewAsync));
            throw TranslateSqlException(ex);
        }
    }

    private static Exception TranslateSqlException(SqlException ex)
    {
        return ex.Number switch
        {
            50044 => new NoPrescriptionMedicationsException(),
            50047 => new InvalidOperationException("PrescriptionStatus 'DRAFT' is not seeded. Run LookupSeedData.sql."),
            50048 => new PrescriptionNotFoundException(),
            50060 => new InvalidPrescriptionDataException(),
            50061 => new PrescriptionNotFinalizedException(),
            _ => ex
        };
    }
}
