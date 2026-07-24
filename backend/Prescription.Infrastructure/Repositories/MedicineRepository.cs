using System.Data;
using Dapper;
using Microsoft.Data.SqlClient;
using Prescription.Application.Exceptions;
using Prescription.Application.Repositories;
using Prescription.Domain.Entities;

namespace Prescription.Infrastructure.Repositories;

public class MedicineRepository : IMedicineRepository
{
    private readonly IDbConnection _connection;

    public MedicineRepository(IDbConnection connection)
    {
        _connection = connection;
    }

    public async Task<(IEnumerable<(Medicine Medicine, MedicineForm MedicineForm, MedicineRoute MedicineRoute)> Medicines, int TotalCount)> GetMedicinesAsync(
        int page,
        int pageSize,
        string sortBy,
        string sortDirection)
    {
        using var multi = await _connection.QueryMultipleAsync(
            "usp_Medicine_GetAll",
            new { Page = page, PageSize = pageSize, SortBy = sortBy, SortDirection = sortDirection },
            commandType: CommandType.StoredProcedure);

        var rows = (await multi.ReadAsync<MedicineListRow>()).ToList();
        var totalCount = await multi.ReadSingleAsync<int>();

        var medicines = rows.Select(row => (row.ToMedicine(), row.ToMedicineForm(), row.ToMedicineRoute())).ToList();

        return (medicines, totalCount);
    }

    public async Task<(IEnumerable<(Medicine Medicine, MedicineForm MedicineForm, MedicineRoute MedicineRoute)> Medicines, int TotalCount)> SearchMedicinesAsync(
        int page,
        int pageSize,
        string? searchTerm,
        string? medicineFormCode,
        string? medicineRouteCode,
        string? status,
        bool? isControlledDrug,
        string sortBy,
        string sortDirection)
    {
        using var multi = await _connection.QueryMultipleAsync(
            "usp_Medicine_Search",
            new
            {
                Page = page,
                PageSize = pageSize,
                SearchTerm = searchTerm,
                MedicineFormCode = medicineFormCode,
                MedicineRouteCode = medicineRouteCode,
                Status = status,
                IsControlledDrug = isControlledDrug,
                SortBy = sortBy,
                SortDirection = sortDirection
            },
            commandType: CommandType.StoredProcedure);

        var rows = (await multi.ReadAsync<MedicineListRow>()).ToList();
        var totalCount = await multi.ReadSingleAsync<int>();

        var medicines = rows.Select(row => (row.ToMedicine(), row.ToMedicineForm(), row.ToMedicineRoute())).ToList();

        return (medicines, totalCount);
    }

    public async Task<(Medicine? Medicine, MedicineForm? MedicineForm, MedicineRoute? MedicineRoute)> GetMedicineByIdAsync(int medicineId)
    {
        var row = await _connection.QuerySingleOrDefaultAsync<MedicineDetailRow>(
            "usp_Medicine_GetById",
            new { MedicineId = medicineId },
            commandType: CommandType.StoredProcedure);

        return row is null ? (null, null, null) : (row.ToMedicine(), row.ToMedicineForm(), row.ToMedicineRoute());
    }

    public async Task<int> CreateMedicineAsync(Medicine medicine, string createdBy)
    {
        var parameters = new DynamicParameters();
        parameters.Add("MedicineCode", medicine.MedicineCode);
        parameters.Add("MedicineName", medicine.MedicineName);
        parameters.Add("GenericName", medicine.GenericName);
        parameters.Add("BrandName", medicine.BrandName);
        parameters.Add("Strength", medicine.Strength);
        parameters.Add("MedicineFormId", medicine.MedicineFormId);
        parameters.Add("MedicineRouteId", medicine.MedicineRouteId);
        parameters.Add("Manufacturer", medicine.Manufacturer);
        parameters.Add("ATCCode", medicine.ATCCode);
        parameters.Add("IsControlledDrug", medicine.IsControlledDrug);
        parameters.Add("Notes", medicine.Notes);
        parameters.Add("CreatedBy", createdBy);
        parameters.Add("MedicineId", dbType: DbType.Int32, direction: ParameterDirection.Output);

        try
        {
            await _connection.ExecuteAsync(
                "usp_Medicine_Create",
                parameters,
                commandType: CommandType.StoredProcedure);
        }
        catch (SqlException ex)
        {
            throw TranslateSqlException(ex);
        }

        return parameters.Get<int>("MedicineId");
    }

    public async Task UpdateMedicineAsync(Medicine medicine, string updatedBy)
    {
        var parameters = new
        {
            medicine.MedicineId,
            medicine.MedicineName,
            medicine.GenericName,
            medicine.BrandName,
            medicine.Strength,
            medicine.MedicineFormId,
            medicine.MedicineRouteId,
            medicine.Manufacturer,
            medicine.ATCCode,
            medicine.IsControlledDrug,
            medicine.Notes,
            medicine.RowVersion,
            UpdatedBy = updatedBy
        };

        try
        {
            await _connection.ExecuteAsync(
                "usp_Medicine_Update",
                parameters,
                commandType: CommandType.StoredProcedure);
        }
        catch (SqlException ex)
        {
            throw TranslateSqlException(ex);
        }
    }

    public async Task ActivateMedicineAsync(int medicineId, string updatedBy)
    {
        try
        {
            await _connection.ExecuteAsync(
                "usp_Medicine_Activate",
                new { MedicineId = medicineId, UpdatedBy = updatedBy },
                commandType: CommandType.StoredProcedure);
        }
        catch (SqlException ex)
        {
            throw TranslateSqlException(ex);
        }
    }

