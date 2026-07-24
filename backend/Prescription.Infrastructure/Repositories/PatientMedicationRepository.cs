using System.Data;
using Dapper;
using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Logging;
using Prescription.Application.Exceptions;
using Prescription.Application.Repositories;
using Prescription.Domain.Entities;

namespace Prescription.Infrastructure.Repositories;

// Logs every database exception before translating/rethrowing it - a new, more
// thorough logging discipline than PatientRepository/MedicineRepository (neither of
// which takes an ILogger at all), added because this task's own Error Handling
// requirements explicitly ask for it. Never swallows an exception: every catch block
// either rethrows the original (bare `throw;`) or a translated typed exception.
public class PatientMedicationRepository : IPatientMedicationRepository
{
    private readonly IDbConnection _connection;
    private readonly ILogger<PatientMedicationRepository> _logger;

    public PatientMedicationRepository(IDbConnection connection, ILogger<PatientMedicationRepository> logger)
    {
        _connection = connection;
        _logger = logger;
    }

    public async Task<(IEnumerable<PatientMedicationRecord> Items, int TotalCount)> GetPagedAsync(
        int page,
        int pageSize,
        string? searchTerm,
        string? statusCode,
        bool? isPrn,
        string sortBy,
        string sortDirection)
    {
        try
        {
            using var multi = await _connection.QueryMultipleAsync(
                "usp_PatientMedication_GetAll",
                new { Page = page, PageSize = pageSize, SearchTerm = searchTerm, StatusCode = statusCode, IsPrn = isPrn, SortBy = sortBy, SortDirection = sortDirection },
                commandType: CommandType.StoredProcedure);

            var rows = (await multi.ReadAsync<PatientMedicationListRow>()).ToList();
            var totalCount = await multi.ReadSingleAsync<int>();

            return (rows.Select(row => row.ToRecord()).ToList(), totalCount);
        }
        catch (SqlException ex)
        {
            _logger.LogError(ex, "Database error in {Method}", nameof(GetPagedAsync));
            throw;
        }
    }

    public async Task<PatientMedicationDetail?> GetByIdAsync(int patientMedicationId)
    {
        try
        {
            var row = await _connection.QuerySingleOrDefaultAsync<PatientMedicationDetailRow>(
                "usp_PatientMedication_GetById",
                new { PatientMedicationId = patientMedicationId },
                commandType: CommandType.StoredProcedure);

            return row?.ToDetail();
        }
        catch (SqlException ex)
        {
            _logger.LogError(ex, "Database error in {Method}", nameof(GetByIdAsync));
            throw;
        }
    }

    public async Task<(IEnumerable<PatientMedicationRecord> Items, int TotalCount)> GetCurrentByPatientIdAsync(
        int patientId,
        int page,
        int pageSize,
        string sortBy,
        string sortDirection)
    {
        try
        {
            using var multi = await _connection.QueryMultipleAsync(
                "usp_PatientMedication_GetCurrent",
                new { PatientId = patientId, Page = page, PageSize = pageSize, SortBy = sortBy, SortDirection = sortDirection },
                commandType: CommandType.StoredProcedure);

            var rows = (await multi.ReadAsync<PatientMedicationListRow>()).ToList();
            var totalCount = await multi.ReadSingleAsync<int>();

            return (rows.Select(row => row.ToRecord()).ToList(), totalCount);
        }
        catch (SqlException ex)
        {
            _logger.LogError(ex, "Database error in {Method}", nameof(GetCurrentByPatientIdAsync));
            throw;
        }
    }

    public async Task<(IEnumerable<PatientMedicationRecord> Items, int TotalCount)> GetHistoryAsync(
        int patientId,
        int page,
        int pageSize)
    {
        try
        {
            using var multi = await _connection.QueryMultipleAsync(
                "usp_PatientMedication_GetHistory",
                new { PatientId = patientId, Page = page, PageSize = pageSize },
                commandType: CommandType.StoredProcedure);

            var rows = (await multi.ReadAsync<PatientMedicationListRow>()).ToList();
            var totalCount = await multi.ReadSingleAsync<int>();

            return (rows.Select(row => row.ToRecord()).ToList(), totalCount);
        }
        catch (SqlException ex)
        {
            _logger.LogError(ex, "Database error in {Method}", nameof(GetHistoryAsync));
            throw;
        }
    }

