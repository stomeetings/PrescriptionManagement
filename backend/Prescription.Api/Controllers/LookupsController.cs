using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Prescription.Application.Mapping;
using Prescription.Application.Services;
using Prescription.Shared.DTOs;

namespace Prescription.Api.Controllers;

/// <summary>
/// Provides read-only access to lookup reference data (dropdown/reference values) used across the application.
/// </summary>
[ApiController]
[Route("api/lookups")]
[Authorize]
public class LookupsController : ControllerBase
{
    private readonly IGenderService _genderService;
    private readonly IPrescriptionStatusService _prescriptionStatusService;
    private readonly IMedicineFormService _medicineFormService;
    private readonly IMedicineRouteService _medicineRouteService;
    private readonly IDoseUnitService _doseUnitService;
    private readonly IFrequencyService _frequencyService;
    private readonly IDurationUnitService _durationUnitService;
    private readonly IProfileTypeService _profileTypeService;

    public LookupsController(
        IGenderService genderService,
        IPrescriptionStatusService prescriptionStatusService,
        IMedicineFormService medicineFormService,
        IMedicineRouteService medicineRouteService,
        IDoseUnitService doseUnitService,
        IFrequencyService frequencyService,
        IDurationUnitService durationUnitService,
        IProfileTypeService profileTypeService)
    {
        _genderService = genderService;
        _prescriptionStatusService = prescriptionStatusService;
        _medicineFormService = medicineFormService;
        _medicineRouteService = medicineRouteService;
        _doseUnitService = doseUnitService;
        _frequencyService = frequencyService;
        _durationUnitService = durationUnitService;
        _profileTypeService = profileTypeService;
    }

    /// <summary>
    /// Retrieves every lookup category and its values in a single call.
    /// </summary>
    /// <response code="200">All lookup categories and their values.</response>
    [HttpGet]
    [ProducesResponseType(typeof(IEnumerable<LookupCategoryResponse>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IEnumerable<LookupCategoryResponse>>> GetAll()
    {
        var categories = new List<LookupCategoryResponse>
        {
            (await _genderService.GetAllAsync()).ToLookupCategoryResponse(),
            (await _prescriptionStatusService.GetAllAsync()).ToLookupCategoryResponse(),
            (await _medicineFormService.GetAllAsync()).ToLookupCategoryResponse(),
            (await _medicineRouteService.GetAllAsync()).ToLookupCategoryResponse(),
            (await _doseUnitService.GetAllAsync()).ToLookupCategoryResponse(),
            (await _frequencyService.GetAllAsync()).ToLookupCategoryResponse(),
            (await _durationUnitService.GetAllAsync()).ToLookupCategoryResponse(),
            (await _profileTypeService.GetAllAsync()).ToLookupCategoryResponse()
        };

        return Ok(categories);
    }

    /// <summary>
    /// Retrieves values for a single lookup category.
    /// </summary>
    /// <param name="categoryCode">
    /// The category code (case-insensitive): Gender, PrescriptionStatus, MedicineForm,
    /// MedicineRoute, DoseUnit, Frequency, DurationUnit, or ProfileType.
    /// </param>
    /// <response code="200">The requested category and its values.</response>
    /// <response code="404">The category code is not recognized.</response>
    [HttpGet("{categoryCode}")]
    [ProducesResponseType(typeof(LookupCategoryResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<LookupCategoryResponse>> GetByCategory(string categoryCode)
    {
        LookupCategoryResponse response = categoryCode.ToLowerInvariant() switch
        {
            "gender" => (await _genderService.GetAllAsync()).ToLookupCategoryResponse(),
            "prescriptionstatus" => (await _prescriptionStatusService.GetAllAsync()).ToLookupCategoryResponse(),
            "medicineform" => (await _medicineFormService.GetAllAsync()).ToLookupCategoryResponse(),
            "medicineroute" => (await _medicineRouteService.GetAllAsync()).ToLookupCategoryResponse(),
            "doseunit" => (await _doseUnitService.GetAllAsync()).ToLookupCategoryResponse(),
            "frequency" => (await _frequencyService.GetAllAsync()).ToLookupCategoryResponse(),
            "durationunit" => (await _durationUnitService.GetAllAsync()).ToLookupCategoryResponse(),
            "profiletype" => (await _profileTypeService.GetAllAsync()).ToLookupCategoryResponse(),
            _ => null
        };

        if (response is null)
        {
            return NotFound();
        }

        return Ok(response);
    }
}