    public async Task DeactivateMedicineAsync(int medicineId, string updatedBy)
    {
        try
        {
            await _connection.ExecuteAsync(
                "usp_Medicine_Deactivate",
                new { MedicineId = medicineId, UpdatedBy = updatedBy },
                commandType: CommandType.StoredProcedure);
        }
        catch (SqlException ex)
        {
            throw TranslateSqlException(ex);
        }
    }

    public async Task<bool> CheckMedicineCodeExistsAsync(string medicineCode, int? excludeMedicineId)
    {
        var result = await _connection.QuerySingleAsync<int>(
            "usp_Medicine_CheckMedicineCodeExists",
            new { MedicineCode = medicineCode, ExcludeMedicineId = excludeMedicineId },
            commandType: CommandType.StoredProcedure);

        return result == 1;
    }

    public async Task<bool> CheckDuplicateMedicineAsync(string medicineName, string strength, int medicineFormId, int? excludeMedicineId)
    {
        var result = await _connection.QuerySingleAsync<int>(
            "usp_Medicine_CheckDuplicateMedicine",
            new { MedicineName = medicineName, Strength = strength, MedicineFormId = medicineFormId, ExcludeMedicineId = excludeMedicineId },
            commandType: CommandType.StoredProcedure);

        return result == 1;
    }

    // Translates the custom error numbers raised by usp_Medicine_Create/Update (see
    // database/StoredProcedures) into typed exceptions, so the Service layer can catch a
    // specific condition instead of parsing SQL Server error text or inspecting raw error
    // numbers itself. Mirrors PatientRepository/UserRepository's identical role, using a
    // distinct 50021-50024 range so raw error numbers never overlap across modules.
    private static Exception TranslateSqlException(SqlException ex)
    {
        return ex.Number switch
        {
            50021 => new DuplicateMedicineCodeException(),
            50022 => new DuplicateMedicineException(),
            50023 => new MedicineConcurrencyConflictException(),
            50024 => new MedicineNotFoundException(),
            _ => ex
        };
    }

    private class MedicineListRow
    {
        public int MedicineId { get; set; }
        public string MedicineCode { get; set; }
        public string MedicineName { get; set; }
        public string GenericName { get; set; }
        public string BrandName { get; set; }
        public string Strength { get; set; }
        public int MedicineFormId { get; set; }
        public string MedicineFormCode { get; set; }
        public string MedicineFormDisplayText { get; set; }
        public int MedicineRouteId { get; set; }
        public string MedicineRouteCode { get; set; }
        public string MedicineRouteDisplayText { get; set; }
        public string Manufacturer { get; set; }
        public bool IsControlledDrug { get; set; }
        public bool IsActive { get; set; }
        public DateTime CreatedDate { get; set; }
        public DateTime? UpdatedDate { get; set; }

        public Medicine ToMedicine() => new()
        {
            MedicineId = MedicineId,
            MedicineCode = MedicineCode,
            MedicineName = MedicineName,
            GenericName = GenericName,
            BrandName = BrandName,
            Strength = Strength,
            MedicineFormId = MedicineFormId,
            MedicineRouteId = MedicineRouteId,
            Manufacturer = Manufacturer,
            IsControlledDrug = IsControlledDrug,
            IsActive = IsActive,
            CreatedDate = CreatedDate,
            UpdatedDate = UpdatedDate
        };

        public MedicineForm ToMedicineForm() => new()
        {
            MedicineFormId = MedicineFormId,
            Code = MedicineFormCode,
            DisplayText = MedicineFormDisplayText
        };

        public MedicineRoute ToMedicineRoute() => new()
        {
            MedicineRouteId = MedicineRouteId,
            Code = MedicineRouteCode,
            DisplayText = MedicineRouteDisplayText
        };
    }

    private class MedicineDetailRow
    {
        public int MedicineId { get; set; }
        public string MedicineCode { get; set; }
        public string MedicineName { get; set; }
        public string GenericName { get; set; }
        public string BrandName { get; set; }
        public string Strength { get; set; }
        public int MedicineFormId { get; set; }
        public string MedicineFormCode { get; set; }
        public string MedicineFormDisplayText { get; set; }
        public int MedicineRouteId { get; set; }
        public string MedicineRouteCode { get; set; }
        public string MedicineRouteDisplayText { get; set; }
        public string Manufacturer { get; set; }
        public string ATCCode { get; set; }
        public bool IsControlledDrug { get; set; }
        public bool IsActive { get; set; }
        public string Notes { get; set; }
        public DateTime CreatedDate { get; set; }
        public string CreatedBy { get; set; }
        public DateTime? UpdatedDate { get; set; }
        public string UpdatedBy { get; set; }
        public byte[] RowVersion { get; set; }

        public Medicine ToMedicine() => new()
        {
            MedicineId = MedicineId,
            MedicineCode = MedicineCode,
            MedicineName = MedicineName,
            GenericName = GenericName,
            BrandName = BrandName,
            Strength = Strength,
            MedicineFormId = MedicineFormId,
            MedicineRouteId = MedicineRouteId,
            Manufacturer = Manufacturer,
            ATCCode = ATCCode,
            IsControlledDrug = IsControlledDrug,
            IsActive = IsActive,
            Notes = Notes,
            CreatedDate = CreatedDate,
            CreatedBy = CreatedBy,
            UpdatedDate = UpdatedDate,
            UpdatedBy = UpdatedBy,
            RowVersion = RowVersion
        };

        public MedicineForm ToMedicineForm() => new()
        {
            MedicineFormId = MedicineFormId,
            Code = MedicineFormCode,
            DisplayText = MedicineFormDisplayText
        };

        public MedicineRoute ToMedicineRoute() => new()
        {
            MedicineRouteId = MedicineRouteId,
            Code = MedicineRouteCode,
            DisplayText = MedicineRouteDisplayText
        };
    }
}
