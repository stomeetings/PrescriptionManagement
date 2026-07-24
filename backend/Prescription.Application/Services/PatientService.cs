using System.Text.RegularExpressions;
using Prescription.Application.Exceptions;
using Prescription.Application.Repositories;
using Prescription.Domain.Entities;

namespace Prescription.Application.Services;

public class PatientService : IPatientService
{
    private static readonly Regex EmailPattern = new(@"^[^@\s]+@[^@\s]+\.[^@\s]+$", RegexOptions.Compiled);

    // No confirmed mobile-number format rule exists anywhere in the approved business,
    // database, or API specs for Patient Management (all three explicitly leave it
    // unresolved pending the system's NZ-only-vs-general locale scope decision). This
    // pattern - digits, spaces, "+", "-", parentheses, 7-20 characters - is this
    // Service's own interim rule, not a documented project standard; revisit once that
    // scope question is answered.
    private static readonly Regex MobileNumberPattern = new(@"^[0-9+()\-\s]{7,20}$", RegexOptions.Compiled);

    private readonly IPatientRepository _patientRepository;
    private readonly IGenderRepository _genderRepository;

    public PatientService(IPatientRepository patientRepository, IGenderRepository genderRepository)
    {
        _patientRepository = patientRepository;
        _genderRepository = genderRepository;
    }

    public async Task<(IEnumerable<(Patient Patient, Gender Gender)> Patients, int TotalCount)> GetPatientsAsync(
        int page,
        int pageSize,
        string sortBy,
        string sortDirection)
    {
        var normalizedPage = page < 1 ? 1 : page;
        var normalizedPageSize = pageSize is < 1 or > 100 ? 20 : pageSize;

        return await _patientRepository.GetPatientsAsync(normalizedPage, normalizedPageSize, sortBy, sortDirection);
    }

    public async Task<(IEnumerable<(Patient Patient, Gender Gender)> Patients, int TotalCount)> SearchPatientsAsync(
        int page,
        int pageSize,
        string? searchTerm,
        string? status,
        string? genderCode,
        string? nhi,
        string? firstName,
        string? lastName,
        DateTime? dateOfBirth,
        string sortBy,
        string sortDirection)
    {
        var normalizedPage = page < 1 ? 1 : page;
        var normalizedPageSize = pageSize is < 1 or > 100 ? 20 : pageSize;

        return await _patientRepository.SearchPatientsAsync(
            normalizedPage,
            normalizedPageSize,
            TrimOrNull(searchTerm),
            TrimOrNull(status),
            TrimOrNull(genderCode),
            TrimOrNull(nhi),
            TrimOrNull(firstName),
            TrimOrNull(lastName),
            dateOfBirth,
            sortBy,
            sortDirection);
    }

    public Task<(Patient? Patient, Gender? Gender)> GetPatientByIdAsync(int patientId)
        => _patientRepository.GetPatientByIdAsync(patientId);

