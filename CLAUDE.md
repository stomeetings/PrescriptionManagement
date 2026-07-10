# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project status: documentation/spec stage, no code yet

This repository currently contains **only documentation and Claude configuration** — no `backend/`, `frontend/`, or `database/` folders exist, and there are no manifests (`.sln`, `.csproj`, `package.json`), no `.sql` files, and no CI config anywhere in the repo. Everything below describes the *intended* architecture and conventions from `docs/Project/*.md`, not code that has been verified to exist. When you start implementing a module, you are creating these folders/files for the first time — check the current repo state rather than assuming prior work is in place.

There are no build, lint, or test commands yet because there is nothing to build. Once a `Prescription.*` solution, `frontend/`, or `database/` project is scaffolded, this file should be updated with the real commands (`dotnet build`, `dotnet test`, `npm run dev`, etc.).

## Development methodology (hard gate)

This project follows **Specification-Driven Development**: specifications are the single source of truth, and **no implementation should begin until the relevant spec has been written and approved** by the user. Do not write backend, frontend, or database code from assumed requirements.

Each module (e.g. Patients, Medicines, Prescriptions) is built module-by-module through this sequence:

```
Business Requirements → Database Spec → SQL Implementation → API Spec →
API Implementation → UI Spec → React Implementation → Testing →
Documentation Update → Git Commit → Merge to Main
```

Module docs live under `docs/<module>/` (e.g. `docs/patients/`) as `database-spec.md`, `api-spec.md`, `ui-spec.md`, `test-cases.md`. None of these module folders exist yet — only `docs/Project/` (project-overview, technology-stack, backend-architecture, coding-standards) is populated.

If a requirement is ambiguous, ask before implementing — this mirrors the ask-before-assuming rule already baked into the `.claude/skills/*.md` personas (see below), and the developer is explicitly using this project to learn enterprise .NET/React/SQL patterns, so prefer explaining trade-offs over silently picking one.

## Resolved technology stack

Some `.claude/skills/*.md` files contain stack details that conflict with the root docs (`README.md`, `docs/Project/technology-stack.md`). The following has been confirmed as authoritative — **when a skill file disagrees with this table, this table wins**:

| Layer | Technology |
|---|---|
| Frontend framework | React (functional components + hooks), Vite |
| Frontend UI library | **Bootstrap 5** + Bootstrap Icons (not Material UI — `react-ui-designer.md` is stale on this point) |
| Frontend routing/HTTP | React Router, Axios |
| Frontend state | React Context API (Redux only if introduced later) |
| Backend framework | ASP.NET Core Web API, C#, **.NET 8 LTS** (not .NET 9 — `technology-stack.md` is stale on this point) |
| Backend data access | **Dapper + stored procedures only — no Entity Framework, no inline SQL** (EF Core sections in `dotnet-api-architect.md`/`sql-server-designer.md` are stale) |
| Backend auth | JWT Bearer Authentication, role-based authorization (Administrator, Doctor, Pharmacist, Receptionist) |
| Backend docs/logging/DI | Swagger/OpenAPI, `ILogger<T>`, built-in .NET Dependency Injection |
| Database | Microsoft SQL Server — tables, stored procedures, views only; parameterized queries; plain SQL migration scripts (not EF migrations) |

## Planned architecture

Request flow:

```
React (Bootstrap 5)
    ↓
ASP.NET Core Web API
    ↓
Controllers  (thin — no SQL, no business logic, no direct repository access)
    ↓
Services / Application layer  (business rules, validation, status transitions — no SQL)
    ↓
Repositories  (Dapper, execute stored procedures only — no business logic)
    ↓
Stored Procedures
    ↓
SQL Server
```

The backend is planned as a **multi-project Clean Architecture solution**, not a single flat folder:

- `Prescription.Api` — controllers, thin HTTP layer, request/response only
- `Prescription.Application` — business rules, validation, prescription status-transition logic, workflow coordination
- `Prescription.Domain` — domain entities/model
- `Prescription.Infrastructure` — Dapper repositories; executes stored procedures only, returns DTOs/models, no business logic
- `Prescription.Shared` — cross-cutting DTOs/utilities used by multiple projects
- `Prescription.Worker` — background service, the one part of the system that isn't request/response driven (see below)

Never let a layer skip past its neighbor (e.g. controllers must not call repositories directly).

### Worker service

`Prescription.Worker` polls for prescriptions in `Pending` status and drives them through `Pending → Processing → Sent` on success, or `Processing → Failed` on error, with configurable retries. This is a distinct execution context from the API and should be designed accordingly (no HTTP context, no per-request DI scope assumptions).

## Domain model

Core entities: `Profile`, `Patient`, `Doctor`, `Medicine`, `Prescription`, `PrescriptionItem`, `AuditLog`, `Notification`, `WorkerQueue`. Don't add new entities without an approved spec.

Prescription status lifecycle (a core invariant enforced across API, Application layer, and Worker):

```
Draft → Pending → Processing → Sent → Dispensed
                                 ↘ Cancelled / Failed / Expired
```

Status transitions must always be validated — never allow an invalid transition — and status history must remain auditable (don't overwrite prior status/audit data).

## Conventions

- **Naming**: PascalCase for classes/methods (`PatientService`, `GetPatientByIdAsync`), camelCase for variables, interfaces prefixed with `I` (`IPatientRepository`). Stored procedures follow `usp_<Entity>_<Action>` (e.g. `usp_Patient_Search`, `usp_User_Create`). Tables are singular PascalCase (`Patient`, `PrescriptionItem`), with standard audit columns (`CreatedDate`, `CreatedBy`, `UpdatedDate`, `UpdatedBy`, `IsDeleted`, `IsActive`, optional `RowVersion`). Soft delete is preferred over hard delete.
- **Layering is strict**: Controllers must never contain SQL, business logic, or call repositories directly. Services/Application layer must never contain SQL. Repositories must never contain business logic — they only execute stored procedures via Dapper and return DTOs/models.
- **DTOs only at boundaries**: never expose database or domain entities directly through the API; keep Request DTOs and Response DTOs separate.
- **Config/secrets**: only from `appsettings.json`/`appsettings.Development.json`/environment variables, never hardcoded. Repositories receive `IDbConnection` via constructor injection.
- **Logging**: use `ILogger<T>`; never log passwords, JWT tokens, patient PHI, or connection strings.
- **Git**: `main` is always stable; develop on `feature/*` branches (`feature/authentication`, `feature/patient-management`, ...); commit small, focused changes with imperative messages (e.g. "Add patient search API").

## `.claude/skills` personas

Three scoped skill personas exist under `.claude/skills/`, each restricted to one architectural layer and each required to stop and ask questions rather than guess when requirements are unclear:

- `dotnet-api-architect.md` — designs/implements the ASP.NET Core API layer.
- `react-ui-designer.md` — UI/UX design only; explicitly must not implement business logic or API calls.
- `sql-server-designer.md` — database design only; explicitly must not write application code.

All three include a **"Teaching Mode"** convention: because the developer is using this project to learn enterprise .NET/React/SQL patterns, when introducing a notable concept (DI, Repository Pattern, DTOs, middleware, MUI-equivalent Bootstrap components, indexes, normalization, etc.) explain *why* it's used, alternatives, best practices, and common mistakes — don't just emit code silently. Apply this same teaching approach generally in this repo, not only when one of these skills is explicitly invoked.

Note: these skill files predate the stack decisions above and still contain stale references (Material UI, EF Core, .NET 9, single-project backend layout) — defer to the "Resolved technology stack" and "Planned architecture" sections of this file over the skill files where they disagree.
