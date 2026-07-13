namespace Prescription.Shared.DTOs;

public class LoginResponse
{
    public string AccessToken { get; set; }
    public string TokenType { get; set; }
    public int ExpiresIn { get; set; }
    public DateTime ExpiresAtUtc { get; set; }
    public CurrentUserResponse User { get; set; }
}
