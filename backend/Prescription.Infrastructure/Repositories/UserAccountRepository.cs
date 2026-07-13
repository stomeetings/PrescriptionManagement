using System.Data;
using Dapper;
using Prescription.Application.Repositories;
using Prescription.Domain.Entities;

namespace Prescription.Infrastructure.Repositories;

public class UserAccountRepository : IUserAccountRepository
{
    private readonly IDbConnection _connection;

    public UserAccountRepository(IDbConnection connection)
    {
        _connection = connection;
    }

    public async Task<(UserAccount? UserAccount, Role? Role)> GetByUsernameAsync(string username)
    {
        var row = await _connection.QuerySingleOrDefaultAsync<UserAccountLoginRow>(
            "usp_UserAccount_GetByUsername",
            new { Username = username },
            commandType: CommandType.StoredProcedure);

        if (row is null)
        {
            return (null, null);
        }

        var userAccount = new UserAccount
        {
            UserAccountId = row.UserAccountId,
            Username = row.Username,
            PasswordHash = row.PasswordHash,
            FullName = row.FullName,
            RoleId = row.RoleId,
            IsActive = row.IsActive,
            IsDeleted = row.IsDeleted
        };

        var role = new Role
        {
            RoleId = row.RoleId,
            Code = row.RoleCode,
            DisplayText = row.RoleDisplayText
        };

        return (userAccount, role);
    }

    public async Task<(UserAccount? UserAccount, Role? Role)> GetByIdAsync(int userAccountId)
    {
        var row = await _connection.QuerySingleOrDefaultAsync<UserAccountProfileRow>(
            "usp_UserAccount_GetById",
            new { UserAccountId = userAccountId },
            commandType: CommandType.StoredProcedure);

        if (row is null)
        {
            return (null, null);
        }

        var userAccount = new UserAccount
        {
            UserAccountId = row.UserAccountId,
            Username = row.Username,
            FullName = row.FullName,
            RoleId = row.RoleId,
            IsActive = row.IsActive,
            IsDeleted = row.IsDeleted
        };

        var role = new Role
        {
            RoleId = row.RoleId,
            Code = row.RoleCode,
            DisplayText = row.RoleDisplayText
        };

        return (userAccount, role);
    }

    private class UserAccountLoginRow
    {
        public int UserAccountId { get; set; }
        public string Username { get; set; }
        public string PasswordHash { get; set; }
        public string FullName { get; set; }
        public int RoleId { get; set; }
        public string RoleCode { get; set; }
        public string RoleDisplayText { get; set; }
        public bool IsActive { get; set; }
        public bool IsDeleted { get; set; }
    }

    private class UserAccountProfileRow
    {
        public int UserAccountId { get; set; }
        public string Username { get; set; }
        public string FullName { get; set; }
        public int RoleId { get; set; }
        public string RoleCode { get; set; }
        public string RoleDisplayText { get; set; }
        public bool IsActive { get; set; }
        public bool IsDeleted { get; set; }
    }
}
