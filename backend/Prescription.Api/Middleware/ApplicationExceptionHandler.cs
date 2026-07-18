using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;
using Prescription.Application.Exceptions;

namespace Prescription.Api.Middleware;

// Maps the typed business exceptions thrown by the Application layer (see
// Prescription.Application.Exceptions) to their approved HTTP status codes, so a
// DuplicateEmailException becomes a 409 ProblemDetails instead of falling through to
// the generic 500 handler registered in Program.cs. Returns false for anything it
// doesn't recognize, letting that generic handler take over unchanged.
public class ApplicationExceptionHandler : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(HttpContext httpContext, Exception exception, CancellationToken cancellationToken)
    {
        var (statusCode, title) = exception switch
        {
            UserNotFoundException => (StatusCodes.Status404NotFound, "User not found."),
            DuplicateUsernameException => (StatusCodes.Status409Conflict, "A user with this username already exists."),
            DuplicateEmailException => (StatusCodes.Status409Conflict, "A user with this email already exists."),
            ConcurrencyConflictException => (StatusCodes.Status409Conflict, "This user was modified by someone else."),
            SelfDeactivationException => (StatusCodes.Status409Conflict, "Cannot deactivate your own account."),
            InvalidRoleException => (StatusCodes.Status400BadRequest, "Invalid role."),
            ArgumentException => (StatusCodes.Status400BadRequest, "Invalid request."),
            _ => (0, null)
        };

        if (statusCode == 0)
        {
            return false;
        }

        httpContext.Response.StatusCode = statusCode;
        httpContext.Response.ContentType = "application/problem+json";

        await httpContext.Response.WriteAsJsonAsync(
            new ProblemDetails
            {
                Title = title,
                Status = statusCode,
                Detail = exception.Message,
                Instance = httpContext.Request.Path
            },
            cancellationToken);

        return true;
    }
}
