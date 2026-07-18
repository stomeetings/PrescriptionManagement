# User Management

## Version

1.0

---

# 1. Overview

The User Management module enables authorized administrators to manage system users.

This module provides functionality to create, update, view, activate, deactivate, and reset passwords for users who access the Prescription Management System.

Version 1 supports a single role per user.

---

# 2. Objectives

The objectives of this module are to:

- Manage system users.
- Assign a role to each user.
- Control user access.
- Enable password reset.
- Prevent unauthorized access.
- Maintain audit history.

---

# 3. Scope

Version 1 includes:

- View Users
- Search Users
- Filter Users
- Create User
- Edit User
- View User Details
- Activate User
- Deactivate User
- Reset Password

Version 1 excludes:

- Self Registration
- Profile Picture
- Email Verification
- Multi-Factor Authentication
- Password History
- Bulk Import
- Bulk Export

---

# 4. User Roles

The following roles are supported.

- Administrator
- Doctor
- Pharmacist
- Receptionist

Only Administrators can access User Management.

---

# 5. Functional Requirements

## 5.1 View Users

Administrators can view all users.

The list shall display:

- Full Name
- Username
- Email
- Phone Number
- Role
- Status
- Last Login
- Created Date

---

## 5.2 Search Users

Users can be searched by:

- Name
- Username
- Email

---

## 5.3 Filter Users

Users can be filtered by:

- Role
- Status

---

## 5.4 Create User

Administrator can create a new user.

Required fields:

- First Name
- Last Name
- Username
- Email
- Phone Number
- Role
- Temporary Password
- Active Status

---

## 5.5 Edit User

Administrator can modify:

- First Name
- Last Name
- Email
- Phone Number
- Role
- Active Status

Username cannot be changed after creation.

---

## 5.6 User Details

The system shall display:

- Full Name
- Username
- Email
- Phone Number
- Role
- Status
- Last Login
- Created Date
- Updated Date

---

## 5.7 Activate User

Administrator can activate inactive users.

Activated users may log in immediately.

---

## 5.8 Deactivate User

Administrator can deactivate users.

Deactivated users cannot authenticate.

An Administrator cannot deactivate their own account.

---

## 5.9 Reset Password

Administrator can reset another user's password.

A temporary password shall be generated.

The user must change the password at the next login if enabled by project policy.

---

# 6. Business Rules

- Username must be unique.
- Email must be unique.
- Username cannot be modified.
- One role per user.
- Every user must have a role.
- Passwords are stored as secure hashes.
- Inactive users cannot log in.
- Users cannot delete themselves.
- Administrators cannot deactivate themselves.
- Audit information shall be maintained.

---

# 7. Validation Rules

- Username is required.
- Email is required.
- Email must be valid.
- Role is required.
- First Name is required.
- Last Name is required.
- Phone Number is optional.
- Username length must comply with project standards.
- Password policy follows Authentication specifications.

---

# 8. Authorization Rules

Only users assigned the Administrator role may:

- Create Users
- Edit Users
- Reset Passwords
- Activate Users
- Deactivate Users

All other roles have read or no access according to future requirements.

---

# 9. Non-Functional Requirements

The module shall:

- Support pagination.
- Support searching.
- Support filtering.
- Maintain audit history.
- Be responsive.
- Follow project security standards.
- Use JWT authentication.
- Support future scalability.

---

# 10. Audit Requirements

Maintain:

- Created By
- Created Date
- Updated By
- Updated Date

---

# 11. Acceptance Criteria

The feature shall be accepted when:

- Administrator can create users.
- Administrator can edit users.
- Administrator can activate users.
- Administrator can deactivate users.
- Administrator can reset passwords.
- Search works.
- Filters work.
- Pagination works.
- Validation messages display correctly.
- Unauthorized users cannot access User Management.

---

# 12. Risks

- Duplicate usernames.
- Duplicate email addresses.
- Accidental administrator deactivation.
- Unauthorized access.
- Weak passwords.

---

# 13. Dependencies

This module depends on:

- Authentication
- Lookup Management
- Role Management

---

# 14. Future Enhancements

- Profile Photos
- Self Registration
- Email Verification
- MFA
- Password History
- User Lockout
- Bulk Import
- Bulk Export
- User Activity Logs
