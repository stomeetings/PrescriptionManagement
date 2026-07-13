using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using Prescription.Application.Mapping;
using Prescription.Application.Security;
using Prescription.Application.Services;
using Prescription.Shared.DTOs;

namespace Prescription.Api.Controllers;

/// <summary>
/// Authentication endpoints: login, logout, and retrieving the current authenticated user's profile.
/// </summary>
[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _authService;
    private readonly JwtOptions _jwtOptions;

    public AuthController(IAuthService authService, IOptions<JwtOptions> jwtOptions)
    {
        _authService = authService;
        _jwtOptions = jwtOptions.Value;
    }

    /// <summary>
    /// Authenticates a user by username and password and issues a JWT access token.
    /// Call this endpoint without an Authorization header.
    /// </summary>
    /// <response code="200">Login succeeded; returns the access token and user profile.</response>
    /// <response code="400">The username or password is missing or invalid.</response>
    /// <response code="401">The username or password is incorrect, or the account is not active.</response>
    [HttpPost("login")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(LoginResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ValidationProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<LoginResponse>> Login([FromBody] LoginRequest request)
    {
        var result = await _authService.LoginAsync(request.Username, request.Password);

        if (!result.Succeeded)
        {
            return Problem(
                statusCode: StatusCodes.Status401Unauthorized,
                title: "Authentication failed.",
                detail: "The username or password is incorrect, or the account is not active.");
        }

        var response = new LoginResponse
        {
            AccessToken = result.AccessToken!,
            TokenType = "Bearer",
            ExpiresIn = _jwtOptions.ExpirationMinutes * 60,
            ExpiresAtUtc = DateTime.UtcNow.AddMinutes(_jwtOptions.ExpirationMinutes),
            User = result.UserAccount!.ToCurrentUserResponse(result.Role!)
        };

        return Ok(response);
    }

    /// <summary>
    /// Signals end-of-session. The client must discard its access token; the server holds no
    /// token state to revoke. Requires a valid Authorization header.
    /// </summary>
    /// <response code="200">Logout acknowledged.</response>
    /// <response code="401">A valid access token is required.</response>
    [HttpPost("logout")]
    [Authorize]
    [ProducesResponseType(typeof(LogoutResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status401Unauthorized)]
    public ActionResult<LogoutResponse> Logout()
    {
        return Ok(new LogoutResponse { Message = "Logout successful." });
    }

    /// <summary>
    /// Returns the currently authenticated user's profile, resolved from the bearer token.
    /// Requires a valid Authorization header.
    /// </summary>
    /// <response code="200">The current user's profile.</response>
    /// <response code="401">A valid access token is required, or the account is no longer active.</response>
    [HttpGet("me")]
    [Authorize]
    [ProducesResponseType(typeof(CurrentUserResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<CurrentUserResponse>> Me()
    {
        var userAccountIdClaim = User.FindFirst("sub")?.Value;

        if (!int.TryParse(userAccountIdClaim, out var userAccountId))
        {
            return Problem(
                statusCode: StatusCodes.Status401Unauthorized,
                title: "Unauthorized.",
                detail: "A valid access token is required.");
        }

        var result = await _authService.GetCurrentUserAsync(userAccountId);

        if (!result.Succeeded)
        {
            return Problem(
                statusCode: StatusCodes.Status401Unauthorized,
                title: "Unauthorized.",
                detail: "A valid access token is required.");
        }

        return Ok(result.UserAccount!.ToCurrentUserResponse(result.Role!));
    }
}
