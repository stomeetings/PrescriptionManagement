using Prescription.Domain.Entities;
using Prescription.Shared.DTOs;

namespace Prescription.Application.Mapping;

public static class UserMappingExtensions
{
    public static UserListResponse ToUserListResponse(this UserAccount userAccount, Role role)
        => new UserListResponse
        {
            UserAccountId = userAccount.UserAccountId,
            Username = userAccount.Username,
            FullName = userAccount.FullName,
            Email = userAccount.Email,
            PhoneNumber = userAccount.PhoneNumber,
            Role = role.ToRoleResponse(),
            IsActive = userAccount.IsActive,
            LastLoginDate = userAccount.LastLoginDate,
            CreatedDate = userAccount.CreatedDate
        };

    public static UserDetailResponse ToUserDetailResponse(this UserAccount userAccount, Role role)
        => new UserDetailResponse
        {
            UserAccountId = userAccount.UserAccountId,
            FirstName = userAccount.FirstName,
            LastName = userAccount.LastName,
            FullName = userAccount.FullName,
            Username = userAccount.Username,
            Email = userAccount.Email,
            PhoneNumber = userAccount.PhoneNumber,
            Role = role.ToRoleResponse(),
            IsActive = userAccount.IsActive,
            LastLoginDate = userAccount.LastLoginDate,
            CreatedDate = userAccount.CreatedDate,
            CreatedBy = userAccount.CreatedBy,
            UpdatedDate = userAccount.UpdatedDate,
            UpdatedBy = userAccount.UpdatedBy,
            RowVersion = userAccount.RowVersion
        };

    public static UserPagedResponse ToUserPagedResponse(
        this IEnumerable<(UserAccount UserAccount, Role Role)> users,
        int totalCount,
        int page,
        int pageSize)
    {
        var totalPages = pageSize > 0 ? (int)Math.Ceiling(totalCount / (double)pageSize) : 0;

        return new UserPagedResponse
        {
            Items = users.Select(user => user.UserAccount.ToUserListResponse(user.Role)).ToList(),
            Page = page,
            PageSize = pageSize,
            TotalCount = totalCount,
            TotalPages = totalPages
        };
    }
}
