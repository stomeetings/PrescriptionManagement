using System.Data;
using System.Linq;
using Dapper;
using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Logging;
using Prescription.Application.Exceptions;
using Prescription.Application.Repositories;
using Prescription.Domain.Entities;

namespace Prescription.Infrastructure.Repositories;

public class PrescriptionItemAmendmentRepository : IPrescriptionItemAmendmentRepository
{
    private readonly IDbConnection _connection;
    private readonly ILogger<PrescriptionItemAmendmentRepository> _logger;

    public PrescriptionItemAmendmentRepository(IDbConnection connection, ILogger<PrescriptionItemAmendmentRepository> logger)
    {
        _connection = connection;
        _logger = logger;
    }

    public async Task<PrescriptionItemActiveLookup?> FindActiveItemAsync(int patientMedicationId)
    {
        var items = await _connection.QueryAsync<PrescriptionItemActiveLookup>(
            "usp_PrescriptionItem_FindActiveByPatientMedication",
            new { PatientMedicationId = patientMedicationId },
            commandType: CommandType.StoredProcedure);

        return items.FirstOrDefault();
    }

    public async Task<IEnumerable<PrescriptionItemActiveLookup>> FindAllActiveItemsAsync(int patientMedicationId)
    {
        return await _connection.QueryAsync<PrescriptionItemActiveLookup>(
            "usp_PrescriptionItem_FindActiveByPatientMedication",
            new { PatientMedicationId = patientMedicationId },
            commandType: CommandType.StoredProcedure);
    }

    public async Task<PrescriptionItemAmendmentResult> AmendAsync(
        int patientMedicationId,
        string reason,
        PrescriptionItem newItemSnapshot,
        string newXhtml,
        DateTime newIssueDate,
        string amendedBy)
    {
        var parameters = new
        {
            PatientMedicationId = patientMedicationId,
            Reason = reason,
            NewMedicineId = newItemSnapshot.MedicineId,
            NewMedicineNameSnapshot = newItemSnapshot.MedicineNameSnapshot,
            NewGenericNameSnapshot = newItemSnapshot.GenericNameSnapshot,
            NewStrengthSnapshot = newItemSnapshot.StrengthSnapshot,
            NewDosageFormSnapshot = newItemSnapshot.DosageFormSnapshot,
            NewRouteSnapshot = newItemSnapshot.RouteSnapshot,
            NewDose = newItemSnapshot.Dose,
            NewDoseUnitId = newItemSnapshot.DoseUnitId,
            NewDoseUnitSnapshot = newItemSnapshot.DoseUnitSnapshot,
            NewFrequencyId = newItemSnapshot.FrequencyId,
            NewFrequencySnapshot = newItemSnapshot.FrequencySnapshot,
            NewDuration = newItemSnapshot.Duration,
            NewDurationUnitId = newItemSnapshot.DurationUnitId,
            NewDurationUnitSnapshot = newItemSnapshot.DurationUnitSnapshot,
            NewQuantity = newItemSnapshot.Quantity,
            NewInstructions = newItemSnapshot.Instructions,
            NewPRN = newItemSnapshot.PRN,
            NewXhtml = newXhtml,
            NewIssueDate = newIssueDate,
            AmendedBy = amendedBy
        };

        try
        {
            // Two result sets: one row per distinct original prescription superseded,
            // then one row for the single new replacement prescription - see
            // usp_PrescriptionItem_Amend's own final SELECTs.
            using var multi = await _connection.QueryMultipleAsync(
                "usp_PrescriptionItem_Amend",
                parameters,
                commandType: CommandType.StoredProcedure);

            var originalPrescriptions = (await multi.ReadAsync<OriginalPrescriptionAmendmentInfo>()).ToList();
            var replacement = await multi.ReadSingleAsync<ReplacementPrescriptionAmendmentRow>();

            return new PrescriptionItemAmendmentResult
            {
                OriginalPrescriptions = originalPrescriptions,
                ReplacementPrescriptionId = replacement.ReplacementPrescriptionId,
                ReplacementPrescriptionNumber = replacement.ReplacementPrescriptionNumber,
                ReplacementStatusCode = replacement.ReplacementStatusCode,
                ReplacementStatusDisplayText = replacement.ReplacementStatusDisplayText,
                NewScid = replacement.NewScid
            };
        }
        catch (SqlException ex)
        {
            _logger.LogError(ex, "Database error in {Method}", nameof(AmendAsync));
            throw TranslateSqlException(ex);
        }
    }

    private class ReplacementPrescriptionAmendmentRow
    {
        public int ReplacementPrescriptionId { get; set; }
        public string ReplacementPrescriptionNumber { get; set; }
        public string ReplacementStatusCode { get; set; }
        public string ReplacementStatusDisplayText { get; set; }
        public string NewScid { get; set; }
    }

    private static Exception TranslateSqlException(SqlException ex)
    {
        return ex.Number switch
        {
            50047 => new InvalidOperationException("PrescriptionStatus 'PENDING' is not seeded. Run LookupSeedData.sql."),
            50058 => new PrescriptionNotFoundException(),
            50059 => new PrescriptionItemAlreadySupersededException(),
            _ => ex
        };
    }
}
