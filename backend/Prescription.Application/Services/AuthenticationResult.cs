using Prescription.Domain.Entities;

namespace Prescription.Application.Services;

public class AuthenticationResult
{
    public bool Succeeded { get; }
    public UserAccount? UserAccount { get; }
    public Role? Role { get; }
    public string? AccessToken { get; }

    private AuthenticationResult(bool succeeded, UserAccount? userAccount, Role? role, string? accessToken)
    {
        Succeeded = succeeded;
        UserAccount = userAccount;
        Role = role;
        AccessToken = accessToken;
    }

    public static AuthenticationResult Success(UserAccount userAccount, Role role, string accessToken)
        => new(true, userAccount, role, accessToken);

    public static AuthenticationResult Failed()
        => new(false, null, null, null);
}
