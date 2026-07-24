using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Prescription.Application.Mapping;
using Prescription.Application.Services;
using Prescription.Shared.Authorization;
using Prescription.Shared.DTOs;

namespace Prescription.Api.Controllers;

/// <summary>
/// Medicine Management endpoints: list, search, view, create, edit, and activate/
/// deactivate medicines. Every authenticated role may view; only Administrators may
/// create, edit, activate, or deactivate (api-spec.md section 3) - a simpler,
/// single-write-tier authorization model than Patient Management's.
/// </summary>
[ApiController]
[Authorize]
[Route("api/medicines")]
public class MedicinesController : ControllerBase
{
    private readonly IMedicineService _medicineService;
    private readonly ILogger<MedicinesController> _logger;

    public MedicinesController(IMedicineService medicineService, ILogger<MedicinesController> logger)
    {
        _medicineService = medicineService;
        _logger = logger;
    }

    /// <summary>Returns a paginated list of all medicines, no search/filter applied.</summary>
    /// <response code="200">The requested page of medicines.</response>
    [HttpGet]
    [ProducesResponseType(typeof(MedicinePagedResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<MedicinePagedResponse>> GetAll(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] string sortBy = "createdDate",
        [FromQuery] string sortDirection = "desc")
    {
        var (medicines, totalCount) = await _medicineService.GetMedicinesAsync(page, pageSize, sortBy, sortDirection);

        _logger.LogInformation("Retrieved {Count} of {TotalCount} medicines (page {Page})", medicines.Count(), totalCount, page);

        return Ok(medicines.ToMedicinePagedResponse(totalCount, page, pageSize));
    }

    /// <summary>Returns full details for one medicine.</summary>
    /// <response code="200">The requested medicine's details.</response>
    /// <response code="404">No medicine exists with that ID.</response>
    [HttpGet("{medicineId:int}")]
    [ProducesResponseType(typeof(MedicineDetailResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<MedicineDetailResponse>> GetById(int medicineId)
    {
        var (medicine, medicineForm, medicineRoute) = await _medicineService.GetMedicineByIdAsync(medicineId);

        if (medicine is null || medicineForm is null || medicineRoute is null)
        {
            return NotFound();
        }

        return Ok(medicine.ToMedicineDetailResponse(medicineForm, medicineRoute));
    }

    /// <summary>Searches and filters medicines by code/name/generic name/brand/manufacturer, dosage form, route, status, and controlled-drug flag, with pagination.</summary>
    /// <response code="200">The requested page of matching medicines.</response>
    [HttpPost("search")]
    [ProducesResponseType(typeof(MedicinePagedResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<MedicinePagedResponse>> Search([FromBody] MedicineSearchRequest request)
    {
        var (medicines, totalCount) = await _medicineService.SearchMedicinesAsync(
            request.Page,
            request.PageSize,
            request.SearchTerm,
            request.MedicineFormCode,
            request.MedicineRouteCode,
            request.Status,
            request.IsControlledDrug,
            request.SortBy,
            request.SortDirection);

        _logger.LogInformation("Medicine search returned {Count} of {TotalCount} results (page {Page})", medicines.Count(), totalCount, request.Page);

        return Ok(medicines.ToMedicinePagedResponse(totalCount, request.Page, request.PageSize));
    }

    /// <summary>Adds a new medicine to the catalog. Medicine Code is required and must be unique.</summary>
    /// <response code="201">The medicine was created.</response>
    /// <response code="400">Validation failed, or the dosage form/route is invalid.</response>
    /// <response code="409">A medicine with this code, or this name/strength/dosage form, already exists.</response>
    [HttpPost]
    [Authorize(Roles = Roles.SystemAdministrator)]
    [ProducesResponseType(typeof(MedicineDetailResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ValidationProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
    public async Task<ActionResult<MedicineDetailResponse>> Create([FromBody] CreateMedicineRequest request)
    {
        var createdBy = CurrentUsername;

        var (medicine, medicineForm, medicineRoute) = await _medicineService.CreateMedicineAsync(
            request.MedicineCode,
            request.MedicineName,
            request.GenericName,
            request.BrandName,
            request.Strength,
            request.MedicineFormCode,
            request.MedicineRouteCode,
            request.Manufacturer,
            request.ATCCode,
            request.IsControlledDrug,
            request.Notes,
            createdBy);

        _logger.LogInformation("Medicine {MedicineCode} (ID {MedicineId}) created by {CreatedBy}", medicine.MedicineCode, medicine.MedicineId, createdBy);

        var response = medicine.ToMedicineDetailResponse(medicineForm, medicineRoute);

        return CreatedAtAction(nameof(GetById), new { medicineId = medicine.MedicineId }, response);
    }

    /// <summary>Edits an existing medicine's editable fields. Medicine Code cannot be changed.</summary>
    /// <response code="200">The updated medicine.</response>
    /// <response code="400">Validation failed, or the dosage form/route is invalid.</response>
    /// <response code="404">No medicine exists with that ID.</response>
    /// <response code="409">The name/strength/dosage form combination is already in use, or the medicine was modified by someone else since it was loaded.</response>
    [HttpPut("{medicineId:int}")]
    [Authorize(Roles = Roles.SystemAdministrator)]
    [ProducesResponseType(typeof(MedicineDetailResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ValidationProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
    public async Task<ActionResult<MedicineDetailResponse>> Update(int medicineId, [FromBody] UpdateMedicineRequest request)
    {
        var updatedBy = CurrentUsername;

        var (medicine, medicineForm, medicineRoute) = await _medicineService.UpdateMedicineAsync(
            medicineId,
            request.MedicineName,
            request.GenericName,
            request.BrandName,
            request.Strength,
            request.MedicineFormCode,
            request.MedicineRouteCode,
            request.Manufacturer,
            request.ATCCode,
            request.IsControlledDrug,
            request.Notes,
            request.RowVersion,
            updatedBy);

        _logger.LogInformation("Medicine {MedicineId} updated by {UpdatedBy}", medicineId, updatedBy);

        return Ok(medicine.ToMedicineDetailResponse(medicineForm, medicineRoute));
    }

    /// <summary>Sets a medicine's status to Active. Administrators only.</summary>
    /// <response code="200">The updated medicine.</response>
    /// <response code="404">No medicine exists with that ID.</response>
    [HttpPut("{medicineId:int}/activate")]
    [Authorize(Roles = Roles.SystemAdministrator)]
    [ProducesResponseType(typeof(MedicineDetailResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<MedicineDetailResponse>> Activate(int medicineId, [FromBody] ActivateMedicineRequest request)
    {
        var updatedBy = CurrentUsername;

        var (medicine, medicineForm, medicineRoute) = await _medicineService.ActivateMedicineAsync(medicineId, updatedBy);

        _logger.LogInformation("Medicine {MedicineId} activated by {UpdatedBy}", medicineId, updatedBy);

        return Ok(medicine.ToMedicineDetailResponse(medicineForm, medicineRoute));
    }

    /// <summary>Sets a medicine's status to Inactive so it can no longer be selected for new prescriptions. Administrators only.</summary>
    /// <response code="200">The updated medicine.</response>
    /// <response code="404">No medicine exists with that ID.</response>
    [HttpPut("{medicineId:int}/deactivate")]
    [Authorize(Roles = Roles.SystemAdministrator)]
    [ProducesResponseType(typeof(MedicineDetailResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<MedicineDetailResponse>> Deactivate(int medicineId, [FromBody] DeactivateMedicineRequest request)
    {
        var updatedBy = CurrentUsername;

        var (medicine, medicineForm, medicineRoute) = await _medicineService.DeactivateMedicineAsync(medicineId, updatedBy);

        _logger.LogInformation("Medicine {MedicineId} deactivated by {UpdatedBy}", medicineId, updatedBy);

        return Ok(medicine.ToMedicineDetailResponse(medicineForm, medicineRoute));
    }

    // "unique_name" is read as a raw claim key, not ClaimTypes.Name, because JWT
    // authentication is configured with MapInboundClaims = false (see
    // JwtAuthenticationExtensions.cs) - matching PatientsController's existing convention.
    private string CurrentUsername => User.FindFirst("unique_name")?.Value ?? "Unknown";
}
