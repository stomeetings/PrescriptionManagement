using System.Data;
using System.Text.Json;
using Dapper;
using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Logging;
using Prescription.Application.Exceptions;
using Prescription.Application.Repositories;
using Prescription.Domain.Entities;
// See IPrescriptionRepository.cs for why this alias exists on every file that
// references the Prescription entity type.
using PrescriptionEntity = Prescription.Domain.Entities.Prescription;

namespace Prescription.Infrastructure.Repositories;

// Logs every database exception before translating/rethrowing it, matching
// PatientMedicationRepository's identical, more-thorough-than-Patient/Medicine logging
// discipline (Step 7's own precedent).
public class PrescriptionRepository : IPrescriptionRepository
{
    private readonly IDbConnection _connection;
    private readonly ILogger<PrescriptionRepository> _logger;

    public PrescriptionRepository(IDbConnection connection, ILogger<PrescriptionRepository> logger)
    {
        _connection = connection;
        _logger = logger;
    }

    public async Task<PrescriptionCreateResult> CreateDraftAsync(PrescriptionEntity prescription, IEnumerable<PrescriptionItem> items, string createdBy)
    {
        // Shredded server-side via OPENJSON (usp_Prescription_CreateDraft) - no
        // User-Defined Table Type precedent exists yet in this project, and this keeps
        // the calling convention consistent with this project's existing FOR JSON PATH
        // usage elsewhere.
        var itemsJson = JsonSerializer.Serialize(items.Select(item => new
        {
            patientMedicationId = item.PatientMedicationId,
            medicineId = item.MedicineId,
            medicineName = item.MedicineNameSnapshot,
            genericName = item.GenericNameSnapshot,
            strength = item.StrengthSnapshot,
            dosageForm = item.DosageFormSnapshot,
            route = item.RouteSnapshot,
            dose = item.Dose,
            doseUnitId = item.DoseUnitId,
            doseUnit = item.DoseUnitSnapshot,
            frequencyId = item.FrequencyId,
            frequency = item.FrequencySnapshot,
            duration = item.Duration,
            durationUnitId = item.DurationUnitId,
            durationUnit = item.DurationUnitSnapshot,
            quantity = item.Quantity,
            instructions = item.Instructions,
            prn = item.PRN
        }));

        var parameters = new DynamicParameters();
        parameters.Add("DraftPrescriptionId", prescription.DraftPrescriptionId);
        parameters.Add("PatientId", prescription.PatientId);
        parameters.Add("ProviderUserAccountId", prescription.ProviderUserAccountId);
        parameters.Add("Xhtml", prescription.Xhtml);
        parameters.Add("ClinicalNotes", prescription.ClinicalNotes);
        parameters.Add("IssueDate", prescription.IssueDate);
        parameters.Add("ItemsJson", itemsJson);
        parameters.Add("CreatedBy", createdBy);
        parameters.Add("PrescriptionId", dbType: DbType.Int32, direction: ParameterDirection.Output);

        try
        {
            var result = await _connection.QuerySingleAsync<PrescriptionCreateResult>(
                "usp_Prescription_CreateDraft",
                parameters,
                commandType: CommandType.StoredProcedure);

            return result;
        }
        catch (SqlException ex)
        {
            _logger.LogError(ex, "Database error in {Method}", nameof(CreateDraftAsync));
            throw TranslateSqlException(ex);
        }
    }

    public async Task<PrescriptionUpdateResult> UpdateDraftAsync(
        int prescriptionId,
        string clinicalNotes,
        string xhtml,
        IEnumerable<PrescriptionItem> items,
        byte[] rowVersion,
        string updatedBy)
    {
        // Same OPENJSON shredding convention as CreateDraftAsync - kept as its own
        // explicit block rather than a shared helper (this project's established
        // preference: flat, duplicated code over a shared abstraction two call sites
        // don't clearly warrant).
        var itemsJson = JsonSerializer.Serialize(items.Select(item => new
        {
            patientMedicationId = item.PatientMedicationId,
            medicineId = item.MedicineId,
            medicineName = item.MedicineNameSnapshot,
            genericName = item.GenericNameSnapshot,
            strength = item.StrengthSnapshot,
            dosageForm = item.DosageFormSnapshot,
            route = item.RouteSnapshot,
            dose = item.Dose,
            doseUnitId = item.DoseUnitId,
            doseUnit = item.DoseUnitSnapshot,
            frequencyId = item.FrequencyId,
            frequency = item.FrequencySnapshot,
            duration = item.Duration,
            durationUnitId = item.DurationUnitId,
            durationUnit = item.DurationUnitSnapshot,
            quantity = item.Quantity,
            instructions = item.Instructions,
            prn = item.PRN
        }));

        var parameters = new
        {
            PrescriptionId = prescriptionId,
            ClinicalNotes = clinicalNotes,
            Xhtml = xhtml,
            ItemsJson = itemsJson,
            RowVersion = rowVersion,
            UpdatedBy = updatedBy
        };

        try
        {
            return await _connection.QuerySingleAsync<PrescriptionUpdateResult>(
                "usp_Prescription_UpdateDraft",
                parameters,
                commandType: CommandType.StoredProcedure);
        }
        catch (SqlException ex)
        {
            _logger.LogError(ex, "Database error in {Method}", nameof(UpdateDraftAsync));
            throw TranslateSqlException(ex);
        }
    }

