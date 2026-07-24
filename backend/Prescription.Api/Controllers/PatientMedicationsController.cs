using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using Prescription.Application.Mapping;
using Prescription.Application.Prescriptions;
using Prescription.Application.Prescriptions.Templating;
using Prescription.Application.Services;
using Prescription.Shared.Authorization;
using Prescription.Shared.DTOs;

namespace Prescription.Api.Controllers;

/// <summary>
/// Patient Medication Management endpoints: view/search a patient's current medication
/// list and its history, add/edit entries, stop/resume, and assemble a prescription
/// draft. Administrator and Doctor share full access; Pharmacist and Receptionist are
/// view-only (api-spec.md section 3) - a two-tier authorization model, distinct from
/// Medicine Management's single-write-tier one.
/// </summary>
[ApiController]
[Authorize]
[Route("api/patient-medications")]
public class PatientMedicationsController : ControllerBase
{
    private const string FullAccessRoles = $"{Roles.SystemAdministrator},{Roles.Doctor}";

    private readonly IPatientMedicationService _patientMedicationService;
    private readonly IPatientMedicationPrescriptionService _patientMedicationPrescriptionService;
    private readonly IPatientService _patientService;
    private readonly IUserService _userService;
    private readonly IPrescriptionHtmlGenerator _prescriptionHtmlGenerator;
    private readonly ClinicOptions _clinicOptions;
    private readonly ILogger<PatientMedicationsController> _logger;

    public PatientMedicationsController(
        IPatientMedicationService patientMedicationService,
        IPatientMedicationPrescriptionService patientMedicationPrescriptionService,
        IPatientService patientService,
        IUserService userService,
        IPrescriptionHtmlGenerator prescriptionHtmlGenerator,
        IOptions<ClinicOptions> clinicOptions,
        ILogger<PatientMedicationsController> logger)
    {
        _patientMedicationService = patientMedicationService;
        _patientMedicationPrescriptionService = patientMedicationPrescriptionService;
        _patientService = patientService;
        _userService = userService;
        _prescriptionHtmlGenerator = prescriptionHtmlGenerator;
        _clinicOptions = clinicOptions.Value;
        _logger = logger;
    }

