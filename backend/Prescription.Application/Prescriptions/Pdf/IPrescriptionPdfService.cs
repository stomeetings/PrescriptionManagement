namespace Prescription.Application.Prescriptions.Pdf;

public interface IPrescriptionPdfService
{
    Task<PrescriptionPdfResult> GetPdfAsync(int prescriptionId, string generatedBy);
}
