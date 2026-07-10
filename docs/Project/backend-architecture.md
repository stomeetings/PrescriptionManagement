# Backend Architecture

## Purpose

This document defines the backend architecture, design principles, and development standards for the Prescription Management System.

The objective is to ensure consistency, maintainability, scalability, and high performance across all backend modules.

---

# Technology Stack

| Component            | Technology                |
| -------------------- | ------------------------- |
| Framework            | ASP.NET Core Web API      |
| Language             | C#                        |
| Database             | Microsoft SQL Server      |
| Data Access          | Dapper                    |
| Authentication       | JWT Bearer Authentication |
| API Documentation    | Swagger / OpenAPI         |
| Logging              | Microsoft ILogger         |
| Dependency Injection | Built-in .NET DI          |
| Configuration        | appsettings.json          |

---

# Architecture Overview

The application follows a layered architecture.

```text
React Frontend
        │
        ▼
ASP.NET Core Web API
        │
        ▼
Controllers
        │
        ▼
Services
        │
        ▼
Repositories
        │
        ▼
Dapper
        │
        ▼
Stored Procedures
        │
        ▼
SQL Server
```

Each layer has a single responsibility.

---

# Project Structure

```text
backend/

├── Controllers/
├── Services/
│   ├── Interfaces/
│   └── Implementations/
├── Repositories/
│   ├── Interfaces/
│   └── Implementations/
├── Models/
├── DTOs/
├── Mapping/
├── Middleware/
├── Helpers/
├── Common/
├── Configuration/
├── Extensions/
└── Program.cs
```

---

# Layer Responsibilities

## Controllers

Responsibilities:

* Receive HTTP requests
* Validate request models
* Call Services
* Return HTTP responses
* No business logic

---

## Services

Responsibilities:

* Implement business rules
* Validate business operations
* Coordinate multiple repositories
* Handle transactions when required

---

## Repositories

Responsibilities:

* Execute Stored Procedures
* Access SQL Server through Dapper
* No business logic
* Return DTOs or Models

---

# Database Access

The backend communicates with SQL Server using Dapper.

Guidelines:

* Use Stored Procedures only.
* Do not use inline SQL.
* Do not use Entity Framework.
* Use parameterized queries.
* Use asynchronous methods whenever possible.

---

# Connection Management

Connection strings are stored in:

* appsettings.json
* appsettings.Development.json

Connections are registered using Dependency Injection.

Repositories receive an `IDbConnection` through constructor injection.

---

# Dependency Injection

The application uses the built-in .NET Dependency Injection container.

All Services and Repositories must be registered during application startup.

---

# Authentication

The API uses JWT Bearer Authentication.

Protected endpoints require a valid access token.

Authentication and authorization are implemented using ASP.NET Core middleware.

---

# Authorization

Authorization is role-based.

Examples:

* Administrator
* Doctor
* Pharmacist
* Receptionist

Permissions are enforced at the API level.

---

# Validation

Validation should be implemented using model validation.

Business validation belongs in the Service layer.

Database validation belongs in Stored Procedures.

---

# Error Handling

A global exception handling middleware is used.

The API should return consistent error responses.

Internal exceptions should be logged but not exposed to clients.

---

# Logging

Use `ILogger<T>` throughout the application.

Log:

* Errors
* Warnings
* Important business events

Sensitive information must never be written to logs.

---

# API Response Standards

All endpoints should return consistent HTTP status codes.

Examples:

* 200 OK
* 201 Created
* 400 Bad Request
* 401 Unauthorized
* 403 Forbidden
* 404 Not Found
* 500 Internal Server Error

---

# Transactions

Use SQL transactions only when multiple write operations must succeed or fail together.

Avoid unnecessary transactions for read operations.

---

# Performance Guidelines

* Use asynchronous programming.
* Keep Controllers lightweight.
* Minimize database round trips.
* Use proper SQL indexes.
* Return only required fields.
* Implement server-side pagination for large datasets.

---

# Security Guidelines

* Validate all user input.
* Use parameterized queries.
* Never expose connection strings.
* Store secrets outside source control for production.
* Enable HTTPS.
* Protect APIs using JWT authentication.

---

# Coding Standards

* Follow SOLID principles.
* Use meaningful class and method names.
* Keep methods focused on a single responsibility.
* Use dependency injection.
* Avoid duplicate code.
* Keep business logic out of Controllers.

---

# Module Development Workflow

Every backend module must follow this sequence:

1. Review the approved Database Specification.
2. Implement SQL Server tables and Stored Procedures.
3. Review the approved API Specification.
4. Implement Repository.
5. Implement Service.
6. Implement Controller.
7. Perform unit and integration testing.
8. Update documentation if required.

No implementation should begin until the related specification has been reviewed and approved.

---

# Future Enhancements

Potential future improvements include:

* Refresh Tokens
* API Versioning
* Health Checks
* Background Jobs
* Redis Caching
* Audit Logging
* Rate Limiting
* OpenTelemetry Monitoring
* Docker Support
* CI/CD Pipeline
