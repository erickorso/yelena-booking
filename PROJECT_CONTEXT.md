# Yelena App — System Architecture & Engineering Standards

## 1. Executive Summary

Yelena App is a production-ready web application for medical/specialist appointments, electronic health records (EHR), and clinic management. Built with Clean Code, SOLID, and enterprise design patterns for portfolio-grade quality.

## 2. Tech Stack

- **Framework:** Next.js (App Router) + React 19 + TypeScript (Strict Mode)
- **Styling:** Tailwind CSS + Atomic Design (`atoms`, `molecules`, `organisms`, `templates`)
- **Backend / Firebase (Spark / Free tier focused):**
  - **Firebase Auth:** Email/Password + Google OAuth (Custom Claims for roles)
  - **Cloud Firestore:** Database
  - **Cloud Storage:** Medical files, profile pictures, attachments
  - **Firebase Admin SDK:** Server-only (BFF Route Handlers). Never on the client.
- **Testing & Quality:** Vitest + React Testing Library + ESLint + Prettier + Strict `tsc`
- **i18n & Theme:** EN/ES (`next-intl`) + light/dark (`next-themes`) from day 1

### Spark / Free constraints (v1)

- Custom Claims only via Admin SDK in Next.js BFF (`app/api/*`). OK on free tier.
- No Cloud Functions in v1; privileged logic lives in Route Handlers.
- EHR “encryption” in v1 = Storage rules + path scoping + claim gates. Client-side encryption is phase 2.

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
| Patient | `paciente` | Search, book/cancel, own EHR/files, profile. |
| Specialist | `especialista` | Schedule, appointments, notes for assigned patients. Admin approval required. |
| Admin | `admin` | Approvals, audit, full governance. |

Claims store: `paciente` | `especialista` | `admin` only. Guest = unauthenticated.

## 5. Key Modules & Domain Model

1. **Auth & Identity:** Claims via BFF (`/api/auth/set-claim`). Firestore user profile on signup.
2. **Specialist Onboarding:** `pending` → Admin verify → `active`. Filters: specialty, availability, location/rating.
3. **Availability Engine:** Weekly recurring slots + date overrides (blocks/vacations).
4. **Appointments:** `pending` | `confirmed` | `completed` | `cancelled` | `no_show`.
5. **EHR:** Immutable notes per appointment; patient file uploads (PDF/labs) under strict Storage rules.
6. **Admin Dashboard:** Pending specialist queue, platform stats, user management.
7. **i18n & Theme:** System-wide dark/light + EN/ES.

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