    public async Task<(Patient Patient, Gender Gender)> CreatePatientAsync(
        string firstName,
        string lastName,
        string? preferredName,
        DateTime dateOfBirth,
        string genderCode,
        string? mobileNumber,
        string? email,
        string? addressLine1,
        string? addressLine2,
        string? city,
        string? region,
        string? postalCode,
        string? country,
        string? nhiNumber,
        string? nzmcNumber,
        bool isActive,
        string? notes,
        string createdBy)
    {
        firstName = ValidateRequired(firstName, nameof(firstName));
        lastName = ValidateRequired(lastName, nameof(lastName));
        genderCode = ValidateRequired(genderCode, nameof(genderCode));

        preferredName = TrimOrNull(preferredName);
        mobileNumber = TrimOrNull(mobileNumber);
        email = TrimOrNull(email);
        addressLine1 = TrimOrNull(addressLine1);
        addressLine2 = TrimOrNull(addressLine2);
        city = TrimOrNull(city);
        region = TrimOrNull(region);
        postalCode = TrimOrNull(postalCode);
        country = TrimOrNull(country);
        nhiNumber = TrimOrNull(nhiNumber);
        nzmcNumber = TrimOrNull(nzmcNumber);
        notes = TrimOrNull(notes);

        ValidateDateOfBirthNotInFuture(dateOfBirth);
        ValidateEmailFormat(email);
        ValidateMobileNumberFormat(mobileNumber);

        var gender = await GetActiveGenderOrThrowAsync(genderCode);

        // PatientNumber has no client-supplied value to check for uniqueness against - it
        // is generated inside usp_Patient_Create from Patient_PatientNumberSequence (see
        // the approved database spec, section 3.3). usp_Patient_Create still translates a
        // UQ_Patient_PatientNumber violation into DuplicatePatientNumberException as a
        // defensive fallback, but there is no pre-check to perform here for it.
        if (nhiNumber is not null && await _patientRepository.CheckNHINumberExistsAsync(nhiNumber, excludePatientId: null))
        {
            throw new DuplicateNhiNumberException();
        }

        var newPatient = new Patient
        {
            FirstName = firstName,
            LastName = lastName,
            PreferredName = preferredName,
            DateOfBirth = dateOfBirth,
            GenderId = gender.GenderId,
            MobileNumber = mobileNumber,
            Email = email,
            AddressLine1 = addressLine1,
            AddressLine2 = addressLine2,
            City = city,
            Region = region,
            PostalCode = postalCode,
            Country = country,
            NHINumber = nhiNumber,
            NZMCNumber = nzmcNumber,
            IsActive = isActive,
            Notes = notes
        };

        var (patientId, _) = await _patientRepository.CreatePatientAsync(newPatient, createdBy);

        // Re-fetch rather than returning `newPatient` as-is: PatientNumber, CreatedDate
        // and RowVersion are generated by SQL Server, not known to this in-memory object -
        // matches UserService.CreateUserAsync's identical reasoning.
        var (createdPatient, createdGender) = await _patientRepository.GetPatientByIdAsync(patientId);

        return (createdPatient!, createdGender!);
    }

    public async Task<(Patient Patient, Gender Gender)> UpdatePatientAsync(
        int patientId,
        string firstName,
        string lastName,
        string? preferredName,
        DateTime dateOfBirth,
        string genderCode,
        string? mobileNumber,
        string? email,
        string? addressLine1,
        string? addressLine2,
        string? city,
        string? region,
        string? postalCode,
        string? country,
        string? nhiNumber,
        string? nzmcNumber,
        string? notes,
        byte[] rowVersion,
        string updatedBy)
    {
        firstName = ValidateRequired(firstName, nameof(firstName));
        lastName = ValidateRequired(lastName, nameof(lastName));
        genderCode = ValidateRequired(genderCode, nameof(genderCode));

        preferredName = TrimOrNull(preferredName);
        mobileNumber = TrimOrNull(mobileNumber);
        email = TrimOrNull(email);
        addressLine1 = TrimOrNull(addressLine1);
        addressLine2 = TrimOrNull(addressLine2);
        city = TrimOrNull(city);
        region = TrimOrNull(region);
        postalCode = TrimOrNull(postalCode);
        country = TrimOrNull(country);
        nhiNumber = TrimOrNull(nhiNumber);
        nzmcNumber = TrimOrNull(nzmcNumber);
        notes = TrimOrNull(notes);

        ValidateDateOfBirthNotInFuture(dateOfBirth);
        ValidateEmailFormat(email);
        ValidateMobileNumberFormat(mobileNumber);

        var (existingPatient, _) = await _patientRepository.GetPatientByIdAsync(patientId);
        if (existingPatient is null)
        {
            throw new PatientNotFoundException();
        }

        var gender = await GetActiveGenderOrThrowAsync(genderCode);

        if (nhiNumber is not null && await _patientRepository.CheckNHINumberExistsAsync(nhiNumber, excludePatientId: patientId))
        {
            throw new DuplicateNhiNumberException();
        }

        // PatientNumber and IsActive are deliberately absent from this method's
        // parameters - PatientNumber cannot be changed after creation (business spec
        // section 4.5) and there is no way to pass one in; IsActive changes only through
        // ActivatePatientAsync/DeactivatePatientAsync, matching usp_Patient_Update's own
        // parameter list, which accepts neither.
        var patientToUpdate = new Patient
        {
            PatientId = patientId,
            FirstName = firstName,
            LastName = lastName,
            PreferredName = preferredName,
            DateOfBirth = dateOfBirth,
            GenderId = gender.GenderId,
            MobileNumber = mobileNumber,
            Email = email,
            AddressLine1 = addressLine1,
            AddressLine2 = addressLine2,
            City = city,
            Region = region,
            PostalCode = postalCode,
            Country = country,
            NHINumber = nhiNumber,
            NZMCNumber = nzmcNumber,
            Notes = notes,
            RowVersion = rowVersion
        };

        // The repository/stored procedure is the authoritative check for the RowVersion
        // match - a stale value throws PatientConcurrencyConflictException from there,
        // not here (mirrors UserService.UpdateUserAsync).
        await _patientRepository.UpdatePatientAsync(patientToUpdate, updatedBy);

        var (updatedPatient, updatedGender) = await _patientRepository.GetPatientByIdAsync(patientId);

        return (updatedPatient!, updatedGender!);
    }

