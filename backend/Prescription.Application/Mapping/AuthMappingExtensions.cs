using Prescription.Domain.Entities;
using Prescription.Shared.DTOs;

namespace Prescription.Application.Mapping;

public static class AuthMappingExtensions
{
    public static RoleResponse ToRoleResponse(this Role entity)
        => new RoleResponse
        {
            Code = entity.Code,
            DisplayText = entity.DisplayText
        };

    public static CurrentUserResponse ToCurrentUserResponse(this UserAccount userAccount, Role role)
        => new CurrentUserResponse
        {
            UserAccountId = userAccount.UserAccountId,
            Username = userAccount.Username,
            FullName = userAccount.FullName,
            Role = role.ToRoleResponse()
        };
}
