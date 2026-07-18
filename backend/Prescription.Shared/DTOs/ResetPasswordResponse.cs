namespace Prescription.Shared.DTOs;

// Not in this step's requested DTO list, but added anyway: without it there is no way
// to return the one-time plaintext temporary password (api-spec.md sections 4.7/12) -
// the entire point of the Reset Password endpoint.
public class ResetPasswordResponse
{
    public int UserAccountId { get; set; }
    public string Username { get; set; }
    public string TemporaryPassword { get; set; }
}