    public async Task<(IEnumerable<PatientMedicationRecord> Items, int TotalCount)> SearchAsync(
        int page,
        int pageSize,
        string? searchTerm,
        int? patientId,
        string? statusCode,
        bool? isPrn,
        DateTime? startDateFrom,
        DateTime? startDateTo,
        DateTime? endDateFrom,
        DateTime? endDateTo,
        string sortBy,
        string sortDirection)
    {
        try
        {
            using var multi = await _connection.QueryMultipleAsync(
                "usp_PatientMedication_Search",
                new
                {
                    Page = page,
                    PageSize = pageSize,
                    SearchTerm = searchTerm,
                    PatientId = patientId,
                    StatusCode = statusCode,
                    IsPrn = isPrn,
                    StartDateFrom = startDateFrom,
                    StartDateTo = startDateTo,
                    EndDateFrom = endDateFrom,
                    EndDateTo = endDateTo,
                    SortBy = sortBy,
                    SortDirection = sortDirection
                },
                commandType: CommandType.StoredProcedure);

            var rows = (await multi.ReadAsync<PatientMedicationListRow>()).ToList();
            var totalCount = await multi.ReadSingleAsync<int>();

            return (rows.Select(row => row.ToRecord()).ToList(), totalCount);
        }
        catch (SqlException ex)
        {
            _logger.LogError(ex, "Database error in {Method}", nameof(SearchAsync));
            throw;
        }
    }

    public async Task<int> CreateAsync(PatientMedication patientMedication, string createdBy)
    {
        var parameters = new DynamicParameters();
        parameters.Add("PatientId", patientMedication.PatientId);
        parameters.Add("MedicineId", patientMedication.MedicineId);
        parameters.Add("Dose", patientMedication.Dose);
        parameters.Add("DoseUnitId", patientMedication.DoseUnitId);
        parameters.Add("FrequencyId", patientMedication.FrequencyId);
        parameters.Add("Duration", patientMedication.Duration);
        parameters.Add("DurationUnitId", patientMedication.DurationUnitId);
        parameters.Add("Quantity", patientMedication.Quantity);
        parameters.Add("Instructions", patientMedication.Instructions);
        parameters.Add("PRN", patientMedication.PRN);
        parameters.Add("StartDate", patientMedication.StartDate);
        parameters.Add("EndDate", patientMedication.EndDate);
        parameters.Add("ClinicalNotes", patientMedication.ClinicalNotes);
        parameters.Add("PrescribedByUserAccountId", patientMedication.PrescribedByUserAccountId);
        parameters.Add("PatientMedicationSourceId", patientMedication.PatientMedicationSourceId);
        parameters.Add("PatientMedicationStatusId", patientMedication.PatientMedicationStatusId);
        parameters.Add("CreatedBy", createdBy);
        parameters.Add("PatientMedicationId", dbType: DbType.Int32, direction: ParameterDirection.Output);

        try
        {
            await _connection.ExecuteAsync(
                "usp_PatientMedication_Create",
                parameters,
                commandType: CommandType.StoredProcedure);
        }
        catch (SqlException ex)
        {
            _logger.LogError(ex, "Database error in {Method}", nameof(CreateAsync));
            throw TranslateSqlException(ex);
        }

        return parameters.Get<int>("PatientMedicationId");
    }

    public async Task UpdateAsync(PatientMedication patientMedication, string updatedBy)
    {
        var parameters = new
        {
            patientMedication.PatientMedicationId,
            patientMedication.Dose,
            patientMedication.DoseUnitId,
            patientMedication.FrequencyId,
            patientMedication.Duration,
            patientMedication.DurationUnitId,
            patientMedication.Quantity,
            patientMedication.Instructions,
            patientMedication.PRN,
            patientMedication.StartDate,
            patientMedication.EndDate,
            patientMedication.ClinicalNotes,
            patientMedication.PrescribedByUserAccountId,
            patientMedication.RowVersion,
            UpdatedBy = updatedBy
        };

        try
        {
            await _connection.ExecuteAsync(
                "usp_PatientMedication_Update",
                parameters,
                commandType: CommandType.StoredProcedure);
        }
        catch (SqlException ex)
        {
            _logger.LogError(ex, "Database error in {Method}", nameof(UpdateAsync));
            throw TranslateSqlException(ex);
        }
    }

