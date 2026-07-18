using System.Data;
using Dapper;
using Microsoft.Data.SqlClient;
using Prescription.Application.Exceptions;
using Prescription.Application.Repositories;
using Prescription.Domain.Entities;

namespace Prescription.Infrastructure.Repositories;

public class UserRepository : IUserRepository
{
    private readonly IDbConnection _connection;

    public UserRepository(IDbConnection connection)
    {
        _connection = connection;
    }

    public async Task<(IEnumerable<(UserAccount UserAccount, Role Role)> Users, int TotalCount)> GetUsersAsync(
        int page,
        int pageSize,
        string? searchTerm,
        string? roleCode,
        string? status,
        string sortBy,
        string sortDirection)
    {
        // No filters supplied -> the simple, filter-free procedure; otherwise the
        // filtered/search procedure. Both return the same two result sets, but they
        // declare different parameter lists - usp_User_GetAll only takes Page/PageSize/
        // SortBy/SortDirection, so it must never be called with SearchTerm/RoleCode/
        // Status included, or SQL Server rejects the call with "too many arguments".
        var hasFilters = !string.IsNullOrWhiteSpace(searchTerm)
            || !string.IsNullOrWhiteSpace(roleCode)
            || !string.IsNullOrWhiteSpace(status);

        string procedureName;
        object parameters;

        if (hasFilters)
        {
            procedureName = "usp_User_Search";
            parameters = new
            {
                Page = page,
                PageSize = pageSize,
                SearchTerm = searchTerm,
                RoleCode = roleCode,
                Status = status,
                SortBy = sortBy,
                SortDirection = sortDirection
            };
        }
        else
        {
            procedureName = "usp_User_GetAll";
            parameters = new
            {
                Page = page,
                PageSize = pageSize,
                SortBy = sortBy,
                SortDirection = sortDirection
            };
        }

        using var multi = await _connection.QueryMultipleAsync(
            procedureName,
            parameters,
            commandType: CommandType.StoredProcedure);

        var rows = (await multi.ReadAsync<UserListRow>()).ToList();
        var totalCount = await multi.ReadSingleAsync<int>();

        var users = rows.Select(row => (row.ToUserAccount(), row.ToRole())).ToList();

        return (users, totalCount);
    }

    public async Task<(UserAccount? UserAccount, Role? Role)> GetUserByIdAsync(int userAccountId)
    {
        var row = await _connection.QuerySingleOrDefaultAsync<UserDetailRow>(
            "usp_User_GetById",
            new { UserAccountId = userAccountId },
            commandType: CommandType.StoredProcedure);

        return row is null ? (null, null) : (row.ToUserAccount(), row.ToRole());
    }

    public async Task<int> CreateUserAsync(UserAccount user, string createdBy)
    {
        var parameters = new DynamicParameters();
        parameters.Add("FirstName", user.FirstName);
        parameters.Add("LastName", user.LastName);
        parameters.Add("Username", user.Username);
        parameters.Add("Email", user.Email);
        parameters.Add("PhoneNumber", user.PhoneNumber);
        parameters.Add("RoleId", user.RoleId);
        parameters.Add("PasswordHash", user.PasswordHash);
        parameters.Add("IsActive", user.IsActive);
        parameters.Add("MustChangePassword", user.MustChangePassword);
        parameters.Add("CreatedBy", createdBy);
        parameters.Add("UserAccountId", dbType: DbType.Int32, direction: ParameterDirection.Output);

        try
        {
            await _connection.ExecuteAsync(
                "usp_User_Create",
                parameters,
                commandType: CommandType.StoredProcedure);
        }
        catch (SqlException ex)
        {
            throw TranslateSqlException(ex);
        }

        return parameters.Get<int>("UserAccountId");
    }

    public async Task UpdateUserAsync(UserAccount user, string updatedBy)
    {
        var parameters = new
        {
            user.UserAccountId,
            user.FirstName,
            user.LastName,
            user.Email,
            user.PhoneNumber,
            user.RoleId,
            user.IsActive,
            user.RowVersion,
            UpdatedBy = updatedBy
        };

        try
        {
            await _connection.ExecuteAsync(
                "usp_User_Update",
                parameters,
                commandType: CommandType.StoredProcedure);
        }
        catch (SqlException ex)
        {
            throw TranslateSqlException(ex);
        }
    }

    public async Task ActivateUserAsync(int userAccountId, string updatedBy)
    {
        try
        {
            await _connection.ExecuteAsync(
                "usp_User_Activate",
                new { UserAccountId = userAccountId, UpdatedBy = updatedBy },
                commandType: CommandType.StoredProcedure);
        }
        catch (SqlException ex)
        {
            throw TranslateSqlException(ex);
        }
    }

