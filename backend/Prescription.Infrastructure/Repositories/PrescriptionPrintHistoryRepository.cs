using System.Data;
using Dapper;
using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Logging;
using Prescription.Application.Repositories;

namespace Prescription.Infrastructure.Repositories;

public class PrescriptionPrintHistoryRepository : IPrescriptionPrintHistoryRepository
{
    private readonly IDbConnection _connection;
    private readonly ILogger<PrescriptionPrintHistoryRepository> _logger;

    public PrescriptionPrintHistoryRepository(IDbConnection connection, ILogger<PrescriptionPrintHistoryRepository> logger)
    {
        _connection = connection;
        _logger = logger;
    }

    public async Task<PrescriptionReprintResult> ReprintAsync(int prescriptionId, string reason, int copies, string printedBy)
    {
        var parameters = new
        {
            PrescriptionId = prescriptionId,
            Reason = reason,
            CopyCount = copies,
            PrintedBy = printedBy
        };

        try
        {
            return await _connection.QuerySingleAsync<PrescriptionReprintResult>(
                "usp_Prescription_Reprint",
                parameters,
                commandType: CommandType.StoredProcedure);
        }
        catch (SqlException ex)
        {
            _logger.LogError(ex, "Database error in {Method}", nameof(ReprintAsync));
            throw;
        }
    }
}
