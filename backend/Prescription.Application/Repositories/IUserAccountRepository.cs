using Prescription.Domain.Entities;

namespace Prescription.Application.Repositories;

public interface IUserAccountRepository
{
    Task<(UserAccount? UserAccount, Role? Role)> GetByUsernameAsync(string username);

    Task<(UserAccount? UserAccount, Role? Role)> GetByIdAsync(int userAccountId);
}