    public async Task DeactivateUserAsync(int userAccountId, string updatedBy)
    {
        try
        {
            await _connection.ExecuteAsync(
                "usp_User_Deactivate",
                new { UserAccountId = userAccountId, UpdatedBy = updatedBy },
                commandType: CommandType.StoredProcedure);
        }
        catch (SqlException ex)
        {
            throw TranslateSqlException(ex);
        }
    }

    public async Task ResetPasswordAsync(int userAccountId, string passwordHash, string updatedBy)
    {
        try
        {
            await _connection.ExecuteAsync(
                "usp_User_ResetPassword",
                new { UserAccountId = userAccountId, PasswordHash = passwordHash, UpdatedBy = updatedBy },
                commandType: CommandType.StoredProcedure);
        }
        catch (SqlException ex)
        {
            throw TranslateSqlException(ex);
        }
    }

    public async Task<bool> IsUsernameExistsAsync(string username, int? excludeUserAccountId)
    {
        var result = await _connection.QuerySingleAsync<int>(
            "usp_User_CheckUsernameExists",
            new { Username = username, ExcludeUserAccountId = excludeUserAccountId },
            commandType: CommandType.StoredProcedure);

        return result == 1;
    }

    public async Task<bool> IsEmailExistsAsync(string email, int? excludeUserAccountId)
    {
        var result = await _connection.QuerySingleAsync<int>(
            "usp_User_CheckEmailExists",
            new { Email = email, ExcludeUserAccountId = excludeUserAccountId },
            commandType: CommandType.StoredProcedure);

        return result == 1;
    }

    // Translates the custom error numbers raised by usp_User_Create/Update/Activate/
    // Deactivate/ResetPassword (see database/StoredProcedures) into typed exceptions,
    // so the Service layer can catch a specific condition instead of parsing SQL Server
    // error text or inspecting raw error numbers itself.
    private static Exception TranslateSqlException(SqlException ex)
    {
        return ex.Number switch
        {
            50001 => new DuplicateUsernameException(),
            50002 => new DuplicateEmailException(),
            50003 => new ConcurrencyConflictException(),
            50004 => new UserNotFoundException(),
            _ => ex
        };
    }

    private class UserListRow
    {
        public int UserAccountId { get; set; }
        public string Username { get; set; }
        public string FullName { get; set; }
        public string Email { get; set; }
        public string PhoneNumber { get; set; }
        public int RoleId { get; set; }
        public string RoleCode { get; set; }
        public string RoleDisplayText { get; set; }
        public bool IsActive { get; set; }
        public DateTime? LastLoginDate { get; set; }
        public DateTime CreatedDate { get; set; }

        public UserAccount ToUserAccount() => new()
        {
            UserAccountId = UserAccountId,
            Username = Username,
            FullName = FullName,
            Email = Email,
            PhoneNumber = PhoneNumber,
            RoleId = RoleId,
            IsActive = IsActive,
            LastLoginDate = LastLoginDate,
            CreatedDate = CreatedDate
        };

        public Role ToRole() => new()
        {
            RoleId = RoleId,
            Code = RoleCode,
            DisplayText = RoleDisplayText
        };
    }

    private class UserDetailRow
    {
        public int UserAccountId { get; set; }
        public string Username { get; set; }
        public string FirstName { get; set; }
        public string LastName { get; set; }
        public string FullName { get; set; }
        public string Email { get; set; }
        public string PhoneNumber { get; set; }
        public int RoleId { get; set; }
        public string RoleCode { get; set; }
        public string RoleDisplayText { get; set; }
        public bool IsActive { get; set; }
        public DateTime? LastLoginDate { get; set; }
        public DateTime CreatedDate { get; set; }
        public string CreatedBy { get; set; }
        public DateTime? UpdatedDate { get; set; }
        public string UpdatedBy { get; set; }
        public byte[] RowVersion { get; set; }

        public UserAccount ToUserAccount() => new()
        {
            UserAccountId = UserAccountId,
            Username = Username,
            FirstName = FirstName,
            LastName = LastName,
            FullName = FullName,
            Email = Email,
            PhoneNumber = PhoneNumber,
            RoleId = RoleId,
            IsActive = IsActive,
            LastLoginDate = LastLoginDate,
            CreatedDate = CreatedDate,
            CreatedBy = CreatedBy,
            UpdatedDate = UpdatedDate,
            UpdatedBy = UpdatedBy,
            RowVersion = RowVersion
        };

        public Role ToRole() => new()
        {
            RoleId = RoleId,
            Code = RoleCode,
            DisplayText = RoleDisplayText
        };
    }
}
