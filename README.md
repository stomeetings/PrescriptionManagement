# Prescription Management System

## Overview

Prescription Management System is a modern web application for managing patients, medicines, prescriptions, users, and related clinical workflows.

This project follows a **Specification-Driven Development** approach, where every feature is designed, documented, reviewed, implemented, and tested before moving to the next module.

---

# Project Goals

* Build a scalable and maintainable application.
* Follow enterprise development practices.
* Use AI-assisted development with Claude Code.
* Keep documentation as the single source of truth.
* Develop features module by module.

---

# Technology Stack

## Frontend

* React
* Vite
* Bootstrap 5
* Axios
* React Router

## Backend

* ASP.NET Core Web API
* Dapper
* Dependency Injection
* JWT Authentication

## Database

* Microsoft SQL Server
* Stored Procedures
* SQL Server Views

---

# Development Methodology

Each module follows the same workflow:

1. Business Requirements
2. Database Specification
3. SQL Server Implementation
4. API Specification
5. API Implementation
6. UI Specification
7. React Implementation
8. Testing
9. Git Commit
10. Merge to Main

---

# Project Structure

```text
PrescriptionManagement/

├── README.md
├── .claude/
│   ├── skills/
│   ├── commands/
│   └── agents/ (optional)
│
├── docs/
│   ├── project/
│   ├── lookup/
│   ├── users/
│   ├── patients/
│   ├── medicines/
│   ├── prescriptions/
│   ├── pharmacy/
│   └── reports/
│
├── database/
│   ├── Tables/
│   ├── StoredProcedures/
│   ├── Views/
│   ├── SeedData/
│   └── Scripts/
│
├── backend/
│
├── frontend/
│
└── .gitignore
```

---

# Documentation

Project documentation is stored inside the **docs** folder.

## Project Documentation

* Project Overview
* Technology Stack
* Backend Architecture
* Coding Standards
* Git Workflow

## Module Documentation

Each module contains:

* Database Specification
* API Specification
* UI Specification
* Test Cases

Example:

```text
docs/

patients/
    database-spec.md
    api-spec.md
    ui-spec.md
    test-cases.md
```

---

# Claude Code

Claude configuration is stored inside the **.claude** folder.

Contents include:

* Skills
* Slash Commands
* Optional Subagents

Business specifications are **not** stored inside `.claude`.

---

# Database Strategy

* SQL Server
* Stored Procedures only
* Dapper
* No Entity Framework
* No inline SQL
* Proper indexing
* Foreign key constraints
* Seed data maintained separately

---

# Backend Architecture

```
React
    ↓
ASP.NET Core API
    ↓
Service Layer
    ↓
Repository Layer
    ↓
Dapper
    ↓
Stored Procedures
    ↓
SQL Server
```

---

# Frontend Standards

* React Functional Components
* Bootstrap 5
* Responsive Design
* Reusable Components
* Clean Folder Structure
* Axios for API communication

---

# Git Workflow

Main branch always contains stable code.

Feature development is performed using feature branches.

Example:

```
main

feature/authentication

feature/patient-management

feature/medicine-management

feature/prescription-management
```

Each completed feature is reviewed, tested, and merged into the main branch.

---

# Module Development Process

Example for Patient Management:

* Create specification
* Review specification
* Design database
* Generate SQL scripts
* Implement API
* Implement React UI
* Perform testing
* Commit changes
* Merge into main

---

# Lookup Tables

Lookup data is maintained separately.

Examples:

* ProfileType
* Prescription Status
* Medicine
* Medicine Route
* Frequency
* Units

Seed data is maintained using SQL scripts inside the `database/SeedData` folder.

---

# Coding Principles

* Clean Architecture
* SOLID Principles
* Reusable Components
* Modular Design
* Specification-Driven Development
* Consistent Naming Conventions
* Comprehensive Documentation

---

# Project Status

Current Development Phase:

* Project Setup
* Documentation
* Database Design
* API Development
* React UI Development
* Testing

---

# License

This project is intended for learning, experimentation, and enterprise-grade AI-assisted software development.
