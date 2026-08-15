# Yelena App — System Architecture & Engineering Standards

## 1. Executive Summary

Yelena App is a production-ready web application for medical/specialist appointments, electronic health records (EHR), and clinic management. Built with Clean Code, SOLID, and enterprise design patterns for portfolio-grade quality.

## 2. Tech Stack

- **Framework:** Next.js (App Router) + React 19 + TypeScript (Strict Mode)
- **Styling:** Tailwind CSS + Atomic Design (`atoms`, `molecules`, `organisms`, `templates`)
- **Backend / Firebase (Spark / Free tier focused):**
  - **Firebase Auth:** Email/Password + Google OAuth (Custom Claims for roles)
  - **Cloud Firestore:** Database
  - **File storage (v1):** **Vercel Blob** for PDFs/images (Firebase Storage requires Blaze). Firestore stores `MedicalFile` metadata only. Swappable via `IFileStorage`.
  - **Firebase Admin SDK:** Server-only (BFF Route Handlers). Never on the client.
- **Testing & Quality:** Vitest + React Testing Library + ESLint + Prettier + Strict `tsc`
- **i18n & Theme:** EN/ES (`next-intl`) + light/dark (`next-themes`) from day 1

### Spark / Free constraints (v1)

- Custom Claims only via Admin SDK in Next.js BFF (`app/api/*`). OK on free tier.
- No Cloud Functions in v1; privileged logic lives in Route Handlers.
- No Firebase Storage on Spark — use Vercel Blob (`BLOB_READ_WRITE_TOKEN`) + private access + path scoping (`patients/{uid}/...`).
- EHR “encryption” phase 2; v1 = private blobs + claim gates + metadata in Firestore.

## 3. Architecture, Patterns & SOLID (Mandatory)

### A. Clean Code & SOLID

- **SRP:** UI renders; hooks own UI state/side-effects; services/repos own Firebase/API I/O.
- **OCP:** Extend via composition / interfaces (`cva`, polymorphic primitives) without rewriting cores.
- **LSP:** Service interfaces stay swappable without breaking callers.
- **ISP:** Small prop/interfaces; components take only what they use.
- **DIP:** UI and domain depend on abstractions, not concrete Firebase SDK calls.

### B. Design patterns

1. **Repository / Service:** Abstract Firestore & Auth (`AppointmentRepository`, `EhrService`). Never `getDoc()` / `collection()` inside UI.
2. **Adapter:** Map raw Firebase docs → typed domain models before UI consumption.
3. **Container / Presentational + Custom Hooks:** Pure UI; state machines in hooks (`useAppointmentBooking`, `useEhrUpload`).
4. **BFF / Strategy:** `app/api/*` enforces claims, server validation, Admin SDK ops.

### C. Canonical folders

```
types/domain/          # Domain models & unions
adapters/              # Firestore/Storage → domain
repositories/          # Interfaces + Firestore implementations
services/              # Use-case orchestration over repos
hooks/                 # Client state & side-effects
components/atoms|molecules|organisms|templates/
lib/firebase/          # client.ts + admin.ts (server-only)
app/api/               # BFF Route Handlers
messages/              # i18n catalogs (en.json, es.json)
```

## 4. User Roles & Security Matrix

| Role | Key | Access |
|---|---|---|
| Guest | `invitado` | No auth / no claim. Landing, public directory. |
| Patient | `paciente` | Search, book/cancel, own EHR/files, profile. Can request elevation to specialist. |
| Specialist | `especialista` | Also acts as patient (book for self). Schedule, register patients, book on their behalf, notes. Admin approval required. |
| Admin | `admin` | Approvals, audit, full governance. Also patient-capable. |

Claims store: `paciente` | `especialista` | `admin` only. Guest = unauthenticated.

## 5. Key Modules & Domain Model

Domain lives in `src/types/domain/` with **invariants as pure functions** (guards + asserts). Services call asserts before persistence.

1. **Auth & Identity:** Claims via BFF (`/api/auth/set-claim`). Firestore user profile on signup. `locale` + optional `timezone` (IANA).
2. **Specialist Onboarding:** `pending` → Admin verify → `active` (`isActiveSpecialist`). Filters: specialty, availability, location/rating.
3. **Availability Engine:** `SpecialistSchedule` (workdays + ranges + timezone) + date overrides.
4. **Appointments:** FSM `APPOINTMENT_TRANSITIONS`; transfers via `canRequestTransfer`.
5. **EHR:** Immutable notes; medical files append-only with `assertMedicalFileOwnership` by scope.
6. **Admin Dashboard:** Pending specialist queue, platform stats, user management.
7. **i18n & Theme:** System-wide dark/light + EN/ES.

### Collections (Firestore)

- `users/{uid}` — profile + role
- `specialists/{uid}` — onboarding (`pending`|`active`|`rejected`)
- `appointments/{id}`, `ehrNotes/{id}`, `medicalFiles/{id}`
- `availabilityRules/{id}`, `availabilityOverrides/{id}`
- `_meta/seed` — seed marker

Seed: `npm run seed` (demo users in script output).

## 6. Security Principles

- Never ship Firebase Admin credentials to the client.
- Security Rules deny-by-default; medical data gated by patient–specialist relationship or Admin override.
- RSC by default; `"use client"` only on interactive islands.
- TypeScript Strict; zero `any` (generics / explicit types).

## 7. Agent instructions (Cursor)

Act as Principal Software Engineer / Staff Frontend Architect (Next.js App Router, React 19, TS, Firebase).

Before any feature: read this file. Enforce SOLID, Clean Architecture, Atomic Design.

- UI → hooks → services/repos → Firebase (never SDK in components).
- Adapters transform raw docs to domain models.
- Tests: Vitest + RTL with a11y queries (`getByRole`, `findByRole`).
- Start from domain types + abstracted repositories; keep code review-ready with JSDoc where it clarifies contracts.
