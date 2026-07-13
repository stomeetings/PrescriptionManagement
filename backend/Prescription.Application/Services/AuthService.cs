using Microsoft.AspNetCore.Identity;
using Prescription.Application.Repositories;
using Prescription.Application.Security;
using Prescription.Domain.Entities;

namespace Prescription.Application.Services;

public class AuthService : IAuthService
{
    private readonly IUserAccountRepository _userAccountRepository;
    private readonly IPasswordHasher<UserAccount> _passwordHasher;
    private readonly IJwtTokenGenerator _jwtTokenGenerator;

    public AuthService(
        IUserAccountRepository userAccountRepository,
        IPasswordHasher<UserAccount> passwordHasher,
        IJwtTokenGenerator jwtTokenGenerator)
    {
        _userAccountRepository = userAccountRepository;
        _passwordHasher = passwordHasher;
        _jwtTokenGenerator = jwtTokenGenerator;
    }

    public async Task<AuthenticationResult> LoginAsync(string username, string password)
    {
        if (string.IsNullOrWhiteSpace(username) || string.IsNullOrWhiteSpace(password))
        {
            return AuthenticationResult.Failed();
        }

        var (userAccount, role) = await _userAccountRepository.GetByUsernameAsync(username);

        if (userAccount is null || role is null)
        {
            return AuthenticationResult.Failed();
        }

        var verificationResult = _passwordHasher.VerifyHashedPassword(userAccount, userAccount.PasswordHash, password);

        if (verificationResult == PasswordVerificationResult.Failed)
        {
            return AuthenticationResult.Failed();
        }

        if (!userAccount.IsActive || userAccount.IsDeleted)
        {
            return AuthenticationResult.Failed();
        }

        var accessToken = _jwtTokenGenerator.GenerateToken(userAccount, role);

        return AuthenticationResult.Success(userAccount, role, accessToken);
    }

    public async Task<CurrentUserResult> GetCurrentUserAsync(int userAccountId)
    {
        var (userAccount, role) = await _userAccountRepository.GetByIdAsync(userAccountId);

        if (userAccount is null || role is null || !userAccount.IsActive || userAccount.IsDeleted)
        {
            return CurrentUserResult.NotFound();
        }

        return CurrentUserResult.Found(userAccount, role);
    }
}