    /// <summary>Cross-patient paginated list of patient medications, with basic query-string search/filter/sort.</summary>
    /// <response code="200">The requested page of patient medications.</response>
    [HttpGet]
    [ProducesResponseType(typeof(PatientMedicationPagedResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<PatientMedicationPagedResponse>> GetPaged(
        [FromQuery] string? searchTerm,
        [FromQuery] string? statusCode,
        [FromQuery] bool? isPrn,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] string sortBy = "createdDate",
        [FromQuery] string sortDirection = "desc")
    {
        var (items, totalCount) = await _patientMedicationService.GetPagedAsync(page, pageSize, searchTerm, statusCode, isPrn, sortBy, sortDirection);

        _logger.LogInformation("Retrieved {Count} of {TotalCount} patient medications (page {Page})", items.Count(), totalCount, page);

        return Ok(items.ToPagedResponse(totalCount, page, pageSize));
    }

    /// <summary>Returns full details for one patient medication.</summary>
    /// <response code="200">The requested patient medication's details.</response>
    /// <response code="404">No patient medication exists with that ID.</response>
    [HttpGet("{patientMedicationId:int}")]
    [ProducesResponseType(typeof(PatientMedicationDetailResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<PatientMedicationDetailResponse>> GetById(int patientMedicationId)
    {
        var detail = await _patientMedicationService.GetByIdAsync(patientMedicationId);

        if (detail is null)
        {
            return NotFound();
        }

        return Ok(detail.ToDetailResponse());
    }

    /// <summary>
    /// Patient Medication and Prescription Synchronization: every prescription this
    /// medication has ever been linked to (Original creation, or a Replacement from the
    /// Amendment &amp; Replacement workflow), chronological, plus the derived Current
    /// Active Prescription/Last Prescription/Replacement Count/Print Count summary.
    /// Empty history is a normal result for a medication never selected onto a finalized
    /// prescription - not an error.
    /// </summary>
    /// <response code="200">The medication's prescription history.</response>
    [HttpGet("{patientMedicationId:int}/prescriptions")]
    [ProducesResponseType(typeof(PatientMedicationPrescriptionHistoryResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<PatientMedicationPrescriptionHistoryResponse>> GetPrescriptionHistory(int patientMedicationId)
    {
        var summary = await _patientMedicationPrescriptionService.GetByPatientMedicationAsync(patientMedicationId);

        var response = new PatientMedicationPrescriptionHistoryResponse
        {
            History = summary.History.Select(entry => new PatientMedicationPrescriptionResponse
            {
                PrescriptionId = entry.PrescriptionId,
                PrescriptionNumber = entry.PrescriptionNumber,
                Scid = entry.Scid,
                IssueDate = entry.IssueDate,
                Status = new PrescriptionStatusResponse { Code = entry.StatusCode, DisplayText = entry.StatusDisplayText },
                RelationshipType = entry.RelationshipType,
                ItemStatus = entry.ItemStatus,
                LinkedBy = entry.LinkedBy,
                LinkedDate = entry.LinkedDate
            }).ToList(),
            CurrentActivePrescriptionNumber = summary.CurrentActivePrescriptionNumber,
            LastPrescriptionNumber = summary.LastPrescriptionNumber,
            ReplacementCount = summary.ReplacementCount,
            PrintCount = summary.PrintCount
        };

        return Ok(response);
    }

    /// <summary>Current (Active) medications for one patient. Never returns stopped entries - use the history endpoint for those.</summary>
    /// <response code="200">The requested page of the patient's current medications.</response>
    /// <response code="404">No patient exists with that ID.</response>
    [HttpGet("~/api/patients/{patientId:int}/medications")]
    [ProducesResponseType(typeof(PatientMedicationPagedResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<PatientMedicationPagedResponse>> GetCurrentByPatient(
        int patientId,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] string sortBy = "startDate",
        [FromQuery] string sortDirection = "asc")
    {
        var (patient, _) = await _patientService.GetPatientByIdAsync(patientId);
        if (patient is null)
        {
            return NotFound();
        }

        var (items, totalCount) = await _patientMedicationService.GetCurrentByPatientIdAsync(patientId, page, pageSize, sortBy, sortDirection);

        _logger.LogInformation("Retrieved {Count} of {TotalCount} current medications for patient {PatientId}", items.Count(), totalCount, patientId);

        return Ok(items.ToPagedResponse(totalCount, page, pageSize));
    }

    /// <summary>The complete medication timeline for one patient - Active and every Stopped entry, in chronological order.</summary>
    /// <response code="200">The patient's medication history.</response>
    /// <response code="404">No patient exists with that ID.</response>
    [HttpGet("~/api/patients/{patientId:int}/medications/history")]
    [ProducesResponseType(typeof(PatientMedicationHistoryResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<PatientMedicationHistoryResponse>> GetHistory(
        int patientId,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        var (patient, _) = await _patientService.GetPatientByIdAsync(patientId);
        if (patient is null)
        {
            return NotFound();
        }

        var (entries, _) = await _patientMedicationService.GetHistoryAsync(patientId, page, pageSize);

        _logger.LogInformation("Retrieved {Count} history entries for patient {PatientId}", entries.Count(), patientId);

        return Ok(entries.ToHistoryResponse(patient.PatientId, patient.PatientNumber, $"{patient.FirstName} {patient.LastName}"));
    }

    /// <summary>Advanced search - richer filter combinations than the query-string GET comfortably supports.</summary>
    /// <response code="200">The requested page of matching patient medications.</response>
    [HttpPost("search")]
    [ProducesResponseType(typeof(PatientMedicationPagedResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<PatientMedicationPagedResponse>> Search([FromBody] MedicationSearchRequest request)
    {
        var (items, totalCount) = await _patientMedicationService.SearchAsync(
            request.Page,
            request.PageSize,
            request.SearchTerm,
            request.PatientId,
            request.StatusCode,
            request.IsPrn,
            request.StartDateFrom,
            request.StartDateTo,
            request.EndDateFrom,
            request.EndDateTo,
            request.SortBy,
            request.SortDirection);

        _logger.LogInformation("Patient medication search returned {Count} of {TotalCount} results (page {Page})", items.Count(), totalCount, request.Page);

        return Ok(items.ToPagedResponse(totalCount, request.Page, request.PageSize));
    }

    /// <summary>Adds a medication to a patient's current list. Only Administrators and Doctors may create.</summary>
    /// <response code="201">The patient medication was created.</response>
    /// <response code="400">Validation failed, or a lookup code is invalid.</response>
    /// <response code="409">This patient already has an active medication for this medicine.</response>
    /// <response code="422">The referenced patient or medicine is not active.</response>
    [HttpPost]
    [Authorize(Roles = FullAccessRoles)]
    [ProducesResponseType(typeof(PatientMedicationDetailResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ValidationProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status422UnprocessableEntity)]
    public async Task<ActionResult<PatientMedicationDetailResponse>> Create([FromBody] CreatePatientMedicationRequest request)
    {
        var createdBy = CurrentUsername;

        var detail = await _patientMedicationService.CreateAsync(
            request.PatientId,
            request.MedicineId,
            request.Dose,
            request.DoseUnitCode,
            request.FrequencyCode,
            request.Duration,
            request.DurationUnitCode,
            request.Quantity,
            request.Instructions,
            request.PRN,
            request.StartDate,
            request.EndDate,
            request.ClinicalNotes,
            request.PrescribedByUserAccountId,
            createdBy);

        _logger.LogInformation(
            "Patient medication {PatientMedicationId} created for patient {PatientId} by {CreatedBy}",
            detail.PatientMedication.PatientMedicationId, request.PatientId, createdBy);

        var response = detail.ToDetailResponse();

        return CreatedAtAction(nameof(GetById), new { patientMedicationId = response.PatientMedicationId }, response);
    }

    /// <summary>Assembles a draft payload from one or more selected current patient medications, for the future Prescription Management module. Creates or persists nothing.</summary>
    /// <response code="200">The generated draft. May carry non-fatal validationMessages even on success.</response>
    /// <response code="400">Validation failed.</response>
    /// <response code="422">The patient is not active, or none of the selected medications are eligible.</response>
    [HttpPost("generate-prescription")]
    [Authorize(Roles = FullAccessRoles)]
    [ProducesResponseType(typeof(GeneratePrescriptionResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ValidationProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status422UnprocessableEntity)]
    public async Task<ActionResult<GeneratePrescriptionResponse>> GeneratePrescriptionDraft([FromBody] GeneratePrescriptionRequest request)
    {
        var (draftPrescriptionId, patient, selectedMedications, validationMessages) = await _patientMedicationService.GeneratePrescriptionDraftAsync(
            request.PatientId,
            request.SelectedPatientMedicationIds,
            request.ClinicalNotes);

        // Gender display text isn't returned by GeneratePrescriptionDraftAsync (it only
        // returns Patient) - reusing the already-injected IPatientService (already
        // called elsewhere in this controller) rather than widening that method's
        // signature for a Step 18.2-only rendering need.
        var (_, gender) = await _patientService.GetPatientByIdAsync(patient.PatientId);

        // The prescribing clinician is the authenticated caller (docs/prescriptions/
        // prescription-management.md section 15 item 5) - "sub" is the raw JWT claim key
        // for UserAccountId (MapInboundClaims = false, matching CurrentUsername's
        // identical "unique_name" convention below).
        var currentUserAccountId = int.Parse(User.FindFirst("sub")!.Value);
        var (providerAccount, _) = await _userService.GetUserByIdAsync(currentUserAccountId);

        var medicationsList = selectedMedications.ToList();

        var templateModel = PrescriptionTemplateMappingExtensions.BuildPrescriptionTemplateModel(
            draftPrescriptionId,
            patient,
            gender,
            providerAccount!,
            medicationsList,
            request.ClinicalNotes,
            _clinicOptions);

        var xhtml = _prescriptionHtmlGenerator.GenerateHtml(templateModel);

        _logger.LogInformation(
            "Prescription draft {DraftPrescriptionId} generated for patient {PatientId} by {GeneratedBy}",
            draftPrescriptionId, request.PatientId, CurrentUsername);

        return Ok(new GeneratePrescriptionResponse
        {
            DraftPrescriptionId = draftPrescriptionId,
            Patient = patient.ToPatientSummaryResponse(),
            SelectedMedicines = medicationsList.Select(medication => medication.ToSummaryResponse()).ToList(),
            ValidationMessages = validationMessages.ToList(),
            Xhtml = xhtml,
            Provider = providerAccount!.ToPrescriptionProviderResponse(),
            PrescriptionNumber = templateModel.Prescription.PrescriptionNumber,
            IssueDate = templateModel.Prescription.IssueDate,
            Status = templateModel.Prescription.Status
        });
    }

    /// <summary>Edits an Active medication's editable fields. Patient/Medicine cannot be changed. Only Administrators and Doctors may edit.</summary>
    /// <response code="200">The updated patient medication.</response>
    /// <response code="400">Validation failed, or a lookup code is invalid.</response>
    /// <response code="404">No patient medication exists with that ID.</response>
    /// <response code="409">The target is stopped (read-only), or the row was modified by someone else since it was loaded.</response>
    [HttpPut("{patientMedicationId:int}")]
    [Authorize(Roles = FullAccessRoles)]
    [ProducesResponseType(typeof(PatientMedicationDetailResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ValidationProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
    public async Task<ActionResult<PatientMedicationDetailResponse>> Update(int patientMedicationId, [FromBody] UpdatePatientMedicationRequest request)
    {
        var updatedBy = CurrentUsername;

        var detail = await _patientMedicationService.UpdateAsync(
            patientMedicationId,
            request.Dose,
            request.DoseUnitCode,
            request.FrequencyCode,
            request.Duration,
            request.DurationUnitCode,
            request.Quantity,
            request.Instructions,
            request.PRN,
            request.StartDate,
            request.EndDate,
            request.ClinicalNotes,
            request.PrescribedByUserAccountId,
            request.RowVersion,
            updatedBy);

        _logger.LogInformation("Patient medication {PatientMedicationId} updated by {UpdatedBy}", patientMedicationId, updatedBy);

        return Ok(detail.ToDetailResponse());
    }

    /// <summary>Stops an Active medication. Stopping an already-stopped medication is a conflict, not a silent no-op. Only Administrators and Doctors may stop.</summary>
    /// <response code="200">The updated patient medication, with stoppedBy/stoppedDate now populated.</response>
    /// <response code="404">No patient medication exists with that ID.</response>
    /// <response code="409">This patient medication is already stopped.</response>
    [HttpPut("{patientMedicationId:int}/stop")]
    [Authorize(Roles = FullAccessRoles)]
    [ProducesResponseType(typeof(PatientMedicationDetailResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
    public async Task<ActionResult<PatientMedicationDetailResponse>> Stop(int patientMedicationId, [FromBody] StopMedicationRequest request)
    {
        var stoppedBy = CurrentUsername;

        var detail = await _patientMedicationService.StopAsync(patientMedicationId, stoppedBy);

        _logger.LogInformation("Patient medication {PatientMedicationId} stopped by {StoppedBy}", patientMedicationId, stoppedBy);

        return Ok(detail.ToDetailResponse());
    }

    /// <summary>Creates a new Active medication record from a Stopped one, pre-populated from the stopped source as editable defaults. Does not reactivate the historical record. Only Administrators and Doctors may resume.</summary>
    /// <response code="201">The new patient medication record, with resumedFromPatientMedicationId pointing at the stopped source.</response>
    /// <response code="400">Validation failed, or an overridden lookup code is invalid.</response>
    /// <response code="404">No patient medication exists with that ID.</response>
    /// <response code="409">The target is not currently stopped.</response>
    [HttpPut("{patientMedicationId:int}/resume")]
    [Authorize(Roles = FullAccessRoles)]
    [ProducesResponseType(typeof(PatientMedicationDetailResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ValidationProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
    public async Task<ActionResult<PatientMedicationDetailResponse>> Resume(int patientMedicationId, [FromBody] ResumeMedicationRequest request)
    {
        var resumedBy = CurrentUsername;

        // api-spec.md section 4.10: StartDate "defaults to today if omitted" - the DTO
        // leaves it nullable (see ResumeMedicationRequest's own note); the Service layer
        // (Step 8, unchanged here) still takes a non-nullable startDate.
        var startDate = request.StartDate ?? DateTime.UtcNow.Date;

        var detail = await _patientMedicationService.ResumeAsync(
            patientMedicationId,
            startDate,
            request.Dose,
            request.DoseUnitCode,
            request.FrequencyCode,
            request.Duration,
            request.DurationUnitCode,
            request.Quantity,
            request.Instructions,
            request.PRN,
            request.EndDate,
            request.ClinicalNotes,
            request.PrescribedByUserAccountId,
            resumedBy);

        _logger.LogInformation(
            "Patient medication {PatientMedicationId} resumed as new record {NewPatientMedicationId} by {ResumedBy}",
            patientMedicationId, detail.PatientMedication.PatientMedicationId, resumedBy);

        var response = detail.ToDetailResponse();

        return CreatedAtAction(nameof(GetById), new { patientMedicationId = response.PatientMedicationId }, response);
    }

    // "unique_name" is read as a raw claim key, not ClaimTypes.Name, because JWT
    // authentication is configured with MapInboundClaims = false - matching
    // MedicinesController/PatientsController's existing convention.
    private string CurrentUsername => User.FindFirst("unique_name")?.Value ?? "Unknown";
}
