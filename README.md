# Yelena Booking

Plataforma de citas médicas e historias clínicas (EHR) — portfolio Next.js + Firebase.

Repo: [erickorso/yelena-booking](https://github.com/erickorso/yelena-booking)

## Stack

- **Next.js 16** (App Router) + React 19 + TypeScript strict
- **Tailwind CSS v4** + Atomic Design (`atoms` / `molecules` / `organisms` / `templates`)
- **Firebase Auth** (Email/Password + Google) + **Custom Claims** (`paciente` | `especialista` | `admin`)
- **Cloud Firestore** (perfiles, especialistas, citas, EHR metadata)
- **Vercel Blob** (PDFs/imágenes — alternativa free a Firebase Storage en Spark)
- **next-intl** (ES/EN) + **next-themes** (claro/oscuro)
- **Vitest** + Testing Library

Arquitectura y reglas SOLID: ver [`PROJECT_CONTEXT.md`](./PROJECT_CONTEXT.md).

## Roles

| Claim | Quién |
|---|---|
| _(sin sesión)_ | Invitado — landing + directorio público |
| `paciente` | Reserva / su historial |
| `especialista` | Agenda + notas (alta inicia en `pending`) |
| `admin` | Aprobaciones y governance (solo seed) |

## Setup local

### 1. Instalar

```bash
npm install
cp .env.example .env.local
```

### 2. Variables (`.env.local`)

```env
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

FIREBASE_ADMIN_PROJECT_ID=
FIREBASE_ADMIN_CLIENT_EMAIL=
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

BLOB_READ_WRITE_TOKEN=
BLOB_STORE_ID=
```

- Firebase web: Console → Project settings → Your apps  
- Admin: Console → Service accounts → Generate new private key  
- Blob: [Vercel](https://vercel.com/dashboard) → Storage → Blob → Read-Write token  

### 3. Firebase Console

1. Auth → Email/Password + Google  
2. Firestore (Standard, native)  
3. Pegar [`firestore.rules`](./firestore.rules) en Firestore → Rules  
4. (Storage Firebase no hace falta en v1)

### 4. Seed + dev

```bash
npm run seed
npm run dev
```

Abre [http://localhost:3000/es](http://localhost:3000/es)

### Cuentas demo (seed)

| Rol | Email | Password |
|---|---|---|
| Admin | `admin@yelena.app` | `YelenaAdmin123!` |
| Paciente | `paciente@yelena.app` | `YelenaPatient123!` |
| Especialista (activo) | `especialista@yelena.app` | `YelenaSpecialist123!` |
| Especialista (pending) | `especialista.pending@yelena.app` | `YelenaSpecialist123!` |

## Scripts

| Comando | Descripción |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` | Build producción |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm test` | Vitest |
| `npm run seed` | Usuarios + claims + docs Firestore |

## Estructura

```
src/
  app/[locale]/          # UI + i18n routes
  app/api/               # BFF (claims, bootstrap, files, specialists)
  components/            # Atomic Design
  repositories/          # Interfaces + Admin Firestore + stubs
  services/              # Casos de uso (auth, appointments, EHR, upload)
  adapters/firestore/    # Docs crudos → domain
  types/domain/          # Modelos tipados
  lib/firebase/          # client (static NEXT_PUBLIC_*) + admin (server-only)
  lib/storage/           # IFileStorage → Vercel Blob
```

## Deploy (Vercel)

1. Importar el repo en Vercel  
2. Env vars: las mismas que `.env.local` (Production + Preview; ideal también Development)  
3. Secrets de GitHub Actions (opcional, workflows en `.github/workflows/`):
   - `VERCEL_TOKEN`
   - `VERCEL_ORG_ID`
   - `VERCEL_PROJECT_ID`

Tras el primer push a `main`, Vercel despliega automáticamente si el proyecto está linkeado al repo.

## Rutas útiles

| Ruta | Uso |
|---|---|
| `/es` `/en` | Landing |
| `/es/login` `/es/register` | Auth |
| `/es/specialists` | Directorio (activos) |
| `/es/dashboard/*` | Paneles por rol |

## Notas

- **Spark:** Custom Claims vía Admin en BFF; sin Cloud Functions en v1.  
- **Archivos:** Vercel Blob (`private`) + metadata en `medicalFiles`.  
- **Google Calendar (especialista):** OAuth → FreeBusy en slots + evento Meet al citar. En Google Cloud Console crea OAuth Client (Web) con redirect `https://<host>/api/integrations/google/callback` (y `http://localhost:3000/...` en local). Env: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`. Conectar desde panel → Horario.  
- **Tailwind v4 + next-themes:** `@custom-variant dark` en `globals.css` (clase `.dark` en `<html>`).  
- No commitear `.env.local` ni JSON de service account.

## Licencia

Uso de portfolio / privado — ver visibilidad del repo en GitHub.
