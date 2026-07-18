namespace Prescription.Shared.DTOs;

// Intentionally empty. Per the approved business spec (section 5.9) and API spec
// (section 4.7), the temporary password is always generated server-side - it is never
// supplied by the caller. This class exists because this step's requirements name it
// explicitly; the approved api-spec documents this endpoint as taking no request body.
public class ResetPasswordRequest
{
}
