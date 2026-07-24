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
            PatientNotFoundException => (StatusCodes.Status404NotFound, "Patient not found."),
            DuplicateNhiNumberException => (StatusCodes.Status409Conflict, "A patient with this NHI number already exists."),
            DuplicatePatientNumberException => (StatusCodes.Status409Conflict, "A patient with this patient number already exists."),
            PatientConcurrencyConflictException => (StatusCodes.Status409Conflict, "This patient was modified by someone else."),
            InvalidGenderException => (StatusCodes.Status400BadRequest, "Invalid gender."),
            MedicineNotFoundException => (StatusCodes.Status404NotFound, "Medicine not found."),
            DuplicateMedicineCodeException => (StatusCodes.Status409Conflict, "A medicine with this code already exists."),
            DuplicateMedicineException => (StatusCodes.Status409Conflict, "A medicine with this name, strength, and dosage form already exists."),
            MedicineConcurrencyConflictException => (StatusCodes.Status409Conflict, "This medicine was modified by someone else."),
            InvalidMedicineFormException => (StatusCodes.Status400BadRequest, "Invalid dosage form."),
            InvalidMedicineRouteException => (StatusCodes.Status400BadRequest, "Invalid route."),
            InvalidPatientReferenceException => (StatusCodes.Status422UnprocessableEntity, "Invalid patient reference."),
            InvalidMedicineReferenceException => (StatusCodes.Status422UnprocessableEntity, "Invalid medicine reference."),
            DuplicateActiveMedicationException => (StatusCodes.Status409Conflict, "This patient already has an active medication for this medicine."),
            PatientMedicationNotFoundException => (StatusCodes.Status404NotFound, "Patient medication not found."),
            PatientMedicationConcurrencyConflictException => (StatusCodes.Status409Conflict, "This patient medication was modified by someone else."),
            PatientMedicationAlreadyStoppedException => (StatusCodes.Status409Conflict, "This patient medication is already stopped."),
            PatientMedicationNotStoppedException => (StatusCodes.Status409Conflict, "This patient medication is not currently stopped."),
            PatientMedicationStoppedReadOnlyException => (StatusCodes.Status409Conflict, "A stopped patient medication is read-only."),
            InvalidMedicationDateRangeException => (StatusCodes.Status400BadRequest, "End date cannot be before start date."),
            InvalidMedicationDataException => (StatusCodes.Status400BadRequest, "Invalid patient medication data."),
            InvalidDoseUnitException => (StatusCodes.Status400BadRequest, "Invalid dose unit."),
            InvalidFrequencyException => (StatusCodes.Status400BadRequest, "Invalid frequency."),
            InvalidDurationUnitException => (StatusCodes.Status400BadRequest, "Invalid duration unit."),
            NoEligiblePatientMedicationsException => (StatusCodes.Status422UnprocessableEntity, "None of the selected patient medications are eligible for a prescription draft."),
            InvalidProviderReferenceException => (StatusCodes.Status422UnprocessableEntity, "Invalid provider reference."),
            MissingPrescriptionXhtmlException => (StatusCodes.Status400BadRequest, "The prescription document is missing."),
            NoPrescriptionMedicationsException => (StatusCodes.Status400BadRequest, "At least one medication is required."),
            DuplicatePrescriptionDraftException => (StatusCodes.Status409Conflict, "This prescription draft has already been saved."),
            InvalidPrescriptionDataException => (StatusCodes.Status400BadRequest, "Invalid prescription data."),
            PrescriptionNotFoundException => (StatusCodes.Status404NotFound, "Prescription not found."),
            PrescriptionNotEditableException => (StatusCodes.Status409Conflict, "Only a Draft-status prescription can be edited."),
            PrescriptionConcurrencyConflictException => (StatusCodes.Status409Conflict, "This prescription was modified by someone else."),
            PrescriptionVersionNotFoundException => (StatusCodes.Status404NotFound, "Prescription version not found."),
            PrescriptionNotFinalizedException => (StatusCodes.Status409Conflict, "Only a finalized prescription can be reprinted."),
            PrescriptionCancelledException => (StatusCodes.Status409Conflict, "A cancelled prescription cannot be reprinted."),
            PrescriptionPdfUnavailableException => (StatusCodes.Status500InternalServerError, "Unable to generate or retrieve the prescription PDF."),
            NoActivePrescriptionItemException => (StatusCodes.Status404NotFound, "This medication is not part of any active finalized prescription."),
            PrescriptionItemAlreadySupersededException => (StatusCodes.Status409Conflict, "This prescription item has already been superseded by another replacement."),
            NoClinicallySignificantChangeException => (StatusCodes.Status400BadRequest, "No clinically significant change was detected."),
            PrescriptionExpiredException => (StatusCodes.Status409Conflict, "This prescription has expired and cannot be renewed."),
            PrescriptionNotEligibleForCancellationException => (StatusCodes.Status409Conflict, "Only a finalized prescription can be cancelled. A Draft can simply be discarded."),
            PrescriptionAlreadyCancelledException => (StatusCodes.Status409Conflict, "This prescription has already been cancelled."),
            PrescriptionFullyDispensedException => (StatusCodes.Status409Conflict, "This prescription has already been fully dispensed and cannot be cancelled."),
            PrescriptionCancellationConflictException => (StatusCodes.Status409Conflict, "This prescription's status changed before the cancellation could complete. Please refresh and try again."),
            PrescriptionAlreadyFinalizedException => (StatusCodes.Status409Conflict, "This prescription has already been finalized."),
            PrescriptionMedicineInactiveException => (StatusCodes.Status400BadRequest, "One or more prescribed medicines are no longer active."),
            DuplicatePrescriptionMedicationException => (StatusCodes.Status400BadRequest, "This prescription contains duplicate medications."),
            PrescriptionMissingDirectionsException => (StatusCodes.Status400BadRequest, "All medications must have complete directions before finalizing."),
            InvalidPrescriptionIssueDateException => (StatusCodes.Status400BadRequest, "Issue date cannot be in the future."),
            InvalidPrescriptionExpiryDateException => (StatusCodes.Status400BadRequest, "Expiry date cannot be before the issue date."),
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
