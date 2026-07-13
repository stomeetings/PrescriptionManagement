using Prescription.Domain.Entities;

namespace Prescription.Application.Services;

public class CurrentUserResult
{
    public bool Succeeded { get; }
    public UserAccount? UserAccount { get; }
    public Role? Role { get; }

    private CurrentUserResult(bool succeeded, UserAccount? userAccount, Role? role)
    {
        Succeeded = succeeded;
        UserAccount = userAccount;
        Role = role;
    }

    public static CurrentUserResult Found(UserAccount userAccount, Role role)
        => new(true, userAccount, role);

    public static CurrentUserResult NotFound()
        => new(false, null, null);
}
