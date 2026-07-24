namespace Prescription.Application.Exceptions;

public class InvalidMedicineRouteException : Exception
{
    public InvalidMedicineRouteException() : base("The specified route does not exist or is not active.")
    {
    }
}
