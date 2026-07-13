namespace Prescription.Application.Services;

public interface IAuthService
{
    Task<AuthenticationResult> LoginAsync(string username, string password);

    Task<CurrentUserResult> GetCurrentUserAsync(int userAccountId);
}
