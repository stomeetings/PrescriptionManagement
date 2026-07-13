using Prescription.Domain.Entities;

namespace Prescription.Application.Security;

public interface IJwtTokenGenerator
{
    string GenerateToken(UserAccount userAccount, Role role);
}
