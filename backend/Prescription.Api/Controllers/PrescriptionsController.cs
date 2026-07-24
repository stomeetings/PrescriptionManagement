using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Prescription.Application.Mapping;
using Prescription.Application.Prescriptions.Pdf;
using Prescription.Application.Repositories;
using Prescription.Application.Services;
using Prescription.Shared.Authorization;
using Prescription.Shared.DTOs;

namespace Prescription.Api.Controllers;

/// <summary>
/// Prescription Management endpoints - Phase 1 (docs/prescriptions/prescription-
/// management.md): list/search (every role), persisting/editing/finalizing a draft and
/// its version history (Administrator/Doctor, or +Pharmacist read-only for versions),
/// and PDF generation. Authorization varies per endpoint - see each action's own
/// [Authorize] attribute, not a single class-level policy.
/// </summary>
[ApiController]
[Authorize]
[Route("api/prescriptions")]
public class PrescriptionsController : ControllerBase
{
    private const string FullAccessRoles = $"{Roles.SystemAdministrator},{Roles.Doctor}";

    // Step 18.7's third authorization tier: Pharmacist can view version history/detail/
    // comparison but not restore. Receptionist has none of the four version endpoints -
    // enforced by simply never including Receptionist in either role list (the
    // class-level [Authorize] alone would otherwise permit any authenticated role).
    private const string ViewVersionRoles = $"{Roles.SystemAdministrator},{Roles.Doctor},{Roles.Pharmacist}";

    private readonly IPrescriptionService _prescriptionService;
    private readonly IPrescriptionVersionService _prescriptionVersionService;
    private readonly IPrescriptionFinalizeService _prescriptionFinalizeService;
    private readonly IPrescriptionReprintService _prescriptionReprintService;
    private readonly IPrescriptionItemAmendmentService _prescriptionItemAmendmentService;
    private readonly IPatientMedicationPrescriptionService _patientMedicationPrescriptionService;
    private readonly IPrescriptionRenewalService _prescriptionRenewalService;
    private readonly IPrescriptionCancellationService _prescriptionCancellationService;
    private readonly IPrescriptionPdfService _prescriptionPdfService;
    private readonly IUserService _userService;
    private readonly ILogger<PrescriptionsController> _logger;

    public PrescriptionsController(
        IPrescriptionService prescriptionService,
        IPrescriptionVersionService prescriptionVersionService,
        IPrescriptionFinalizeService prescriptionFinalizeService,
        IPrescriptionReprintService prescriptionReprintService,
        IPrescriptionItemAmendmentService prescriptionItemAmendmentService,
        IPatientMedicationPrescriptionService patientMedicationPrescriptionService,
        IPrescriptionRenewalService prescriptionRenewalService,
        IPrescriptionCancellationService prescriptionCancellationService,
        IPrescriptionPdfService prescriptionPdfService,
        IUserService userService,
        ILogger<PrescriptionsController> logger)
    {
        _prescriptionService = prescriptionService;
        _prescriptionVersionService = prescriptionVersionService;
        _prescriptionFinalizeService = prescriptionFinalizeService;
        _prescriptionReprintService = prescriptionReprintService;
        _prescriptionItemAmendmentService = prescriptionItemAmendmentService;
        _patientMedicationPrescriptionService = patientMedicationPrescriptionService;
        _prescriptionRenewalService = prescriptionRenewalService;
        _prescriptionCancellationService = prescriptionCancellationService;
        _prescriptionPdfService = prescriptionPdfService;
        _userService = userService;
        _logger = logger;
    }