    public async Task StopAsync(int patientMedicationId, int stoppedStatusId, string stoppedBy)
    {
        try
        {
            await _connection.ExecuteAsync(
                "usp_PatientMedication_Stop",
                new { PatientMedicationId = patientMedicationId, PatientMedicationStatusId = stoppedStatusId, StoppedBy = stoppedBy },
                commandType: CommandType.StoredProcedure);
        }
        catch (SqlException ex)
        {
            _logger.LogError(ex, "Database error in {Method}", nameof(StopAsync));
            throw TranslateSqlException(ex);
        }
    }

    public async Task<int> ResumeAsync(
        int patientMedicationId,
        DateTime startDate,
        decimal? dose,
        int? doseUnitId,
        int? frequencyId,
        int? duration,
        int? durationUnitId,
        decimal? quantity,
        string? instructions,
        bool? prn,
        DateTime? endDate,
        string? clinicalNotes,
        int? prescribedByUserAccountId,
        int activeStatusId,
        string resumedBy)
    {
        var parameters = new DynamicParameters();
        parameters.Add("PatientMedicationId", patientMedicationId);
        parameters.Add("StartDate", startDate);
        parameters.Add("Dose", dose);
        parameters.Add("DoseUnitId", doseUnitId);
        parameters.Add("FrequencyId", frequencyId);
        parameters.Add("Duration", duration);
        parameters.Add("DurationUnitId", durationUnitId);
        parameters.Add("Quantity", quantity);
        parameters.Add("Instructions", instructions);
        parameters.Add("PRN", prn);
        parameters.Add("EndDate", endDate);
        parameters.Add("ClinicalNotes", clinicalNotes);
        parameters.Add("PrescribedByUserAccountId", prescribedByUserAccountId);
        parameters.Add("PatientMedicationStatusId", activeStatusId);
        parameters.Add("ResumedBy", resumedBy);
        parameters.Add("NewPatientMedicationId", dbType: DbType.Int32, direction: ParameterDirection.Output);

        try
        {
            await _connection.ExecuteAsync(
                "usp_PatientMedication_Resume",
                parameters,
                commandType: CommandType.StoredProcedure);
        }
        catch (SqlException ex)
        {
            _logger.LogError(ex, "Database error in {Method}", nameof(ResumeAsync));
            throw TranslateSqlException(ex);
        }

        return parameters.Get<int>("NewPatientMedicationId");
    }

    // Future Integration: no dedicated "prepare a prescription draft" stored procedure
    // exists (Step 6 was never asked to create one, and this step excludes SQL
    // changes). Implemented as repeated calls to the existing usp_PatientMedication_
    // GetById instead - one round trip per requested Id. This is a pragmatic, working
    // implementation, not a performance-optimized one: if this becomes a real hot path,
    // a future SQL step should add a table-valued-parameter-based
    // usp_PatientMedication_GetByIds for a single round trip. Returns only the Ids that
    // actually resolve to a row - filtering for "must be current"/"must belong to this
    // patient" (api-spec.md section 4.8 rules 2-3) is business logic and belongs to the
    // Service layer, not here.
    public async Task<IEnumerable<PatientMedicationDetail>> GeneratePrescriptionDraftAsync(IEnumerable<int> patientMedicationIds)
    {
        var results = new List<PatientMedicationDetail>();

        try
        {
            foreach (var id in patientMedicationIds)
            {
                var detail = await GetByIdAsync(id);
                if (detail is not null)
                {
                    results.Add(detail);
                }
            }
        }
        catch (SqlException ex)
        {
            _logger.LogError(ex, "Database error in {Method}", nameof(GeneratePrescriptionDraftAsync));
            throw;
        }

        return results;
    }

    // Translates the custom error numbers raised by usp_PatientMedication_Create/
    // Update/Stop/Resume (see database/StoredProcedures) into typed exceptions, so the
    // Service layer can catch a specific condition instead of parsing SQL Server error
    // text or inspecting raw error numbers itself. Mirrors Patient/Medicine
    // Repository.TranslateSqlException's identical role, using the distinct 50031-50040
    // range from the approved stored procedures.
    private static Exception TranslateSqlException(SqlException ex)
    {
        return ex.Number switch
        {
            50031 => new InvalidPatientReferenceException(),
            50032 => new InvalidMedicineReferenceException(),
            50033 => new DuplicateActiveMedicationException(),
            50034 => new PatientMedicationNotFoundException(),
            50035 => new PatientMedicationConcurrencyConflictException(),
            50036 => new PatientMedicationAlreadyStoppedException(),
            50037 => new PatientMedicationNotStoppedException(),
            50038 => new InvalidMedicationDateRangeException(),
            50039 => new InvalidMedicationDataException(),
            50040 => new PatientMedicationStoppedReadOnlyException(),
            _ => ex
        };
    }

