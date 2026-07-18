using Prescription.Domain.Entities;

namespace Prescription.Application.Services;

public interface IUserService
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

    Task<(UserAccount UserAccount, Role Role)> CreateUserAsync(
        string firstName,
        string lastName,
        string username,
        string email,
        string? phoneNumber,
        string roleCode,
        string temporaryPassword,
        bool isActive,
        string createdBy);

    Task<(UserAccount UserAccount, Role Role)> UpdateUserAsync(
        int userAccountId,
        string firstName,
        string lastName,
        string email,
        string? phoneNumber,
        string roleCode,
        bool isActive,
        byte[] rowVersion,
        string updatedBy);

    Task<(UserAccount UserAccount, Role Role)> ActivateUserAsync(int userAccountId, string updatedBy);

    Task<(UserAccount UserAccount, Role Role)> DeactivateUserAsync(
        int userAccountId,
        int actingUserAccountId,
        string updatedBy);

    Task<string> ResetPasswordAsync(int userAccountId, string updatedBy);
}