    public async Task<(IEnumerable<PrescriptionListItem> Items, int TotalCount)> GetAllAsync(int page, int pageSize, string sortBy, string sortDirection)
    {
        using var multi = await _connection.QueryMultipleAsync(
            "usp_Prescription_GetAll",
            new { Page = page, PageSize = pageSize, SortBy = sortBy, SortDirection = sortDirection },
            commandType: CommandType.StoredProcedure);

        var items = (await multi.ReadAsync<PrescriptionListItem>()).ToList();
        var totalCount = await multi.ReadSingleAsync<int>();

        return (items, totalCount);
    }

    public async Task<(IEnumerable<PrescriptionListItem> Items, int TotalCount)> SearchAsync(
        int page,
        int pageSize,
        string? searchTerm,
        string? statusCode,
        DateTime? issueDateFrom,
        DateTime? issueDateTo,
        DateTime? expiryDateFrom,
        DateTime? expiryDateTo,
        int? patientId,
        int? providerUserAccountId,
        string sortBy,
        string sortDirection)
    {
        var parameters = new
        {
            Page = page,
            PageSize = pageSize,
            SearchTerm = searchTerm,
            StatusCode = statusCode,
            IssueDateFrom = issueDateFrom,
            IssueDateTo = issueDateTo,
            ExpiryDateFrom = expiryDateFrom,
            ExpiryDateTo = expiryDateTo,
            PatientId = patientId,
            ProviderUserAccountId = providerUserAccountId,
            SortBy = sortBy,
            SortDirection = sortDirection
        };

        using var multi = await _connection.QueryMultipleAsync(
            "usp_Prescription_Search",
            parameters,
            commandType: CommandType.StoredProcedure);

        var items = (await multi.ReadAsync<PrescriptionListItem>()).ToList();
        var totalCount = await multi.ReadSingleAsync<int>();

        return (items, totalCount);
    }

    public async Task<PrescriptionDetail?> GetByIdAsync(int prescriptionId)
    {
        try
        {
            return await _connection.QuerySingleOrDefaultAsync<PrescriptionDetail>(
                "usp_Prescription_GetById",
                new { PrescriptionId = prescriptionId },
                commandType: CommandType.StoredProcedure);
        }
        catch (SqlException ex)
        {
            _logger.LogError(ex, "Database error in {Method}", nameof(GetByIdAsync));
            throw;
        }
    }

    public async Task<PrescriptionFullDetail?> GetDetailsByIdAsync(int prescriptionId)
    {
        using var multi = await _connection.QueryMultipleAsync(
            "usp_Prescription_GetDetailsById",
            new { PrescriptionId = prescriptionId },
            commandType: CommandType.StoredProcedure);

        var header = await multi.ReadSingleOrDefaultAsync<PrescriptionDetailsView>();
        var items = (await multi.ReadAsync<PrescriptionDetailItem>()).ToList();
        var timeline = (await multi.ReadAsync<PrescriptionTimelineEvent>()).ToList();

        if (header is null)
        {
            return null;
        }

        return new PrescriptionFullDetail { Header = header, Items = items, Timeline = timeline };
    }

    public async Task<int> LogPdfGeneratedAsync(int prescriptionId, string changedBy)
    {
        var parameters = new DynamicParameters();
        parameters.Add("PrescriptionId", prescriptionId);
        parameters.Add("ChangedBy", changedBy);
        parameters.Add("DownloadCount", dbType: DbType.Int32, direction: ParameterDirection.Output);

        try
        {
            await _connection.ExecuteAsync(
                "usp_Prescription_LogPdfGenerated",
                parameters,
                commandType: CommandType.StoredProcedure);
        }
        catch (SqlException ex)
        {
            _logger.LogError(ex, "Database error in {Method}", nameof(LogPdfGeneratedAsync));
            throw;
        }

        return parameters.Get<int>("DownloadCount");
    }

    // Translates the custom error numbers raised by usp_Prescription_CreateDraft/
    // usp_Prescription_UpdateDraft (see database/StoredProcedures) into typed exceptions
    // - mirrors PatientMedicationRepository.TranslateSqlException's identical role,
    // using the 50041-50051 range (Step 18.7 extends it with 50048-50051 for Update/
    // Restore/version lookup).
    private static Exception TranslateSqlException(SqlException ex)
    {
        return ex.Number switch
        {
            50041 => new InvalidPatientReferenceException(),
            50042 => new InvalidProviderReferenceException(),
            50043 => new MissingPrescriptionXhtmlException(),
            50044 => new NoPrescriptionMedicationsException(),
            50045 => new DuplicatePrescriptionDraftException(),
            50046 => new InvalidPrescriptionDataException(),
            50047 => new InvalidOperationException("PrescriptionStatus 'DRAFT' is not seeded. Run LookupSeedData.sql."),
            50048 => new PrescriptionNotFoundException(),
            50049 => new PrescriptionNotEditableException(),
            50050 => new PrescriptionConcurrencyConflictException(),
            50051 => new PrescriptionVersionNotFoundException(),
            _ => ex
        };
    }
}