    // Maps usp_PatientMedication_GetAll/GetCurrent/GetHistory/Search's shared row shape.
    // Known limitation: these procedures select each lookup's Code/DisplayText but not
    // its own raw numeric Id (only PatientMedication.PatientId/MedicineId - the two core
    // FKs - are selected as real Ids). MedicineForm/MedicineRoute/DoseUnit/Frequency/
    // DurationUnit/Status below therefore have their Id properties left at 0 - fine for
    // a read/list/history view (nothing here needs to write these lookups back), but
    // these objects are not suitable for reuse as write-side entities. PatientFullName
    // is a precomputed SQL concatenation with nowhere to go on the Patient entity itself
    // (which has no FullName property) - exposed directly on PatientMedicationRecord
    // instead of forced into Patient.
    private class PatientMedicationListRow
    {
        public int PatientMedicationId { get; set; }
        public int PatientId { get; set; }
        public string PatientNumber { get; set; }
        public string PatientFullName { get; set; }
        public int MedicineId { get; set; }
        public string MedicineName { get; set; }
        public string GenericName { get; set; }
        public string Strength { get; set; }
        public string MedicineFormCode { get; set; }
        public string MedicineFormDisplayText { get; set; }
        public string MedicineRouteCode { get; set; }
        public string MedicineRouteDisplayText { get; set; }
        public decimal Dose { get; set; }
        public string DoseUnitCode { get; set; }
        public string DoseUnitDisplayText { get; set; }
        public string FrequencyCode { get; set; }
        public string FrequencyDisplayText { get; set; }
        public int Duration { get; set; }
        public string DurationUnitCode { get; set; }
        public string DurationUnitDisplayText { get; set; }
        public decimal Quantity { get; set; }
        public bool PRN { get; set; }
        public DateTime StartDate { get; set; }
        public DateTime? EndDate { get; set; }
        public string StatusCode { get; set; }
        public string StatusDisplayText { get; set; }
        public int? ResumedFromPatientMedicationId { get; set; } // only present in usp_PatientMedication_GetHistory's result set
        public string PrescriptionLinkStatus { get; set; } // only present in usp_PatientMedication_GetCurrent's result set - see that procedure's own comment

        public PatientMedicationRecord ToRecord() => new()
        {
            PatientMedication = new PatientMedication
            {
                PatientMedicationId = PatientMedicationId,
                PatientId = PatientId,
                MedicineId = MedicineId,
                Dose = Dose,
                Duration = Duration,
                Quantity = Quantity,
                PRN = PRN,
                StartDate = StartDate,
                EndDate = EndDate,
                ResumedFromPatientMedicationId = ResumedFromPatientMedicationId
            },
            Patient = new Patient { PatientId = PatientId, PatientNumber = PatientNumber },
            PatientFullName = PatientFullName,
            Medicine = new Medicine { MedicineId = MedicineId, MedicineName = MedicineName, GenericName = GenericName, Strength = Strength },
            MedicineForm = new MedicineForm { Code = MedicineFormCode, DisplayText = MedicineFormDisplayText },
            MedicineRoute = new MedicineRoute { Code = MedicineRouteCode, DisplayText = MedicineRouteDisplayText },
            DoseUnit = new DoseUnit { Code = DoseUnitCode, DisplayText = DoseUnitDisplayText },
            Frequency = new Frequency { Code = FrequencyCode, DisplayText = FrequencyDisplayText },
            DurationUnit = new DurationUnit { Code = DurationUnitCode, DisplayText = DurationUnitDisplayText },
            Status = new PatientMedicationStatus { Code = StatusCode, DisplayText = StatusDisplayText },
            PrescriptionLinkStatus = PrescriptionLinkStatus
        };
    }

