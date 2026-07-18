using Prescription.Domain.Entities;

namespace Prescription.Application.Repositories;

public interface IUserRepository
{
    Task<(IEnumerable<(UserAccount UserAccount, Role Role)> Users, int TotalCount)> GetUsersAsync(
        int page,
        int pageSize,
        string? searchTerm,
        string? roleCode,
        string? status,
        string sortBy,
        string sortDirection);

    Task<(UserAccount? UserAccount, Role? Role)> GetUserByIdAsync(int userAccountId);

    Task<int> CreateUserAsync(UserAccount user, string createdBy);

    Task UpdateUserAsync(UserAccount user, string updatedBy);

    Task ActivateUserAsync(int userAccountId, string updatedBy);

    Task DeactivateUserAsync(int userAccountId, string updatedBy);

    Task ResetPasswordAsync(int userAccountId, string passwordHash, string updatedBy);

    Task<bool> IsUsernameExistsAsync(string username, int? excludeUserAccountId);

    Task<bool> IsEmailExistsAsync(string email, int? excludeUserAccountId);
}
