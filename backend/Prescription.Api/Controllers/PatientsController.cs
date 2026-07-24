using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Prescription.Application.Mapping;
using Prescription.Application.Services;
using Prescription.Shared.Authorization;
using Prescription.Shared.DTOs;

namespace Prescription.Api.Controllers;

/// <summary>
/// Patient Management endpoints: list, search, view, create, edit, and activate/deactivate
/// patients. Unlike User Management, authorization varies per endpoint - every authenticated
/// role may view, but only Administrators, Doctors, and Receptionists may create or edit,
/// and only Administrators may activate/deactivate (api-spec.md section 3).
/// </summary>
[ApiController]
[Authorize]
[Route("api/patients")]
public class PatientsController : ControllerBase
{
    private readonly IPatientService _patientService;
    private readonly ILogger<PatientsController> _logger;

    public PatientsController(IPatientService patientService, ILogger<PatientsController> logger)
    {
        _patientService = patientService;
        _logger = logger;
    }

    /// <summary>Returns a paginated list of all patients, no search/filter applied.</summary>
    /// <response code="200">The requested page of patients.</response>
    [HttpGet]
    [ProducesResponseType(typeof(PatientPagedResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<PatientPagedResponse>> GetAll(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] string sortBy = "createdDate",
        [FromQuery] string sortDirection = "desc")
    {
        var (patients, totalCount) = await _patientService.GetPatientsAsync(page, pageSize, sortBy, sortDirection);

        _logger.LogInformation("Retrieved {Count} of {TotalCount} patients (page {Page})", patients.Count(), totalCount, page);

        return Ok(patients.ToPatientPagedResponse(totalCount, page, pageSize));
    }

    /// <summary>Returns full details for one patient.</summary>
    /// <response code="200">The requested patient's details.</response>
    /// <response code="404">No patient exists with that ID.</response>
    [HttpGet("{patientId:int}")]
    [ProducesResponseType(typeof(PatientDetailResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<PatientDetailResponse>> GetById(int patientId)
    {
        var (patient, gender) = await _patientService.GetPatientByIdAsync(patientId);

        if (patient is null || gender is null)
        {
            return NotFound();
        }

        return Ok(patient.ToPatientDetailResponse(gender));
    }

    /// <summary>Registers a new patient. PatientNumber is generated automatically.</summary>
    /// <response code="201">The patient was created.</response>
    /// <response code="400">Validation failed, or the gender code is invalid.</response>
    /// <response code="409">A patient with this NHI number already exists.</response>
    [HttpPost]
    [Authorize(Roles = $"{Roles.SystemAdministrator},{Roles.Doctor},{Roles.Receptionist}")]
    [ProducesResponseType(typeof(PatientDetailResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ValidationProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
    public async Task<ActionResult<PatientDetailResponse>> Create([FromBody] CreatePatientRequest request)
    {
        var createdBy = CurrentUsername;

        var (patient, gender) = await _patientService.CreatePatientAsync(
            request.FirstName,
            request.LastName,
            request.PreferredName,
            request.DateOfBirth,
            request.GenderCode,
            request.MobileNumber,
            request.Email,
            request.AddressLine1,
            request.AddressLine2,
            request.City,
            request.Region,
            request.PostalCode,
            request.Country,
            request.NHINumber,
            request.NZMCNumber,
            request.IsActive,
            request.Notes,
            createdBy);

        // Never log Email/MobileNumber/NHINumber/address fields in full - only
        // identifiers, consistent with the project's PII logging rules
        // (CLAUDE.md, database-spec.md section 8).
        _logger.LogInformation("Patient {PatientNumber} (ID {PatientId}) created by {CreatedBy}", patient.PatientNumber, patient.PatientId, createdBy);

        var response = patient.ToPatientDetailResponse(gender);

        return CreatedAtAction(nameof(GetById), new { patientId = patient.PatientId }, response);
    }

    /// <summary>Searches and filters patients by name/patient number/mobile/email/NHI number, status, and gender, with pagination.</summary>
    /// <response code="200">The requested page of matching patients.</response>
    [HttpPost("search")]
    [ProducesResponseType(typeof(PatientPagedResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<PatientPagedResponse>> Search([FromBody] PatientSearchRequest request)
    {
        var (patients, totalCount) = await _patientService.SearchPatientsAsync(
            request.Page,
            request.PageSize,
            request.SearchTerm,
            request.Status,
            request.GenderCode,
            request.Nhi,
            request.FirstName,
            request.LastName,
            request.DateOfBirth,
            request.SortBy,
            request.SortDirection);

        _logger.LogInformation("Patient search returned {Count} of {TotalCount} results (page {Page})", patients.Count(), totalCount, request.Page);

        return Ok(patients.ToPatientPagedResponse(totalCount, request.Page, request.PageSize));
    }

    /// <summary>Edits an existing patient's editable fields. PatientNumber cannot be changed.</summary>
    /// <response code="200">The updated patient.</response>
    /// <response code="400">Validation failed, or the gender code is invalid.</response>
    /// <response code="404">No patient exists with that ID.</response>
    /// <response code="409">The NHI number is already in use, or the patient was modified by someone else since it was loaded.</response>
    [HttpPut("{patientId:int}")]
    [Authorize(Roles = $"{Roles.SystemAdministrator},{Roles.Doctor},{Roles.Receptionist}")]
    [ProducesResponseType(typeof(PatientDetailResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ValidationProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
    public async Task<ActionResult<PatientDetailResponse>> Update(int patientId, [FromBody] UpdatePatientRequest request)
    {
        var updatedBy = CurrentUsername;

        var (patient, gender) = await _patientService.UpdatePatientAsync(
            patientId,
            request.FirstName,
            request.LastName,
            request.PreferredName,
            request.DateOfBirth,
            request.GenderCode,
            request.MobileNumber,
            request.Email,
            request.AddressLine1,
            request.AddressLine2,
            request.City,
            request.Region,
            request.PostalCode,
            request.Country,
            request.NHINumber,
            request.NZMCNumber,
            request.Notes,
            request.RowVersion,
            updatedBy);

        _logger.LogInformation("Patient {PatientId} updated by {UpdatedBy}", patientId, updatedBy);

        return Ok(patient.ToPatientDetailResponse(gender));
    }

    /// <summary>Sets a patient's status to Active. Administrators only.</summary>
    /// <response code="200">The updated patient.</response>
    /// <response code="404">No patient exists with that ID.</response>
    [HttpPut("{patientId:int}/activate")]
    [Authorize(Roles = Roles.SystemAdministrator)]
    [ProducesResponseType(typeof(PatientDetailResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<PatientDetailResponse>> Activate(int patientId, [FromBody] ActivatePatientRequest request)
    {
        var updatedBy = CurrentUsername;

        var (patient, gender) = await _patientService.ActivatePatientAsync(patientId, updatedBy);

        _logger.LogInformation("Patient {PatientId} activated by {UpdatedBy}", patientId, updatedBy);

        return Ok(patient.ToPatientDetailResponse(gender));
    }

    /// <summary>Sets a patient's status to Inactive. Inactive patients cannot receive new prescriptions. Administrators only.</summary>
    /// <response code="200">The updated patient.</response>
    /// <response code="404">No patient exists with that ID.</response>
    [HttpPut("{patientId:int}/deactivate")]
    [Authorize(Roles = Roles.SystemAdministrator)]
    [ProducesResponseType(typeof(PatientDetailResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<PatientDetailResponse>> Deactivate(int patientId, [FromBody] DeactivatePatientRequest request)
    {
        var updatedBy = CurrentUsername;

        var (patient, gender) = await _patientService.DeactivatePatientAsync(patientId, updatedBy);

        _logger.LogInformation("Patient {PatientId} deactivated by {UpdatedBy}", patientId, updatedBy);

        return Ok(patient.ToPatientDetailResponse(gender));
    }

    // "unique_name" is read as a raw claim key, not ClaimTypes.Name, because JWT
    // authentication is configured with MapInboundClaims = false (see
    // JwtAuthenticationExtensions.cs) - matching UsersController's existing convention.
    private string CurrentUsername => User.FindFirst("unique_name")?.Value ?? "Unknown";
}