    // Maps usp_PatientMedication_GetById's row. Same raw-lookup-Id limitation as
    // PatientMedicationListRow above.
    private class PatientMedicationDetailRow
    {
        public int PatientMedicationId { get; set; }
        public int PatientId { get; set; }
        public string PatientNumber { get; set; }
        public string PatientFullName { get; set; }
        public int MedicineId { get; set; }
        public string MedicineCode { get; set; }
        public string MedicineName { get; set; }
        public string GenericName { get; set; }
        public string Strength { get; set; }
        public bool MedicineIsActive { get; set; }
        public string MedicineFormCode { get; set; }
        public string MedicineFormDisplayText { get; set; }
        public string MedicineRouteCode { get; set; }
        public string MedicineRouteDisplayText { get; set; }
        public decimal Dose { get; set; }
        public int DoseUnitId { get; set; }
        public string DoseUnitCode { get; set; }
        public string DoseUnitDisplayText { get; set; }
        public int FrequencyId { get; set; }
        public string FrequencyCode { get; set; }
        public string FrequencyDisplayText { get; set; }
        public int Duration { get; set; }
        public int DurationUnitId { get; set; }
        public string DurationUnitCode { get; set; }
        public string DurationUnitDisplayText { get; set; }
        public decimal Quantity { get; set; }
        public string Instructions { get; set; }
        public bool PRN { get; set; }
        public DateTime StartDate { get; set; }
        public DateTime? EndDate { get; set; }
        public string ClinicalNotes { get; set; }
        public int? PrescribedByUserAccountId { get; set; }
        public string PrescribedByFullName { get; set; }
        public string SourceCode { get; set; }
        public string SourceDisplayText { get; set; }
        public string StatusCode { get; set; }
        public string StatusDisplayText { get; set; }
        public bool IsCurrent { get; set; }
        public int? ResumedFromPatientMedicationId { get; set; }
        public DateTime CreatedDate { get; set; }
        public string CreatedBy { get; set; }
        public DateTime? UpdatedDate { get; set; }
        public string UpdatedBy { get; set; }
        public DateTime? StoppedDate { get; set; }
        public string StoppedBy { get; set; }
        public byte[] RowVersion { get; set; }

        public PatientMedicationDetail ToDetail() => new()
        {
            PatientMedication = new PatientMedication
            {
                PatientMedicationId = PatientMedicationId,
                PatientId = PatientId,
                MedicineId = MedicineId,
                Dose = Dose,
                DoseUnitId = DoseUnitId,
                FrequencyId = FrequencyId,
                Duration = Duration,
                DurationUnitId = DurationUnitId,
                Quantity = Quantity,
                Instructions = Instructions,
                PRN = PRN,
                StartDate = StartDate,
                EndDate = EndDate,
                ClinicalNotes = ClinicalNotes,
                PrescribedByUserAccountId = PrescribedByUserAccountId,
                IsCurrent = IsCurrent,
                ResumedFromPatientMedicationId = ResumedFromPatientMedicationId,
                CreatedDate = CreatedDate,
                CreatedBy = CreatedBy,
                UpdatedDate = UpdatedDate,
                UpdatedBy = UpdatedBy,
                StoppedDate = StoppedDate,
                StoppedBy = StoppedBy,
                RowVersion = RowVersion
            },
            Patient = new Patient { PatientId = PatientId, PatientNumber = PatientNumber },
            PatientFullName = PatientFullName,
            Medicine = new Medicine { MedicineId = MedicineId, MedicineCode = MedicineCode, MedicineName = MedicineName, GenericName = GenericName, Strength = Strength, IsActive = MedicineIsActive },
            MedicineForm = new MedicineForm { Code = MedicineFormCode, DisplayText = MedicineFormDisplayText },
            MedicineRoute = new MedicineRoute { Code = MedicineRouteCode, DisplayText = MedicineRouteDisplayText },
            DoseUnit = new DoseUnit { DoseUnitId = DoseUnitId, Code = DoseUnitCode, DisplayText = DoseUnitDisplayText },
            Frequency = new Frequency { FrequencyId = FrequencyId, Code = FrequencyCode, DisplayText = FrequencyDisplayText },
            DurationUnit = new DurationUnit { DurationUnitId = DurationUnitId, Code = DurationUnitCode, DisplayText = DurationUnitDisplayText },
            Status = new PatientMedicationStatus { Code = StatusCode, DisplayText = StatusDisplayText },
            Source = new PatientMedicationSource { Code = SourceCode, DisplayText = SourceDisplayText },
            PrescribedBy = PrescribedByUserAccountId.HasValue ? new UserAccount { UserAccountId = PrescribedByUserAccountId.Value, FullName = PrescribedByFullName } : null
        };
    }
}