    /// <summary>
    /// Prescription Management List: returns every prescription, no search/filter
    /// applied, newest first by default. Open to every authenticated role, matching
    /// PatientsController.GetAll's identical "every role may view" precedent - only
    /// write actions (Save Draft/Update/Finalize/Restore) are role-restricted.
    /// </summary>
    /// <response code="200">The requested page of prescriptions.</response>
    [HttpGet]
    [ProducesResponseType(typeof(PrescriptionPagedResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<PrescriptionPagedResponse>> GetAll(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] string sortBy = "createdDate",
        [FromQuery] string sortDirection = "desc")
    {
        var (items, totalCount) = await _prescriptionService.GetPrescriptionsAsync(page, pageSize, sortBy, sortDirection);

        _logger.LogInformation("Retrieved {Count} of {TotalCount} prescriptions (page {Page})", items.Count(), totalCount, page);

        return Ok(items.ToPrescriptionPagedResponse(totalCount, page, pageSize));
    }

    /// <summary>
    /// Prescription Management List search/filter: Prescription Number/Patient Name/NHI/
    /// Medicine Name/Provider Name (SearchTerm), Status, Issue/Expiry date ranges,
    /// Patient, Provider. POST with a body, not the task's literal "GET .../search" -
    /// matches PatientsController.Search/UsersController.Search's identical established
    /// convention in this project (a GET with this many optional filters would need a
    /// large, unwieldy query string; every other search endpoint here already uses POST).
    /// Same "every role may view" access as GetAll above.
    /// </summary>
    /// <response code="200">The requested page of matching prescriptions.</response>
    [HttpPost("search")]
    [ProducesResponseType(typeof(PrescriptionPagedResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<PrescriptionPagedResponse>> Search([FromBody] PrescriptionSearchRequest request)
    {
        var (items, totalCount) = await _prescriptionService.SearchPrescriptionsAsync(
            request.Page,
            request.PageSize,
            request.SearchTerm,
            request.StatusCode,
            request.IssueDateFrom,
            request.IssueDateTo,
            request.ExpiryDateFrom,
            request.ExpiryDateTo,
            request.PatientId,
            request.ProviderUserAccountId,
            request.SortBy,
            request.SortDirection);

        _logger.LogInformation("Prescription search returned {Count} of {TotalCount} results (page {Page})", items.Count(), totalCount, request.Page);

        return Ok(items.ToPrescriptionPagedResponse(totalCount, request.Page, request.PageSize));
    }

    /// <summary>
    /// Prescription Details: full read-only view (header, patient, provider, medications,
    /// timeline) for one prescription. "All users should navigate here before performing
    /// any action" (this feature's own framing) - open to every authenticated role, same
    /// as GetAll/Search above; only write actions are role-restricted.
    /// </summary>
    /// <response code="200">The requested prescription's full detail.</response>
    /// <response code="404">No prescription exists with that ID.</response>
    [HttpGet("{prescriptionId:int}")]
    [ProducesResponseType(typeof(PrescriptionDetailsResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<PrescriptionDetailsResponse>> GetDetails(int prescriptionId)
    {
        var detail = await _prescriptionService.GetDetailsByIdAsync(prescriptionId);

        if (detail is null)
        {
            return NotFound();
        }

        return Ok(detail.ToPrescriptionDetailsResponse());
    }

    /// <summary>
    /// Patient Medication and Prescription Synchronization: the Patient Medication(s)
    /// each item on this Prescription was created from - "Originating Patient
    /// Medication". A replacement Prescription always returns exactly one row (it
    /// contains only the amended medication); an original Prescription can return
    /// several, one per selected medication.
    /// </summary>
    /// <response code="200">The originating patient medication(s) for this prescription.</response>
    [HttpGet("{prescriptionId:int}/patient-medications")]
    [ProducesResponseType(typeof(List<OriginatingPatientMedicationResponse>), StatusCodes.Status200OK)]
    public async Task<ActionResult<List<OriginatingPatientMedicationResponse>>> GetOriginatingPatientMedications(int prescriptionId)
    {
        var entries = await _patientMedicationPrescriptionService.GetByPrescriptionAsync(prescriptionId);

        var response = entries.Select(entry => new OriginatingPatientMedicationResponse
        {
            PatientMedicationId = entry.PatientMedicationId,
            MedicineName = entry.MedicineName,
            RelationshipType = entry.RelationshipType,
            Scid = entry.Scid,
            IsCurrent = entry.IsCurrent,
            IsActive = entry.PatientMedicationIsActive
        }).ToList();

        return Ok(response);
    }

    /// <summary>
    /// Prescription Renewal: creates a new DRAFT prescription from selected items on an
    /// already-finalized one - the original prescription is never modified. Unlike
    /// Reprint/Amendment, this does not finalize anything itself; the returned draft
    /// goes through the normal Doctor reviews -&gt; Preview -&gt; Print -&gt; Finalize
    /// lifecycle from its own Prescription Details page. Administrator and Doctor only.
    /// </summary>
    /// <response code="200">The renewal draft was created.</response>
    /// <response code="400">No items were selected.</response>
    /// <response code="404">The prescription, or a selected item, does not exist.</response>
    /// <response code="409">The prescription is not finalized, has been cancelled, or has expired.</response>
    /// <response code="422">The patient, provider, or a selected medicine is not active.</response>
    [HttpPost("{prescriptionId:int}/renew")]
    [Authorize(Roles = FullAccessRoles)]
    [ProducesResponseType(typeof(RenewPrescriptionResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ValidationProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status422UnprocessableEntity)]
    public async Task<ActionResult<RenewPrescriptionResponse>> Renew(int prescriptionId, [FromBody] RenewPrescriptionRequest request)
    {
        var renewedBy = CurrentUsername;

        var selections = request.SelectedItems.Select(item => new PrescriptionRenewalItemSelection
        {
            PrescriptionItemId = item.PrescriptionItemId,
            Quantity = item.Quantity,
            Duration = item.Duration,
            Instructions = item.Instructions
        });

        var result = await _prescriptionRenewalService.RenewAsync(prescriptionId, selections, renewedBy);

        _logger.LogInformation(
            "Prescription {PrescriptionId} renewed as {NewPrescriptionNumber} (draft id {NewPrescriptionId}) by {RenewedBy}",
            prescriptionId, result.NewPrescriptionNumber, result.NewPrescriptionId, renewedBy);

        var response = new RenewPrescriptionResponse
        {
            DraftPrescriptionId = result.NewPrescriptionId,
            NewPrescriptionNumber = result.NewPrescriptionNumber
        };

        return Ok(response);
    }

    /// <summary>
    /// Entire Prescription Cancellation: invalidates the whole Prescription (status ->
    /// CANCELLED) and cascades every currently ACTIVE PrescriptionItem to CANCELLED in the
    /// same transaction - items already Superseded or Dispensed are left untouched.
    /// Distinct from Prescription Item Amendment &amp; Replacement (which supersedes one
    /// item and creates a new replacement Prescription); nothing new is created here
    /// except the audit/cancellation record. Nothing is deleted - the prescription remains
    /// fully visible in the List/Details/Timeline. Administrator and Doctor only.
    /// </summary>
    /// <response code="200">The prescription was cancelled.</response>
    /// <response code="400">Validation failed (missing/invalid Cancellation Type, Reason, or Comments).</response>
    /// <response code="404">No prescription exists with that ID.</response>
    /// <response code="409">The prescription is still a Draft, already cancelled, fully dispensed, or a concurrent status change won the race.</response>
    [HttpPost("{prescriptionId:int}/cancel")]
    [Authorize(Roles = FullAccessRoles)]
    [ProducesResponseType(typeof(CancelPrescriptionResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ValidationProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
    public async Task<ActionResult<CancelPrescriptionResponse>> Cancel(int prescriptionId, [FromBody] CancelPrescriptionRequest request)
    {
        var cancelledBy = CurrentUsername;

        var result = await _prescriptionCancellationService.CancelAsync(
            prescriptionId, request.CancellationType, request.Reason, request.Comments, cancelledBy);

        _logger.LogInformation(
            "Prescription {PrescriptionId} ({PrescriptionNumber}) cancelled ({CancellationType}, {CancelledItemCount} items cancelled) by {CancelledBy}",
            result.PrescriptionId, result.PrescriptionNumber, request.CancellationType, result.CancelledItemCount, cancelledBy);

        var response = new CancelPrescriptionResponse
        {
            PrescriptionId = result.PrescriptionId,
            PrescriptionNumber = result.PrescriptionNumber,
            Status = new PrescriptionStatusResponse { Code = result.StatusCode, DisplayText = result.StatusDisplayText },
            CancelledDate = result.CancelledDate,
            CancelledBy = result.CancelledBy,
            CancelledItemCount = result.CancelledItemCount
        };

        return Ok(response);
    }

    /// <summary>
    /// Reprints a finalized prescription, reusing its stored Xhtml/PDF snapshot exactly -
    /// never regenerated from live prescription data. Route stays at the bare
    /// "{prescriptionId}/reprint" (not under "drafts/", unlike Save/Update/Finalize/PDF/
    /// versions) - a reprint is, by definition, only ever valid for a prescription that
    /// has already left Draft status, so the "drafts/" prefix used by this module's other
    /// mutating actions doesn't fit here. Administrator and Doctor only; Pharmacist has
    /// read-only access via the Timeline this writes into, Receptionist has none.
    /// </summary>
    /// <response code="200">The reprint was recorded.</response>
    /// <response code="400">Validation failed, or the prescription document is missing.</response>
    /// <response code="404">No prescription exists with that ID.</response>
    /// <response code="409">The prescription is still a Draft, or has been cancelled.</response>
    [HttpPost("{prescriptionId:int}/reprint")]
    [Authorize(Roles = FullAccessRoles)]
    [ProducesResponseType(typeof(ReprintPrescriptionResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ValidationProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
    public async Task<ActionResult<ReprintPrescriptionResponse>> Reprint(int prescriptionId, [FromBody] ReprintPrescriptionRequest request)
    {
        var reprintedBy = CurrentUsername;

        var result = await _prescriptionReprintService.ReprintAsync(prescriptionId, request.Reason, request.Copies, reprintedBy);

        _logger.LogInformation(
            "Prescription {PrescriptionId} reprinted (copy #{PrintCount}, {Copies} copies) by {ReprintedBy}",
            prescriptionId, result.PrintCount, request.Copies, reprintedBy);

        var response = new ReprintPrescriptionResponse
        {
            PrintCount = result.PrintCount,
            PrintedDate = result.PrintedDate,
            PrintedBy = result.PrintedBy
        };

        return Ok(response);
    }

    /// <summary>
    /// Prescription Item Amendment &amp; Replacement: "does this medication belong to an
    /// active, finalized prescription?" - drives the Edit Patient Medication form's own
    /// warning-dialog trigger. HasActivePrescriptionItem=false is a normal result, not an
    /// error. Open to every authenticated role (Pharmacist is read-only for the amend
    /// action itself, but can still see this).
    /// </summary>
    /// <response code="200">Whether an active prescription item exists for this medication.</response>
    [HttpGet("items/{patientMedicationId:int}/active")]
    [ProducesResponseType(typeof(ActivePrescriptionItemResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<ActivePrescriptionItemResponse>> GetActiveItemForMedication(int patientMedicationId)
    {
        var activeItem = await _prescriptionItemAmendmentService.FindActiveItemAsync(patientMedicationId);

        return Ok(new ActivePrescriptionItemResponse
        {
            HasActivePrescriptionItem = activeItem is not null,
            PrescriptionNumber = activeItem?.PrescriptionNumber
        });
    }

    /// <summary>
    /// Prescription Item Amendment &amp; Replacement: supersedes the active prescription
    /// item for a just-updated Patient Medication and creates a replacement prescription
    /// containing ONLY that medication - the original prescription and every other item
    /// on it are untouched. Re-reads the current (already-saved) PatientMedication row
    /// itself; the caller must already have saved the new values via the existing
    /// PUT /api/patientmedications/{id} before calling this. Administrator and Doctor
    /// only; Pharmacist is read-only (can view the resulting Timeline/history, not
    /// trigger a replacement), Receptionist has no access at all.
    /// </summary>
    /// <response code="200">The replacement was created.</response>
    /// <response code="400">No clinically significant change was detected.</response>
    /// <response code="404">The patient medication, or its active prescription item, does not exist.</response>
    /// <response code="409">The prescription is not finalized, has been cancelled, or the item was already superseded.</response>
    /// <response code="422">The medicine, patient, or provider is not active.</response>
    [HttpPost("items/amend")]
    [Authorize(Roles = FullAccessRoles)]
    [ProducesResponseType(typeof(AmendPrescriptionItemResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ValidationProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status422UnprocessableEntity)]
    public async Task<ActionResult<AmendPrescriptionItemResponse>> AmendItem([FromBody] AmendPrescriptionItemRequest request)
    {
        var amendedBy = CurrentUsername;

        var result = await _prescriptionItemAmendmentService.AmendAsync(request.PatientMedicationId, request.Reason, amendedBy);

        _logger.LogInformation(
            "Patient medication {PatientMedicationId} amended: {OriginalCount} original prescription item(s) superseded ({OriginalPrescriptionNumbers}), replacement {ReplacementPrescriptionNumber} created (new SCID {NewScid}) by {AmendedBy}",
            request.PatientMedicationId, result.OriginalPrescriptions.Count,
            string.Join(", ", result.OriginalPrescriptions.Select(op => op.OriginalPrescriptionNumber)),
            result.ReplacementPrescriptionNumber, result.NewScid, amendedBy);

        var response = new AmendPrescriptionItemResponse
        {
            OriginalPrescriptions = result.OriginalPrescriptions.Select(op => new OriginalPrescriptionForAmendmentResponse
            {
                PrescriptionId = op.OriginalPrescriptionId,
                PrescriptionNumber = op.OriginalPrescriptionNumber,
                Status = new PrescriptionStatusResponse { Code = op.OriginalStatusCode, DisplayText = op.OriginalStatusDisplayText },
                OldScid = op.OldScid
            }).ToList(),
            ReplacementPrescription = new PrescriptionSummaryForAmendmentResponse
            {
                PrescriptionId = result.ReplacementPrescriptionId,
                PrescriptionNumber = result.ReplacementPrescriptionNumber,
                Status = new PrescriptionStatusResponse { Code = result.ReplacementStatusCode, DisplayText = result.ReplacementStatusDisplayText }
            },
            NewScid = result.NewScid
        };

        return Ok(response);
    }

    /// <summary>Persists a generated prescription draft (Save Draft) at Draft status. Nothing is sent to NZePS - that is a future phase.</summary>
    /// <response code="201">The draft was saved.</response>
    /// <response code="400">Validation failed, no medications were selected, or the XHTML document is missing.</response>
    /// <response code="404">A selected patient medication does not exist.</response>
    /// <response code="409">This draft has already been saved (duplicate DraftPrescriptionId).</response>
    /// <response code="422">The patient or provider does not exist or is not active.</response>
    [HttpPost("drafts")]
    [Authorize(Roles = FullAccessRoles)]
    [ProducesResponseType(typeof(SaveDraftPrescriptionResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ValidationProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status422UnprocessableEntity)]
    public async Task<ActionResult<SaveDraftPrescriptionResponse>> SaveDraft([FromBody] SaveDraftPrescriptionRequest request)
    {
        var createdBy = CurrentUsername;

        // The prescribing clinician is the authenticated caller, not a client-supplied
        // field (see SaveDraftPrescriptionRequest's own note) - "sub" is the raw JWT
        // claim key for UserAccountId (MapInboundClaims = false), matching
        // PatientMedicationsController.GeneratePrescriptionDraft's identical pattern.
        var currentUserAccountId = int.Parse(User.FindFirst("sub")!.Value);

        var result = await _prescriptionService.CreateDraftAsync(
            request.DraftPrescriptionId,
            request.PatientId,
            currentUserAccountId,
            request.Xhtml,
            request.SelectedPatientMedicationIds,
            request.ClinicalNotes,
            createdBy);

        _logger.LogInformation(
            "Prescription {PrescriptionId} ({PrescriptionNumber}) saved as Draft for patient {PatientId} by {CreatedBy}",
            result.PrescriptionId, result.PrescriptionNumber, request.PatientId, createdBy);

        var response = new SaveDraftPrescriptionResponse
        {
            PrescriptionId = result.PrescriptionId,
            PrescriptionNumber = result.PrescriptionNumber,
            Status = new PrescriptionStatusResponse { Code = result.StatusCode, DisplayText = result.StatusDisplayText },
            SavedDate = result.CreatedDate,
            SavedBy = result.CreatedBy,
            RowVersion = result.RowVersion
        };

        return StatusCode(StatusCodes.Status201Created, response);
    }

    /// <summary>
    /// Step 18.7's real minimal Edit: updates Clinical Notes and/or the medication item
    /// set on a saved Draft prescription, and - in the same underlying transaction -
    /// creates a new PrescriptionVersion snapshot. Only Draft-status prescriptions are
    /// editable; a stale RowVersion is rejected as a 409 Conflict rather than silently
    /// overwritten.
    /// </summary>
    /// <response code="200">The draft was updated.</response>
    /// <response code="400">Validation failed, no medications were selected, or the XHTML document is missing.</response>
    /// <response code="404">The prescription (or a selected patient medication) does not exist.</response>
    /// <response code="409">The prescription is not editable, or was modified by someone else (stale RowVersion).</response>
    /// <response code="422">Invalid prescription data.</response>
    [HttpPut("drafts/{prescriptionId:int}")]
    [Authorize(Roles = FullAccessRoles)]
    [ProducesResponseType(typeof(UpdateDraftPrescriptionResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ValidationProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status422UnprocessableEntity)]
    public async Task<ActionResult<UpdateDraftPrescriptionResponse>> UpdateDraft(int prescriptionId, [FromBody] UpdateDraftPrescriptionRequest request)
    {
        var updatedBy = CurrentUsername;

        var result = await _prescriptionService.UpdateDraftAsync(
            prescriptionId,
            request.Xhtml,
            request.SelectedPatientMedicationIds,
            request.ClinicalNotes,
            request.RowVersion,
            updatedBy);

        _logger.LogInformation(
            "Prescription {PrescriptionId} ({PrescriptionNumber}) updated to Version {VersionNumber} by {UpdatedBy}",
            result.PrescriptionId, result.PrescriptionNumber, result.VersionNumber, updatedBy);

        var response = new UpdateDraftPrescriptionResponse
        {
            PrescriptionId = result.PrescriptionId,
            PrescriptionNumber = result.PrescriptionNumber,
            Status = new PrescriptionStatusResponse { Code = result.StatusCode, DisplayText = result.StatusDisplayText },
            VersionNumber = result.VersionNumber,
            SavedDate = result.UpdatedDate,
            SavedBy = result.UpdatedBy,
            RowVersion = result.RowVersion
        };

        return Ok(response);
    }

    /// <summary>
    /// Locks a Draft prescription as an official clinical document (Step 18.8). No
    /// separate "Finalized" status exists - this performs the Prescription lifecycle's
    /// first real transition, DRAFT -&gt; PENDING (CLAUDE.md's fixed status enum; PENDING
    /// is already documented there as "awaiting the Worker's automated pickup", the exact
    /// semantic this task calls "locked, awaiting a future Send to NZePS"). The route
    /// stays under "drafts/" for the same path-consistency reason GetPdf already
    /// documents, even though the prescription is no longer editable once this succeeds.
    /// Editing/Restore are rejected afterward "for free" - usp_Prescription_UpdateDraft
    /// and usp_Prescription_RestoreVersion already require Draft status.
    /// </summary>
    /// <response code="200">The prescription was finalized.</response>
    /// <response code="404">No prescription exists with that ID.</response>
    /// <response code="409">Already finalized (or a concurrent finalize/edit won the race).</response>
    /// <response code="422">The patient or provider is not active.</response>
    [HttpPost("drafts/{prescriptionId:int}/finalize")]
    [Authorize(Roles = FullAccessRoles)]
    [ProducesResponseType(typeof(FinalizePrescriptionResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ValidationProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status422UnprocessableEntity)]
    public async Task<ActionResult<FinalizePrescriptionResponse>> FinalizeDraft(int prescriptionId)
    {
        var finalizedBy = CurrentUsername;

        var result = await _prescriptionFinalizeService.FinalizeAsync(prescriptionId, finalizedBy);

        _logger.LogInformation(
            "Prescription {PrescriptionId} ({PrescriptionNumber}) finalized by {FinalizedBy}",
            result.PrescriptionId, result.PrescriptionNumber, finalizedBy);

        var response = new FinalizePrescriptionResponse
        {
            PrescriptionId = result.PrescriptionId,
            PrescriptionNumber = result.PrescriptionNumber,
            Status = new PrescriptionStatusResponse { Code = result.StatusCode, DisplayText = result.StatusDisplayText },
            FinalizedDate = result.FinalizedDate,
            FinalizedBy = result.FinalizedBy
        };

        return Ok(response);
    }

    /// <summary>
    /// Renders a saved Prescription's XHTML to PDF and returns it for download
    /// (Step 18.6). "{prescriptionId}" is the real, persisted Prescription id (not the
    /// transient DraftPrescriptionId used only during Generate/Preview) - the URL
    /// segment stays "drafts/" for path consistency with POST /api/prescriptions/drafts,
    /// even though a saved Prescription may later move on from Draft status in a future
    /// phase. Generated directly from the same Xhtml the Preview dialog and Save Draft
    /// already used - never re-rendered in React.
    /// </summary>
    /// <response code="200">The PDF file.</response>
    /// <response code="404">No prescription exists with that ID.</response>
    [HttpGet("drafts/{prescriptionId:int}/pdf")]
    [Authorize(Roles = FullAccessRoles)]
    [Produces("application/pdf")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetPdf(int prescriptionId)
    {
        var generatedBy = CurrentUsername;

        var result = await _prescriptionPdfService.GetPdfAsync(prescriptionId, generatedBy);

        _logger.LogInformation(
            "PDF generated for prescription {PrescriptionId} by {GeneratedBy} (download #{DownloadCount})",
            prescriptionId, generatedBy, result.DownloadCount);

        return File(result.PdfBytes, "application/pdf", result.FileName);
    }

    /// <summary>Lists every saved version of a Prescription, newest first (Step 18.7).</summary>
    /// <response code="200">The version list.</response>
    /// <response code="404">No prescription exists with that ID.</response>
    [HttpGet("drafts/{prescriptionId:int}/versions")]
    [Authorize(Roles = ViewVersionRoles)]
    [ProducesResponseType(typeof(List<PrescriptionVersionSummaryResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<List<PrescriptionVersionSummaryResponse>>> GetVersions(int prescriptionId)
    {
        var versions = await _prescriptionVersionService.GetAllAsync(prescriptionId);

        var response = versions.Select(version => new PrescriptionVersionSummaryResponse
        {
            VersionNumber = version.VersionNumber,
            ChangeSummary = version.ChangeSummary,
            Status = new PrescriptionStatusResponse { Code = version.StatusCode, DisplayText = version.StatusDisplayText },
            SavedDate = version.SavedDate,
            SavedBy = version.SavedBy
        }).ToList();

        return Ok(response);
    }

    /// <summary>Full detail (header + items) for one specific version (Step 18.7).</summary>
    /// <response code="200">The version detail.</response>
    /// <response code="404">No prescription or version exists with those IDs.</response>
    [HttpGet("drafts/{prescriptionId:int}/versions/{versionNumber:int}")]
    [Authorize(Roles = ViewVersionRoles)]
    [ProducesResponseType(typeof(PrescriptionVersionDetailResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<PrescriptionVersionDetailResponse>> GetVersion(int prescriptionId, int versionNumber)
    {
        var version = await _prescriptionVersionService.GetByVersionAsync(prescriptionId, versionNumber);

        var response = new PrescriptionVersionDetailResponse
        {
            PrescriptionId = version.PrescriptionId,
            VersionNumber = version.VersionNumber,
            ClinicalNotes = version.ClinicalNotes,
            Xhtml = version.Xhtml,
            Status = new PrescriptionStatusResponse { Code = version.StatusCode, DisplayText = version.StatusDisplayText },
            ChangeSummary = version.ChangeSummary,
            SavedDate = version.SavedDate,
            SavedBy = version.SavedBy,
            Items = version.Items.Select(MapItem).ToList()
        };

        return Ok(response);
    }

    /// <summary>Diffs two versions - added/removed/changed/unchanged medications plus a Clinical Notes changed flag (Step 18.7). Computed in the Application layer, not SQL.</summary>
    /// <response code="200">The comparison result.</response>
    /// <response code="404">No prescription or either version exists with those IDs.</response>
    [HttpGet("drafts/{prescriptionId:int}/versions/compare")]
    [Authorize(Roles = ViewVersionRoles)]
    [ProducesResponseType(typeof(PrescriptionVersionComparisonResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<PrescriptionVersionComparisonResponse>> CompareVersions(int prescriptionId, [FromQuery] int from, [FromQuery] int to)
    {
        var comparison = await _prescriptionVersionService.CompareAsync(prescriptionId, from, to);

        var response = new PrescriptionVersionComparisonResponse
        {
            PrescriptionId = comparison.PrescriptionId,
            FromVersionNumber = comparison.FromVersionNumber,
            ToVersionNumber = comparison.ToVersionNumber,
            FromClinicalNotes = comparison.FromClinicalNotes,
            ToClinicalNotes = comparison.ToClinicalNotes,
            ClinicalNotesChanged = comparison.ClinicalNotesChanged,
            MedicationsAdded = comparison.MedicationsAdded.Select(MapItem).ToList(),
            MedicationsRemoved = comparison.MedicationsRemoved.Select(MapItem).ToList(),
            MedicationsChanged = comparison.MedicationsChanged.Select(change => new PrescriptionVersionItemChangeResponse
            {
                Before = MapItem(change.Before),
                After = MapItem(change.After),
                ChangedFields = change.ChangedFields
            }).ToList(),
            MedicationsUnchanged = comparison.MedicationsUnchanged.Select(MapItem).ToList()
        };

        return Ok(response);
    }

    /// <summary>
    /// Restores a historical version's content onto the live Prescription and creates a
    /// brand-new latest version from it - existing PrescriptionVersion rows are never
    /// overwritten or deleted (Step 18.7). Administrator and Doctor only; Pharmacist has
    /// read-only access to the other three version endpoints.
    /// </summary>
    /// <response code="200">The version was restored (as a new version).</response>
    /// <response code="404">No prescription or version exists with those IDs.</response>
    /// <response code="409">The prescription is not editable (not at Draft status).</response>
    [HttpPost("drafts/{prescriptionId:int}/versions/{versionNumber:int}/restore")]
    [Authorize(Roles = FullAccessRoles)]
    [ProducesResponseType(typeof(RestoreVersionResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
    public async Task<ActionResult<RestoreVersionResponse>> RestoreVersion(int prescriptionId, int versionNumber)
    {
        var restoredBy = CurrentUsername;

        var result = await _prescriptionVersionService.RestoreAsync(prescriptionId, versionNumber, restoredBy);

        _logger.LogInformation(
            "Prescription {PrescriptionId} ({PrescriptionNumber}) restored to new Version {VersionNumber} from Version {RestoredFromVersionNumber} by {RestoredBy}",
            result.PrescriptionId, result.PrescriptionNumber, result.VersionNumber, result.RestoredFromVersionNumber, restoredBy);

        var response = new RestoreVersionResponse
        {
            PrescriptionId = result.PrescriptionId,
            PrescriptionNumber = result.PrescriptionNumber,
            Status = new PrescriptionStatusResponse { Code = result.StatusCode, DisplayText = result.StatusDisplayText },
            VersionNumber = result.VersionNumber,
            RestoredFromVersionNumber = result.RestoredFromVersionNumber,
            SavedDate = result.UpdatedDate,
            SavedBy = result.UpdatedBy,
            RowVersion = result.RowVersion
        };

        return Ok(response);
    }

    // "unique_name" is read as a raw claim key, not ClaimTypes.Name, because JWT
    // authentication is configured with MapInboundClaims = false - matching every other
    // controller's identical convention.
    private string CurrentUsername => User.FindFirst("unique_name")?.Value ?? "Unknown";

    // Shared by GetVersion and CompareVersions - both map the same
    // PrescriptionVersionItemDetail shape to the same PrescriptionVersionItemResponse
    // shape (PrescriptionVersionItemResponse's own doc comment already documents that
    // reuse), so this stays a single mapping rather than four near-identical inline
    // Select bodies within the same file.
    private static PrescriptionVersionItemResponse MapItem(PrescriptionVersionItemDetail item) => new()
    {
        MedicineId = item.MedicineId,
        MedicineName = item.MedicineNameSnapshot,
        GenericName = item.GenericNameSnapshot,
        Strength = item.StrengthSnapshot,
        DosageForm = item.DosageFormSnapshot,
        Route = item.RouteSnapshot,
        Dose = item.Dose,
        DoseUnit = item.DoseUnitSnapshot,
        Frequency = item.FrequencySnapshot,
        Duration = item.Duration,
        DurationUnit = item.DurationUnitSnapshot,
        Quantity = item.Quantity,
        Instructions = item.Instructions,
        PRN = item.PRN
    };
}
