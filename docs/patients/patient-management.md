# Patient Management

## Version

1.0

---

# 1. Overview

The Patient Management module allows authorized users to create, maintain and search patient records within the Prescription Management System.

Patients are the core entity of the system and are required before prescriptions can be created.

---

# 2. Objectives

The objectives are:

- Register new patients
- View patient information
- Update patient information
- Search patients
- Maintain patient status
- Store demographic information
- Store healthcare identifiers
- Support future prescription management

---

# 3. Scope

Version 1 includes

- View Patients
- Search Patients
- Filter Patients
- Create Patient
- Edit Patient
- View Patient Details
- Activate Patient
- Deactivate Patient

Version 1 excludes

- Patient Portal
- Online Registration
- Medical History
- Allergies
- Attachments
- Insurance Claims
- Appointment Scheduling

---

# 4. Functional Requirements

## 4.1 View Patients

Display:

- Patient Number
- Full Name
- Date of Birth
- Gender
- Mobile Number
- Email
- NHI Number
- Status

---

## 4.2 Search Patients

Search by:

- Patient Number
- First Name
- Last Name
- Mobile Number
- Email
- NHI Number

---

## 4.3 Filter Patients

Filter by:

- Status
- Gender

---

## 4.4 Create Patient

Required fields

- First Name
- Last Name
- Date of Birth
- Gender

Optional

- Mobile
- Email
- Address
- City
- Post Code
- Country
- NHI Number
- NZMC Number (if applicable)
- Notes

---

## 4.5 Edit Patient

Administrator or authorized staff may update patient details.

Patient Number cannot be modified.

---

## 4.6 View Patient Details

Display all patient demographic information.

---

## 4.7 Activate Patient

Activate inactive patients.

---

## 4.8 Deactivate Patient

Inactive patients cannot receive new prescriptions.

---

# 5. Business Rules

- Patient Number is system generated.
- NHI Number must be unique if provided.
- Email must be unique if project policy requires.
- Date of Birth cannot be in the future.
- Patient must be at least one day old.
- Inactive patients cannot receive prescriptions.
- Deleted patients are not physically removed.

---

# 6. Validation Rules

Required

- First Name
- Last Name
- Date of Birth
- Gender

Validation

- Email format
- Mobile format
- DOB cannot be future
- NHI format (New Zealand)
- Maximum field lengths

---

# 7. Authorization

Administrators

- Full Access

Doctors

- View
- Create
- Edit

Pharmacists

- View

Receptionists

- View
- Create
- Edit

---

# 8. Non Functional Requirements

- Responsive UI
- Server-side pagination
- Search
- Sorting
- Filtering
- Audit history
- JWT Authentication
- Role Based Authorization

---

# 9. Audit Requirements

Maintain:

- Created By
- Created Date
- Updated By
- Updated Date

---

# 10. Acceptance Criteria

The feature is complete when users can:

- Create patient
- Edit patient
- View patient
- Search patient
- Filter patient
- Activate patient
- Deactivate patient

---

# 11. Risks

- Duplicate patients
- Invalid NHI numbers
- Invalid DOB
- Unauthorized access

---

# 12. Dependencies

- Authentication
- User Management
- Lookup Management

---

# 13. Future Enhancements

- Medical History
- Allergies
- Emergency Contacts
- Insurance
- Attachments
- Patient Portal
- Appointment History
- Prescription History
- Clinical Notes