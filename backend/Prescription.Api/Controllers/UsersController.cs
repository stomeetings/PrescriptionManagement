using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Prescription.Application.Mapping;
using Prescription.Application.Services;
using Prescription.Shared.Authorization;
using Prescription.Shared.DTOs;

namespace Prescription.Api.Controllers;

/// <summary>
/// User Management endpoints: list, view, create, edit, activate/deactivate, and
/// reset passwords for system users. Every endpoint requires the SYSTEM_ADMINISTRATOR
/// role - no other role has any access to this module in V1.
/// </summary>
[ApiController]
[Authorize(Roles = Roles.SystemAdministrator)]
[Route("api/users")]
public class UsersController : ControllerBase
{
    private readonly IUserService _userService;
    private readonly ILogger<UsersController> _logger;

    public UsersController(IUserService userService, ILogger<UsersController> logger)
    {
        _userService = userService;
        _logger = logger;
    }

    /// <summary>Returns a paginated list of all users, no search/filter applied.</summary>
    /// <response code="200">The requested page of users.</response>
    [HttpGet]
    [ProducesResponseType(typeof(UserPagedResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<UserPagedResponse>> GetAll(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] string sortBy = "createdDate",
        [FromQuery] string sortDirection = "desc")
    {
        var (users, totalCount) = await _userService.GetUsersAsync(
            page, pageSize, searchTerm: null, roleCode: null, status: null, sortBy, sortDirection);

        _logger.LogInformation("Retrieved {Count} of {TotalCount} users (page {Page})", users.Count(), totalCount, page);

        return Ok(users.ToUserPagedResponse(totalCount, page, pageSize));
    }

    /// <summary>Returns full details for one user.</summary>
    /// <response code="200">The requested user's details.</response>
    /// <response code="404">No user exists with that ID.</response>
    [HttpGet("{userAccountId:int}")]
    [ProducesResponseType(typeof(UserDetailResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<UserDetailResponse>> GetById(int userAccountId)
    {
        var (user, role) = await _userService.GetUserByIdAsync(userAccountId);

        if (user is null || role is null)
        {
            return NotFound();
        }

        return Ok(user.ToUserDetailResponse(role));
    }

    /// <summary>Creates a new system user with a generated temporary password.</summary>
    /// <response code="201">The user was created.</response>
    /// <response code="400">Validation failed, or the role code is invalid.</response>
    /// <response code="409">The username or email is already in use.</response>
    [HttpPost]
    [ProducesResponseType(typeof(UserDetailResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ValidationProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
    public async Task<ActionResult<UserDetailResponse>> Create([FromBody] CreateUserRequest request)
    {
        var createdBy = CurrentUsername;

        var (user, role) = await _userService.CreateUserAsync(
            request.FirstName,
            request.LastName,
            request.Username,
            request.Email,
            request.PhoneNumber,
            request.RoleCode,
            request.TemporaryPassword,
            request.IsActive,
            createdBy);

        // Never log Email/PhoneNumber/TemporaryPassword - only identifiers, consistent
        // with the project's logging rules (CLAUDE.md, backend-architecture.md).
        _logger.LogInformation("User {Username} (ID {UserAccountId}) created by {CreatedBy}", user.Username, user.UserAccountId, createdBy);

        var response = user.ToUserDetailResponse(role);

        return CreatedAtAction(nameof(GetById), new { userAccountId = user.UserAccountId }, response);
    }

    /// <summary>Searches and filters users by name/username/email, role, and status, with pagination.</summary>
    /// <response code="200">The requested page of matching users.</response>
    [HttpPost("search")]
    [ProducesResponseType(typeof(UserPagedResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<UserPagedResponse>> Search([FromBody] UserSearchRequest request)
    {
        var (users, totalCount) = await _userService.GetUsersAsync(
            request.Page,
            request.PageSize,
            request.SearchTerm,
            request.RoleCode,
            request.Status,
            request.SortBy,
            request.SortDirection);

        _logger.LogInformation("User search returned {Count} of {TotalCount} results (page {Page})", users.Count(), totalCount, request.Page);

        return Ok(users.ToUserPagedResponse(totalCount, request.Page, request.PageSize));
    }

    /// <summary>Edits an existing user's editable fields. Username cannot be changed.</summary>
    /// <response code="200">The updated user.</response>
    /// <response code="400">Validation failed, or the role code is invalid.</response>
    /// <response code="404">No user exists with that ID.</response>
    /// <response code="409">The email is already in use, or the user was modified by someone else since it was loaded.</response>
    [HttpPut("{userAccountId:int}")]
    [ProducesResponseType(typeof(UserDetailResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ValidationProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
    public async Task<ActionResult<UserDetailResponse>> Update(int userAccountId, [FromBody] UpdateUserRequest request)
    {
        var updatedBy = CurrentUsername;

        var (user, role) = await _userService.UpdateUserAsync(
            userAccountId,
            request.FirstName,
            request.LastName,
            request.Email,
            request.PhoneNumber,
            request.RoleCode,
            request.IsActive,
            request.RowVersion,
            updatedBy);

        _logger.LogInformation("User {UserAccountId} updated by {UpdatedBy}", userAccountId, updatedBy);

        return Ok(user.ToUserDetailResponse(role));
    }

    /// <summary>Sets a user's status to Active.</summary>
    /// <response code="200">The updated user.</response>
    /// <response code="404">No user exists with that ID.</response>
    [HttpPut("{userAccountId:int}/activate")]
    [ProducesResponseType(typeof(UserDetailResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<UserDetailResponse>> Activate(int userAccountId)
    {
        var updatedBy = CurrentUsername;

        var (user, role) = await _userService.ActivateUserAsync(userAccountId, updatedBy);

        _logger.LogInformation("User {UserAccountId} activated by {UpdatedBy}", userAccountId, updatedBy);

        return Ok(user.ToUserDetailResponse(role));
    }

    /// <summary>Sets a user's status to Inactive. An Administrator cannot deactivate their own account.</summary>
    /// <response code="200">The updated user.</response>
    /// <response code="404">No user exists with that ID.</response>
    /// <response code="409">The caller attempted to deactivate their own account.</response>
    [HttpPut("{userAccountId:int}/deactivate")]
    [ProducesResponseType(typeof(UserDetailResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
    public async Task<ActionResult<UserDetailResponse>> Deactivate(int userAccountId)
    {
        var updatedBy = CurrentUsername;
        var actingUserAccountId = CurrentUserAccountId;

        var (user, role) = await _userService.DeactivateUserAsync(userAccountId, actingUserAccountId, updatedBy);

        _logger.LogWarning("User {UserAccountId} deactivated by {UpdatedBy}", userAccountId, updatedBy);

        return Ok(user.ToUserDetailResponse(role));
    }

    /// <summary>
    /// Generates a new temporary password for a user. The response contains the
    /// plaintext temporary password exactly once - it cannot be retrieved again after
    /// this call, and is never stored or logged in plain text anywhere.
    /// </summary>
    /// <response code="200">The generated temporary password.</response>
    /// <response code="404">No user exists with that ID.</response>
    [HttpPut("{userAccountId:int}/reset-password")]
    [ProducesResponseType(typeof(ResetPasswordResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ResetPasswordResponse>> ResetPassword(int userAccountId, [FromBody] ResetPasswordRequest request)
    {
        var updatedBy = CurrentUsername;

        var (user, _) = await _userService.GetUserByIdAsync(userAccountId);
        if (user is null)
        {
            return NotFound();
        }

        var temporaryPassword = await _userService.ResetPasswordAsync(userAccountId, updatedBy);

        _logger.LogWarning("Password reset for user {UserAccountId} by {UpdatedBy}", userAccountId, updatedBy);

        return Ok(new ResetPasswordResponse
        {
            UserAccountId = userAccountId,
            Username = user.Username,
            TemporaryPassword = temporaryPassword
        });
    }

    // "sub"/"unique_name" are read as raw claim keys, not ClaimTypes.*, because JWT
    // authentication is configured with MapInboundClaims = false (see
    // JwtAuthenticationExtensions.cs) - matching AuthController's existing convention.
    private string CurrentUsername => User.FindFirst("unique_name")?.Value ?? "Unknown";

    private int CurrentUserAccountId => int.Parse(User.FindFirst("sub")!.Value);
}
