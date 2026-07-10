# Coding Standards

## Purpose

This document defines the coding standards and development guidelines for the Prescription Management System.

The objective is to ensure that all developers and AI-generated code follow a consistent, maintainable, secure, and scalable coding style.

---

# General Principles

* Follow Clean Code principles.
* Follow SOLID principles.
* Write readable and self-documenting code.
* Prefer simplicity over unnecessary complexity.
* Avoid code duplication (DRY).
* Keep methods small and focused.
* One class should have one responsibility.

---

# Project Structure

All code must follow the approved project folder structure.

Example:

```text
backend/

Controllers/
Services/
Repositories/
Models/
DTOs/
Middleware/
Helpers/
Extensions/
Configuration/
```

Do not create unnecessary folders.

---

# Naming Conventions

## Classes

* Use PascalCase.

Example:

```
PatientService
UserRepository
PrescriptionController
```

---

## Methods

* Use PascalCase.
* Method names should clearly describe their purpose.

Examples:

```
GetPatientByIdAsync()

CreatePrescriptionAsync()

UpdateUserAsync()
```

---

## Variables

* Use camelCase.

Example:

```
patientId

currentUser

prescriptionNumber
```

---

## Interfaces

Prefix all interfaces with **I**.

Example:

```
IPatientService

IUserRepository
```

---

## Constants

Use PascalCase.

Example:

```
MaxPrescriptionDays

DefaultPageSize
```

---

# Controllers

Controllers should:

* Handle HTTP requests only.
* Validate request models.
* Call Services.
* Return HTTP responses.

Controllers must NOT:

* Contain SQL.
* Contain business logic.
* Access repositories directly.

Controllers should remain thin.

---

# Services

Services are responsible for:

* Business rules
* Business validation
* Workflow coordination

Services should never contain SQL statements.

---

# Repositories

Repositories are responsible for database access only.

Rules:

* Use Dapper.
* Execute Stored Procedures only.
* Do not implement business logic.
* Return DTOs or Models.

---

# SQL Standards

* Use Stored Procedures for all database operations.
* Never concatenate SQL strings.
* Use parameterized queries.
* Use meaningful Stored Procedure names.

Example:

```
usp_Patient_Search

usp_User_Create

usp_Prescription_Update
```

---

# Asynchronous Programming

Use asynchronous methods whenever supported.

Examples:

```
GetPatientsAsync()

CreateUserAsync()

UpdatePrescriptionAsync()
```

Avoid blocking calls.

---

# Exception Handling

* Use Global Exception Middleware.
* Catch exceptions only when required.
* Never swallow exceptions.
* Return meaningful API responses.

---

# Logging

Use ILogger.

Log:

* Errors
* Warnings
* Important business events

Never log:

* Passwords
* JWT tokens
* Sensitive patient information
* Connection strings

---

# Validation

Validation should occur at multiple levels:

* Client-side validation
* API model validation
* Business validation
* Database validation

Each layer should validate only what it is responsible for.

---

# DTO Guidelines

Use DTOs for all API requests and responses.

Do not expose database entities directly.

Separate:

* Request DTOs
* Response DTOs

---

# Dependency Injection

Use constructor injection.

Do not manually instantiate dependencies.

Example:

```
public PatientService(IPatientRepository repository)
{
}
```

---

# Configuration

Configuration values must come from configuration files or environment variables.

Do not hardcode:

* Connection strings
* API URLs
* Secrets
* File paths

---

# API Standards

* Use RESTful endpoints.
* Use appropriate HTTP verbs.
* Return appropriate HTTP status codes.
* Support pagination for list endpoints.
* Validate all incoming requests.

---

# Security Standards

* Validate all inputs.
* Use parameterized queries.
* Protect APIs with JWT Authentication.
* Apply authorization where required.
* Never trust client-side validation alone.

---

# React Standards

* Use Functional Components.
* Use Hooks.
* Keep components reusable.
* Keep business logic outside UI components.
* Use Axios for API communication.
* Keep styling consistent with the project UI standards.

---

# Documentation Standards

Every new module should include:

* Database Specification
* API Specification
* UI Specification
* Test Cases

Documentation must be updated whenever business requirements change.

---

# Git Standards

* Commit small, focused changes.
* Use meaningful commit messages.
* Develop features in feature branches.
* Merge only after successful testing.
* Do not commit temporary or generated files unless required.

Example commit messages:

```
Add patient search API

Implement medicine lookup service

Update prescription validation rules
```

---

# AI-Assisted Development Standards

Before implementing any feature:

1. Review the approved specification.
2. Do not make assumptions about business rules.
3. Ask for clarification if requirements are ambiguous.
4. Follow project architecture and coding standards.
5. Keep generated code modular and maintainable.

---

# Definition of Done

A feature is considered complete only when:

* Specification is approved.
* Database implementation is complete.
* API implementation is complete.
* React UI is complete.
* Validation is implemented.
* Error handling is implemented.
* Testing is completed.
* Documentation is updated.
* Code is committed and reviewed.
