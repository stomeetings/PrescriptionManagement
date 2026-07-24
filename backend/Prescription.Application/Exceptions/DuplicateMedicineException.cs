namespace Prescription.Application.Exceptions;

// Thrown when the (MedicineName, Strength, MedicineFormId) triple already exists -
// matches UQ_Medicine_Name_Strength_Form, per the approved database spec.
public class DuplicateMedicineException : Exception
{
    public DuplicateMedicineException() : base("A medicine with this name, strength, and dosage form already exists.")
    {
    }
}