    public async Task<(Patient Patient, Gender Gender)> ActivatePatientAsync(int patientId, string updatedBy)
    {
        // usp_Patient_Activate itself throws PATIENT_NOT_FOUND (translated to
        // PatientNotFoundException by the repository) when @@ROWCOUNT is 0 - no
        // redundant existence pre-check here, matching UserService.ActivateUserAsync.
        await _patientRepository.ActivatePatientAsync(patientId, updatedBy);

        var (patient, gender) = await _patientRepository.GetPatientByIdAsync(patientId);

        return (patient!, gender!);
    }

    public async Task<(Patient Patient, Gender Gender)> DeactivatePatientAsync(int patientId, string updatedBy)
    {
        // "Inactive patients cannot be used for future prescription creation" is enforced
        // by the future Prescription module reading Patient.IsActive at the point a
        // prescription is created - there is no such consumer in this codebase yet, so
        // there is nothing for Patient Management itself to guard here beyond flipping
        // the flag. This mirrors how Deactivate here performs only the state change,
        // matching usp_User_Deactivate/UserService.DeactivateUserAsync's own division of
        // responsibility (self-deactivation is the one extra rule User Management has;
        // Patient Management's business spec defines no equivalent restriction on who may
        // deactivate a patient - see database-spec.md section 10 item 5, still open).
        await _patientRepository.DeactivatePatientAsync(patientId, updatedBy);

        var (patient, gender) = await _patientRepository.GetPatientByIdAsync(patientId);

        return (patient!, gender!);
    }

    private async Task<Gender> GetActiveGenderOrThrowAsync(string genderCode)
    {
        var genders = await _genderRepository.GetAllAsync();
        var matchedGender = genders.FirstOrDefault(gender =>
            gender.IsActive && string.Equals(gender.Code, genderCode, StringComparison.OrdinalIgnoreCase));

        return matchedGender ?? throw new InvalidGenderException();
    }

    private static string ValidateRequired(string value, string fieldName)
    {
        var trimmed = value?.Trim();

        if (string.IsNullOrWhiteSpace(trimmed))
        {
            throw new ArgumentException($"{fieldName} is required.", fieldName);
        }

        return trimmed;
    }

    private static string? TrimOrNull(string? value)
    {
        var trimmed = value?.Trim();
        return string.IsNullOrEmpty(trimmed) ? null : trimmed;
    }

    private static void ValidateDateOfBirthNotInFuture(DateTime dateOfBirth)
    {
        // Only "not in the future" is enforced, matching the approved database spec's own
        // decision (section 5) - the related "at least one day old" rule is still
        // unconfirmed (possible newborn-exclusion bug flagged in the business-spec
        // review) and is deliberately not enforced here either.
        if (dateOfBirth.Date > DateTime.UtcNow.Date)
        {
            throw new ArgumentException("Date of birth cannot be in the future.", nameof(dateOfBirth));
        }
    }

    private static void ValidateEmailFormat(string? email)
    {
        if (email is not null && !EmailPattern.IsMatch(email))
        {
            throw new ArgumentException("Email is not a valid email address.", nameof(email));
        }
    }

    private static void ValidateMobileNumberFormat(string? mobileNumber)
    {
        if (mobileNumber is not null && !MobileNumberPattern.IsMatch(mobileNumber))
        {
            throw new ArgumentException("Mobile number is not a valid phone number.", nameof(mobileNumber));
        }
    }
}
