using System.Data;
using Dapper;
using Microsoft.Data.SqlClient;
using Prescription.Application.Exceptions;
using Prescription.Application.Repositories;
using Prescription.Domain.Entities;

namespace Prescription.Infrastructure.Repositories;

public class PatientRepository : IPatientRepository
{
    private readonly IDbConnection _connection;

    public PatientRepository(IDbConnection connection)
    {
        _connection = connection;
    }

    public async Task<(IEnumerable<(Patient Patient, Gender Gender)> Patients, int TotalCount)> GetPatientsAsync(
        int page,
        int pageSize,
        string sortBy,
        string sortDirection)
    {
        using var multi = await _connection.QueryMultipleAsync(
            "usp_Patient_GetAll",
            new { Page = page, PageSize = pageSize, SortBy = sortBy, SortDirection = sortDirection },
            commandType: CommandType.StoredProcedure);

        var rows = (await multi.ReadAsync<PatientListRow>()).ToList();
        var totalCount = await multi.ReadSingleAsync<int>();

        var patients = rows.Select(row => (row.ToPatient(), row.ToGender())).ToList();

        return (patients, totalCount);
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
        using var multi = await _connection.QueryMultipleAsync(
            "usp_Patient_Search",
            new
            {
                Page = page,
                PageSize = pageSize,
                SearchTerm = searchTerm,
                Status = status,
                GenderCode = genderCode,
                Nhi = nhi,
                FirstName = firstName,
                LastName = lastName,
                DateOfBirth = dateOfBirth,
                SortBy = sortBy,
                SortDirection = sortDirection
            },
            commandType: CommandType.StoredProcedure);

        var rows = (await multi.ReadAsync<PatientListRow>()).ToList();
        var totalCount = await multi.ReadSingleAsync<int>();

        var patients = rows.Select(row => (row.ToPatient(), row.ToGender())).ToList();

        return (patients, totalCount);
    }

    public async Task<(Patient? Patient, Gender? Gender)> GetPatientByIdAsync(int patientId)
    {
        var row = await _connection.QuerySingleOrDefaultAsync<PatientDetailRow>(
            "usp_Patient_GetById",
            new { PatientId = patientId },
            commandType: CommandType.StoredProcedure);

        return row is null ? (null, null) : (row.ToPatient(), row.ToGender());
    }

    public async Task<(int PatientId, string PatientNumber)> CreatePatientAsync(Patient patient, string createdBy)
    {
        var parameters = new DynamicParameters();
        parameters.Add("FirstName", patient.FirstName);
        parameters.Add("LastName", patient.LastName);
        parameters.Add("PreferredName", patient.PreferredName);
        parameters.Add("DateOfBirth", patient.DateOfBirth);
        parameters.Add("GenderId", patient.GenderId);
        parameters.Add("MobileNumber", patient.MobileNumber);
        parameters.Add("Email", patient.Email);
        parameters.Add("AddressLine1", patient.AddressLine1);
        parameters.Add("AddressLine2", patient.AddressLine2);
        parameters.Add("City", patient.City);
        parameters.Add("Region", patient.Region);
        parameters.Add("PostalCode", patient.PostalCode);
        parameters.Add("Country", patient.Country);
        parameters.Add("NHINumber", patient.NHINumber);
        parameters.Add("NZMCNumber", patient.NZMCNumber);
        parameters.Add("IsActive", patient.IsActive);
        parameters.Add("Notes", patient.Notes);
        parameters.Add("CreatedBy", createdBy);
        parameters.Add("PatientId", dbType: DbType.Int32, direction: ParameterDirection.Output);
        parameters.Add("PatientNumber", dbType: DbType.String, size: 20, direction: ParameterDirection.Output);

        try
        {
            await _connection.ExecuteAsync(
                "usp_Patient_Create",
                parameters,
                commandType: CommandType.StoredProcedure);
        }
        catch (SqlException ex)
        {
            throw TranslateSqlException(ex);
        }

        return (parameters.Get<int>("PatientId"), parameters.Get<string>("PatientNumber"));
    }

    public async Task UpdatePatientAsync(Patient patient, string updatedBy)
    {
        var parameters = new
        {
            patient.PatientId,
            patient.FirstName,
            patient.LastName,
            patient.PreferredName,
            patient.DateOfBirth,
            patient.GenderId,
            patient.MobileNumber,
            patient.Email,
            patient.AddressLine1,
            patient.AddressLine2,
            patient.City,
            patient.Region,
            patient.PostalCode,
            patient.Country,
            patient.NHINumber,
            patient.NZMCNumber,
            patient.Notes,
            patient.RowVersion,
            UpdatedBy = updatedBy
        };

        try
        {
            await _connection.ExecuteAsync(
                "usp_Patient_Update",
                parameters,
                commandType: CommandType.StoredProcedure);
        }
        catch (SqlException ex)
        {
            throw TranslateSqlException(ex);
        }
    }

    public async Task ActivatePatientAsync(int patientId, string updatedBy)
    {
        try
        {
            await _connection.ExecuteAsync(
                "usp_Patient_Activate",
                new { PatientId = patientId, UpdatedBy = updatedBy },
                commandType: CommandType.StoredProcedure);
        }
        catch (SqlException ex)
        {
            throw TranslateSqlException(ex);
        }
    }

