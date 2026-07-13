namespace Prescription.Application.Security;

public class JwtOptions
{
    public const string SectionName = "Jwt";

    public string SigningKey { get; set; }
    public string Issuer { get; set; }
    public string Audience { get; set; }
    public int ExpirationMinutes { get; set; }
}
