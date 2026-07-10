# Technology Stack

## Purpose

This document defines the approved technologies, frameworks, libraries, and tools used in the Prescription Management System.

All development should follow this technology stack unless a change has been approved.

---

# Application Architecture

The system follows a three-tier architecture.

```text
React Frontend
        │
        ▼
ASP.NET Core Web API
        │
        ▼
Microsoft SQL Server
```

The application uses a Specification-Driven Development approach where all implementation is based on approved specifications.

---

# Frontend

| Category         | Technology                                              |
| ---------------- | ------------------------------------------------------- |
| Framework        | React                                                   |
| Build Tool       | Vite                                                    |
| Language         | JavaScript (or TypeScript in future)                    |
| UI Framework     | Bootstrap 5                                             |
| Routing          | React Router                                            |
| HTTP Client      | Axios                                                   |
| Icons            | Bootstrap Icons                                         |
| State Management | React Context API (Redux may be introduced if required) |

---

# Backend

| Category             | Technology                         |
| -------------------- | ---------------------------------- |
| Framework            | ASP.NET Core Web API               |
| Language             | C#                                 |
| Runtime              | .NET 9 (update as required)        |
| API Documentation    | Swagger / OpenAPI                  |
| Authentication       | JWT Bearer Authentication          |
| Authorization        | Role-Based Authorization           |
| Logging              | Microsoft ILogger                  |
| Dependency Injection | Built-in .NET Dependency Injection |
| Configuration        | appsettings.json                   |

---

# Database

| Category         | Technology                                   |
| ---------------- | -------------------------------------------- |
| Database Engine  | Microsoft SQL Server                         |
| Data Access      | Dapper                                       |
| Database Objects | Stored Procedures, Views, Tables             |
| Query Method     | Parameterized Queries                        |
| Migrations       | SQL Scripts (No Entity Framework Migrations) |
| Seeding          | SQL Seed Scripts                             |

---

# Development Tools

| Tool                                | Purpose                                       |
| ----------------------------------- | --------------------------------------------- |
| Visual Studio 2022                  | Backend Development                           |
| Visual Studio Code                  | React Development, Documentation, Claude Code |
| SQL Server Management Studio (SSMS) | Database Development                          |
| Git                                 | Version Control                               |
| GitHub                              | Source Code Repository                        |
| Claude Code                         | AI-Assisted Development                       |

---

# Documentation

| Tool           | Purpose                                    |
| -------------- | ------------------------------------------ |
| Markdown (.md) | Project Documentation                      |
| README.md      | Project Entry Documentation                |
| docs/ Folder   | Specifications and Technical Documentation |

---

# AI Development

Claude Code is used to assist with:

* Reviewing specifications
* SQL Server design
* Stored Procedure generation
* ASP.NET Core API development
* React UI development
* Code review
* Documentation improvements
* Test case generation

Claude Skills are maintained separately inside the `.claude` directory.

---

# API Standards

The API follows REST principles.

Supported HTTP methods include:

* GET
* POST
* PUT
* DELETE

Responses should:

* Return appropriate HTTP status codes
* Use JSON
* Follow a consistent response structure
* Include meaningful error messages

---

# Database Standards

The database follows these standards:

* SQL Server
* Stored Procedures for all database operations
* Dapper for data access
* No Entity Framework
* Parameterized queries only
* Proper indexing
* Foreign key constraints
* Audit columns where required

---

# Frontend Standards

The frontend follows these standards:

* Responsive design
* Mobile-friendly layouts
* Reusable React components
* Functional Components
* React Hooks
* Bootstrap utility classes
* Axios for API communication

---

# Source Control

| Tool             | Purpose                              |
| ---------------- | ------------------------------------ |
| Git              | Local Version Control                |
| GitHub           | Remote Repository                    |
| Feature Branches | Module Development                   |
| Pull Requests    | Code Review (when working in a team) |

---

# Project Documentation Structure

```text
docs/

project/
lookup/
users/
patients/
medicines/
prescriptions/
reports/
```

Each module contains its own:

* Database Specification
* API Specification
* UI Specification
* Test Cases

---

# Supported Development Workflow

Every module should follow this sequence:

1. Write or update the specification.
2. Review and approve the specification.
3. Design the database.
4. Implement SQL scripts.
5. Develop the API.
6. Build the React UI.
7. Test the module.
8. Update documentation.
9. Commit changes to Git.
10. Merge the feature into the main branch.

---

# Future Technologies

The architecture should support future adoption of technologies such as:

* TypeScript
* Redis
* Docker
* Kubernetes
* Azure
* CI/CD Pipelines
* OpenTelemetry
* Background Jobs
* SignalR
* Automated Testing Frameworks

These technologies should only be introduced after evaluation and approval.