    public async Task DeactivatePatientAsync(int patientId, string updatedBy)
    {
        try
        {
            await _connection.ExecuteAsync(
                "usp_Patient_Deactivate",
                new { PatientId = patientId, UpdatedBy = updatedBy },
                commandType: CommandType.StoredProcedure);
        }
        catch (SqlException ex)
        {
            throw TranslateSqlException(ex);
        }
    }

    public async Task<bool> CheckPatientNumberExistsAsync(string patientNumber, int? excludePatientId)
    {
        var result = await _connection.QuerySingleAsync<int>(
            "usp_Patient_CheckPatientNumberExists",
            new { PatientNumber = patientNumber, ExcludePatientId = excludePatientId },
            commandType: CommandType.StoredProcedure);

        return result == 1;
    }

    public async Task<bool> CheckNHINumberExistsAsync(string nhiNumber, int? excludePatientId)
    {
        var result = await _connection.QuerySingleAsync<int>(
            "usp_Patient_CheckNHINumberExists",
            new { NHINumber = nhiNumber, ExcludePatientId = excludePatientId },
            commandType: CommandType.StoredProcedure);

        return result == 1;
    }

    // Translates the custom error numbers raised by usp_Patient_Create/Update (see
    // database/StoredProcedures) into typed exceptions, so the Service layer can catch a
    // specific condition instead of parsing SQL Server error text or inspecting raw error
    // numbers itself. Mirrors UserRepository.TranslateSqlException's role exactly, using
    // a distinct 50011-50014 range so raw error numbers never overlap across modules.
    private static Exception TranslateSqlException(SqlException ex)
    {
        return ex.Number switch
        {
            50011 => new DuplicatePatientNumberException(),
            50012 => new DuplicateNhiNumberException(),
            50013 => new PatientConcurrencyConflictException(),
            50014 => new PatientNotFoundException(),
            _ => ex
        };
    }

    private class PatientListRow
    {
        public int PatientId { get; set; }
        public string PatientNumber { get; set; }
        public string FirstName { get; set; }
        public string LastName { get; set; }
        public DateTime DateOfBirth { get; set; }
        public int GenderId { get; set; }
        public string GenderCode { get; set; }
        public string GenderDisplayText { get; set; }
        public string MobileNumber { get; set; }
        public string Email { get; set; }
        public string NHINumber { get; set; }
        public bool IsActive { get; set; }
        public DateTime CreatedDate { get; set; }
        public DateTime? UpdatedDate { get; set; }

        public Patient ToPatient() => new()
        {
            PatientId = PatientId,
            PatientNumber = PatientNumber,
            FirstName = FirstName,
            LastName = LastName,
            DateOfBirth = DateOfBirth,
            GenderId = GenderId,
            MobileNumber = MobileNumber,
            Email = Email,
            NHINumber = NHINumber,
            IsActive = IsActive,
            CreatedDate = CreatedDate,
            UpdatedDate = UpdatedDate
        };

        public Gender ToGender() => new()
        {
            GenderId = GenderId,
            Code = GenderCode,
            DisplayText = GenderDisplayText
        };
    }

    private class PatientDetailRow
    {
        public int PatientId { get; set; }
        public string PatientNumber { get; set; }
        public string FirstName { get; set; }
        public string LastName { get; set; }
        public string PreferredName { get; set; }
        public DateTime DateOfBirth { get; set; }
        public int GenderId { get; set; }
        public string GenderCode { get; set; }
        public string GenderDisplayText { get; set; }
        public string MobileNumber { get; set; }
        public string Email { get; set; }
        public string AddressLine1 { get; set; }
        public string AddressLine2 { get; set; }
        public string City { get; set; }
        public string Region { get; set; }
        public string PostalCode { get; set; }
        public string Country { get; set; }
        public string NHINumber { get; set; }
        public string NZMCNumber { get; set; }
        public bool IsActive { get; set; }
        public string Notes { get; set; }
        public DateTime CreatedDate { get; set; }
        public string CreatedBy { get; set; }
        public DateTime? UpdatedDate { get; set; }
        public string UpdatedBy { get; set; }
        public byte[] RowVersion { get; set; }

        public Patient ToPatient() => new()
        {
            PatientId = PatientId,
            PatientNumber = PatientNumber,
            FirstName = FirstName,
            LastName = LastName,
            PreferredName = PreferredName,
            DateOfBirth = DateOfBirth,
            GenderId = GenderId,
            MobileNumber = MobileNumber,
            Email = Email,
            AddressLine1 = AddressLine1,
            AddressLine2 = AddressLine2,
            City = City,
            Region = Region,
            PostalCode = PostalCode,
            Country = Country,
            NHINumber = NHINumber,
            NZMCNumber = NZMCNumber,
            IsActive = IsActive,
            Notes = Notes,
            CreatedDate = CreatedDate,
            CreatedBy = CreatedBy,
            UpdatedDate = UpdatedDate,
            UpdatedBy = UpdatedBy,
            RowVersion = RowVersion
        };

        public Gender ToGender() => new()
        {
            GenderId = GenderId,
            Code = GenderCode,
            DisplayText = GenderDisplayText
        };
    }
}
